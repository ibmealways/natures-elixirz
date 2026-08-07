import { describe, expect, it } from "vitest";
import { formatIngredientMeasurement, formatKitchenNumber, formatQuantityText, formatYield } from "./measurements";

describe("measurement formatting", () => {
  it("uses readable kitchen fractions instead of decimals", () => {
    expect(formatKitchenNumber(0.76)).toBe("3/4");
    expect(formatIngredientMeasurement(0.49, "cup")).toBe("1/2 cup");
    expect(formatIngredientMeasurement(1.24, "cup")).toBe("1 1/4 cups");
    expect(formatQuantityText("0.5 medium")).toBe("1/2 medium");
  });

  it("converts recipe volume and weight to metric", () => {
    expect(formatIngredientMeasurement(0.5, "cup", "metric")).toBe("120 mL");
    expect(formatIngredientMeasurement(0.5, "tsp", "metric")).toBe("2.5 mL");
    expect(formatQuantityText("5 oz", "metric")).toBe("142 g");
    expect(formatQuantityText("1 cup cooked", "metric")).toBe("240 mL cooked");
    expect(formatYield(16, "metric")).toBe("473 mL");
  });
});
