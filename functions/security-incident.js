import { createHash } from "node:crypto";

export const INCIDENT_STATUSES = Object.freeze(["REPORTED", "TRIAGE", "CONTAINMENT", "INVESTIGATION", "EVIDENCE_PRESERVATION", "TECHNICAL_ASSESSMENT", "COUNSEL_REVIEW", "NOTIFICATION_DECISION", "REMEDIATION", "CLOSED"]);
export const INCIDENT_SEVERITIES = Object.freeze(["SEV0", "SEV1", "SEV2", "SEV3"]);
export const LEGAL_REVIEW_STATUSES = Object.freeze(["PENDING_COUNSEL", "COUNSEL_REVIEWED"]);
export const NOTIFICATION_DECISION_STATUSES = Object.freeze(["PENDING_COUNSEL", "NOTIFICATION_REQUIRED", "NOTIFICATION_NOT_REQUIRED"]);
export const CONTAINMENT_CHECKLIST = Object.freeze(["revoke-compromised-credentials", "disable-affected-integration", "disable-affected-administrative-access", "isolate-affected-function", "review-firestore-rule-exposure", "review-storage-exposure", "review-openai-transmission", "review-household-authorization", "review-astra-authorization", "review-exported-downloaded-information", "preserve-logs-before-configuration-changes", "contact-vendor-security-team", "escalate-to-counsel"]);
export const INCIDENT_ACTIONS = Object.freeze(["create", "list", "get", "update", "transition", "addTimeline", "addContainment", "addEvidence", "addTechnicalFinding", "setAffectedAssessment", "setHbnrAssessment", "requestCounselReview", "recordCounselDecision", "recordNotificationDecision", "setPostIncidentReview", "close"]);
export const INCIDENT_LIMITS = Object.freeze({ incidentsPerAdminPerDay: 100, timeline: 100, containment: CONTAINMENT_CHECKLIST.length, evidence: 50, findings: 50, auditsReturned: 500 });
export const INCIDENT_TRANSITIONS = Object.freeze({
  REPORTED: ["TRIAGE"], TRIAGE: ["CONTAINMENT", "INVESTIGATION"], CONTAINMENT: ["INVESTIGATION", "EVIDENCE_PRESERVATION"],
  INVESTIGATION: ["EVIDENCE_PRESERVATION", "TECHNICAL_ASSESSMENT"], EVIDENCE_PRESERVATION: ["TECHNICAL_ASSESSMENT"],
  TECHNICAL_ASSESSMENT: ["COUNSEL_REVIEW"], COUNSEL_REVIEW: ["NOTIFICATION_DECISION"],
  NOTIFICATION_DECISION: ["REMEDIATION", "CLOSED"], REMEDIATION: ["CLOSED"], CLOSED: [],
});
export const HBNR_DISCLAIMER = "THIS TOOL DOES NOT DETERMINE WHETHER AN EVENT IS A LEGALLY REPORTABLE BREACH. FINAL DETERMINATION REQUIRES AUTHORIZED HUMAN AND, WHERE APPROPRIATE, LEGAL COUNSEL REVIEW.";

const own = (value) => Object.prototype.toString.call(value) === "[object Object]" && Object.getPrototypeOf(value) === Object.prototype;
function object(value, name, allowed) {
  if (!own(value)) throw new Error(`${name} must be a plain object.`);
  const unknown = Object.keys(value).filter((key) => !allowed.includes(key));
  if (unknown.length) throw new Error(`${name} contains unsupported fields.`);
  return value;
}
export function assertAllowedFields(value, allowed, name = "Request") { return object(value, name, allowed); }
function string(value, name, maximum, { required = false, pattern = null } = {}) {
  if (value == null || value === "") { if (required) throw new Error(`${name} is required.`); return null; }
  if (typeof value !== "string") throw new Error(`${name} must be text.`);
  const result = value.replace(/\s+/g, " ").trim();
  if ((required && !result) || result.length > maximum || (pattern && !pattern.test(result))) throw new Error(`${name} is invalid or exceeds ${maximum} characters.`);
  return result || null;
}
function strings(value, name, maximumItems = 30, maximumLength = 120) {
  if (value == null) return [];
  if (!Array.isArray(value) || value.length > maximumItems) throw new Error(`${name} must be an array of at most ${maximumItems} values.`);
  return [...new Set(value.map((item) => string(item, name, maximumLength, { required: true })))];
}
function integer(value, name, { required = false, maximum = 10_000_000 } = {}) {
  if (value == null && !required) return 0;
  if (!Number.isSafeInteger(value) || value < 0 || value > maximum) throw new Error(`${name} must be a non-negative integer.`);
  return value;
}
const boolean = (value, name) => { if (typeof value !== "boolean") throw new Error(`${name} must be boolean.`); return value; };
const choice = (value, name, choices) => { if (!choices.includes(value)) throw new Error(`${name} has an unsupported value.`); return value; };
const dateText = (value, name) => { const result = string(value, name, 40); if (result && !Number.isFinite(Date.parse(result))) throw new Error(`${name} must be an ISO date.`); return result; };

