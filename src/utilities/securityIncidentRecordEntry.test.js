import { describe, expect, it } from "vitest";
import { buildIncidentRecordEntry, getVisibleIncidentRecordSections, INCIDENT_RECORD_TYPES } from "./securityIncidentRecordEntry";

describe("security incident record-entry mapping", () => {
  it("maps each browser record category to its canonical machine type", () => {
    expect(buildIncidentRecordEntry({ kind: "timeline", sourceReference: "Beta Admin", description: "Synthetic record." })).toEqual({ action: "addTimeline", payload: { event: { eventType: INCIDENT_RECORD_TYPES.timeline, description: "Synthetic record.", sourceReference: "Beta Admin" } } });
    expect(buildIncidentRecordEntry({ kind: "evidence", sourceReference: "Beta Admin", description: "Synthetic reference.", storageReference: "local/test" }).payload.item.evidenceType).toBe(INCIDENT_RECORD_TYPES.evidence);
    expect(buildIncidentRecordEntry({ kind: "finding", sourceReference: "Beta Admin", description: "Synthetic finding." }).payload.finding.findingType).toBe(INCIDENT_RECORD_TYPES.finding);
  });

  it("renders only the three canonical stored record categories", () => {
    const sections = getVisibleIncidentRecordSections({
      timeline: [{ eventType: "TIMELINE_EVENT", sourceReference: "Beta Admin", description: "Synthetic timeline." }, { eventType: "UNSUPPORTED_EVENT", sourceReference: "Ignore", description: "Ignore" }],
      evidenceReferences: [{ evidenceType: "EVIDENCE_REFERENCE", sourceSystem: "Local emulator", description: "Synthetic evidence.", storageReference: "local/reference" }, { evidenceType: "UNSUPPORTED_EVIDENCE", sourceSystem: "Ignore", description: "Ignore" }],
      technicalFindings: [{ findingType: "TECHNICAL_FINDING", sourceReference: "Local test", summary: "Synthetic finding." }, { findingType: "UNSUPPORTED_FINDING", sourceReference: "Ignore", summary: "Ignore" }],
    });
    expect(sections).toEqual([
      { key: "timeline", label: "Timeline events", items: [{ type: "Timeline event", source: "Beta Admin", description: "Synthetic timeline." }] },
      { key: "evidence", label: "Evidence references", items: [{ type: "Evidence reference", source: "Local emulator", description: "Synthetic evidence.", storageReference: "local/reference" }] },
      { key: "findings", label: "Technical findings", items: [{ type: "Technical finding", source: "Local test", description: "Synthetic finding." }] },
    ]);
  });
});