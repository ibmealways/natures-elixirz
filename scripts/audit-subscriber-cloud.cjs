const { Client } = require("firebase-tools/lib/apiv2");
const { getProjectDefaultAccount, setActiveAccount } = require("firebase-tools/lib/auth");

const requestedEmail = String(process.argv[2] || "").trim().toLowerCase();
const expectedProfileName = String(process.argv[3] || "").trim().toLowerCase();
if (!requestedEmail) {
  console.error("Usage: node scripts/audit-subscriber-cloud.cjs subscriber@example.com");
  process.exit(1);
}

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

function scalar(value) {
  return value?.stringValue ?? value?.timestampValue ?? value?.integerValue ?? null;
}

async function main() {
  let pageToken;
  const matches = [];
  const nameMatches = [];
  do {
    const query = new URLSearchParams({ pageSize: "100" });
    if (pageToken) query.set("pageToken", pageToken);
    const response = await client.get(
      `/projects/natures-elixirz-os/databases/(default)/documents/users?${query}`,
    );
    for (const document of response.body.documents || []) {
      const email = String(scalar(document.fields?.email) || "").toLowerCase();
      const profile = document.fields?.profile?.mapValue?.fields || {};
      const profileName = String(scalar(profile.name) || "").trim().toLowerCase();
      if (expectedProfileName && profileName === expectedProfileName) {
        nameMatches.push({
          uid: document.name.split("/").at(-1),
          ownerEmail: scalar(document.fields?.email),
          updateTime: document.updateTime,
        });
      }
      if (email !== requestedEmail) continue;
      const uid = document.name.split("/").at(-1);
      const recipesResponse = await client.get(`/projects/natures-elixirz-os/databases/(default)/documents/users/${uid}/recipes?pageSize=100`);
      matches.push({
        uid,
        createTime: document.createTime,
        updateTime: document.updateTime,
        accountUpdatedAt: scalar(document.fields?.updatedAt),
        profileFieldNames: Object.keys(profile).sort(),
        completedAt: scalar(profile.completedAt),
        clearedAt: scalar(profile.clearedAt),
        accountFieldNames: Object.keys(document.fields || {}).sort(),
        recipeCount: (recipesResponse.body.documents || []).length,
      });
    }
    pageToken = response.body.nextPageToken;
  } while (pageToken);

  process.stdout.write(JSON.stringify({
    matchCount: matches.length,
    matches,
    expectedProfileNameMatches: nameMatches,
  }, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