export function assertAuthorizedIncidentAdmin(auth, record) {
  if (!auth?.uid || typeof auth.uid !== "string") throw new Error("UNAUTHENTICATED");
  if (!own(record) || record.enabled !== true) throw new Error("FORBIDDEN");
  return auth.uid;
}
export const isAuthorizedIncidentAdministrator = (record) => own(record) && record.enabled === true;
export function assertIncidentAction(action) { return choice(action, "Action", INCIDENT_ACTIONS); }
export function assertIncidentId(value) { return string(value, "Incident ID", 64, { required: true, pattern: /^[A-Za-z0-9_-]{16,64}$/ }); }
export function assertMutationId(value) { return string(value, "Mutation ID", 128, { required: true, pattern: /^[A-Za-z0-9_-]{16,128}$/ }); }
export function assertExpectedVersion(value) { return integer(value, "Expected version", { required: true, maximum: Number.MAX_SAFE_INTEGER }); }
export function assertCurrentVersion(currentVersion, expectedVersion) {
  const expected = assertExpectedVersion(expectedVersion);
  if (!Number.isSafeInteger(currentVersion) || currentVersion !== expected) throw new Error("Incident version is stale.");
  return expected;
}
function canonicalValue(value) {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (own(value)) return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalValue(value[key])]));
  throw new Error("Mutation request contains an unsupported value.");
}
export function mutationFingerprint(value) {
  const serialized = JSON.stringify(canonicalValue(value));
  if (serialized.length > 100_000) throw new Error("Mutation request exceeds the supported size.");
  return createHash("sha256").update(serialized).digest("hex");
}
export function assertReplayMatches(audit, { incidentId, actorUid, action, mutationId, requestFingerprint }) {
  if (!own(audit) || audit.incidentId !== incidentId || audit.actorUid !== actorUid || audit.action !== action || audit.mutationId !== mutationId || audit.requestFingerprint !== requestFingerprint) throw new Error("Mutation identifier is already associated with another operation.");
  return true;
}
export function incidentIdForMutation(actorUid, mutationId) { return `inc_${createHash("sha256").update(`${actorUid}:${assertMutationId(mutationId)}`).digest("hex").slice(0, 32)}`; }
export function auditIdForMutation(incidentId, mutationId) { return `aud_${createHash("sha256").update(`${assertIncidentId(incidentId)}:${assertMutationId(mutationId)}`).digest("hex")}`; }
export function normalizeReason(value) { return string(value, "Audit reason", 1000); }
export function assertTransition(from, to) {
  if (!INCIDENT_STATUSES.includes(from) || !INCIDENT_STATUSES.includes(to) || !INCIDENT_TRANSITIONS[from].includes(to)) throw new Error(`Transition from ${from} to ${to} is not allowed.`);
  return to;
}
export function assertIncidentMutable(incident) { if (incident?.status === "CLOSED") throw new Error("Closed incidents are immutable."); }
export function boundedAppend(values, item, limit, name) { const current = Array.isArray(values) ? values : []; if (current.length >= limit) throw new Error(`${name} limit reached.`); return [...current, item]; }

