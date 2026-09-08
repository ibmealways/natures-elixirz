import { describe, expect, it, vi } from "vitest";
import { dailyAllowanceComparison, mergeValidatedMealPlanSection, normalizeDailyNutrition, normalizeGroceryList, normalizeRestoredMealPlan, replacementForMealPlanSection, requestMealPlanSectionWithRetry, validateGeneratedPlanSection } from "./mealPlanViewModel";

describe("meal plan section retry", () => {
  it("retries a rejected section without losing the eventual valid result", async () => {
    const request = vi.fn()
      .mockRejectedValueOnce(new Error("Day 7 failed validation"))
      .mockResolvedValueOnce({ data: { plan: [{ day: 1 }] } });
    const onRetry = vi.fn();

    const result = await requestMealPlanSectionWithRetry(request, { maximumAttempts: 3, onRetry });

    expect(result.data.plan).toHaveLength(1);
    expect(request).toHaveBeenNthCalledWith(1, 1);
    expect(request).toHaveBeenNthCalledWith(2, 2);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("surfaces the last error after the bounded retry limit", async () => {
    const request = vi.fn()
      .mockRejectedValueOnce(new Error("first"))
      .mockRejectedValueOnce(new Error("second"))
      .mockRejectedValueOnce(new Error("final"));

    await expect(requestMealPlanSectionWithRetry(request, { maximumAttempts: 3 })).rejects.toThrow("final");
    expect(request).toHaveBeenCalledTimes(3);
  });
});

describe("meal plan persisted-state compatibility", () => {
  it.each([undefined, null, {}, "legacy", 3])("rejects a non-array restored plan", (value) => {
    expect(normalizeRestoredMealPlan(value)).toBeNull();
  });

  it("normalizes malformed legacy days and nested meal collections", () => {
    expect(normalizeRestoredMealPlan([{ meals: [{ name: "Breakfast" }, null] }, null])).toEqual([
      {
        day: 1,
        meals: [{ name: "Breakfast", ingredients: [], instructions: [] }],
      },
    ]);
  });

  it("returns null when daily nutrition is absent", () => {
    expect(normalizeDailyNutrition(undefined)).toBeNull();
    expect(normalizeDailyNutrition({})).toBeNull();
  });

  it("supplies safe arrays and objects for legacy daily nutrition", () => {
    expect(normalizeDailyNutrition({ dailyNutrition: { status: "legacy" } })).toEqual({
      status: "legacy",
      targets: {},
      days: [],
    });
  });

  it("normalizes nested daily nutrition fields", () => {
    const result = normalizeDailyNutrition({ dailyNutrition: { days: [{ day: 1 }] } });
    expect(result.days[0]).toMatchObject({ day: 1, totals: {}, nutrientCoveragePercent: {} });
  });

  it.each([undefined, null, [], "legacy"])('supplies a complete grocery-list shape for %j', (value) => {
    expect(normalizeGroceryList(value)).toEqual({
      foundations: [],
      missing: [],
      available: [],
      missingDetails: [],
      availableDetails: [],
      stapleDetails: [],
      plannedMeals: [],
      pantryMatches: [],
    });
  });

  it("preserves valid grocery-list entries while normalizing absent collections", () => {
    expect(normalizeGroceryList({ plannedMeals: ["Breakfast"], missingDetails: [{ name: "Oats" }] })).toMatchObject({
      plannedMeals: ["Breakfast"],
      missingDetails: [{ name: "Oats" }],
      availableDetails: [],
      stapleDetails: [],
    });
  });
});

describe("meal-plan section recovery", () => {
  const day = (number) => ({ day: number, meals: Array.from({ length: 5 }, (_, index) => ({ meal: `Meal ${index + 1}` })) });

  it("preserves accepted days and appends a valid partial section immutably", () => {
    const accepted = [day(1), day(2), day(3)];
    const snapshot = structuredClone(accepted);
    const merged = mergeValidatedMealPlanSection(accepted, [day(1), day(2)], 4, 4);
    expect(accepted).toEqual(snapshot);
    expect(merged.map((entry) => entry.day)).toEqual([1, 2, 3, 4, 5]);
  });

  it("rejects empty, oversized, incomplete, and out-of-sequence sections", () => {
    expect(() => validateGeneratedPlanSection([], 4)).toThrow(/0 usable days/);
    expect(() => validateGeneratedPlanSection([day(1), day(2)], 1)).toThrow(/2 usable days/);
    expect(() => validateGeneratedPlanSection([{ day: 1, meals: [] }], 1)).toThrow(/five-meal/);
    expect(() => mergeValidatedMealPlanSection([day(1)], [day(1)], 3, 1)).toThrow(/out of sequence/);
  });
});

describe("meal-plan swaps", () => {
  it("maps a calendar-day swap into its owning generation section only", () => {
    const swap = { day: 5, meal: "Lunch", ingredient: "Tuna", replacement: "Chickpeas" };

    expect(replacementForMealPlanSection(swap, 1, 3)).toBeNull();
    expect(replacementForMealPlanSection(swap, 4, 3)).toEqual({ ...swap, day: 2 });
    expect(replacementForMealPlanSection(swap, 7, 3)).toBeNull();
    expect(swap.day).toBe(5);
  });
});

describe("daily allowance comparisons", () => {
  it("shows estimated remaining amounts only when the nutrient has verified coverage", () => {
    const items = dailyAllowanceComparison({
      totals: { energyKcal: 700, proteinG: 30, sodiumMg: 250 },
      nutrientCoveragePercent: { energyKcal: 90, proteinG: 90, sodiumMg: 90, calciumMg: 0 },
    }, {
      energyKcal: 2000,
      proteinG: { minimum: 80 },
      dailyReference: { sodiumMgUpper: 2300, calciumMg: 1000 },
    });

    expect(items.find((item) => item.key === "energyKcal")).toMatchObject({ target: 2000, difference: 1300, status: "1300 kcal estimated remaining" });
    expect(items.find((item) => item.key === "sodiumMg")).toMatchObject({ kind: "upper", difference: 2050, status: "2050 mg before limit" });
    expect(items.find((item) => item.key === "calciumMg")).toMatchObject({ total: null, status: "Unknown — no verified ingredient values" });
  });
});
