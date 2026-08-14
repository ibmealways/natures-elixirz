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

export const EXPECTED_AUTONOMY_OPERATIONS = {
  stripeEntitlementReconciliation: { label: "Stripe entitlement reconciliation", maximumAgeHours: 30 },
  firestoreBackupValidation: { label: "Firestore backup validation", maximumAgeHours: 30 },
};

const timestampMillis = (value) => {
  if (typeof value?.toMillis === "function") return value.toMillis();
  const parsed = Date.parse(String(value || ""));
  return Number.isFinite(parsed) ? parsed : null;
};

export function assessOperationHealth(operationId, record = {}, now = Date.now(), configuration = EXPECTED_AUTONOMY_OPERATIONS) {
  const expected = configuration[operationId];
  if (!expected) return { operationId, label: operationId, healthy: true, reason: "not-monitored", ageHours: null };
  const completedAt = timestampMillis(record.completedAt);
  if (!completedAt) return { operationId, label: expected.label, healthy: false, reason: "never-completed", ageHours: null };
  const ageHours = (now - completedAt) / (60 * 60 * 1000);
  if (!Number.isFinite(ageHours) || ageHours < 0) return { operationId, label: expected.label, healthy: false, reason: "invalid-completion-time", ageHours: null };
  if (record.status !== "healthy") return { operationId, label: expected.label, healthy: false, reason: String(record.status || "unknown-status"), ageHours };
  if (ageHours > expected.maximumAgeHours) return { operationId, label: expected.label, healthy: false, reason: "stale", ageHours };
  return { operationId, label: expected.label, healthy: true, reason: "healthy", ageHours };
}

export function summarizeAutonomyHealth({ operations = {}, unresolvedIncidents = 0, failedMail = 0, now = Date.now() } = {}) {
  const checks = Object.keys(EXPECTED_AUTONOMY_OPERATIONS)
    .map((operationId) => assessOperationHealth(operationId, operations[operationId], now));
  const attention = [
    ...checks.filter((check) => !check.healthy).map((check) => `${check.label}: ${check.reason}`),
    ...(unresolvedIncidents ? [`${unresolvedIncidents} unresolved AI service incident(s)`] : []),
    ...(failedMail ? [`${failedMail} email delivery failure(s) awaiting intervention`] : []),
  ];
  return {
    status: attention.length ? "attention-required" : "healthy",
    checks,
    unresolvedIncidents,
    failedMail,
    attention,
  };
}