export function defaultAffectedUserAssessment() { return { potentiallyAffectedCount: 0, confirmedAffectedCount: 0, affectedDataCategories: [], affectedSystems: [], exposureStart: null, exposureEnd: null, accessMechanism: null, exportPossible: false, downloadPossible: false, vendorDisclosurePossible: false, householdPropagationPossible: false, affectedJurisdictions: [], identificationConfidence: "UNKNOWN", assessmentNotes: null }; }
export function defaultHbnrAssessment() { return { healthWellnessInformationInvolved: "UNKNOWN", potentiallyIdentifiable: "UNKNOWN", accessOrDisclosureAuthorized: "UNKNOWN", acquisitionTechnicallyPossible: "UNKNOWN", encryptedOrProtected: "UNKNOWN", systems: [], vendors: [], potentiallyAffectedCount: 0, jurisdictions: [], discoveredAt: null, evidencePreserved: "UNKNOWN", disclaimer: HBNR_DISCLAIMER }; }
export function defaultCounselState() { return { counselReviewRequired: false, counselReviewRequestedAt: null, counselReviewStatus: "NOT_REVIEWED", counselDecisionRecordedAt: null, counselDecisionRecordedBy: null, counselNotesReference: null }; }
export function defaultNotificationDecision() { return { notificationDecisionStatus: "NOT_EVALUATED", notificationChannelsConsidered: [], consumerNoticeRequired: null, ftcNoticeRequired: null, mediaNoticeRequired: null, stateNoticeReviewRequired: null, decisionRecordedAt: null, decisionRecordedBy: null, decisionBasisReference: null }; }
export function defaultPostIncidentReview() { return { rootCauseCategory: null, rootCauseSummary: null, correctiveActions: [], preventiveActions: [], policyReviewRequired: false, vendorReviewRequired: false, securityReviewRequired: false, trainingReviewRequired: false, followUpOwner: null, followUpDueDate: null, postIncidentReviewCompletedAt: null }; }

export function normalizeIncidentCreate(value) {
  const input = object(value, "Incident", ["title", "summary", "severity", "incidentType", "discoveredAt", "assignedOwnerUid", "affectedSystems", "potentialDataCategories", "potentiallyAffectedAccountCount", "externalVendorsPotentiallyInvolved"]);
  const severity = input.severity == null ? "SEV0" : choice(input.severity, "Severity", INCIDENT_SEVERITIES);
  return { status: "REPORTED", severity, incidentType: string(input.incidentType || "suspected-privacy-security-event", "Incident type", 100, { required: true }), title: string(input.title, "Title", 160, { required: true }), summary: string(input.summary, "Summary", 2000, { required: true }), discoveredAt: dateText(input.discoveredAt, "Discovered at"), assignedOwnerUid: string(input.assignedOwnerUid, "Owner UID", 128), affectedSystems: strings(input.affectedSystems, "Affected systems"), potentialDataCategories: strings(input.potentialDataCategories, "Potential data categories"), potentiallyAffectedAccountCount: integer(input.potentiallyAffectedAccountCount, "Potentially affected count"), knownAffectedAccountCount: 0, containmentStatus: "NOT_STARTED", containmentActions: [], evidencePreservationStatus: "NOT_STARTED", evidenceReferences: [], timeline: [], technicalFindings: [], externalVendorsPotentiallyInvolved: strings(input.externalVendorsPotentiallyInvolved, "Potential vendors"), legalReviewStatus: "NOT_REVIEWED", counselReviewRequired: false, notificationDecisionStatus: "NOT_EVALUATED", notificationDecisionReason: null, closureSummary: null, closedAt: null, postIncidentReviewRequired: true, affectedUserAssessment: defaultAffectedUserAssessment(), hbnrAssessment: defaultHbnrAssessment(), counsel: defaultCounselState(), notificationDecision: defaultNotificationDecision(), postIncidentReview: defaultPostIncidentReview() };
}
export function normalizeIncidentUpdate(value) {
  const input = object(value, "Incident update", ["title", "summary", "severity", "incidentType", "assignedOwnerUid", "affectedSystems", "potentialDataCategories", "externalVendorsPotentiallyInvolved"]);
  const next = {};
  for (const [key, max] of [["title",160],["summary",2000],["incidentType",100],["assignedOwnerUid",128]]) if (key in input) next[key] = string(input[key], key, max, { required: key !== "assignedOwnerUid" });
  if ("severity" in input) next.severity = choice(input.severity, "Severity", INCIDENT_SEVERITIES);
  for (const key of ["affectedSystems", "potentialDataCategories", "externalVendorsPotentiallyInvolved"]) if (key in input) next[key] = strings(input[key], key);
  if (!Object.keys(next).length) throw new Error("No supported incident fields were provided.");
  return next;
}
export function normalizeTimelineEvent(value, authority = {}) {
  const input = object(value, "Timeline event", ["eventType", "description", "sourceReference"]);
  return { eventType: string(input.eventType, "Event type", 80, { required: true, pattern: /^[A-Z0-9_:-]+$/ }), description: string(input.description, "Description", 1000, { required: true }), sourceReference: string(input.sourceReference, "Source reference", 500), actorUid: authority.actorUid, timestamp: authority.timestamp };
}
export function normalizeContainmentAction(value, authority = {}) {
  const input = object(value, "Containment item", ["checklistId", "status", "notes"]);
  return { checklistId: choice(input.checklistId, "Checklist item", CONTAINMENT_CHECKLIST), status: choice(input.status || "PENDING", "Checklist status", ["PENDING", "IN_PROGRESS", "COMPLETE", "NOT_APPLICABLE"]), notes: string(input.notes, "Containment notes", 1000), recordedAt: authority.recordedAt, recordedByUid: authority.recordedByUid };
}
export function normalizeEvidenceReference(value, authority = {}) {
  const input = object(value, "Evidence reference", ["evidenceType", "sourceSystem", "description", "dateRange", "storageReference", "integrityNotes", "containsSensitiveData", "accessRestrictions", "retentionReviewRequired"]);
  return { evidenceId: authority.evidenceId, evidenceType: string(input.evidenceType, "Evidence type", 100, { required: true }), sourceSystem: string(input.sourceSystem, "Source system", 120, { required: true }), description: string(input.description, "Evidence description", 1000, { required: true }), dateRange: string(input.dateRange, "Date range", 200), preservedAt: authority.preservedAt, preservedByUid: authority.preservedByUid, storageReference: string(input.storageReference, "Storage reference", 500), integrityNotes: string(input.integrityNotes, "Integrity notes", 1000), containsSensitiveData: input.containsSensitiveData == null ? false : boolean(input.containsSensitiveData, "Sensitive-data flag"), accessRestrictions: string(input.accessRestrictions, "Access restrictions", 500), retentionReviewRequired: input.retentionReviewRequired == null ? true : boolean(input.retentionReviewRequired, "Retention-review flag") };
}
export function normalizeTechnicalFinding(value, authority = {}) {
  const input = object(value, "Technical finding", ["findingType", "summary", "sourceReference"]);
  return { findingType: string(input.findingType, "Finding type", 100, { required: true }), summary: string(input.summary, "Finding summary", 1500, { required: true }), sourceReference: string(input.sourceReference, "Source reference", 500), recordedAt: authority.recordedAt, recordedByUid: authority.recordedByUid };
}
export function normalizeAffectedUserAssessment(value) {
  const input = object(value, "Affected-user assessment", ["potentiallyAffectedCount", "confirmedAffectedCount", "affectedDataCategories", "affectedSystems", "exposureStart", "exposureEnd", "accessMechanism", "exportPossible", "downloadPossible", "vendorDisclosurePossible", "householdPropagationPossible", "affectedJurisdictions", "identificationConfidence", "assessmentNotes"]);
  return { potentiallyAffectedCount: integer(input.potentiallyAffectedCount, "Potentially affected count"), confirmedAffectedCount: integer(input.confirmedAffectedCount, "Confirmed affected count"), affectedDataCategories: strings(input.affectedDataCategories, "Affected data categories"), affectedSystems: strings(input.affectedSystems, "Affected systems"), exposureStart: dateText(input.exposureStart, "Exposure start"), exposureEnd: dateText(input.exposureEnd, "Exposure end"), accessMechanism: string(input.accessMechanism, "Access mechanism", 500), exportPossible: input.exportPossible == null ? false : boolean(input.exportPossible, "Export possible"), downloadPossible: input.downloadPossible == null ? false : boolean(input.downloadPossible, "Download possible"), vendorDisclosurePossible: input.vendorDisclosurePossible == null ? false : boolean(input.vendorDisclosurePossible, "Vendor disclosure possible"), householdPropagationPossible: input.householdPropagationPossible == null ? false : boolean(input.householdPropagationPossible, "Household propagation possible"), affectedJurisdictions: strings(input.affectedJurisdictions, "Affected jurisdictions"), identificationConfidence: choice(input.identificationConfidence || "UNKNOWN", "Identification confidence", ["UNKNOWN","LOW","MEDIUM","HIGH"]), assessmentNotes: string(input.assessmentNotes, "Assessment notes", 2000) };
}
export function normalizeHbnrAssessment(value) {
  const input = object(value, "HBNR worksheet", ["healthWellnessInformationInvolved", "potentiallyIdentifiable", "accessOrDisclosureAuthorized", "acquisitionTechnicallyPossible", "encryptedOrProtected", "systems", "vendors", "potentiallyAffectedCount", "jurisdictions", "discoveredAt", "evidencePreserved"]);
  const tri = (key) => choice(input[key] || "UNKNOWN", key, ["YES","NO","UNKNOWN"]);
  return { healthWellnessInformationInvolved: tri("healthWellnessInformationInvolved"), potentiallyIdentifiable: tri("potentiallyIdentifiable"), accessOrDisclosureAuthorized: tri("accessOrDisclosureAuthorized"), acquisitionTechnicallyPossible: tri("acquisitionTechnicallyPossible"), encryptedOrProtected: tri("encryptedOrProtected"), systems: strings(input.systems, "Systems"), vendors: strings(input.vendors, "Vendors"), potentiallyAffectedCount: integer(input.potentiallyAffectedCount, "Potentially affected count"), jurisdictions: strings(input.jurisdictions, "Jurisdictions"), discoveredAt: dateText(input.discoveredAt, "Discovered at"), evidencePreserved: tri("evidencePreserved"), disclaimer: HBNR_DISCLAIMER };
}
export function normalizeCounselDecision(value, authority = {}) {
  const input = object(value, "Counsel decision", ["status", "notesReference"]);
  return { counselReviewStatus: choice(input.status, "Counsel status", LEGAL_REVIEW_STATUSES), counselDecisionRecordedAt: authority.recordedAt, counselDecisionRecordedBy: authority.recordedBy, counselNotesReference: string(input.notesReference, "Counsel notes reference", 500) };
}
export function normalizeNotificationDecision(value, authority = {}) {
  const input = object(value, "Notification decision", ["notificationDecisionStatus", "notificationChannelsConsidered", "consumerNoticeRequired", "ftcNoticeRequired", "mediaNoticeRequired", "stateNoticeReviewRequired", "decisionBasisReference"]);
  const status = choice(input.notificationDecisionStatus, "Notification decision status", NOTIFICATION_DECISION_STATUSES);
  const basis = string(input.decisionBasisReference, "Decision basis reference", 500, { required: status !== "PENDING_COUNSEL" });
  const nullableBool = (key) => input[key] == null ? null : boolean(input[key], key);
  return { notificationDecisionStatus: status, notificationChannelsConsidered: strings(input.notificationChannelsConsidered, "Notification channels", 10), consumerNoticeRequired: nullableBool("consumerNoticeRequired"), ftcNoticeRequired: nullableBool("ftcNoticeRequired"), mediaNoticeRequired: nullableBool("mediaNoticeRequired"), stateNoticeReviewRequired: nullableBool("stateNoticeReviewRequired"), decisionRecordedAt: authority.recordedAt, decisionRecordedBy: authority.recordedBy, decisionBasisReference: basis };
}
export function normalizePostIncidentReview(value, authority = {}) {
  const input = object(value, "Post-incident review", ["rootCauseCategory", "rootCauseSummary", "correctiveActions", "preventiveActions", "policyReviewRequired", "vendorReviewRequired", "securityReviewRequired", "trainingReviewRequired", "followUpOwner", "followUpDueDate", "completed"]);
  const flag = (key) => input[key] == null ? false : boolean(input[key], key);
  return { rootCauseCategory: string(input.rootCauseCategory, "Root-cause category", 120), rootCauseSummary: string(input.rootCauseSummary, "Root-cause summary", 1500), correctiveActions: strings(input.correctiveActions, "Corrective actions", 20, 250), preventiveActions: strings(input.preventiveActions, "Preventive actions", 20, 250), policyReviewRequired: flag("policyReviewRequired"), vendorReviewRequired: flag("vendorReviewRequired"), securityReviewRequired: flag("securityReviewRequired"), trainingReviewRequired: flag("trainingReviewRequired"), followUpOwner: string(input.followUpOwner, "Follow-up owner", 128), followUpDueDate: dateText(input.followUpDueDate, "Follow-up due date"), postIncidentReviewCompletedAt: input.completed === true ? authority.completedAt : null };
}
export function changedFieldCategories(previous = {}, next = {}) { return Object.keys(next).filter((key) => JSON.stringify(previous[key]) !== JSON.stringify(next[key])).sort(); }
export function assertClosable(incident, closureSummary) {
  assertIncidentMutable(incident);
  if (!["NOTIFICATION_DECISION", "REMEDIATION"].includes(incident?.status)) throw new Error("Incident must reach notification decision or remediation before closure.");
  return string(closureSummary, "Closure summary", 2000, { required: true });
}
