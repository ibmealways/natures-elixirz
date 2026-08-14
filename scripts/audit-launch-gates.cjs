const { Client } = require("firebase-tools/lib/apiv2");
const { getProjectDefaultAccount, setActiveAccount } = require("firebase-tools/lib/auth");

const activeAccount = getProjectDefaultAccount(process.cwd());
if (!activeAccount) throw new Error("The Firebase CLI is not signed in.");
setActiveAccount({}, activeAccount);

const projectId = "natures-elixirz-os";
const firestore = new Client({ urlPrefix: "https://firestore.googleapis.com", apiVersion: "v1" });
const functions = new Client({ urlPrefix: "https://cloudfunctions.googleapis.com", apiVersion: "v2" });
const secrets = new Client({ urlPrefix: "https://secretmanager.googleapis.com", apiVersion: "v1" });
const documentsPath = `/projects/${projectId}/databases/(default)/documents`;
const scalar = (value) => value?.stringValue ?? value?.integerValue ?? value?.booleanValue ?? value?.timestampValue ?? null;
const fields = (document) => Object.fromEntries(Object.entries(document?.fields || {}).map(([key, value]) => [key, scalar(value)]));

async function document(path) {
  try { return (await firestore.get(`${documentsPath}/${path}`)).body; }
  catch (error) { if (error.status === 404) return null; throw error; }
}
async function collection(path, pageSize = 500) {
  const response = await firestore.get(`${documentsPath}/${path}?pageSize=${pageSize}`);
  return response.body.documents || [];
}

async function main() {
  const [stripe, backup, autonomy, incidents, mail, ledger, deployed, stripeKeySecret, stripePricesSecret, stripeWebhookSecret] = await Promise.all([
    document("systemOperations/stripeEntitlementReconciliation"),
    document("systemOperations/firestoreBackupValidation"),
    document("systemOperations/autonomyHealthMonitor"),
    collection("systemIncidents", 200), collection("mail", 500), collection("subscriptionLedger", 500),
    functions.get(`/projects/${projectId}/locations/us-central1/functions?pageSize=200`),
    secrets.get(`/projects/${projectId}/secrets/STRIPE_SECRET_KEY/versions/latest:access`),
    secrets.get(`/projects/${projectId}/secrets/STRIPE_PRICES/versions/latest:access`),
    secrets.get(`/projects/${projectId}/secrets/STRIPE_WEBHOOK_SECRET/versions/latest:access`),
  ]);
  const operation = (value) => { const data = fields(value); return { status: data.status, completedAt: data.completedAt, inspected: data.inspected, repaired: data.repaired, missing: data.missing, reason: data.reason }; };
  const statusCounts = ledger.reduce((counts, item) => { const status = String(fields(item).status || "unknown"); counts[status] = (counts[status] || 0) + 1; return counts; }, {});
  const unresolvedIncidents = incidents.filter((item) => fields(item).status === "open").length;
  const openIncidentSummaries = incidents
    .filter((item) => fields(item).status === "open")
    .map((item) => {
      const data = fields(item);
      return {
        id: item.name.split("/").at(-1),
        service: data.service,
        errorCode: data.errorCode,
        errorMessage: data.errorMessage,
        firstObservedAt: data.firstObservedAt,
        lastObservedAt: data.lastObservedAt,
      };
    });
  const interventionMail = mail.filter((item) => fields(item).category === "operations-autonomy-alert" && fields(item).deliveryState === "ERROR").length;
  const deployedFunctions = deployed.body.functions || [];
  const deployedNames = deployedFunctions.map((item) => item.name.split("/").at(-1));
  const requiredFunctions = ["createCheckoutSession", "createBillingPortalSession", "stripeWebhook", "reconcileStripeEntitlements", "validateFirestoreBackupReadiness", "monitorAutonomyHealth", "exportSubscriberData", "deleteSubscriberAccount", "requestVerificationEmail"];
  const missingFunctions = requiredFunctions.filter((name) => !deployedNames.includes(name));
  const decodeSecret = (response) => Buffer.from(response.body.payload.data, "base64").toString("utf8");
  const stripeKey = decodeSecret(stripeKeySecret);
  let prices = {}; try { prices = JSON.parse(decodeSecret(stripePricesSecret)); } catch {}
  const expectedPriceKeys = Array.from({ length: 5 }, (_, index) => index + 1).flatMap((tier) => [`STRIPE_PRICE_TIER_${tier}_MONTHLY`, `STRIPE_PRICE_TIER_${tier}_YEARLY`]);
  const stripeMode = stripeKey.startsWith("sk_live_") ? "live" : stripeKey.startsWith("sk_test_") ? "test" : "unknown";
  const configuredPriceCount = expectedPriceKeys.filter((key) => String(prices[key] || "").startsWith("price_")).length;
  const latestSecretVersions = {
    STRIPE_SECRET_KEY: stripeKeySecret.body.name.split("/").at(-1),
    STRIPE_PRICES: stripePricesSecret.body.name.split("/").at(-1),
    STRIPE_WEBHOOK_SECRET: stripeWebhookSecret.body.name.split("/").at(-1),
  };
  const expectedBindings = {
    createCheckoutSession: ["STRIPE_SECRET_KEY", "STRIPE_PRICES"],
    createBillingPortalSession: ["STRIPE_SECRET_KEY"],
    deleteSubscriberAccount: ["STRIPE_SECRET_KEY"],
    reconcileStripeEntitlements: ["STRIPE_SECRET_KEY", "STRIPE_PRICES"],
    recoverSubscriptionEntitlement: ["STRIPE_SECRET_KEY", "STRIPE_PRICES"],
    stripeWebhook: ["STRIPE_SECRET_KEY", "STRIPE_PRICES", "STRIPE_WEBHOOK_SECRET"],
  };
  const bindingMismatches = [];
  for (const [functionName, secretNames] of Object.entries(expectedBindings)) {
    const deployedFunction = deployedFunctions.find((item) => item.name.endsWith(`/functions/${functionName}`));
    const bindings = Object.fromEntries((deployedFunction?.serviceConfig?.secretEnvironmentVariables || []).map((item) => [item.key, item.version]));
    for (const secretName of secretNames) {
      if (bindings[secretName] !== latestSecretVersions[secretName]) {
        bindingMismatches.push({ functionName, secretName, deployedVersion: bindings[secretName] || null, latestVersion: latestSecretVersions[secretName] });
      }
    }
  }
  const report = {
    auditedAt: new Date().toISOString(),
    operations: { stripeEntitlementReconciliation: operation(stripe), firestoreBackupValidation: operation(backup), autonomyHealthMonitor: operation(autonomy) },
    unresolvedIncidents, openIncidentSummaries, interventionMail, subscriptionLedgerStatusCounts: statusCounts,
    deployedFunctionCount: deployedNames.length, missingRequiredFunctions: missingFunctions,
    stripe: { mode: stripeMode, configuredPriceCount, expectedPriceCount: expectedPriceKeys.length, catalogComplete: configuredPriceCount === expectedPriceKeys.length, bindingMismatches },
  };
  report.launchGate = missingFunctions.length || unresolvedIncidents || interventionMail || stripeMode !== "live" || configuredPriceCount !== expectedPriceKeys.length || bindingMismatches.length || Object.values(report.operations).some((item) => !["healthy", "completed"].includes(String(item.status))) ? "attention-required" : "operationally-healthy";
  process.stdout.write(JSON.stringify(report, null, 2));
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });
