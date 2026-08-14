import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { validateMealDayQuantities, validateMealIngredientQuantity } from "./meal-quantity-validation.js";

describe("meal quantity validation", () => {
  it("parses familiar fractions and count units", () => {
    assert.equal(validateMealIngredientQuantity({ name: "rice", quantity: "3/4 cup" }).amount, 0.75);
    assert.equal(validateMealIngredientQuantity({ name: "eggs", quantity: "2 count" }).unit, "count");
  });

  it("rejects ambiguous, decimal, unknown, and excessive quantities", () => {
    assert.throws(() => validateMealIngredientQuantity({ name: "nuts", quantity: "a handful" }), /Unrecognized|Ambiguous/);
    assert.throws(() => validateMealIngredientQuantity({ name: "rice", quantity: "1.5 cup" }), /Decimal/);
    assert.throws(() => validateMealIngredientQuantity({ name: "chicken", quantity: "24 oz" }), /Excessive/);
  });

  it("rejects excessive aggregate ounce exposure", () => {
    const meals = Array.from({ length: 5 }, (_, index) => ({ ingredients: [{ name: `food ${index}`, quantity: "10 oz" }] }));
    assert.throws(() => validateMealDayQuantities(meals), /across the day/);
  });
});
