import { describe, expect, it } from "vitest";
import { hasCloudProfileRecord, hasMeaningfulProfile } from "./cloudSync";

describe("cloud profile compatibility", () => {
  it("recognizes legacy profiles that predate completedAt", () => {
    expect(hasMeaningfulProfile({ name: "Heather", healthGoals: ["energy"] })).toBe(true);
  });

  it("recognizes protected lifestyle profile data", () => {
    expect(hasMeaningfulProfile({ alcohol: { types: ["wine"], frequency: "monthly" } })).toBe(true);
  });

  it("does not treat default-only profile values as subscriber data", () => {
    expect(hasMeaningfulProfile({ dietaryPattern: "omnivore", activity: "moderate" })).toBe(false);
  });

  it("treats a profile-clearing marker as cross-device synchronization state", () => {
    expect(hasMeaningfulProfile({ clearedAt: "2026-08-04T12:00:00.000Z" })).toBe(false);
    expect(hasCloudProfileRecord({ clearedAt: "2026-08-04T12:00:00.000Z" })).toBe(true);
  });
});
