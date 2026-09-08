export const INCIDENT_RECORD_TYPES = Object.freeze({
  timeline: "TIMELINE_EVENT",
  evidence: "EVIDENCE_REFERENCE",
  finding: "TECHNICAL_FINDING",
});

export function buildIncidentRecordEntry({ kind, sourceReference, description, storageReference }) {
  if (kind === "timeline") return { action: "addTimeline", payload: { event: { eventType: INCIDENT_RECORD_TYPES.timeline, description, sourceReference } } };
  if (kind === "evidence") return { action: "addEvidence", payload: { item: { evidenceType: INCIDENT_RECORD_TYPES.evidence, sourceSystem: sourceReference, description, storageReference: storageReference || null, containsSensitiveData: false } } };
  if (kind === "finding") return { action: "addTechnicalFinding", payload: { finding: { findingType: INCIDENT_RECORD_TYPES.finding, summary: description, sourceReference } } };
  throw new Error("Unsupported record kind.");
}

export function getVisibleIncidentRecordSections(incident) {
  const timeline = (incident?.timeline || []).filter((item) => item?.eventType === INCIDENT_RECORD_TYPES.timeline).map((item) => ({
    type: "Timeline event",
    source: item.sourceReference,
    description: item.description,
  }));
  const evidence = (incident?.evidenceReferences || []).filter((item) => item?.evidenceType === INCIDENT_RECORD_TYPES.evidence).map((item) => ({
    type: "Evidence reference",
    source: item.sourceSystem,
    description: item.description,
    storageReference: item.storageReference,
  }));
  const findings = (incident?.technicalFindings || []).filter((item) => item?.findingType === INCIDENT_RECORD_TYPES.finding).map((item) => ({
    type: "Technical finding",
    source: item.sourceReference,
    description: item.summary,
  }));
  return [
    { key: "timeline", label: "Timeline events", items: timeline },
    { key: "evidence", label: "Evidence references", items: evidence },
    { key: "findings", label: "Technical findings", items: findings },
  ];
}