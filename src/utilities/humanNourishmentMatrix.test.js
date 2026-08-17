import { describe, expect, it } from "vitest";
import { evaluateNourishmentMatrix } from "./humanNourishmentMatrix";

describe("Human Nourishment Matrix presentation model", () => {
  it("exposes systems, synergies, and missing links", () => {
    const complete = evaluateNourishmentMatrix([{ name: "Blueberries" }, { name: "Spinach" }, { name: "Hemp protein" }, { name: "Chia seeds" }, { name: "Coconut water" }]);
    const incomplete = evaluateNourishmentMatrix([{ name: "Banana" }, { name: "Mango" }]);
    expect(complete.systems).toHaveLength(9);
    expect(complete.synergies.length).toBeGreaterThan(0);
    expect(incomplete.gaps.join(" ")).toMatch(/Protein link missing/);
    expect(complete.score).toBeGreaterThan(incomplete.score);
  });
});
