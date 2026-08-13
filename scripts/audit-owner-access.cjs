const { Client } = require("firebase-tools/lib/apiv2");
const { getProjectDefaultAccount, setActiveAccount } = require("firebase-tools/lib/auth");

const activeAccount = getProjectDefaultAccount(process.cwd());
if (!activeAccount) throw new Error("The Firebase CLI is not signed in.");
setActiveAccount({}, activeAccount);

const firestore = new Client({ urlPrefix: "https://firestore.googleapis.com", apiVersion: "v1" });
const projectPath = "/projects/natures-elixirz-os/databases/(default)/documents";
const scalar = (value) => value?.stringValue ?? value?.booleanValue ?? value?.integerValue ?? null;

async function getDocument(path) {
  try { return (await firestore.get(`${projectPath}/${path}`)).body; }
  catch (error) { if (error.status === 404) return null; throw error; }
}

async function main() {
  const response = await firestore.get(`${projectPath}/betaAdmins?pageSize=20`);
  const owners = await Promise.all((response.body.documents || []).map(async (admin) => {
    const uid = admin.name.split("/").at(-1);
    const [user, entitlement, tester] = await Promise.all([
      getDocument(`users/${uid}`),
      getDocument(`users/${uid}/private/entitlement`),
      getDocument(`betaTesters/${uid}`),
    ]);
    return {
      uid,
      email: scalar(user?.fields?.email),
      adminEnabled: scalar(admin.fields?.enabled),
      entitlement: entitlement ? {
        tier: scalar(entitlement.fields?.tier),
        status: scalar(entitlement.fields?.status),
        accessSource: scalar(entitlement.fields?.accessSource),
        betaExpiresAt: scalar(entitlement.fields?.betaExpiresAt),
      } : null,
      betaTester: tester ? {
        status: scalar(tester.fields?.status),
        expiresAt: scalar(tester.fields?.expiresAt),
      } : null,
    };
  }));
  process.stdout.write(JSON.stringify({ ownerCount: owners.length, owners }, null, 2));
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });
