# Firestore Recovery Record

## Native scheduled protection

- Database: `projects/natures-elixirz-os/databases/(default)`
- Schedule: daily, Google-managed execution time
- Retention: 14 days
- Restore policy: restore only into a new isolated database; never automate an in-place production restore
- Audit command: `node scripts/audit-firestore-recovery.cjs`

## First verified on-demand export

- Completed: `2026-08-13T01:57:26.252591Z`
- Prefix: `gs://natures-elixirz-firestore-recovery/exports/manual-2026-08-13T01-57-21-595Z`
- Manifest: `gs://natures-elixirz-firestore-recovery/exports/manual-2026-08-13T01-57-21-595Z/manual-2026-08-13T01-57-21-595Z.overall_export_metadata`
- Firestore operation: `projects/natures-elixirz-os/databases/(default)/operations/ASBlNDMxNmUwZTI4YjctMGUxOC1kNTM0LTQyYjgtNmYxMDkyNWMkGnNlbmlsZXBpcAkKMxI`
- Object count: 3
- Stored bytes: 502,446
- Verification: completed operation and overall export metadata manifest confirmed

Retention rule: keep this export until a native scheduled backup is confirmed `READY` and a deliberate recovery review approves retirement. The recovery bucket has no automatic deletion lifecycle.

## Recovery bucket controls

- Bucket: `natures-elixirz-firestore-recovery`
- Location: `US`, compatible with the Firestore `nam5` database
- Uniform bucket-level access: enabled
- Public access prevention: enforced
- Object versioning: enabled
- Firestore service-agent access is scoped to this bucket

## On-demand export commands

Start a new timestamped export:

```powershell
node scripts/run-firestore-export.cjs
```

Verify the returned operation and prefix:

```powershell
node scripts/verify-firestore-export.cjs "OPERATION_NAME" "GS_OUTPUT_PREFIX"
```

Never import an export into the production `(default)` database as an automated test. A restore drill must use a separately named, isolated database and explicit approval before it is created or deleted.

## First verified native-backup restore drill

- Source backup: `projects/natures-elixirz-os/locations/nam5/backups/23e4a9bb-c786-469e-b0f4-8b6dbaba1ee8`
- Source snapshot: `2026-08-13T13:36:26.848392Z`
- Validation completed: `2026-08-14T01:09:07.103Z`
- Restore target: isolated `restore-drill-20260814` database in `nam5`
- Database type/state: `FIRESTORE_NATIVE` / `ACTIVE`
- Root collections verified: `betaAdminAudit`, `betaAdmins`, `betaSignupRequests`, `betaTesters`, `mail`, `systemOperations`, `users`
- Representative document reads: successful from every restored root collection
- Index metadata query: successful; zero composite indexes existed in the backup
- Cleanup: isolated restore database deleted successfully
- Production `(default)` database modified: no

An earlier guarded target, `restore-drill-20260813`, was created during the same drill while Google processed the long-running restore across UTC midnight. It was independently source-verified, produced the same collection/read results, and was also deleted successfully. After cleanup, `(default)` was confirmed as the only remaining Firestore database.

Run a future guarded restore drill:

```powershell
node scripts/run-firestore-restore-drill.cjs "READY_BACKUP_RESOURCE_NAME" "restore-drill-YYYYMMDD"
```

The tool refuses `(default)`, refuses names outside `restore-drill-YYYYMMDD`, verifies an existing target came from the specified backup before resuming it, and waits for guarded deletion after validation.
