import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { validateMealDayQuantities, validateMealIngredientQuantity } from "./meal-quantity-validation.js";

describe("meal quantity validation", () => {
  it("parses familiar fractions and count units", () => {
    assert.equal(validateMealIngredientQuantity({ name: "rice", quantity: "3/4 cup" }).amount, 0.75);
    assert.equal(validateMealIngredientQuantity({ name: "eggs", quantity: "2 count" }).unit, "count");
    assert.equal(validateMealIngredientQuantity({ name: "black pepper", quantity: "1 pinch" }).unit, "pinch");
  });

  it("accepts mixed-fraction size-qualified whole produce", () => {
    const result = validateMealIngredientQuantity({ name: "Kiwi", quantity: "1 1/8 medium" });
    assert.equal(result.amount, 1.125);
    assert.equal(result.unit, "each");
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

  it("rejects cup-sized and excessive concentrated seasonings", () => {
    assert.throws(() => validateMealIngredientQuantity({ name: "Black Pepper", quantity: "1 cup" }), /seasoning quantity/);
    assert.throws(() => validateMealIngredientQuantity({ name: "Sea salt", quantity: "2 tsp" }), /seasoning quantity/);
    assert.doesNotThrow(() => validateMealIngredientQuantity({ name: "Black Pepper", quantity: "1 pinch" }));
    assert.doesNotThrow(() => validateMealIngredientQuantity({ name: "Dried oregano", quantity: "1/2 tsp" }));
  });
});
