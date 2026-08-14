import test from "node:test";
import assert from "node:assert/strict";
import { assessOperationHealth, backupReadiness, newestReadyBackup, shouldReconcileLedger, shouldRecordAiServiceIncident, summarizeAutonomyHealth } from "./operations-autonomy.js";

test("Stripe reconciliation includes recoverable subscription states only", () => {
  assert.equal(shouldReconcileLedger({ id: "sub_1", uid: "user-1", status: "active" }), true);
  assert.equal(shouldReconcileLedger({ id: "sub_2", uid: "user-2", status: "past_due" }), true);
  assert.equal(shouldReconcileLedger({ id: "sub_3", uid: "user-3", status: "canceled" }), false);
  assert.equal(shouldReconcileLedger({ id: "sub_4", status: "active" }), false);
});

test("AI incident classification excludes recipe validation and records service failures", () => {
  assert.equal(shouldRecordAiServiceIncident(new Error("The AI recipe was too similar to a recent recipe.")), false);
  assert.equal(shouldRecordAiServiceIncident({ status: 429, code: "rate_limit_exceeded" }), true);
  assert.equal(shouldRecordAiServiceIncident({ name: "APIConnectionError" }), true);
});

test("backup readiness selects the newest ready production backup", () => {
  const database = "projects/example/databases/(default)";
  const backups = [
    { name: "older", database, state: "READY", snapshotTime: "2026-08-11T00:00:00Z" },
    { name: "creating", database, state: "CREATING", snapshotTime: "2026-08-13T00:00:00Z" },
    { name: "newest", database, state: "READY", snapshotTime: "2026-08-12T12:00:00Z" },
  ];
  assert.equal(newestReadyBackup(backups, database).name, "newest");
  assert.equal(backupReadiness(backups, database, Date.parse("2026-08-13T00:00:00Z")).healthy, true);
});

test("backup readiness rejects missing and stale backups", () => {
  const database = "projects/example/databases/(default)";
  assert.deepEqual(backupReadiness([], database), {
    healthy: false, reason: "no-ready-backup", backup: null, ageHours: null,
  });
  const result = backupReadiness([
    { name: "stale", database, state: "READY", snapshotTime: "2026-08-01T00:00:00Z" },
  ], database, Date.parse("2026-08-13T00:00:00Z"));
  assert.equal(result.healthy, false);
  assert.equal(result.reason, "backup-too-old");
});

test("operation health rejects missing, failed, and stale scheduled work", () => {
  const now = Date.parse("2026-08-14T12:00:00Z");
  assert.equal(assessOperationHealth("firestoreBackupValidation", {}, now).reason, "never-completed");
  assert.equal(assessOperationHealth("firestoreBackupValidation", {
    status: "failed", completedAt: "2026-08-14T11:00:00Z",
  }, now).reason, "failed");
  assert.equal(assessOperationHealth("firestoreBackupValidation", {
    status: "healthy", completedAt: "2026-08-12T00:00:00Z",
  }, now).reason, "stale");
});

test("autonomy summary includes operational, AI, and mail attention", () => {
  const summary = summarizeAutonomyHealth({
    now: Date.parse("2026-08-14T12:00:00Z"),
    operations: {
      stripeEntitlementReconciliation: { status: "healthy", completedAt: "2026-08-14T10:00:00Z" },
      firestoreBackupValidation: { status: "healthy", completedAt: "2026-08-14T10:00:00Z" },
    },
    unresolvedIncidents: 2,
    failedMail: 1,
  });
  assert.equal(summary.status, "attention-required");
  assert.equal(summary.attention.length, 2);
});
