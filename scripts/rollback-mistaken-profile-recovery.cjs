const { Client } = require("firebase-tools/lib/apiv2");
const { getProjectDefaultAccount, setActiveAccount } = require("firebase-tools/lib/auth");

const uid = String(process.argv[2] || "").trim();
const expectedEmail = String(process.argv[3] || "").trim().toLowerCase();
const expectedProfileName = String(process.argv[4] || "").trim().toLowerCase();
if (!uid || !expectedEmail || !expectedProfileName) {
  console.error("Usage: node scripts/rollback-mistaken-profile-recovery.cjs UID email expected-profile-name");
  process.exit(1);
}

const client = new Client({ urlPrefix: "https://firestore.googleapis.com", apiVersion: "v1" });
const activeAccount = getProjectDefaultAccount(process.cwd());
if (!activeAccount) throw new Error("The Firebase CLI is not signed in.");
setActiveAccount({}, activeAccount);

const scalar = (value) => value?.stringValue ?? null;
const accountPath = `/projects/natures-elixirz-os/databases/(default)/documents/users/${uid}`;

async function main() {
  const account = (await client.get(accountPath)).body;
  const actualEmail = String(scalar(account.fields?.email) || "").toLowerCase();
  const actualName = String(scalar(account.fields?.profile?.mapValue?.fields?.name) || "").trim().toLowerCase();
  if (actualEmail !== expectedEmail || actualName !== expectedProfileName) {
    throw new Error("Rollback guard failed: account email or copied profile name no longer matches.");
  }

  const recipes = (await client.get(`${accountPath}/recipes?pageSize=100`)).body.documents || [];
  const queryParams = new URLSearchParams();
  ["profile", "journey", "movement", "kitchen", "mealKitchen", "exchange", "updatedAt"]
    .forEach((field) => queryParams.append("updateMask.fieldPaths", field));
  queryParams.set("currentDocument.updateTime", account.updateTime);
  await client.patch(accountPath, { fields: {} }, { queryParams });
  await Promise.all(recipes.map((recipe) => client.delete(`/${recipe.name}`)));
  process.stdout.write(JSON.stringify({ clearedAccount: expectedEmail, deletedCopiedRecipes: recipes.length }, null, 2));
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });
