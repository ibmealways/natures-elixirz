import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { assessNutritionSelection, assertNutritionSafety, createNutritionBrief } from "./nutrition-intelligence.js";

describe("nutrition intelligence engine", () => {
  it("creates a deterministic goal and safety brief without treating medication text", () => {
    const brief = createNutritionBrief({ medications: "Warfarin", allergies: "Peanut" }, ["muscles"]);
    assert.deepEqual(brief.targetPatterns, ["protein", "energy"]);
    assert.equal(brief.professionalReviewRequired, true);
    assert.match(brief.reviewReason, /pharmacist or prescriber/i);
    assert.deepEqual(brief.prohibitedIngredients, ["Peanut"]);
  });

  it("scores different ingredient patterns differently for the selected goal", () => {
    const proteinMeal = assessNutritionSelection({ goals: ["muscles"], ingredients: [{ name: "Salmon" }, { name: "Brown rice" }, { name: "Broccoli" }] });
    const fruitOnly = assessNutritionSelection({ goals: ["muscles"], ingredients: [{ name: "Blueberries" }, { name: "Strawberries" }] });
    assert.ok(proteinMeal.goalFitScore > fruitOnly.goalFitScore);
    assert.deepEqual(proteinMeal.missingPriorityPatterns, []);
  });

  it("blocks saved restrictions and duplicate ingredients", () => {
    const restricted = assessNutritionSelection({ profile: { allergies: "Peanut" }, ingredients: [{ name: "Peanut butter" }] });
    assert.throws(() => assertNutritionSafety(restricted), /saved restriction/i);
    const duplicate = assessNutritionSelection({ ingredients: [{ name: "Spinach" }, { name: "spinach" }] });
    assert.throws(() => assertNutritionSafety(duplicate), /duplicate ingredients in one dish: spinach/i);
  });

  it("flags unreasonable household portions", () => {
    const assessment = assessNutritionSelection({ ingredients: [{ name: "Turmeric", amount: 8, unit: "tbsp" }] });
    assert.throws(() => assertNutritionSafety(assessment), /unreasonable quantity/i);
  });

  it("attaches ingredient evidence without enabling reflux for an unrelated profile", () => {
    const assessment = assessNutritionSelection({ profile: { conditions: ["High blood pressure"] }, ingredients: [{ name: "Pineapple" }] });
    assert.equal(assessment.evidence.matchedIngredients[0].canonicalName, "pineapple");
    assert.equal(assessment.evidence.refluxScreeningEnabled, false);
    assert.deepEqual(assessment.evidence.refluxConsiderations, []);
  });
});
