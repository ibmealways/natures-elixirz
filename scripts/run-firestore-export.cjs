const { Client } = require("firebase-tools/lib/apiv2");
const { getProjectDefaultAccount, setActiveAccount } = require("firebase-tools/lib/auth");

const projectId = "natures-elixirz-os";
const projectNumber = "248307295904";
const bucket = "natures-elixirz-firestore-recovery";
const activeAccount = getProjectDefaultAccount(process.cwd());
if (!activeAccount) throw new Error("The Firebase CLI is not signed in.");
setActiveAccount({}, activeAccount);

const storage = new Client({ urlPrefix: "https://storage.googleapis.com", apiVersion: "storage/v1" });
const firestore = new Client({ urlPrefix: "https://firestore.googleapis.com", apiVersion: "v1" });

async function ensureBucket() {
  let metadata;
  try {
    metadata = (await storage.get(`/b/${bucket}`)).body;
  } catch (error) {
    if ((error.status || error.response?.status) !== 404) throw error;
    metadata = (await storage.post(`/b?project=${projectId}`, {
      name: bucket,
      location: "US",
      storageClass: "STANDARD",
      versioning: { enabled: true },
      iamConfiguration: {
        uniformBucketLevelAccess: { enabled: true },
        publicAccessPrevention: "enforced",
      },
      labels: { purpose: "firestore-disaster-recovery", environment: "production" },
    })).body;
  }
  if (metadata.location !== "US") throw new Error(`Recovery bucket must be in US; found ${metadata.location}.`);
  const policyResponse = await storage.get(`/b/${bucket}/iam`);
  const policy = policyResponse.body;
  const member = `serviceAccount:service-${projectNumber}@gcp-sa-firestore.iam.gserviceaccount.com`;
  const role = "roles/storage.admin";
  let binding = (policy.bindings || []).find((candidate) => candidate.role === role);
  if (!binding) {
    binding = { role, members: [] };
    policy.bindings = [...(policy.bindings || []), binding];
  }
  if (!binding.members.includes(member)) {
    binding.members.push(member);
    await storage.put(`/b/${bucket}/iam`, policy);
  }
  return { name: metadata.name, location: metadata.location, versioning: metadata.versioning, publicAccessPrevention: metadata.iamConfiguration?.publicAccessPrevention };
}

async function startExport() {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outputUriPrefix = `gs://${bucket}/exports/manual-${stamp}`;
  const response = await firestore.post(`/projects/${projectId}/databases/${encodeURIComponent("(default)")}:exportDocuments`, {
    outputUriPrefix,
  });
  return { operation: response.body.name, outputUriPrefix };
}

(async () => {
  const bucketMetadata = await ensureBucket();
  const exportOperation = await startExport();
  process.stdout.write(JSON.stringify({ bucket: bucketMetadata, ...exportOperation }, null, 2));
})().catch((error) => {
  console.error(error?.response?.body || error.message);
  process.exitCode = 1;
});
