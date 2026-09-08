import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { validateMealDayQuantities, validateMealIngredientQuantity } from "./meal-quantity-validation.js";

describe("meal quantity validation", () => {
  it("parses familiar fractions and count units", () => {
    assert.equal(validateMealIngredientQuantity({ name: "rice", quantity: "3/4 cup" }).amount, 0.75);
    assert.equal(validateMealIngredientQuantity({ name: "eggs", quantity: "2 count" }).unit, "count");
    assert.equal(validateMealIngredientQuantity({ name: "black pepper", quantity: "1 pinch" }).unit, "pinch");
    assert.deepEqual(
      validateMealIngredientQuantity({ name: "black pepper", quantity: "pinch." }),
      { raw: "pinch.", amount: 1, unit: "pinch", maximum: 6, status: "validated-inferred-count" },
    );
    assert.equal(validateMealIngredientQuantity({ name: "Cinnamon", quantity: "pinch" }).unit, "pinch");
    assert.throws(
      () => validateMealIngredientQuantity({ name: "Spinach", quantity: "pinch" }),
      /Unrecognized household quantity/,
    );
  });

  it("accepts mixed-fraction size-qualified whole produce", () => {
    const result = validateMealIngredientQuantity({ name: "Kiwi", quantity: "1 1/8 medium" });
    assert.equal(result.amount, 1.125);
    assert.equal(result.unit, "each");
  });

  it("infers bounded counts from quantity grammar without a food-name whitelist", () => {
    assert.equal(validateMealIngredientQuantity({ name: "Corn tortillas", quantity: "2." }).unit, "count");
    assert.deepEqual(
      validateMealIngredientQuantity({ name: "Brown rice cakes", quantity: "2." }),
      { raw: "2.", amount: 2, unit: "count", maximum: 8, status: "validated-inferred-count" },
    );
  assert.deepEqual(
    validateMealIngredientQuantity({ name: "Avocado", quantity: "1/4" }),
    { raw: "1/4", amount: 0.25, unit: "count", maximum: 8, status: "validated-inferred-count" },
  );
  assert.deepEqual(
    validateMealIngredientQuantity({ name: "Garlic", quantity: "1 clove" }),
    { raw: "1 clove", amount: 1, unit: "piece", maximum: 6, status: "validated-household-quantity" },
  );
    assert.equal(validateMealIngredientQuantity({ name: "Egg", quantity: "1" }).unit, "count");
    assert.equal(validateMealIngredientQuantity({ name: "Whole-wheat tortilla", quantity: "1" }).unit, "count");
    assert.equal(validateMealIngredientQuantity({ name: "Whole-wheat tortilla", quantity: "1 tortilla" }).unit, "count");
    assert.equal(validateMealIngredientQuantity({ name: "Whole-grain tortilla", quantity: "1 whole." }).unit, "count");
    assert.equal(validateMealIngredientQuantity({ name: "Whole-wheat pita", quantity: "1 whole." }).unit, "count");
    assert.equal(validateMealIngredientQuantity({ name: "Lemon", quantity: "1/2 whole." }).amount, 0.5);
    assert.equal(validateMealIngredientQuantity({ name: "Lemon", quantity: "1 wedge." }).unit, "piece");
    assert.equal(validateMealIngredientQuantity({ name: "Mint", quantity: "4 leaves." }).amount, 4);
    assert.equal(validateMealIngredientQuantity({ name: "Eggs", quantity: "2." }).unit, "count");
    assert.equal(validateMealIngredientQuantity({ name: "Mint leaves", quantity: "4." }).unit, "piece");
    assert.equal(validateMealIngredientQuantity({ name: "Whole pita", quantity: "1 whole" }).unit, "count");
    assert.equal(validateMealIngredientQuantity({ name: "Garlic", quantity: "1" }).unit, "piece");
    assert.equal(validateMealIngredientQuantity({ name: "Unfamiliar regional fruit", quantity: "1" }).unit, "count");
    assert.equal(validateMealIngredientQuantity({ name: "Rice cakes", quantity: "2" }).amount, 2);
    assert.equal(validateMealIngredientQuantity({ name: "Pita", quantity: "1" }).unit, "count");
    assert.equal(validateMealIngredientQuantity({ name: "Chicken breast", quantity: "1" }).unit, "count");
    assert.equal(validateMealIngredientQuantity({ name: "Crackers", quantity: "3" }).amount, 3);
  });

  it("accepts decimals but rejects ambiguous, unknown, and excessive quantities", () => {
    assert.throws(() => validateMealIngredientQuantity({ name: "nuts", quantity: "a handful" }), /Unrecognized|Ambiguous/);
    assert.equal(validateMealIngredientQuantity({ name: "rice", quantity: "1.5 cup" }).amount, 1.5);
    assert.throws(() => validateMealIngredientQuantity({ name: "chicken", quantity: "24 oz" }), /Excessive/);
  });

  it("rejects missing, zero, negative, and absurd inferred counts", () => {
    assert.throws(() => validateMealIngredientQuantity({ name: "Eggs", quantity: "" }), /Missing quantity/);
    assert.throws(() => validateMealIngredientQuantity({ name: "Eggs", quantity: "0" }), /Unrecognized household quantity/);
    assert.throws(() => validateMealIngredientQuantity({ name: "Eggs", quantity: "-2" }), /Ambiguous quantity/);
    assert.throws(() => validateMealIngredientQuantity({ name: "Eggs", quantity: "99" }), /Excessive quantity/);
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
    assert.doesNotThrow(() => validateMealIngredientQuantity({ name: "Diced tomatoes, no-salt-added", quantity: "1 cup" }));
    assert.doesNotThrow(() => validateMealIngredientQuantity({ name: "No salt added kidney beans", quantity: "3/4 cup" }));
  });
});
