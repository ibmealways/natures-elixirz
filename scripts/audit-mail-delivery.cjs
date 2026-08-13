const { Client } = require("firebase-tools/lib/apiv2");
const { getProjectDefaultAccount, setActiveAccount } = require("firebase-tools/lib/auth");

const client = new Client({
  urlPrefix: "https://firestore.googleapis.com",
  apiVersion: "v1",
});

const activeAccount = getProjectDefaultAccount(process.cwd());
if (!activeAccount) {
  console.error("The Firebase CLI is not signed in.");
  process.exit(1);
}
setActiveAccount({}, activeAccount);

function valueOf(value) {
  if (!value) return null;
  if ("stringValue" in value) return value.stringValue;
  if ("timestampValue" in value) return value.timestampValue;
  if ("booleanValue" in value) return value.booleanValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if (value.arrayValue) return (value.arrayValue.values || []).map(valueOf);
  if (value.mapValue) return Object.fromEntries(Object.entries(value.mapValue.fields || {}).map(([key, nested]) => [key, valueOf(nested)]));
  return null;
}

function recipientDomain(fields = {}) {
  const recipients = valueOf(fields.to) || [];
  const email = String(recipients[0] || "").toLowerCase();
  return email.includes("@") ? email.split("@").at(-1) : "unknown";
}

async function main() {
  const response = await client.get("/projects/natures-elixirz-os/databases/(default)/documents/mail?pageSize=50&orderBy=createdAt%20desc");
  const records = (response.body.documents || []).map((document) => {
    const fields = document.fields || {};
    const delivery = valueOf(fields.delivery) || {};
    return {
      category: valueOf(fields.category) || "uncategorized",
      recipientDomain: recipientDomain(fields),
      createdAt: valueOf(fields.createdAt) || document.createTime,
      deliveryState: delivery.state || delivery.status || "queued-or-unreported",
      deliveryMessageId: delivery.info?.messageId || delivery.messageId || null,
      deliveryResponse: delivery.info?.response || delivery.response || null,
      acceptedCount: Array.isArray(delivery.info?.accepted) ? delivery.info.accepted.length : null,
      rejectedCount: Array.isArray(delivery.info?.rejected) ? delivery.info.rejected.length : null,
      deliveryErrorCode: delivery.error?.code || null,
      deliveryError: typeof delivery.error === "string" ? delivery.error : delivery.error?.message || null,
    };
  });
  const byDomain = {};
  for (const record of records) {
    const key = record.recipientDomain;
    byDomain[key] ||= { total: 0, states: {} };
    byDomain[key].total += 1;
    byDomain[key].states[record.deliveryState] = (byDomain[key].states[record.deliveryState] || 0) + 1;
  }
  const failures = records.filter((record) => record.deliveryState === "ERROR" || record.deliveryError);
  process.stdout.write(JSON.stringify({ inspected: records.length, byDomain, failures, recent: records.slice(0, 15) }, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
