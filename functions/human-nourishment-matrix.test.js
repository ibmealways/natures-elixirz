import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { evaluateHumanNourishmentMatrix } from "./human-nourishment-matrix.js";

describe("Human Nourishment Matrix", () => {
  it("distinguishes a layered formulation from fruit stacking", () => {
    const layered = evaluateHumanNourishmentMatrix(["Blueberries", "Spinach", "Hemp protein", "Chia seeds", "Coconut water"]);
    const fruitOnly = evaluateHumanNourishmentMatrix(["Banana", "Mango", "Grapes"]);
    assert.ok(layered.score > fruitOnly.score);
    assert.ok(layered.synergies.length > 0);
    assert.ok(fruitOnly.gaps.some((gap) => gap.pattern === "protein"));
  });

  it("detects ingredient saturation without treating it as a clinical conclusion", () => {
    const result = evaluateHumanNourishmentMatrix(Array.from({ length: 13 }, (_, index) => `Ingredient ${index}`));
    assert.equal(result.saturation.detected, true);
    assert.match(result.boundary, /not disease treatment/i);
  });
});
