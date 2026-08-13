export const RECONCILABLE_STRIPE_STATUSES = new Set([
  "active", "trialing", "past_due", "paused", "unpaid", "incomplete",
]);

export function shouldReconcileLedger(record = {}) {
  return Boolean(record.uid && record.id && RECONCILABLE_STRIPE_STATUSES.has(String(record.status || "")));
}

export function newestReadyBackup(backups = [], databaseName) {
  return backups
    .filter((backup) => backup.state === "READY" && backup.database === databaseName && backup.snapshotTime)
    .sort((left, right) => Date.parse(right.snapshotTime) - Date.parse(left.snapshotTime))[0] || null;
}

export function backupReadiness(backups, databaseName, now = Date.now(), maximumAgeHours = 36) {
  const backup = newestReadyBackup(backups, databaseName);
  if (!backup) return { healthy: false, reason: "no-ready-backup", backup: null, ageHours: null };
  const ageHours = (now - Date.parse(backup.snapshotTime)) / (60 * 60 * 1000);
  if (!Number.isFinite(ageHours) || ageHours < 0) return { healthy: false, reason: "invalid-snapshot-time", backup, ageHours: null };
  if (ageHours > maximumAgeHours) return { healthy: false, reason: "backup-too-old", backup, ageHours };
  return { healthy: true, reason: "ready", backup, ageHours };
}
