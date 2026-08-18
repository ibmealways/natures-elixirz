import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildMealPlanContext, buildMealPlanInstructions, validateMealPlanProposal } from "./meal-plan-ai.js";

const DEFAULT_DISHES = { Smoothie: "Berry protein smoothie", Breakfast: "Egg and brown rice breakfast bowl", Lunch: "Chicken and brown rice bowl", Snack: "Berry yogurt snack bowl", Dinner: "Chicken and brown rice dinner plate" };
const DEFAULT_INGREDIENTS = {
  Smoothie: [{ quantity: "1 cup", name: "Berries" }, { quantity: "1 scoop", name: "Protein powder" }],
  Breakfast: [{ quantity: "2 count", name: "Eggs" }, { quantity: "3/4 cup", name: "Brown rice" }],
  Lunch: [{ quantity: "4 oz", name: "Chicken" }, { quantity: "3/4 cup", name: "Brown rice" }],
  Snack: [{ quantity: "3/4 cup", name: "Plain yogurt" }, { quantity: "1 cup", name: "Berries" }],
  Dinner: [{ quantity: "4 oz", name: "Chicken" }, { quantity: "3/4 cup", name: "Brown rice" }],
};
const meal = (type, food = DEFAULT_DISHES[type]) => ({
  meal: type,
  food: /option$/i.test(food) ? DEFAULT_DISHES[type] : food,
  ingredients: DEFAULT_INGREDIENTS[type].map((item) => ({ ...item, availability: "needed" })),
  instructions: [`Prepare ${DEFAULT_INGREDIENTS[type].map((item) => item.name).join(" and ")} safely and serve.`],
  requiresCooking: type !== "Snack",
  rationale: "Provides protein and carbohydrate for muscle nourishment.",
});

