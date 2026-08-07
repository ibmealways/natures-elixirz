import { describe, expect, it } from "vitest";
import { buildSmoothieVisualPreview } from "./smoothieVisualPreview";

describe("buildSmoothieVisualPreview", () => {
  it("changes when the generated ingredients change", () => {
    const green = buildSmoothieVisualPreview({ ingredients: [{ name: "Spinach" }, { name: "Cucumber" }] });
    const berry = buildSmoothieVisualPreview({ ingredients: [{ name: "Blueberries" }, { name: "Strawberries" }] });
    expect(green).not.toBe(berry);
    expect(green).toContain("data:image/svg+xml");
  });
});
