import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { calculateVerifiedNutrients, foodIdentityFor, normalizeIngredientMass, parseHouseholdQuantity } from "./food-identity.js";

describe("USDA food identity registry", () => {
  it("matches a verified generic food without implying a branded match", () => {
    const identity = foodIdentityFor("blueberries");
    assert.equal(identity.fdcId, 2346411);
    assert.equal(identity.description, "Blueberries, raw");
    assert.equal(identity.matchStatus, "verified-generic");
  });

  it("normalizes a preparation-specific household measure to grams", () => {
    const serving = normalizeIngredientMass({ amount: 0.5, unit: "cup" }, foodIdentityFor("spinach"));
    assert.deepEqual(serving, { grams: 15, status: "verified-household-measure", basis: "whole leaves; 30 g/cup", fdcId: 168462 });
  });

  it("refuses false precision for an unresolved scoop", () => {
    const serving = normalizeIngredientMass({ amount: 1.5, unit: "scoop" }, foodIdentityFor("hemp protein"));
    assert.equal(serving.grams, null);
    assert.equal(serving.status, "unresolved");
  });

  it("parses meal-plan fraction strings and uses preparation-specific weights", () => {
    assert.deepEqual(parseHouseholdQuantity({ quantity: "1/2 cup cooked" }), { amount: 0.5, unit: "cup" });
    assert.deepEqual(parseHouseholdQuantity({ quantity: "1 pinch" }), { amount: 1, unit: "pinch" });
    assert.deepEqual(parseHouseholdQuantity({ quantity: "1 1/8 medium" }), { amount: 1.125, unit: "each" });
    assert.deepEqual(parseHouseholdQuantity({ quantity: "1 small" }), { amount: 1, unit: "each" });
    assert.deepEqual(parseHouseholdQuantity({ quantity: "1 large" }), { amount: 1, unit: "each" });
    const serving = normalizeIngredientMass({ quantity: "1/2 cup cooked" }, foodIdentityFor("cooked quinoa"));
    assert.equal(serving.grams, 92.5);
    assert.equal(serving.fdcId, 168917);
  });

  it("calculates a transparent USDA subtotal from normalized ingredients", () => {
    const identity = foodIdentityFor("rolled oats");
    const estimate = calculateVerifiedNutrients([{ foodIdentity: identity, normalizedServing: normalizeIngredientMass({ amount: 1, unit: "cup" }, identity) }]);
    assert.equal(estimate.calculatedIngredientCount, 1);
    assert.equal(estimate.coveragePercent, 100);
    assert.equal(estimate.totals.energyKcal, 307);
    assert.equal(estimate.status, "complete-verified-estimate");
  });
});
