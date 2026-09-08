const { Client } = require("firebase-tools/lib/apiv2");
const { getProjectDefaultAccount, setActiveAccount } = require("firebase-tools/lib/auth");

const projectId = "natures-elixirz-os";
const projectNumber = "248307295904";
const databaseId = "(default)";
const firestore = new Client({ urlPrefix: "https://firestore.googleapis.com", apiVersion: "v1" });
const resourceManager = new Client({ urlPrefix: "https://cloudresourcemanager.googleapis.com", apiVersion: "v1" });

const activeAccount = getProjectDefaultAccount(process.cwd());
if (!activeAccount) throw new Error("The Firebase CLI is not signed in.");
setActiveAccount({}, activeAccount);

async function ensureBackupSchedule() {
  const parent = `/projects/${projectId}/databases/${encodeURIComponent(databaseId)}/backupSchedules`;
  const existing = await firestore.get(parent);
  const daily = (existing.body.backupSchedules || []).find((schedule) => schedule.dailyRecurrence);
  if (daily) return { created: false, schedule: daily };
  const created = await firestore.post(parent, {
    retention: "1209600s",
    dailyRecurrence: {},
  });
  return { created: true, schedule: created.body };
}

async function ensureBackupViewerRole() {
  const member = `serviceAccount:${projectNumber}-compute@developer.gserviceaccount.com`;
  const policyResponse = await resourceManager.post(`/projects/${projectId}:getIamPolicy`, {});
  const policy = policyResponse.body;
  const bindings = Array.isArray(policy.bindings) ? policy.bindings : [];
  let binding = bindings.find((candidate) => candidate.role === "roles/datastore.backupsViewer");
  if (!binding) {
    binding = { role: "roles/datastore.backupsViewer", members: [] };
    bindings.push(binding);
  }
  if ((binding.members || []).includes(member)) return { changed: false, member };
  binding.members = [...(binding.members || []), member];
  await resourceManager.post(`/projects/${projectId}:setIamPolicy`, {
    policy: { ...policy, bindings },
    updateMask: "bindings,etag",
  });
  return { changed: true, member };
}

Promise.all([ensureBackupSchedule(), ensureBackupViewerRole()])
  .then(([backupSchedule, backupViewerRole]) => process.stdout.write(JSON.stringify({ backupSchedule, backupViewerRole }, null, 2)))
  .catch((error) => {
    console.error(error?.response?.body || error.message);
    process.exitCode = 1;
  });
