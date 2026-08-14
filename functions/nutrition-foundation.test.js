import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { assessHighRiskNutritionProfile, calculatePersonalizedNutritionTargets, summarizeMultiDayNutrition } from "./nutrition-foundation.js";

describe("nutrition foundation", () => {
  it("calculates transparent adult wellness targets from complete profile inputs", () => {
    const targets = calculatePersonalizedNutritionTargets({ age: 40, weight: 180, height: 70, sex: "male", activity: "moderate" });
    assert.equal(targets.status, "general-wellness-estimate");
    assert.ok(targets.energyKcal > 2000);
    assert.ok(targets.proteinG.minimum > 60);
    assert.deepEqual(targets.macroDistributionPercent.carbohydrate, [45, 65]);
  });

  it("requires clinician targets for kidney disease and minors", () => {
    assert.equal(assessHighRiskNutritionProfile({ conditions: ["Kidney disease"] }).generationLimited, true);
    assert.equal(assessHighRiskNutritionProfile({ age: 16 }).generationLimited, true);
    assert.equal(calculatePersonalizedNutritionTargets({ age: 16, weight: 130, height: 65, sex: "female" }).energyKcal, null);
  });

  it("does not call missing nutrient values zero coverage", () => {
    const plan = [{ day: 1, meals: [{ nutritionIntelligence: { evidence: { verifiedNutrientEstimate: { totals: { energyKcal: 300 }, totalIngredientCount: 2, nutrientCoverage: { energyKcal: { measuredIngredientCount: 1 } } } } } }] }];
    const summary = summarizeMultiDayNutrition(plan, { age: 40, weight: 180, height: 70, sex: "male" });
    assert.equal(summary.days[0].totals.energyKcal, 300);
    assert.equal(summary.days[0].nutrientCoveragePercent.energyKcal, 50);
    assert.equal(summary.days[0].nutrientCoveragePercent.calciumMg, 0);
    assert.equal(summary.multiDayAdequacyStatus, "insufficient-coverage");
  });
});
