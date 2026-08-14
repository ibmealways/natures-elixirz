import { describe, expect, it } from "vitest";
import { buildClinicianFhirBundle, buildClinicianSummary } from "./clinicianExport";

const archive = {
  exportedAt: "2026-08-14T12:00:00.000Z",
  account: { uid: "subscriber-123", email: "private@example.com" },
  wellness: { profile: { name: "Test Subscriber", height: 68, weight: 170, conditions: ["Hypertension"], medications: "Example medication", allergies: "Peanuts", healthGoals: ["heart"] }, journey: { smoothie: { count: 2 } }, exchange: { feedback: { smoothie: [{ sentiment: "positive" }] } } },
  recipes: [{ name: "Berry smoothie" }],
  accessAndOperations: { subscriptionLedger: [{ secret: "private-operation-value" }] },
};

describe("clinician handoff export", () => {
  it("creates an FHIR R4 collection with explicitly unconfirmed subscriber-entered facts", () => {
    const bundle = buildClinicianFhirBundle(archive);
    expect(bundle.resourceType).toBe("Bundle");
    expect(bundle.type).toBe("collection");
    expect(bundle.entry.some(({ resource }) => resource.resourceType === "Patient")).toBe(true);
    expect(bundle.entry.find(({ resource }) => resource.resourceType === "Condition").resource.verificationStatus.coding[0].code).toBe("unconfirmed");
    expect(JSON.stringify(bundle)).not.toContain("subscriptionLedger");
  });

  it("creates a readable clinical summary and excludes operations and private chat", () => {
    const summary = buildClinicianSummary(archive);
    expect(summary).toContain("Patient-generated wellness information");
    expect(summary).toContain("Berry smoothie");
    expect(summary).not.toContain("private@example.com");
    expect(summary).not.toContain("private-operation-value");
  });
});
