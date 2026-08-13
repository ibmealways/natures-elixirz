import test from "node:test";
import assert from "node:assert/strict";
import { backupReadiness, newestReadyBackup, shouldReconcileLedger } from "./operations-autonomy.js";

test("Stripe reconciliation includes recoverable subscription states only", () => {
  assert.equal(shouldReconcileLedger({ id: "sub_1", uid: "user-1", status: "active" }), true);
  assert.equal(shouldReconcileLedger({ id: "sub_2", uid: "user-2", status: "past_due" }), true);
  assert.equal(shouldReconcileLedger({ id: "sub_3", uid: "user-3", status: "canceled" }), false);
  assert.equal(shouldReconcileLedger({ id: "sub_4", status: "active" }), false);
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
