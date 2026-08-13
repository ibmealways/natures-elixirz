const { Client } = require("firebase-tools/lib/apiv2");
const { getProjectDefaultAccount, setActiveAccount } = require("firebase-tools/lib/auth");

const expectedUid = "AzQ9LHQKzjS6mS3jAfvS0l3DEKJ3";
const expectedEmail = "ibmealways689@gmail.com";
const activeAccount = getProjectDefaultAccount(process.cwd());
if (!activeAccount) throw new Error("The Firebase CLI is not signed in.");
setActiveAccount({}, activeAccount);

const client = new Client({ urlPrefix: "https://firestore.googleapis.com", apiVersion: "v1" });
const base = "/projects/natures-elixirz-os/databases/(default)/documents";
const value = (field) => field?.stringValue ?? field?.booleanValue ?? null;

async function main() {
  const [admin, user] = await Promise.all([
    client.get(`${base}/betaAdmins/${expectedUid}`),
    client.get(`${base}/users/${expectedUid}`),
  ]);
  if (value(admin.body.fields?.enabled) !== true) throw new Error("Expected primary administrator is not enabled.");
  if (String(value(user.body.fields?.email) || "").toLowerCase() !== expectedEmail) throw new Error("Primary account identity did not match the audited email.");

  const query = new URLSearchParams();
  ["tier", "status", "accessSource", "ownerRole", "updatedAt"].forEach((field) => query.append("updateMask.fieldPaths", field));
  const updatedAt = new Date().toISOString();
  await client.patch(`${base}/users/${expectedUid}/private/entitlement?${query}`, {
    fields: {
      tier: { integerValue: "5" },
      status: { stringValue: "active" },
      accessSource: { stringValue: "primary-owner" },
      ownerRole: { stringValue: "creator-developer" },
      updatedAt: { timestampValue: updatedAt },
    },
  });
  process.stdout.write(JSON.stringify({ uid: expectedUid, email: expectedEmail, tier: 5, status: "active", accessSource: "primary-owner", ownerRole: "creator-developer", updatedAt }, null, 2));
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });
