import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  assertAllowedFields,
  assertAuthorizedIncidentAdmin,
  assertClosable,
  assertCurrentVersion,
  assertIncidentAction,
  assertIncidentId,
  assertIncidentMutable,
  assertMutationId,
  assertReplayMatches,
  assertTransition,
  auditIdForMutation,
  boundedAppend,
  changedFieldCategories,
  defaultNotificationDecision,
  HBNR_DISCLAIMER,
  incidentIdForMutation,
  INCIDENT_STATUSES,
  INCIDENT_RECORD_TYPES,
  INCIDENT_TRANSITIONS,
  mutationFingerprint,
  normalizeAffectedUserAssessment,
  normalizeAffectedSystem,
  normalizeContainmentAction,
  normalizeDeadline,
  normalizeEvidenceReference,
  normalizeHbnrAssessment,
  normalizeIncidentCreate,
  normalizeIncidentUpdate,
  normalizeNotificationDecision,
  normalizePostIncidentReview,
  normalizeReviewCheckpoint,
  normalizeTask,
  normalizeTimelineEvent,
  normalizeTriage,
  replaceAffectedSystem,
  replaceDeadline,
  replaceTask,
  upsertReviewCheckpoint,
} from "./security-incident.js";

const validMutationId = "mutation_1234567890";
const validIncidentId = "inc_1234567890abcdef";
const validIncident = () => normalizeIncidentCreate({ title: "Synthetic concern", summary: "Synthetic test only" });

test("authorization denies missing authentication", () => {
  assert.throws(() => assertAuthorizedIncidentAdmin(null, { enabled: true }), /UNAUTHENTICATED/);
});
test("authorization denies subscribers, beta testers, missing records, and disabled admins", () => {
  for (const record of [null, {}, { tier: 1 }, { betaTester: true }, { enabled: false }]) {
    assert.throws(() => assertAuthorizedIncidentAdmin({ uid: "caller" }, record), /FORBIDDEN/);
  }
});
test("authorization allows only an enabled record and returns the authenticated UID", () => {
  assert.equal(assertAuthorizedIncidentAdmin({ uid: "authenticated-uid" }, { enabled: true, uid: "substituted-uid", role: "subscriber" }), "authenticated-uid");
});
test("authorization rejects malformed administrator records", () => {
  assert.throws(() => assertAuthorizedIncidentAdmin({ uid: "caller" }, Object.create(null)), /FORBIDDEN/);
});

test("creation minimizes state and never accepts protected metadata", () => {
  const value = normalizeIncidentCreate({ title: "Synthetic concern", summary: "Synthetic test only", potentialDataCategories: ["profile-category-label"] });
  assert.equal(value.status, "REPORTED");
  assert.equal(value.notificationDecisionStatus, "NOT_EVALUATED");
  assert.deepEqual(value.notificationDecision, defaultNotificationDecision());
  for (const field of ["createdByUid", "createdAt", "updatedByUid", "actorUid", "version", "notificationsSent", "evidencePayload"]) {
    assert.equal(field in value, false);
  }
  assert.throws(() => normalizeIncidentCreate({ title: "x", summary: "y", createdByUid: "forged" }), /unsupported fields/);
});
test("schemas reject malformed values, unknown fields, nested objects, and mass assignment", () => {
  assert.throws(() => normalizeIncidentCreate(null), /plain object/);
  assert.throws(() => normalizeIncidentCreate({ title: { nested: true }, summary: "x" }), /must be text/);
  assert.throws(() => normalizeIncidentUpdate({ status: "CLOSED" }), /unsupported fields/);
  assert.throws(() => normalizeIncidentUpdate({ createdAt: "forged" }), /unsupported fields/);
  assert.throws(() => assertAllowedFields({ action: "list", role: "admin" }, ["action"]), /unsupported fields/);
});
test("schemas reject oversized strings, arrays, invalid enums, IDs, and numbers", () => {
  assert.throws(() => normalizeIncidentCreate({ title: "x".repeat(161), summary: "test" }), /invalid or exceeds/);
  assert.throws(() => normalizeIncidentCreate({ title: "test", summary: "test", affectedSystems: Array.from({ length: 31 }, (_, index) => `system-${index}`) }), /at most 30/);
  assert.throws(() => normalizeIncidentCreate({ title: "test", summary: "test", severity: "CRITICAL" }), /unsupported value/);
  assert.throws(() => normalizeIncidentCreate({ title: "test", summary: "test", potentiallyAffectedAccountCount: -1 }), /non-negative integer/);
  assert.throws(() => assertIncidentId("../incident"), /invalid/);
  assert.throws(() => assertMutationId("short"), /invalid/);
  assert.equal(assertIncidentId(validIncidentId), validIncidentId);
  assert.equal(assertMutationId(validMutationId), validMutationId);
});
test("severity is editable only through the explicit update allowlist", () => {
  assert.deepEqual(normalizeIncidentUpdate({ severity: "SEV2" }), { severity: "SEV2" });
  assert.throws(() => normalizeIncidentUpdate({ severity: "CRITICAL" }), /unsupported value/);
});
test("untrusted incident text remains plain data", () => {
  const value = normalizeIncidentCreate({ title: "<script>alert(1)</script>", summary: "<img src=x onerror=alert(1)>" });
  assert.equal(value.title, "<script>alert(1)</script>");
  const ui = readFileSync(new URL("../src/components/SecurityIncidentRegister.jsx", import.meta.url), "utf8");
  assert.doesNotMatch(ui, /dangerouslySetInnerHTML|\\.innerHTML\\s*=/);
});

test("every declared lifecycle transition is allowed", () => {
  for (const [from, destinations] of Object.entries(INCIDENT_TRANSITIONS)) {
    for (const to of destinations) assert.equal(assertTransition(from, to), to);
  }
});
test("every undeclared lifecycle transition is forbidden", () => {
  for (const from of INCIDENT_STATUSES) {
    for (const to of INCIDENT_STATUSES) {
      if (!INCIDENT_TRANSITIONS[from].includes(to)) assert.throws(() => assertTransition(from, to), /not allowed/);
    }
  }
});
test("closure requires the proper stage and a bounded summary", () => {
  assert.throws(() => assertClosable({ status: "TRIAGE" }, "done"), /notification decision or remediation/);
  assert.throws(() => assertClosable({ status: "REMEDIATION" }, ""), /required/);
  assert.throws(() => assertClosable({ status: "REMEDIATION" }, "x".repeat(2001)), /exceeds/);
  assert.equal(assertClosable({ status: "REMEDIATION" }, "Synthetic closure summary"), "Synthetic closure summary");
});
test("closed records are immutable and cannot reopen", () => {
  assert.throws(() => assertIncidentMutable({ status: "CLOSED" }), /immutable/);
  for (const status of INCIDENT_STATUSES) assert.throws(() => assertTransition("CLOSED", status), /not allowed/);
});

