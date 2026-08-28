# Nature's Elixirz OS — HBNR Incident-Response Technical Runbook

Status: Phase II-A internal foundation. Operational guidance only; not legal advice.

## Purpose and boundary

This runbook supports documented response to suspected privacy or security events. The register does not decide whether an event is a breach, whether the FTC Health Breach Notification Rule applies, or whether notice is required. Authorized humans and, when appropriate, counsel make those decisions.

The register is separate from consumer Kernels and AI reliability records in `systemIncidents`. It performs no containment, notification, account crawl, vendor contact, configuration change, or production-data collection.

## Authorization and lifecycle

Incident administrators reuse the server-verified `betaAdmins/{uid}.enabled == true` authorization. Browser clients have no direct Firestore access.

The server enforces an explicit forward-only transition matrix. Triage may proceed through containment or directly to investigation; investigation may proceed through evidence preservation or directly to technical assessment; notification decision may proceed through remediation or directly to closure. Backward transitions and reopening a closed record are denied.

SEV0–SEV3 are operational labels, not legal conclusions.

## Response procedure

1. Create a minimized record without copying health, wellness, nutrition, movement, authentication, payment, or message content.
2. Assign an owner; record discovery and reporting times.
3. Record potentially affected systems, categories, vendors, jurisdictions, and estimated counts.
4. Preserve references to evidence before configuration changes.
5. Track containment checklist items. Execute real containment only through a separately authorized process.
6. Record technical findings and affected-user estimates without crawling production accounts.
7. Escalate uncertainty to counsel.

## Evidence and audit

Store references, date ranges, source systems, preservation metadata, integrity notes, restrictions, and retention-review flags—not sensitive evidence. Every material server mutation creates a separate append-only audit event in the same Firestore transaction, containing server-derived actor, action, server-controlled timestamp, prior/new status and version, changed field categories, mutation identifier, and minimized reason. Mutations require the version loaded by the administrator; stale writes are rejected, and exact mutation-ID retries do not duplicate state or audit records.

## HBNR worksheet

The worksheet records `YES`, `NO`, or `UNKNOWN` for technical questions about health/wellness information, identifiability, authorization, acquisition, protection, and preservation. It also records systems, vendors, estimated counts, jurisdictions, and discovery time.

> THIS TOOL DOES NOT DETERMINE WHETHER AN EVENT IS A LEGALLY REPORTABLE BREACH. FINAL DETERMINATION REQUIRES AUTHORIZED HUMAN AND, WHERE APPROPRIATE, LEGAL COUNSEL REVIEW.

## Counsel and notification decision

Request counsel review, then record only review status and a restricted notes reference. Record the authorized human notification decision, channels considered, required-review flags, timestamp, actor, and basis reference. The application never sends consumer, FTC, media, state, or vendor notices.

## Remediation and closure

Record root cause, corrective and preventive actions, review flags, follow-up owner/due date, and completion time. Closure requires a summary and a state of `NOTIFICATION_DECISION` or `REMEDIATION`; it does not certify legal compliance.

## Data minimization, retention, and limits

Do not enter secrets, raw logs, tokens, credentials, message bodies, precise health values, or copied user records. Written policy and counsel must establish retention; Phase II-A adds no automatic deletion. Phase II-B notification workflows and Phase II-C retention automation remain excluded.

## Validation and attorney handoff

Use synthetic records only. Verify unauthorized rejection, schema validation, explicit Firestore denial, evidence minimization, paired audit creation, manual notification status, closure gates, tests, and production build. Counsel should review the legal decision tree, deadlines/content, state-law overlap, privilege, retention, vendor duties, and the owner/escalation matrix before activation.
