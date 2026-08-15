import { describe, expect, it } from "vitest";
import { assessClientNutritionRisk } from "./nutritionRiskScreen";

describe("client nutrition risk fail-safe", () => {
  it("blocks generation for clinician-target conditions", () => {
    const result = assessClientNutritionRisk({ conditions: ["Kidney disease"] });
    expect(result.generationLimited).toBe(true);
    expect(result.message).toMatch(/clinician-established/i);
  });

  it("shows review flags without blocking lower-risk generation", () => {
    const result = assessClientNutritionRisk({ conditions: ["Pregnancy"], allergies: "peanut" });
    expect(result.generationLimited).toBe(false);
    expect(result.flags.map((flag) => flag.id)).toEqual(expect.arrayContaining(["pregnancy", "allergy"]));
  });

  it("blocks plans for subscribers under 18", () => {
    expect(assessClientNutritionRisk({ age: 16 }).generationLimited).toBe(true);
  });
});