describe("meal plan AI contract", () => {
  it("expands a pantry deli assortment into separately selectable ingredients", () => {
    const context = buildMealPlanContext({}, { days: 1, kitchenItems: ["Cold Cuts (Ham, Cheese, Pepperoni, Buffalo Chicken)"] });
    assert.deepEqual(context.kitchenItems, ["Ham", "Cheese", "Pepperoni", "Buffalo Chicken"]);
  });
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
    const proposal = { summary: "Protein-forward meal plan.", days: [{ day: 1, meals: ["Smoothie", "Breakfast", "Lunch", "Snack", "Dinner"].map((type) => meal(type)) }] };
    const plan = validateMealPlanProposal(proposal, context);
    assert.equal(plan[0].meals.length, 5);
    assert.equal(plan[0].meals.find((item) => item.meal === "Lunch").ingredients.find((item) => item.name === "Chicken").availability, "on-hand");
    assert.equal(plan[0].meals[0].generationSource, "openai");
    assert.equal(plan[0].meals[0].nutritionIntelligence.version, "nutrition-intelligence-v2");
    assert.ok(plan[0].dailyGoalFit >= 35);
  });

  it("rejects repeated dishes across a multi-day plan", () => {
    const context = buildMealPlanContext({}, { goal: "muscles", days: 2 });
    const meals = ["Smoothie", "Breakfast", "Lunch", "Snack", "Dinner"].map((type) => meal(type, `${type} option`));
    const proposal = { summary: "Repeated plan.", days: [{ day: 1, meals }, { day: 2, meals }] };
    assert.throws(() => validateMealPlanProposal(proposal, context), /repeated a dish/i);
  });

  it("rejects superficial ingredient swaps within the same meal format", () => {
    const context = buildMealPlanContext({}, { goal: "muscles", days: 2 });
    const dayOne = [meal("Smoothie", "Berry smoothie"), meal("Breakfast", "Spinach eggs with toast and kiwi"), meal("Lunch", "Tuna salad sandwich"), meal("Snack", "Apple yogurt cup"), meal("Dinner", "Chicken and rice plate")];
    const dayTwo = [meal("Smoothie", "Mango smoothie"), meal("Breakfast", "Spinach eggs with toast and blueberries"), meal("Lunch", "Chicken wrap"), meal("Snack", "Grape snack plate"), meal("Dinner", "Bean chili")];
    const proposal = { summary: "Superficial breakfast variation.", days: [{ day: 1, meals: dayOne }, { day: 2, meals: dayTwo }] };
    assert.throws(() => validateMealPlanProposal(proposal, context), /repeated the same breakfast culinary format/i);
  });

  it("anchors day one to the exact Tier 1 smoothie handoff", () => {
    const context = buildMealPlanContext({}, { goal: "muscles", days: 1, crossTierContext: { smoothie: {
      recipeName: "Dragon Fruit Apple Golden Protein Smoothie",
      ingredients: [{ name: "Dragon fruit", amount: 0.75, unit: "cup" }, { name: "Hemp protein", amount: 1.125, unit: "scoop" }],
    } } });
    const proposal = { summary: "Paired plan.", days: [{ day: 1, meals: [meal("Smoothie", "Generic smoothie"), ...["Breakfast", "Lunch", "Snack", "Dinner"].map((type) => meal(type, `${type} option`))] }] };
    const plan = validateMealPlanProposal(proposal, context);
    assert.equal(plan[0].meals[0].food, "Dragon Fruit Apple Golden Protein Smoothie");
    assert.deepEqual(plan[0].meals[0].ingredients.map((item) => item.name), ["Dragon fruit", "Hemp protein"]);
    assert.deepEqual(plan[0].meals[0].ingredients.map((item) => item.quantity), ["3/4 cup", "1 1/8 scoop"]);
  });

  it("rejects a disconnected savory breakfast with unrelated sweet components", () => {
    const context = buildMealPlanContext({}, { goal: "nervous", days: 1 });
    const breakfast = {
      ...meal("Breakfast", "Chicken thighs and mashed potatoes breakfast with fruit and peanut butter"),
      ingredients: [
        { quantity: "4 oz", name: "Chicken thighs", availability: "needed" },
        { quantity: "3/4 cup", name: "Mashed potatoes", availability: "needed" },
        { quantity: "1 cup", name: "Dragon fruit", availability: "needed" },
        { quantity: "1 tbsp", name: "Peanut butter", availability: "needed" },
        { quantity: "1 cup", name: "Banana", availability: "needed" },
      ],
      instructions: ["Cook chicken safely.", "Warm mashed potatoes.", "Serve dragon fruit on the side."],
    };
    const proposal = { summary: "Incoherent breakfast.", days: [{ day: 1, meals: [meal("Smoothie", "Smoothie option"), breakfast, meal("Lunch", "Lunch option"), meal("Snack", "Snack option"), meal("Dinner", "Dinner option")] }] };
    assert.throws(() => validateMealPlanProposal(proposal, context), /did not account for|unrelated sweet/i);
  });

  it("rejects duplicate greens in a generic mashed-potato and bean bowl", () => {
    const context = buildMealPlanContext({}, { goal: "nervous", days: 1 });
    const lunch = {
      ...meal("Lunch", "Red kidney beans lunch bowl with mashed potatoes, carrot, spinach, leafy greens"),
      ingredients: [
        { quantity: "4 oz", name: "Red kidney beans", availability: "needed" },
        { quantity: "3/4 cup", name: "Mashed potatoes", availability: "needed" },
        { quantity: "1 cup", name: "Carrot", availability: "needed" },
        { quantity: "1 cup", name: "Spinach", availability: "needed" },
        { quantity: "1 cup", name: "Leafy greens", availability: "needed" },
      ],
      instructions: ["Warm the beans and mashed potatoes.", "Cook the carrot, spinach, and leafy greens, then combine."],
    };
    const proposal = { summary: "Incoherent lunch.", days: [{ day: 1, meals: [meal("Smoothie", "Smoothie option"), meal("Breakfast", "Breakfast option"), lunch, meal("Snack", "Snack option"), meal("Dinner", "Dinner option")] }] };
    assert.throws(() => validateMealPlanProposal(proposal, context), /duplicated leafy greens/i);
  });

  it("rejects an ambiguous assortment of deli meats as one lunch protein", () => {
    const context = buildMealPlanContext({}, { goal: "nervous", days: 1 });
    const lunch = {
      ...meal("Lunch", "Cold cuts lunch bowl with rice and vegetables"),
      ingredients: [
        { quantity: "4 oz", name: "Cold Cuts (Ham, Cheese, Pepperoni, Buffalo Chicken)", availability: "needed" },
        { quantity: "3/4 cup", name: "Rice", availability: "needed" },
        { quantity: "1 cup", name: "Carrot", availability: "needed" },
      ],
      instructions: ["Keep the cold cuts refrigerated.", "Cook rice and carrot, then serve."],
    };
    const proposal = { summary: "Ambiguous deli lunch.", days: [{ day: 1, meals: [meal("Smoothie", "Smoothie option"), meal("Breakfast", "Breakfast option"), lunch, meal("Snack", "Snack option"), meal("Dinner", "Dinner option")] }] };
    assert.throws(() => validateMealPlanProposal(proposal, context), /ambiguous multi-protein deli assortment/i);
  });

  it("rejects unprepared egg, oat, and berry components presented as a snack", () => {
    const context = buildMealPlanContext({}, { goal: "nervous", days: 1 });
    const snack = {
      ...meal("Snack", "Raspberries with eggs, hemp seeds, and oats"),
      ingredients: [
        { quantity: "1 cup", name: "Raspberries", availability: "needed" },
        { quantity: "2 count", name: "Eggs", availability: "needed" },
        { quantity: "2 tbsp", name: "Hemp seeds", availability: "needed" },
        { quantity: "1 cup", name: "Oats", availability: "needed" },
      ],
      instructions: ["Serve the ingredients together."],
      requiresCooking: false,
    };
    const proposal = { summary: "Undefined snack.", days: [{ day: 1, meals: [meal("Smoothie", "Smoothie option"), meal("Breakfast", "Breakfast option"), meal("Lunch", "Lunch option"), snack, meal("Dinner", "Dinner option")] }] };
    assert.throws(() => validateMealPlanProposal(proposal, context), /without defining a cooked snack recipe/i);
  });

  it("rejects a technically measurable meal that is not a recognizable dish", () => {
    const context = buildMealPlanContext({}, { goal: "nervous", days: 1 });
    const breakfast = {
      ...meal("Breakfast", "Chicken, rice, apple, broccoli combination"),
      ingredients: [
        { quantity: "4 oz", name: "Chicken thighs" },
        { quantity: "3/4 cup", name: "Rice" },
        { quantity: "1 cup", name: "Apple" },
        { quantity: "1 cup", name: "Broccoli" },
      ],
      instructions: ["Cook the chicken and rice, then serve with apple and broccoli."],
    };
    const proposal = { summary: "Ingredient assembly.", days: [{ day: 1, meals: [meal("Smoothie"), breakfast, meal("Lunch"), meal("Snack"), meal("Dinner")] }] };
    assert.throws(() => validateMealPlanProposal(proposal, context), /recognizable prepared dish|credible breakfast/i);
  });

  it("rejects lunch or dinner fruit that has no defined culinary role", () => {
    const context = buildMealPlanContext({}, { goal: "nervous", days: 1 });
    const lunch = {
      ...meal("Lunch", "Chicken and rice bowl with banana"),
      ingredients: [{ quantity: "4 oz", name: "Chicken" }, { quantity: "3/4 cup", name: "Rice" }, { quantity: "1 cup", name: "Banana" }],
      instructions: ["Cook chicken and rice, then place the banana beside the bowl."],
    };
    const proposal = { summary: "Disconnected fruit.", days: [{ day: 1, meals: [meal("Smoothie"), meal("Breakfast"), lunch, meal("Snack"), meal("Dinner")] }] };
    assert.throws(() => validateMealPlanProposal(proposal, context), /fruit without a defined culinary role/i);
  });
});
