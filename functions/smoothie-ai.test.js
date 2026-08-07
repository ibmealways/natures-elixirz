import test from "node:test";
import assert from "node:assert/strict";
import { buildSmoothieAiContext, validateSmoothieProposal } from "./smoothie-ai.js";

const baseProposal = {
  name: "Berry oat balance", description: "A berry-forward smoothie with oats and spinach.", type: "Berry protein smoothie",
  ingredients: [
    { name: "Blueberries", group: "Fruit", amount: 0.5, unit: "cup", reason: "Berry flavor and colorful produce." },
    { name: "Pear", group: "Fruit", amount: 0.5, unit: "cup", reason: "Adds gentle sweetness and texture." },
    { name: "Spinach", group: "Vegetable", amount: 0.5, unit: "cup", reason: "Adds leafy-green variety." },
    { name: "Rolled oats", group: "Grain", amount: 0.25, unit: "cup", reason: "Adds fiber and body." },
    { name: "Coconut water", group: "Liquid", amount: 1, unit: "cup", reason: "Provides the blending liquid." },
  ],
  benefits: [], preparation: [], practicalTips: [], reflux: {},
};

test("AI smoothie context excludes the subscriber name and bounds inputs", () => {
  const context = buildSmoothieAiContext({ name: "Private Name", allergies: "Peanut", healthGoals: ["heart"] }, { goals: ["focus"], sizeOz: 24 }, [], {});
  assert.equal(context.profile.name, undefined);
  assert.deepEqual(context.profile.allergies, ["Peanut"]);
  assert.equal(context.request.sizeOz, 24);
});

test("AI smoothie validator rejects allergens and pantry inventions", () => {
  const allergyContext = buildSmoothieAiContext({ allergies: "blueberry" }, {}, [], {});
  assert.throws(() => validateSmoothieProposal(baseProposal, allergyContext), /prohibited ingredient/i);
  const pantryContext = buildSmoothieAiContext({}, { pantryOnly: true }, [], { pantry: ["Pear", "Spinach", "Rolled oats", "Coconut water"] });
  assert.throws(() => validateSmoothieProposal(baseProposal, pantryContext), /not in the selected kitchen/i);
});

test("AI smoothie validator rejects recipes that repeat recent ingredients", () => {
  const context = buildSmoothieAiContext({}, {}, [{ name: "Old", ingredients: baseProposal.ingredients }], {});
  assert.throws(() => validateSmoothieProposal(baseProposal, context), /too similar/i);
});

test("AI smoothie validator accepts and rounds a distinct balanced proposal", () => {
  const context = buildSmoothieAiContext({}, {}, [], {});
  const validated = validateSmoothieProposal({ ...baseProposal, ingredients: baseProposal.ingredients.map((item, index) => index ? item : { ...item, amount: 0.51 }) }, context);
  assert.equal(validated.ingredients[0].amount, 0.5);
});
