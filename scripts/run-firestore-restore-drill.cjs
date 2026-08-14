const { Client } = require("firebase-tools/lib/apiv2");
const { getProjectDefaultAccount, setActiveAccount } = require("firebase-tools/lib/auth");

const projectId = "natures-elixirz-os";
const sourceBackup = process.argv[2];
const requestedDatabaseId = process.argv[3];
const date = new Date().toISOString().slice(0, 10).replaceAll("-", "");
const databaseId = requestedDatabaseId || `restore-drill-${date}`;
if (!sourceBackup?.startsWith(`projects/${projectId}/locations/nam5/backups/`)) throw new Error("A READY nam5 backup resource name is required.");
if (!/^restore-drill-\d{8}$/.test(databaseId) || databaseId === "(default)") throw new Error("Unsafe restore target rejected.");

const activeAccount = getProjectDefaultAccount(process.cwd());
if (!activeAccount) throw new Error("The Firebase CLI is not signed in.");
setActiveAccount({}, activeAccount);
const firestore = new Client({ urlPrefix: "https://firestore.googleapis.com", apiVersion: "v1" });

async function waitForOperation(name, maximumAttempts = 360) {
  for (let attempt = 0; attempt < maximumAttempts; attempt += 1) {
    const operation = (await firestore.get(`/${name}`)).body;
    if (operation.done) {
      if (operation.error) throw new Error(JSON.stringify(operation.error));
      return operation;
    }
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
  throw new Error(`Operation ${name} did not complete within thirty minutes.`);
}

async function existingDatabase() {
  try { return (await firestore.get(`/projects/${projectId}/databases/${databaseId}`)).body; }
  catch (error) { if ((error.status || error.response?.status) === 404) return null; throw error; }
}

async function restore() {
  const existing = await existingDatabase();
  if (existing) {
    const operation = existing.sourceInfo?.operation;
    const backup = existing.sourceInfo?.backup?.backup;
    if (!operation || backup !== sourceBackup || !existing.name.endsWith(`/${databaseId}`)) {
      throw new Error(`Temporary database ${databaseId} exists but is not the expected restore drill; refusing to use it.`);
    }
    return waitForOperation(operation);
  }
  const response = await firestore.post(`/projects/${projectId}/databases:restore`, {
    backup: sourceBackup,
    databaseId,
  });
  return waitForOperation(response.body.name);
}

async function validate() {
  const database = await existingDatabase();
  const active = database && database.sourceInfo?.progress === "COMPLETED" && !database.deleteTime;
  if (!active) throw new Error("Restored database did not become readable after the restore completed.");
  const collectionsResponse = await firestore.post(`/projects/${projectId}/databases/${databaseId}/documents:listCollectionIds`, { pageSize: 1000 });
  const collectionIds = (collectionsResponse.body.collectionIds || []).sort();
  if (!collectionIds.includes("users")) throw new Error("Restored database is missing the users collection.");
  const representative = {};
  for (const collectionId of collectionIds.slice(0, 25)) {
    const page = await firestore.get(`/projects/${projectId}/databases/${databaseId}/documents/${encodeURIComponent(collectionId)}?pageSize=10`);
    representative[collectionId] = (page.body.documents || []).length;
  }
  const indexes = await firestore.get(`/projects/${projectId}/databases/${databaseId}/collectionGroups/-/indexes`);
  return {
    database: database.name,
    state: database.state || "ACTIVE",
    locationId: database.locationId,
    type: database.type,
    collectionIds,
    representativeDocumentCountsUpTo10: representative,
    compositeIndexCount: (indexes.body.indexes || []).length,
  };
}

async function cleanup() {
  if (!/^restore-drill-\d{8}$/.test(databaseId) || databaseId === "(default)") throw new Error("Unsafe cleanup target rejected.");
  const response = await firestore.delete(`/projects/${projectId}/databases/${databaseId}`);
  if (response.body?.name) await waitForOperation(response.body.name);
  if (await existingDatabase()) throw new Error("Temporary drill database still exists after cleanup.");
  return { deleted: true, database: `projects/${projectId}/databases/${databaseId}` };
}

(async () => {
  const startedAt = new Date().toISOString();
  const restoreOperation = await restore();
  const validation = await validate();
  const cleanupResult = await cleanup();
  process.stdout.write(JSON.stringify({
    verified: true,
    startedAt,
    completedAt: new Date().toISOString(),
    sourceBackup,
    restoreOperation: restoreOperation.name,
    validation,
    cleanup: cleanupResult,
    productionDatabaseTouched: false,
  }, null, 2));
})().catch((error) => {
  console.error(error?.response?.body || error.message);
  process.exitCode = 1;
});
