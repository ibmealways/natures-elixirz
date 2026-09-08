const { Client } = require("firebase-tools/lib/apiv2");
const { getProjectDefaultAccount, setActiveAccount } = require("firebase-tools/lib/auth");

const [operationName, outputUriPrefix] = process.argv.slice(2);
if (!operationName || !outputUriPrefix) throw new Error("Usage: node scripts/verify-firestore-export.cjs OPERATION_NAME GS_PREFIX");
const activeAccount = getProjectDefaultAccount(process.cwd());
if (!activeAccount) throw new Error("The Firebase CLI is not signed in.");
setActiveAccount({}, activeAccount);

const firestore = new Client({ urlPrefix: "https://firestore.googleapis.com", apiVersion: "v1" });
const storage = new Client({ urlPrefix: "https://storage.googleapis.com", apiVersion: "storage/v1" });
const [, bucketAndPrefix] = outputUriPrefix.split("gs://");
const slash = bucketAndPrefix.indexOf("/");
const bucket = bucketAndPrefix.slice(0, slash);
const prefix = bucketAndPrefix.slice(slash + 1);

async function waitForOperation() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const operation = (await firestore.get(`/${operationName}`)).body;
    if (operation.done) {
      if (operation.error) throw new Error(JSON.stringify(operation.error));
      return operation;
    }
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
  throw new Error("Firestore export did not complete within five minutes.");
}

(async () => {
  const operation = await waitForOperation();
  const objects = (await storage.get(`/b/${bucket}/o?prefix=${encodeURIComponent(prefix)}&maxResults=1000`)).body.items || [];
  const manifest = objects.find((object) => object.name.endsWith(".overall_export_metadata"));
  if (!manifest) throw new Error("Export completed but the overall export manifest was not found.");
  const totalBytes = objects.reduce((sum, object) => sum + Number(object.size || 0), 0);
  process.stdout.write(JSON.stringify({
    verified: true,
    operation: operation.name,
    outputUriPrefix,
    manifest: `gs://${bucket}/${manifest.name}`,
    objectCount: objects.length,
    totalBytes,
    completedAt: operation.metadata?.endTime || null,
  }, null, 2));
})().catch((error) => {
  console.error(error?.response?.body || error.message);
  process.exitCode = 1;
});
