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