test("stale versions are rejected", () => {
  assert.equal(assertCurrentVersion(4, 4), 4);
  assert.throws(() => assertCurrentVersion(5, 4), /stale/);
  assert.throws(() => assertCurrentVersion(4, -1), /non-negative/);
});
test("mutation and audit identifiers are deterministic and actor scoped", () => {
  const first = incidentIdForMutation("actor-a", validMutationId);
  assert.equal(first, incidentIdForMutation("actor-a", validMutationId));
  assert.notEqual(first, incidentIdForMutation("actor-b", validMutationId));
  assert.equal(auditIdForMutation(first, validMutationId), auditIdForMutation(first, validMutationId));
});
test("idempotent replay must match the original actor, action, incident, and mutation", () => {
  const requestFingerprint = mutationFingerprint({ action: "update", changes: { severity: "SEV2" } });
  assert.equal(requestFingerprint, mutationFingerprint({ changes: { severity: "SEV2" }, action: "update" }));
  const expected = { incidentId: validIncidentId, actorUid: "actor-a", action: "update", mutationId: validMutationId, requestFingerprint };
  assert.equal(assertReplayMatches({ ...expected }, expected), true);
  for (const replacement of [{ actorUid: "actor-b" }, { action: "close" }, { incidentId: "inc_abcdef1234567890" }, { mutationId: "mutation_abcdefghij" }, { requestFingerprint: mutationFingerprint({ action: "update", changes: { severity: "SEV3" } }) }]) {
    assert.throws(() => assertReplayMatches({ ...expected, ...replacement }, expected), /another operation/);
  }
  assert.throws(() => mutationFingerprint({ unsupported: undefined }), /unsupported value/);
  assert.throws(() => mutationFingerprint({ oversized: "x".repeat(100_001) }), /supported size/);
});
test("bounded collections reject growth beyond their limit", () => {
  assert.deepEqual(boundedAppend([], "entry", 1, "Timeline"), ["entry"]);
  assert.throws(() => boundedAppend(["existing"], "entry", 1, "Timeline"), /limit reached/);
  assert.throws(() => normalizeAffectedUserAssessment({ affectedSystems: Array(31).fill("system") }), /at most 30/);
  assert.throws(() => normalizePostIncidentReview({ correctiveActions: Array(21).fill("action") }), /at most 20/);
});
test("evidence stores references and metadata but not payloads", () => {
  const item = normalizeEvidenceReference({ evidenceType: INCIDENT_RECORD_TYPES.EVIDENCE, sourceSystem: "Google Cloud", description: "Synthetic log range", storageReference: "restricted/reference-1", containsSensitiveData: true });
  assert.equal(item.containsSensitiveData, true);
  assert.equal(item.retentionReviewRequired, true);
  assert.equal("payload" in item, false);
  assert.throws(() => normalizeEvidenceReference({ evidenceType: "log", sourceSystem: "cloud", description: "test", payload: "raw evidence" }), /unsupported fields/);
});
test("server authority replaces client actor and timestamp fields", () => {
  const event = normalizeTimelineEvent({ eventType: INCIDENT_RECORD_TYPES.TIMELINE, description: "test" }, { actorUid: "server-actor", timestamp: "server-time" });
  assert.equal(event.actorUid, "server-actor");
  assert.equal(event.timestamp, "server-time");
  assert.throws(() => normalizeTimelineEvent({ eventType: "TEST", description: "test", actorUid: "forged" }), /unsupported fields/);
  assert.throws(() => normalizeTimelineEvent({ eventType: "UNSUPPORTED_EVENT", description: "test" }), /unsupported value/);
  assert.throws(() => normalizeTimelineEvent({ eventType: "x".repeat(81), description: "test" }), /exceeds/);
});
test("containment is a fixed, record-only checklist", () => {
  const item = normalizeContainmentAction({ checklistId: "revoke-compromised-credentials", status: "IN_PROGRESS" }, { recordedByUid: "server-actor", recordedAt: "server-time" });
  assert.equal(item.checklistId, "revoke-compromised-credentials");
  assert.throws(() => normalizeContainmentAction({ checklistId: "disable-production" }), /unsupported value/);
});
test("HBNR and notification fields remain human-recorded, non-automatic facts", () => {
  const assessment = normalizeHbnrAssessment({});
  assert.equal(assessment.disclaimer, HBNR_DISCLAIMER);
  assert.equal(assessment.healthWellnessInformationInvolved, "UNKNOWN");
  assert.throws(() => normalizeNotificationDecision({ notificationDecisionStatus: "AUTO_REQUIRED" }), /unsupported value/);
  assert.equal(normalizeNotificationDecision({ notificationDecisionStatus: "PENDING_COUNSEL" }).notificationDecisionStatus, "PENDING_COUNSEL");
});
test("changed audit categories are deterministic and actions are allowlisted", () => {
  assert.deepEqual(changedFieldCategories({ status: "REPORTED", severity: "SEV0" }, { status: "TRIAGE", severity: "SEV0" }), ["status"]);
  assert.equal(assertIncidentAction("addTimeline"), "addTimeline");
  assert.throws(() => assertIncidentAction("notifyFTC"), /unsupported value/);
});

