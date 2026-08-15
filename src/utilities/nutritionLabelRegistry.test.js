import { beforeEach, describe, expect, it } from "vitest";
import { getNutritionLabels, restoreNutritionLabels, saveNutritionLabels } from "./nutritionLabelRegistry";

const label = { brand: "Example", productName: "Protein", ingredientName: "Hemp protein", servingAmount: 1, servingUnit: "scoop", servingGrams: 30, nutrients: { energyKcal: 100, proteinG: 20, fatG: 2, carbohydrateG: 3, sodiumMg: 50 }, labelCheckedAt: "2026-01-02T00:00:00.000Z" };

describe("Nutrition Facts registry", () => {
  beforeEach(() => {
    const values = new Map();
    globalThis.localStorage = {
      getItem: (key) => values.has(key) ? values.get(key) : null,
      setItem: (key, value) => values.set(key, String(value)),
      removeItem: (key) => values.delete(key),
      clear: () => values.clear(),
    };
  });
  it("isolates subscriber records and preserves the checked date during restore", () => {
    saveNutritionLabels([label], "subscriber-a");
    expect(getNutritionLabels("subscriber-b")).toEqual([]);
    expect(getNutritionLabels("subscriber-a")[0].labelCheckedAt).toBe(label.labelCheckedAt);
    restoreNutritionLabels(getNutritionLabels("subscriber-a"), "subscriber-c");
    expect(getNutritionLabels("subscriber-c")[0].labelCheckedAt).toBe(label.labelCheckedAt);
  });
  it("rejects incomplete package records", () => {
    expect(() => saveNutritionLabels([{ ...label, servingGrams: "" }], "subscriber-a")).toThrow(/gram weight/);
  });
});
