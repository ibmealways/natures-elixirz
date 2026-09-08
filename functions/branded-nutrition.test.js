import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { calculateBrandedNutrients, findNutritionLabel, validateNutritionLabel } from "./branded-nutrition.js";

const label = {
  brand: "Example Nutrition",
  productName: "Hemp Complete",
  ingredientName: "Hemp protein",
  aliases: ["Hemp Complete powder"],
  servingAmount: 1,
  servingUnit: "scoop",
  servingGrams: 30,
  nutrients: { energyKcal: 120, proteinG: 20, fatG: 3, carbohydrateG: 5, fiberG: 2, sodiumMg: 180, potassiumMg: 90 },
};

describe("branded Nutrition Facts", () => {
  it("requires the core panel and serving-weight fields", () => {
    assert.throws(() => validateNutritionLabel({ ...label, servingGrams: "" }), /Serving weight/);
    assert.throws(() => validateNutritionLabel({ ...label, nutrients: { ...label.nutrients, sodiumMg: null } }), /sodiumMg/);
  });

  it("matches exact linked names and aliases without fuzzy brand guessing", () => {
    const validated = validateNutritionLabel(label);
    assert.equal(findNutritionLabel("Hemp protein", [validated])?.productName, "Hemp Complete");
    assert.equal(findNutritionLabel("Hemp Complete powder", [validated])?.brand, "Example Nutrition");
    assert.equal(findNutritionLabel("Hemp", [validated]), null);
  });

  it("scales scoop and gram quantities from the package serving", () => {
    const scoop = calculateBrandedNutrients([{ name: "Hemp protein", amount: 1.5, unit: "scoop" }], [label]);
    assert.equal(scoop.totals.proteinG, 30);
    assert.equal(scoop.totals.sodiumMg, 270);
    const grams = calculateBrandedNutrients([{ name: "Hemp protein", amount: 45, unit: "g" }], [label]);
    assert.equal(grams.totals.energyKcal, 180);
  });
});