test("Phase II-B triage is bounded and rejects mass assignment", () => {
  const triage = normalizeTriage({ discoverySource: "Administrator report", initialScope: "Authentication workflow under review", operationalSeverity: "SEV2", nextReviewAt: "2026-08-29T12:00:00Z" });
  assert.equal(triage.operationalSeverity, "SEV2");
  assert.throws(() => normalizeTriage({ notes: "x".repeat(2001) }), /exceeds/);
  assert.throws(() => normalizeTriage({ legalDeadline: "automatic" }), /unsupported fields/);
});
test("Phase II-B tasks are bounded, allowlisted, and server attributed", () => {
  const task = normalizeTask({ title: "Review synthetic logs", category: "INVESTIGATION", status: "OPEN", assignedTo: "admin-a" }, { taskId: validMutationId, createdAt: "server-time", createdBy: "server-actor" });
  assert.equal(task.createdBy, "server-actor");
  assert.throws(() => normalizeTask({ title: "x", category: "EXECUTE_CONTAINMENT" }, { taskId: validMutationId }), /unsupported value/);
  assert.throws(() => normalizeTask({ title: "x", category: "TRIAGE", createdBy: "forged" }, { taskId: validMutationId }), /unsupported fields/);
  const completed = replaceTask([task], { taskId: validMutationId, title: task.title, category: task.category, status: "COMPLETE" }, { completedAt: "server-complete", completedBy: "server-actor" });
  assert.equal(completed[0].completedBy, "server-actor");
  assert.throws(() => boundedAppend(Array(50).fill(task), task, 50, "Response task"), /limit reached/);
});
test("Phase II-B affected systems record human conclusions without asserting compromise", () => {
  const system = normalizeAffectedSystem({ category: "FIRESTORE", label: "Primary database", status: "SUSPECTED" }, { systemId: validMutationId, recordedAt: "server-time", recordedBy: "server-actor" });
  assert.equal(system.status, "SUSPECTED");
  assert.throws(() => normalizeAffectedSystem({ category: "FIRESTORE", label: "x", status: "COMPROMISED" }, { systemId: validMutationId }), /unsupported value/);
  assert.equal(replaceAffectedSystem([system], { systemId: system.systemId, category: system.category, label: system.label, status: "CONFIRMED_NOT_AFFECTED", notes: system.notes })[0].status, "CONFIRMED_NOT_AFFECTED");
});
test("Phase II-B deadlines require human-entered sources and valid dates", () => {
  const deadline = normalizeDeadline({ type: "Internal review", dueAt: "2026-08-30T12:00:00Z", source: "ADMIN_ENTERED", status: "OPEN" }, { deadlineId: validMutationId, recordedAt: "server-time", recordedBy: "server-actor" });
  assert.equal(deadline.source, "ADMIN_ENTERED");
  assert.throws(() => normalizeDeadline({ type: "Legal notice", dueAt: "tomorrowish", source: "SYSTEM_LEGAL_CALCULATION" }, { deadlineId: validMutationId }), /timestamp|unsupported value/);
  assert.equal(replaceDeadline([deadline], { deadlineId: deadline.deadlineId, type: deadline.type, dueAt: deadline.dueAt, source: deadline.source, owner: deadline.owner, status: "COMPLETE", notes: deadline.notes })[0].status, "COMPLETE");
});
test("Phase II-B review checkpoints are fixed, bounded, and human attributed", () => {
  const checkpoint = normalizeReviewCheckpoint({ type: "TECHNICAL_INVESTIGATION", status: "REVIEWED", reviewerIdentity: "Internal administrator" }, { recordedAt: "server-time", recordedBy: "server-actor" });
  assert.equal(upsertReviewCheckpoint([], checkpoint)[0].recordedBy, "server-actor");
  assert.equal(upsertReviewCheckpoint([checkpoint], { ...checkpoint, status: "PENDING" }).length, 1);
  assert.throws(() => normalizeReviewCheckpoint({ type: "AUTOMATED_LEGAL_REVIEW", status: "REVIEWED" }), /unsupported value/);
});

