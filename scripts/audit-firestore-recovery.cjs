const { Client } = require("firebase-tools/lib/apiv2");
const { getProjectDefaultAccount, setActiveAccount } = require("firebase-tools/lib/auth");

const projectId = "natures-elixirz-os";
const firestore = new Client({ urlPrefix: "https://firestore.googleapis.com", apiVersion: "v1" });
const activeAccount = getProjectDefaultAccount(process.cwd());
if (!activeAccount) throw new Error("The Firebase CLI is not signed in.");
setActiveAccount({}, activeAccount);

async function main() {
  const schedules = await firestore.get(`/projects/${projectId}/databases/${encodeURIComponent("(default)")}/backupSchedules`);
  const backups = await firestore.get(`/projects/${projectId}/locations/nam5/backups?pageSize=20`);
  const ready = (backups.body.backups || []).filter((backup) => backup.state === "READY")
    .sort((left, right) => Date.parse(right.snapshotTime) - Date.parse(left.snapshotTime));
  process.stdout.write(JSON.stringify({
    schedules: schedules.body.backupSchedules || [],
    latestReadyBackup: ready[0] || null,
    restorePolicy: "Restore drills must use a new isolated database ID; production is never an automated restore target.",
  }, null, 2));
}

main().catch((error) => {
  console.error(error?.response?.body || error.message);
  process.exitCode = 1;
});
