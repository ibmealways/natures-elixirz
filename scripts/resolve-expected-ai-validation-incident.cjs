const { Client } = require("firebase-tools/lib/apiv2");
const { getProjectDefaultAccount, setActiveAccount } = require("firebase-tools/lib/auth");

const projectId = "natures-elixirz-os";
const incidentId = "smartSmoothie-286fb990951916a0a7bd62fa";
const expectedMessage = "The AI recipe was too similar to a recent recipe.";
const firestore = new Client({ urlPrefix: "https://firestore.googleapis.com", apiVersion: "v1" });
const path = `/projects/${projectId}/databases/(default)/documents/systemIncidents/${incidentId}`;

async function main() {
  const activeAccount = getProjectDefaultAccount(process.cwd());
  if (!activeAccount) throw new Error("The Firebase CLI is not signed in.");
  setActiveAccount({}, activeAccount);

  const current = (await firestore.get(path)).body;
  const fields = current.fields || {};
  if (fields.status?.stringValue !== "open" || fields.service?.stringValue !== "smartSmoothie" || fields.errorMessage?.stringValue !== expectedMessage) {
    throw new Error("The incident no longer matches the expected validation-only record; no change was made.");
  }

  await firestore.patch(
    `${path}?updateMask.fieldPaths=status&updateMask.fieldPaths=resolution&updateMask.fieldPaths=resolvedAt`,
    { fields: {
      status: { stringValue: "resolved" },
      resolution: { stringValue: "Expected recipe-variety validation; excluded from service incident classification." },
      resolvedAt: { timestampValue: new Date().toISOString() },
    } },
  );
  process.stdout.write(JSON.stringify({ incidentId, status: "resolved", classification: "expected-validation" }, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