test("callable source enforces atomic incident and append-only audit creation", () => {
  const source = readFileSync(new URL("./index.js", import.meta.url), "utf8");
  const phase = source.slice(source.indexOf("async function mutateSecurityIncident"), source.indexOf("function requireRecentAccountAuth"));
  assert.match(phase, /db\.runTransaction/);
  assert.match(phase, /transaction\.set\(incidentRef[\s\S]*transaction\.create\(auditRef/);
  assert.doesNotMatch(phase, /transaction\.(?:update|delete)\(auditRef/);
  assert.match(phase, /FieldValue\.serverTimestamp\(\)/);
  assert.match(phase, /requireIncidentAdmin\(request\)/);
  assert.match(phase, /assertCurrentVersion/);
  assert.match(phase, /assertReplayMatches/);
  assert.match(phase, /requestFingerprint/);
  assert.ok(source.includes("db.doc(`betaAdmins/${request.auth.uid}`).get()"));
  assert.doesNotMatch(phase, /request\.data\.(?:uid|isAdmin|role|enabled|tier|email)/);
});
test("Phase II-A callable has no notification, containment execution, or external-service side effects", () => {
  const source = readFileSync(new URL("./index.js", import.meta.url), "utf8");
  const phase = source.slice(source.indexOf("async function mutateSecurityIncident"), source.indexOf("function requireRecentAccountAuth"));
  assert.doesNotMatch(phase, /sendBetaTesterUpdate|collection\(["']mail["']\)|new Stripe|fetch\s*\(|subscriptions\.|auth\(\)\.revoke|deleteSubscriberAccount/);
});
test("Phase II-B actions reuse atomic audit, version, and idempotency boundaries", () => {
  const source = readFileSync(new URL("./index.js", import.meta.url), "utf8");
  const phase = source.slice(source.indexOf("async function mutateSecurityIncident"), source.indexOf("function requireRecentAccountAuth"));
  for (const action of ["setTriage", "createTask", "updateTask", "addAffectedSystem", "updateAffectedSystem", "addDeadline", "updateDeadline", "recordReviewCheckpoint"]) assert.match(phase, new RegExp(action));
  assert.match(phase, /expectedVersion/);
  assert.match(phase, /mutationId/);
  assert.match(phase, /transaction\.create\(auditRef/);
  assert.doesNotMatch(phase, /collection\(["']mail["']\)|sendBetaTesterUpdate|new Stripe|fetch\s*\(|auth\(\)\.revoke/);
});
test("Phase II-B UI exposes operational sections without autonomous action controls", () => {
  const ui = readFileSync(new URL("../src/components/SecurityIncidentRegister.jsx", import.meta.url), "utf8");
  for (const label of ["Triage workspace", "Response task", "Affected system", "Human-entered deadline", "Human review checkpoint", "Evidence reference"]) assert.match(ui, new RegExp(label));
  for (const action of ["setTriage", "createTask", "updateTask", "addAffectedSystem", "updateAffectedSystem", "addDeadline", "updateDeadline", "recordReviewCheckpoint"]) assert.match(ui, new RegExp(action));
  assert.doesNotMatch(ui, /notify consumer|notify FTC|send notice|execute containment|revoke credentials/i);
  assert.doesNotMatch(ui, /dangerouslySetInnerHTML|\.innerHTML\s*=/);
});
test("Firestore rules explicitly deny all Phase II-A server collections", () => {
  const rules = readFileSync(new URL("../firestore.rules", import.meta.url), "utf8");
  for (const collection of ["securityIncidents", "securityIncidentAudit", "securityIncidentAdminUsage"]) {
    assert.match(rules, new RegExp(`match /${collection}/\\{[^}]+\\} \\{[\\s\\S]*?allow read, write: if false;`));
  }
});
