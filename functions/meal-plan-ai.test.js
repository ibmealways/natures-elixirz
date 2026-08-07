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
    const context = buildMealPlanContext({ dietaryPattern: "omnivore" }, { goal: "muscles", goalLabel: "Muscle nourishment", days: 1, kitchenItems: ["Chicken"] });
    const instructions = buildMealPlanInstructions(context);
    assert.match(instructions, /Muscle nourishment/);
    assert.match(instructions, /Chicken/);
  });

  it("validates five ordered meals and independently computes pantry availability", () => {
    const context = buildMealPlanContext({}, { goal: "muscles", days: 1, kitchenItems: ["Chicken"] });
    const proposal = { summary: "Protein-forward meal plan.", days: [{ day: 1, meals: ["Smoothie", "Breakfast", "Lunch", "Snack", "Dinner"].map((type) => meal(type, `${type} option`)) }] };
    const plan = validateMealPlanProposal(proposal, context);
    assert.equal(plan[0].meals.length, 5);
    assert.equal(plan[0].meals[0].ingredients[0].availability, "on-hand");
    assert.equal(plan[0].meals[0].generationSource, "openai");
  });
});
