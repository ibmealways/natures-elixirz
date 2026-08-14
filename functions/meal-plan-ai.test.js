import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildMealPlanContext, buildMealPlanInstructions, validateMealPlanProposal } from "./meal-plan-ai.js";

const meal = (type, food) => ({
  meal: type,
  food,
  ingredients: [{ quantity: "4 oz", name: "Chicken", availability: "needed" }, { quantity: "1 cup", name: "Brown rice", availability: "needed" }],
  instructions: ["Cook safely and serve."],
  requiresCooking: type !== "Snack",
  rationale: "Provides protein and carbohydrate for muscle nourishment.",
});

describe("meal plan AI contract", () => {
  it("carries the selected goal and inventory into its instructions", () => {
    const context = buildMealPlanContext({ dietaryPattern: "omnivore" }, { goal: "muscles", goalLabel: "Muscle nourishment", days: 1, kitchenItems: ["Chicken"], learning: { source: "explicit-subscriber-feedback", dislikedSelections: ["Repeated chicken plan"] } });
    const instructions = buildMealPlanInstructions(context);
    assert.match(instructions, /Muscle nourishment/);
    assert.match(instructions, /Chicken/);
    assert.match(instructions, /Repeated chicken plan/);
    assert.match(instructions, /never overrides allergies/i);
  });

  it("validates five ordered meals and independently computes pantry availability", () => {
    const context = buildMealPlanContext({}, { goal: "muscles", days: 1, kitchenItems: ["Chicken"] });
    const proposal = { summary: "Protein-forward meal plan.", days: [{ day: 1, meals: ["Smoothie", "Breakfast", "Lunch", "Snack", "Dinner"].map((type) => meal(type, `${type} option`)) }] };
    const plan = validateMealPlanProposal(proposal, context);
    assert.equal(plan[0].meals.length, 5);
    assert.equal(plan[0].meals[0].ingredients[0].availability, "on-hand");
    assert.equal(plan[0].meals[0].generationSource, "openai");
    assert.equal(plan[0].meals[0].nutritionIntelligence.version, "nutrition-intelligence-v1");
    assert.ok(plan[0].dailyGoalFit >= 35);
  });

  it("rejects repeated dishes across a multi-day plan", () => {
    const context = buildMealPlanContext({}, { goal: "muscles", days: 2 });
    const meals = ["Smoothie", "Breakfast", "Lunch", "Snack", "Dinner"].map((type) => meal(type, `${type} option`));
    const proposal = { summary: "Repeated plan.", days: [{ day: 1, meals }, { day: 2, meals }] };
    assert.throws(() => validateMealPlanProposal(proposal, context), /repeated a dish/i);
  });

  it("anchors day one to the exact Tier 1 smoothie handoff", () => {
    const context = buildMealPlanContext({}, { goal: "muscles", days: 1, crossTierContext: { smoothie: {
      recipeName: "Dragon Fruit Apple Golden Protein Smoothie",
      ingredients: [{ name: "Dragon fruit", amount: 1, unit: "cup" }, { name: "Hemp protein", amount: 1, unit: "scoop" }],
    } } });
    const proposal = { summary: "Paired plan.", days: [{ day: 1, meals: [meal("Smoothie", "Generic smoothie"), ...["Breakfast", "Lunch", "Snack", "Dinner"].map((type) => meal(type, `${type} option`))] }] };
    const plan = validateMealPlanProposal(proposal, context);
    assert.equal(plan[0].meals[0].food, "Dragon Fruit Apple Golden Protein Smoothie");
    assert.deepEqual(plan[0].meals[0].ingredients.map((item) => item.name), ["Dragon fruit", "Hemp protein"]);
  });
});
