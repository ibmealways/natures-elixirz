import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildMealPlanContext, buildMealPlanInstructions, buildTargetedMealRepairInput, culinaryFormatKey, describeMealPlanValidationFailure, identifyMealRepairTargets, isHouseholdStapleIngredient, mealPlanGenerationChunks, mealPlanSchemaForDays, mergeTargetedMealRepairs, normalizeSmoothieHandoffIngredients, validateMealPlanProposal } from "./meal-plan-ai.js";

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
  it("partitions long planning horizons into bounded generation chunks", () => {
    assert.deepEqual(mealPlanGenerationChunks(7), [{ startDay: 1, days: 3 }, { startDay: 4, days: 3 }, { startDay: 7, days: 1 }]);
    assert.equal(mealPlanGenerationChunks(30).length, 10);
    assert.equal(mealPlanSchemaForDays(3).properties.days.minItems, 3);
    assert.equal(mealPlanSchemaForDays(30).properties.days.maxItems, 30);
    assert.equal(buildMealPlanContext({}, { days: 30 }).days, 30);
  });

  it("preserves a bounded long-horizon continuation contract", () => {
    const context = buildMealPlanContext({}, { days: 3, continuation: {
      startDay: 7,
      totalDays: 30,
      lockedMeals: ["Breakfast: Egg and brown rice breakfast bowl", "", "Breakfast: Egg and brown rice breakfast bowl"],
    } });
    assert.equal(context.continuation.startDay, 7);
    assert.equal(context.continuation.totalDays, 30);
    assert.deepEqual(context.continuation.lockedMeals, ["Breakfast: Egg and brown rice breakfast bowl"]);
    assert.match(buildMealPlanInstructions(context), /LONG-HORIZON CONTINUATION/);
  });
  it("carries a bounded ingredient replacement into the coherent regeneration contract", () => {
    const context = buildMealPlanContext({}, { days: 3, requestedReplacement: {
      day: 2,
      meal: "Lunch",
      dish: "Tuna salad",
      ingredient: "Canned tuna",
      replacement: "Chickpeas",
    } });
    assert.deepEqual(context.requestedReplacement, {
      day: 2,
      meal: "Lunch",
      dish: "Tuna salad",
      ingredient: "Canned tuna",
      replacement: "Chickpeas",
    });
    const instructions = buildMealPlanInstructions(context);
    assert.match(instructions, /TARGETED INGREDIENT REPLACEMENT/);
    assert.match(instructions, /Chickpeas/);
    assert.match(instructions, /Rebuild that entire dish coherently/);
  });
  it("repairs one rejected meal without replacing valid meals elsewhere", () => {
    const original = {
      medicationSafety: { reviewRequired: false },
      days: [
        { day: 1, meals: ["Smoothie", "Breakfast", "Lunch", "Snack", "Dinner"].map((type) => meal(type, `Original ${type} bowl`)) },
        { day: 2, meals: ["Smoothie", "Breakfast", "Lunch", "Snack", "Dinner"].map((type) => meal(type, `Day two ${type} bowl`)) },
      ],
    };
    const repair = { replacement: meal("Snack", "Baked apple oat cup"), medicationSafety: { reviewRequired: false } };
    const targets = identifyMealRepairTargets(new Error("Day 2 Snack did not identify a recognizable prepared dish."), original);
    const merged = mergeTargetedMealRepairs(original, repair, targets);
    assert.equal(merged.days[1].meals[3].food, "Baked apple oat cup");
    assert.equal(merged.days[0].meals[1].food, "Original Breakfast bowl");
    assert.deepEqual(original.days[1].meals[3], meal("Snack", "Day two Snack bowl"));
  });

  it("gives targeted repair an explicit culinary and quantity contract", () => {
    const proposal = { days: [{ day: 1, meals: [meal("Smoothie"), meal("Breakfast"), meal("Lunch"), meal("Snack"), meal("Dinner")] }] };
    const targets = identifyMealRepairTargets(new Error("Day 1 Snack did not identify a recognizable prepared dish."), proposal);
    const input = buildTargetedMealRepairInput(proposal, targets);
    assert.match(input, /specific, credible dish name/i);
    assert.match(input, /do not need to match a fixed vocabulary/i);
    assert.match(input, /bare numeric quantity will be interpreted as a count/i);
    assert.match(input, /no more than four substantive ingredients/i);
  });

  it("emits privacy-safe structured diagnostics for a rejected meal", () => {
    const original = { days: [{ day: 1, meals: [meal("Smoothie"), meal("Breakfast"), meal("Lunch"), meal("Snack"), meal("Dinner")] }] };
    const diagnostic = describeMealPlanValidationFailure(new Error("Day 1 Lunch quantity failed validation: Unrecognized household quantity for Salmon: 1 pouch"), original, { repairAttempt: 2 });
    assert.equal(diagnostic.day, 1);
    assert.equal(diagnostic.slot, "Lunch");
    assert.equal(diagnostic.category, "quantity");
    assert.equal(diagnostic.offendingIngredient, "Salmon");
    assert.equal(diagnostic.offendingQuantity, "1 pouch");
    assert.equal(diagnostic.repairAttempt, 2);
    assert.equal(diagnostic.validator, "quantity");
    assert.equal(diagnostic.ruleId, "quantity-validation-failed");
    assert.equal(diagnostic.severity, "REPAIR_REQUIRED");
    assert.equal(diagnostic.mealType, "Lunch");
    assert.equal(diagnostic.mealName, "Chicken and brown rice bowl");
    assert.equal(diagnostic.ingredient, "Salmon");
    assert.equal(diagnostic.rawQuantity, "1 pouch");
    assert.equal(diagnostic.repairScope, "meal");
  });

  it("classifies only exact ordinary water and ice names as household staples", () => {
    assert.equal(isHouseholdStapleIngredient("Filtered water"), true);
    assert.equal(isHouseholdStapleIngredient("Ice cubes"), true);
    assert.equal(isHouseholdStapleIngredient("Coconut water"), false);
    assert.equal(isHouseholdStapleIngredient("Sparkling mineral water"), false);
  });

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
    assert.match(instructions, /Italian, French/);
    assert.match(instructions, /Puerto Rican/);
    assert.match(instructions, /Hindu, Muslim\/halal/);
    assert.match(instructions, /authentic culinary logic/i);
  });

  it("distinguishes established global culinary formats for multi-day variety", () => {
    const dishes = ["Mushroom Risotto", "Vegetable Bibimbap", "Chana Masala", "Puerto Rican Arroz con Gandules", "Moroccan Chickpea Tagine"];
    const keys = dishes.map((food) => culinaryFormatKey({ meal: "Dinner", food }));
    assert.equal(new Set(keys).size, dishes.length);
  });

  it("validates five ordered meals and independently computes pantry availability", () => {
    const context = buildMealPlanContext({}, { goal: "muscles", days: 1, kitchenItems: ["Chicken"] });
    const meals = ["Smoothie", "Breakfast", "Lunch", "Snack", "Dinner"].map((type) => meal(type));
    meals[0].ingredients.push({ quantity: "1 cup", name: "Filtered water", availability: "needed" });
    const proposal = { summary: "Protein-forward meal plan.", days: [{ day: 1, meals }] };
    const plan = validateMealPlanProposal(proposal, context);
    assert.equal(plan[0].meals.length, 5);
    assert.equal(plan[0].meals.find((item) => item.meal === "Lunch").ingredients.find((item) => item.name === "Chicken").availability, "on-hand");
    assert.equal(plan[0].meals[0].ingredients.find((item) => item.name === "Filtered water").availability, "household-staple");
    assert.equal(plan[0].meals[0].generationSource, "openai");
    assert.equal(plan[0].meals[0].nutritionIntelligence.version, "nutrition-intelligence-v2");
    assert.ok(plan[0].dailyGoalFit >= 35);
  });

  it("rejects meat, poultry, fish, and shellfish for vegetarian profiles", () => {
    const context = buildMealPlanContext({ dietaryPattern: "vegetarian" }, { goal: "general", days: 1 });
    const meals = ["Smoothie", "Breakfast", "Lunch", "Snack", "Dinner"].map((type) => meal(type));
    meals[2] = meal("Lunch", "Mediterranean salmon quinoa salad");
    meals[2].ingredients = [{ quantity: "4 oz", name: "Salmon fillet", availability: "needed" }, { quantity: "3/4 cup", name: "Cooked quinoa", availability: "needed" }];
    meals[2].instructions = ["Cook salmon and serve it with quinoa."];
    const proposal = { summary: "Vegetarian test plan.", days: [{ day: 1, meals }] };

    assert.throws(() => validateMealPlanProposal(proposal, context), /vegetarian-restricted animal ingredient/i);
  });

  it("keeps eggs and dairy eligible for vegetarian profiles while enforcing vegan exclusions", () => {
    const vegetarian = buildMealPlanContext({ dietaryPattern: "vegetarian" }, { goal: "general", days: 1 });
    const vegan = buildMealPlanContext({ dietaryPattern: "vegan" }, { goal: "general", days: 1 });
    const meals = ["Smoothie", "Breakfast", "Lunch", "Snack", "Dinner"].map((type) => meal(type));
    meals[2] = meal("Lunch", "Egg and quinoa salad");
    meals[2].ingredients = [{ quantity: "2 count", name: "Eggs", availability: "needed" }, { quantity: "3/4 cup", name: "Cooked quinoa", availability: "needed" }];
    meals[2].instructions = ["Cook eggs and serve with quinoa."];
    meals[4] = meal("Dinner", "Red lentil brown rice dinner plate");
    meals[4].ingredients = [{ quantity: "3/4 cup", name: "Cooked red lentils", availability: "needed" }, { quantity: "3/4 cup", name: "Cooked brown rice", availability: "needed" }];
    meals[4].instructions = ["Warm lentils and brown rice together before serving."];
    const proposal = { summary: "Plant-forward test plan.", days: [{ day: 1, meals }] };

    assert.doesNotThrow(() => validateMealPlanProposal(proposal, vegetarian));
    assert.throws(() => validateMealPlanProposal(proposal, vegan), /vegan-restricted animal product/i);
  });

  it("rejects repeated dishes across a multi-day plan", () => {
    const context = buildMealPlanContext({}, { goal: "muscles", days: 2 });
    const meals = ["Smoothie", "Breakfast", "Lunch", "Snack", "Dinner"].map((type) => meal(type, `${type} option`));
    const proposal = { summary: "Repeated plan.", days: [{ day: 1, meals }, { day: 2, meals }] };
    assert.throws(() => validateMealPlanProposal(proposal, context), /repeated a dish/i);
  });

  it("rejects a dish already accepted in an earlier generation section", () => {
    const context = buildMealPlanContext({}, { goal: "muscles", days: 1, continuation: {
      startDay: 4,
      totalDays: 7,
      lockedMeals: ["Breakfast: Egg and brown rice breakfast bowl"],
    } });
    const meals = ["Smoothie", "Breakfast", "Lunch", "Snack", "Dinner"].map((type) => meal(type));
    const proposal = { summary: "Continuation with a repeated breakfast.", days: [{ day: 1, meals }] };
    assert.throws(() => validateMealPlanProposal(proposal, context), /repeated a dish/i);
  });

  it("allows coherent format reuse when the actual dishes are distinct", () => {
    const context = buildMealPlanContext({}, { goal: "muscles", days: 2 });
    const dayOne = [meal("Smoothie", "Berry smoothie"), meal("Breakfast", "Spinach eggs with toast and kiwi"), meal("Lunch", "Tuna salad sandwich"), meal("Snack", "Apple yogurt cup"), meal("Dinner", "Chicken and rice plate")];
    const dayTwo = [meal("Smoothie", "Mango smoothie"), meal("Breakfast", "Spinach eggs with toast and blueberries"), meal("Lunch", "Chicken wrap"), meal("Snack", "Grape snack plate"), meal("Dinner", "Bean chili")];
    const proposal = { summary: "Superficial breakfast variation.", days: [{ day: 1, meals: dayOne }, { day: 2, meals: dayTwo }] };
    assert.doesNotThrow(() => validateMealPlanProposal(proposal, context));
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

  it("coalesces duplicate ingredients in an immutable Smoothie Kernel handoff", () => {
    const ingredients = normalizeSmoothieHandoffIngredients([
      { name: "Coconut water", amount: 1, unit: "cup" },
      { name: "Coconut Water", amount: 0.5, unit: "cup" },
      { name: "Hemp protein", amount: 1, unit: "scoop" },
    ]);
    assert.deepEqual(ingredients, [
      { name: "Coconut water", quantity: "1 1/2 cup" },
      { name: "Hemp protein", quantity: "1 scoop" },
    ]);
  });

  it("does not let a duplicate paired-smoothie ingredient create an impossible retry loop", () => {
    const context = buildMealPlanContext({}, { goal: "muscles", days: 1, crossTierContext: { smoothie: {
      recipeName: "Coconut Berry Protein Smoothie",
      ingredients: [
        { name: "Coconut water", amount: 1, unit: "cup" },
        { name: "Coconut water", amount: 0.5, unit: "cup" },
        { name: "Hemp protein", amount: 1, unit: "scoop" },
      ],
    } } });
    const proposal = { summary: "Paired plan.", days: [{ day: 1, meals: [meal("Smoothie", "Generic smoothie"), ...["Breakfast", "Lunch", "Snack", "Dinner"].map((type) => meal(type, `${type} option`))] }] };
    const plan = validateMealPlanProposal(proposal, context);
    assert.deepEqual(plan[0].meals[0].ingredients.map(({ name, quantity }) => ({ name, quantity })), [
      { name: "Coconut water", quantity: "1 1/2 cup" },
      { name: "Hemp protein", quantity: "1 scoop" },
    ]);
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

  it("accepts chia pudding as a credible breakfast foundation", () => {
    const context = buildMealPlanContext({}, { goal: "muscles", days: 1 });
    const breakfast = {
      ...meal("Breakfast", "Overnight Chia Kiwi Pudding"),
      ingredients: [
        { quantity: "3 tbsp", name: "Chia seeds", availability: "needed" },
        { quantity: "3/4 cup", name: "Plain Greek yogurt", availability: "needed" },
        { quantity: "1 cup", name: "Kiwi", availability: "needed" },
      ],
      instructions: ["Stir chia seeds into Greek yogurt and refrigerate overnight. Top with kiwi before serving."],
      requiresCooking: false,
    };
    const proposal = { summary: "Credible breakfast.", days: [{ day: 1, meals: [meal("Smoothie", "Smoothie option"), breakfast, meal("Lunch", "Lunch option"), meal("Snack", "Snack option"), meal("Dinner", "Dinner option")] }] };
    assert.doesNotThrow(() => validateMealPlanProposal(proposal, context));
  });

  it("accepts a defined five-component parfait snack", () => {
    const context = buildMealPlanContext({}, { goal: "joints", days: 1 });
    const snack = {
      ...meal("Snack", "Kiwi Walnut Greek Yogurt Parfait"),
      ingredients: [
        { quantity: "3/4 cup", name: "Plain Greek yogurt", availability: "needed" },
        { quantity: "1 cup", name: "Kiwi", availability: "needed" },
        { quantity: "1 tbsp", name: "Walnuts", availability: "needed" },
        { quantity: "1 tbsp", name: "Chia seeds", availability: "needed" },
        { quantity: "1 pinch", name: "Cinnamon", availability: "needed" },
      ],
      instructions: ["Layer Greek yogurt and kiwi, then top with walnuts, chia seeds, and cinnamon."],
      requiresCooking: false,
    };
    const proposal = { summary: "Defined snack.", days: [{ day: 1, meals: [meal("Smoothie", "Smoothie option"), meal("Breakfast", "Breakfast option"), meal("Lunch", "Lunch option"), snack, meal("Dinner", "Dinner option")] }] };
    assert.doesNotThrow(() => validateMealPlanProposal(proposal, context));
  });

  it("accepts fruit slices with nut butter as a recognizable snack", () => {
    const context = buildMealPlanContext({}, { goal: "joints", days: 1 });
    const snack = {
      ...meal("Snack", "Apple Slices with Peanut Butter"),
      ingredients: [
        { quantity: "1 count", name: "Apple", availability: "needed" },
        { quantity: "1 tbsp", name: "Peanut butter", availability: "needed" },
      ],
      instructions: ["Slice the apple and serve with peanut butter for dipping."],
      requiresCooking: false,
    };
    const proposal = { summary: "Defined snack.", days: [{ day: 1, meals: [meal("Smoothie", "Smoothie option"), meal("Breakfast", "Breakfast option"), meal("Lunch", "Lunch option"), snack, meal("Dinner", "Dinner option")] }] };
    assert.doesNotThrow(() => validateMealPlanProposal(proposal, context));
  });

  it("matches plural egg ingredients to singular egg cooking instructions", () => {
    const context = buildMealPlanContext({}, { goal: "joints", days: 1 });
    const breakfast = {
      ...meal("Breakfast", "Avocado Toast with Fully Cooked Egg and Tomatoes"),
      ingredients: [
        { quantity: "2 count", name: "Eggs", availability: "needed" },
        { quantity: "1 slice", name: "Whole-grain bread", availability: "needed" },
        { quantity: "1/2 cup", name: "Avocado", availability: "needed" },
        { quantity: "1/2 cup", name: "Tomatoes", availability: "needed" },
      ],
      instructions: ["Cook the egg until fully set. Toast the whole-grain bread, then top with avocado and tomatoes."],
    };
    const proposal = { summary: "Complete instructions.", days: [{ day: 1, meals: [meal("Smoothie", "Smoothie option"), breakfast, meal("Lunch", "Lunch option"), meal("Snack", "Snack option"), meal("Dinner", "Dinner option")] }] };
    assert.doesNotThrow(() => validateMealPlanProposal(proposal, context));
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

  it("accepts a defined sheet-pan dinner as a recognizable prepared dish", () => {
    const context = buildMealPlanContext({}, { goal: "joints", days: 1 });
    const dinner = {
      ...meal("Dinner", "Sheet-Pan Salmon with Sweet Potato and Asparagus"),
      ingredients: [
        { quantity: "4 oz", name: "Salmon" },
        { quantity: "1 cup", name: "Sweet potato" },
        { quantity: "1 cup", name: "Asparagus" },
      ],
      instructions: ["Roast salmon, sweet potato, and asparagus together on a sheet pan until safely cooked."],
    };
    const proposal = { summary: "Coherent sheet-pan meal.", days: [{ day: 1, meals: [meal("Smoothie"), meal("Breakfast"), meal("Lunch"), meal("Snack"), dinner] }] };
    assert.doesNotThrow(() => validateMealPlanProposal(proposal, context));
  });

  it("accepts a savory breakfast hash as a recognizable prepared dish", () => {
    const context = buildMealPlanContext({}, { goal: "everyday", days: 1 });
    const breakfast = {
      ...meal("Breakfast", "Sweet Potato Kale Breakfast Hash with Eggs"),
      ingredients: [
        { quantity: "1 cup", name: "Sweet potato" },
        { quantity: "1 cup", name: "Kale" },
        { quantity: "2 count", name: "Eggs" },
        { quantity: "1 tsp", name: "Olive oil" },
      ],
      instructions: ["Saute the sweet potato and kale in olive oil, then add the eggs and cook until fully set."],
    };
    const proposal = { summary: "Coherent savory breakfast.", days: [{ day: 1, meals: [meal("Smoothie"), breakfast, meal("Lunch"), meal("Snack"), meal("Dinner")] }] };
    assert.doesNotThrow(() => validateMealPlanProposal(proposal, context));
  });

  it("accepts protein pancakes as a recognizable prepared breakfast", () => {
    const context = buildMealPlanContext({}, { goal: "muscles", days: 1 });
    const breakfast = {
      ...meal("Breakfast", "Blueberry Plant-Protein Pancakes"),
      ingredients: [
        { quantity: "1/2 cup", name: "Rolled oats" },
        { quantity: "1 scoop", name: "Plant protein powder" },
        { quantity: "1/2 cup", name: "Blueberries" },
        { quantity: "1 count", name: "Egg" },
      ],
      instructions: ["Blend the rolled oats and protein powder, fold in the blueberries and egg, then cook the pancakes on a skillet until set."],
    };
    const proposal = { summary: "Coherent pancake breakfast.", days: [{ day: 1, meals: [meal("Smoothie"), breakfast, meal("Lunch"), meal("Snack"), meal("Dinner")] }] };
    assert.doesNotThrow(() => validateMealPlanProposal(proposal, context));
  });

  it("accepts a protein waffle stack as a recognizable prepared breakfast", () => {
    const context = buildMealPlanContext({}, { goal: "muscles", days: 1 });
    const breakfast = {
      ...meal("Breakfast", "Strawberry Greek Yogurt Protein Waffle Stack"),
      ingredients: [
        { name: "Whole-grain waffles", quantity: "2 count" },
        { name: "Greek yogurt", quantity: "3/4 cup" },
        { name: "Strawberries", quantity: "1/2 cup" },
      ],
      instructions: ["Toast the waffles, then layer them with Greek yogurt and strawberries to make a waffle stack."],
    };
    const proposal = { summary: "Coherent waffle breakfast.", days: [{ day: 1, meals: [meal("Smoothie"), breakfast, meal("Lunch"), meal("Snack"), meal("Dinner")] }] };
    assert.doesNotThrow(() => validateMealPlanProposal(proposal, context));
  });

  it("accepts cohesive cottage-cheese cups and savory roll-up snacks", () => {
    const context = buildMealPlanContext({}, { goal: "muscles", days: 1 });
    const cottageCup = {
      ...meal("Snack", "Cottage Cheese Cup with Pineapple"),
      ingredients: [
        { quantity: "3/4 cup", name: "Cottage cheese" },
        { quantity: "1/2 cup", name: "Pineapple" },
      ],
      requiresCooking: false,
      instructions: ["Spoon the cottage cheese into a cup and top with pineapple."],
    };
    const cottageProposal = { summary: "Coherent cottage-cheese snack.", days: [{ day: 1, meals: [meal("Smoothie"), meal("Breakfast"), meal("Lunch"), cottageCup, meal("Dinner")] }] };
    assert.doesNotThrow(() => validateMealPlanProposal(cottageProposal, context));

    const rollUps = {
      ...meal("Snack", "Turkey and Cheese Cucumber Roll-Ups"),
      ingredients: [
        { quantity: "2 oz", name: "Turkey" },
        { quantity: "1 oz", name: "Cheese" },
        { quantity: "1/2 cup", name: "Cucumber" },
      ],
      requiresCooking: false,
      instructions: ["Roll the turkey and cheese around cucumber strips."],
    };
    const rollUpProposal = { summary: "Coherent savory snack.", days: [{ day: 1, meals: [meal("Smoothie"), meal("Breakfast"), meal("Lunch"), rollUps, meal("Dinner")] }] };
    assert.doesNotThrow(() => validateMealPlanProposal(rollUpProposal, context));
  });

  it("accepts a black bean and egg breakfast tostada", () => {
    const context = buildMealPlanContext({}, { goal: "muscles", days: 1 });
    const breakfast = {
      ...meal("Breakfast", "Black Bean and Egg Breakfast Tostada"),
      ingredients: [
        { quantity: "1 count", name: "Whole-grain tostada" },
        { quantity: "1 count", name: "Egg" },
        { quantity: "1/2 cup", name: "Black beans" },
      ],
      instructions: ["Warm the tostada and black beans, cook the egg until set, then layer the beans and egg over the tostada."],
    };
    const proposal = { summary: "Coherent tostada breakfast.", days: [{ day: 1, meals: [meal("Smoothie"), breakfast, meal("Lunch"), meal("Snack"), meal("Dinner")] }] };
    assert.doesNotThrow(() => validateMealPlanProposal(proposal, context));
  });

  it("accepts beef and quinoa stuffed red peppers as a recognizable lunch", () => {
    const context = buildMealPlanContext({}, { goal: "muscles", days: 1 });
    const lunch = {
      ...meal("Lunch", "Beef and Quinoa Stuffed Red Peppers"),
      ingredients: [
        { quantity: "4 oz", name: "Lean ground beef" },
        { quantity: "3/4 cup cooked", name: "Quinoa" },
        { quantity: "1 count", name: "Red bell pepper" },
      ],
      instructions: ["Cook the beef safely, combine it with quinoa, fill the red pepper, and bake until the pepper is tender."],
    };
    const proposal = { summary: "Coherent stuffed-pepper lunch.", days: [{ day: 1, meals: [meal("Smoothie"), meal("Breakfast"), lunch, meal("Snack"), meal("Dinner")] }] };
    assert.doesNotThrow(() => validateMealPlanProposal(proposal, context));
  });

  it("accepts carrot sticks with hummus as a cohesive snack", () => {
    const context = buildMealPlanContext({}, { goal: "muscles", days: 1 });
    const snack = {
      ...meal("Snack", "Carrot Sticks with Hummus"),
      ingredients: [
        { quantity: "1 cup", name: "Carrot sticks" },
        { quantity: "1/4 cup", name: "Hummus" },
      ],
      requiresCooking: false,
      instructions: ["Serve the carrot sticks with hummus for dipping."],
    };
    const proposal = { summary: "Coherent hummus snack.", days: [{ day: 1, meals: [meal("Smoothie"), meal("Breakfast"), meal("Lunch"), snack, meal("Dinner")] }] };
    assert.doesNotThrow(() => validateMealPlanProposal(proposal, context));
  });

  it("accepts hummus with mixed vegetable sticks as a cohesive snack", () => {
    const context = buildMealPlanContext({}, { goal: "muscles", days: 1 });
    const snack = {
      ...meal("Snack", "Hummus with Cucumber and Bell Pepper Sticks"),
      ingredients: [
        { quantity: "1/4 cup", name: "Hummus" },
        { quantity: "1/2 cup", name: "Cucumber sticks" },
        { quantity: "1/2 cup", name: "Bell pepper sticks" },
      ],
      requiresCooking: false,
      instructions: ["Serve the cucumber and bell pepper sticks with hummus for dipping."],
    };
    const proposal = { summary: "Coherent hummus snack.", days: [{ day: 1, meals: [meal("Smoothie"), meal("Breakfast"), meal("Lunch"), snack, meal("Dinner")] }] };
    assert.doesNotThrow(() => validateMealPlanProposal(proposal, context));
  });

  it("accepts the repaired hummus-dipper and punctuated rice-cake snacks", () => {
    const context = buildMealPlanContext({}, { goal: "cellular", days: 1 });
    const snacks = [
      {
        ...meal("Snack", "Hummus and Cucumber Dippers"),
        ingredients: [
          { quantity: "1/4 cup", name: "Hummus" },
          { quantity: "1/2 cup", name: "Cucumber" },
        ],
        requiresCooking: false,
        instructions: ["Slice the cucumber into dippers and serve with hummus."],
      },
      {
        ...meal("Snack", "Peanut Butter Banana Rice Cakes"),
        ingredients: [
          { quantity: "2.", name: "Brown rice cakes" },
          { quantity: "1 tbsp", name: "Peanut butter" },
          { quantity: "1/2 count", name: "Banana" },
        ],
        requiresCooking: false,
        instructions: ["Spread peanut butter over the rice cakes and top with sliced banana."],
      },
      {
        ...meal("Snack", "Peanut Butter Banana Rice Cake Toasts"),
        ingredients: [
          { quantity: "2.", name: "Brown rice cakes" },
          { quantity: "1 tbsp", name: "Peanut butter" },
          { quantity: "1/2 count", name: "Banana" },
        ],
        requiresCooking: false,
        instructions: ["Spread peanut butter over the rice cake toasts and top with sliced banana."],
      },
    ];

    for (const snack of snacks) {
      const proposal = { summary: "Coherent repaired snack.", days: [{ day: 1, meals: [meal("Smoothie"), meal("Breakfast"), meal("Lunch"), snack, meal("Dinner")] }] };
      assert.doesNotThrow(() => validateMealPlanProposal(proposal, context));
    }
  });

  it("accepts cohesive production snack formats without treating recipe components as unrelated", () => {
    const context = buildMealPlanContext({}, { goal: "cellular", days: 1 });
    const snacks = [
      {
        ...meal("Snack", "Classic Hummus with Vegetable Crudités"),
        ingredients: [
          { quantity: "1/4 cup", name: "Hummus" },
          { quantity: "1/2 cup", name: "Cucumber sticks" },
          { quantity: "1/2 cup", name: "Carrot sticks" },
        ],
        requiresCooking: false,
        instructions: ["Serve the cucumber and carrot crudités with hummus."],
      },
      {
        ...meal("Snack", "Cinnamon Apple Yogurt Dip with Whole-Grain Crackers"),
        ingredients: [
          { quantity: "3/4 cup", name: "Plain Greek yogurt" },
          { quantity: "1/2 count", name: "Apple" },
          { quantity: "1/4 tsp", name: "Cinnamon" },
          { quantity: "6 count", name: "Whole-grain crackers" },
        ],
        requiresCooking: false,
        instructions: ["Stir cinnamon and diced apple into yogurt and serve with crackers."],
      },
      {
        ...meal("Snack", "Blueberry Almond Oat Muffin"),
        ingredients: [
          { quantity: "1/2 cup", name: "Rolled oats" },
          { quantity: "1 count", name: "Egg" },
          { quantity: "1/2 cup", name: "Blueberries" },
          { quantity: "1 tbsp", name: "Almond butter" },
          { quantity: "1/4 tsp", name: "Cinnamon" },
        ],
        requiresCooking: true,
        instructions: ["Combine the oats, egg, blueberries, almond butter, and cinnamon, then bake as one muffin until set."],
      },
    ];
    for (const snack of snacks) {
      const proposal = { summary: "Coherent production snack.", days: [{ day: 1, meals: [meal("Smoothie"), meal("Breakfast"), meal("Lunch"), snack, meal("Dinner")] }] };
      assert.doesNotThrow(() => validateMealPlanProposal(proposal, context));
    }
  });

  it("accepts breakfast tacos with a punctuated bare tortilla count", () => {
    const context = buildMealPlanContext({}, { goal: "muscles", days: 1 });
    const breakfast = {
      ...meal("Breakfast", "Spinach and Egg Breakfast Tacos"),
      ingredients: [
        { quantity: "2.", name: "Corn tortillas" },
        { quantity: "2 count", name: "Eggs" },
        { quantity: "1 cup", name: "Spinach" },
      ],
      instructions: ["Warm the corn tortillas, cook the eggs with spinach until set, then fill both tortillas."],
    };
    const proposal = { summary: "Coherent taco breakfast.", days: [{ day: 1, meals: [meal("Smoothie"), breakfast, meal("Lunch"), meal("Snack"), meal("Dinner")] }] };
    assert.doesNotThrow(() => validateMealPlanProposal(proposal, context));
  });

  it("keeps pancakes distinct from oatmeal across a multi-day plan", () => {
    assert.notEqual(culinaryFormatKey({ meal: "Breakfast", food: "Blueberry Protein Pancakes" }), culinaryFormatKey({ meal: "Breakfast", food: "Blueberry Protein Oatmeal" }));
  });

  it("keeps waffles distinct from pancakes across a multi-day plan", () => {
    assert.notEqual(culinaryFormatKey({ meal: "Breakfast", food: "Strawberry Protein Waffles" }), culinaryFormatKey({ meal: "Breakfast", food: "Blueberry Protein Pancakes" }));
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

  it("accepts apple incorporated into a named savory skillet", () => {
    const context = buildMealPlanContext({}, { goal: "joints", days: 1 });
    const dinner = {
      ...meal("Dinner", "Pork Tenderloin, Cabbage, and Apple Skillet"),
      ingredients: [
        { quantity: "4 oz", name: "Pork tenderloin" },
        { quantity: "1 cup", name: "Cabbage" },
        { quantity: "1/2 count", name: "Apple" },
      ],
      instructions: ["Cook the pork safely, then saute the cabbage and apple in the skillet until tender."],
    };
    const proposal = { summary: "Coherent savory fruit skillet.", days: [{ day: 1, meals: [meal("Smoothie"), meal("Breakfast"), meal("Lunch"), meal("Snack"), dinner] }] };
    assert.doesNotThrow(() => validateMealPlanProposal(proposal, context));
  });

  it("accepts cucumber hummus cups as a defined cohesive snack", () => {
    const context = buildMealPlanContext({}, { goal: "muscles", days: 1 });
    const snack = {
      ...meal("Snack", "Cucumber Hummus Cups"),
      ingredients: [
        { quantity: "1 cup", name: "Cucumber" },
        { quantity: "1/4 cup", name: "Hummus" },
      ],
      instructions: ["Fill cucumber cups with hummus and serve chilled."],
    };
    const proposal = { summary: "Coherent vegetable snack.", days: [{ day: 1, meals: [meal("Smoothie"), meal("Breakfast"), meal("Lunch"), snack, meal("Dinner")] }] };
    assert.doesNotThrow(() => validateMealPlanProposal(proposal, context));
  });

  it("accepts fish cakes with slaw as a recognizable prepared lunch", () => {
    const context = buildMealPlanContext({}, { goal: "joints", days: 1 });
    const lunch = {
      ...meal("Lunch", "Herbed Tuna Cakes with Creamy Cabbage Slaw"),
      ingredients: [
        { quantity: "1 can", name: "Tuna" },
        { quantity: "1 cup", name: "Cabbage" },
        { quantity: "1/4 cup", name: "Plain Greek yogurt" },
      ],
      instructions: ["Form and cook the tuna cakes safely, then toss cabbage with Greek yogurt for the slaw."],
    };
    const proposal = { summary: "Coherent fish-cake lunch.", days: [{ day: 1, meals: [meal("Smoothie"), meal("Breakfast"), lunch, meal("Snack"), meal("Dinner")] }] };
    assert.doesNotThrow(() => validateMealPlanProposal(proposal, context));
  });

  it("accepts turkey meatballs with spaghetti as a recognizable prepared dinner", () => {
    const context = buildMealPlanContext({}, { goal: "muscles", days: 1 });
    const dinner = {
      ...meal("Dinner", "Turkey Meatballs with Whole-Wheat Spaghetti and Tomato Basil Sauce"),
      ingredients: [
        { quantity: "4 oz", name: "Ground turkey" },
        { quantity: "3/4 cup", name: "Whole-wheat spaghetti" },
        { quantity: "1/2 cup", name: "Tomato basil sauce" },
      ],
      instructions: ["Form and cook the turkey meatballs safely, then serve with whole-wheat spaghetti and tomato basil sauce."],
    };
    const proposal = { summary: "Coherent meatball dinner.", days: [{ day: 1, meals: [meal("Smoothie"), meal("Breakfast"), meal("Lunch"), meal("Snack"), dinner] }] };
    assert.doesNotThrow(() => validateMealPlanProposal(proposal, context));
  });

  it("accepts turkey and vegetable stuffed sweet potatoes as a recognizable prepared dinner", () => {
    const context = buildMealPlanContext({}, { goal: "muscles", days: 1 });
    const dinner = {
      ...meal("Dinner", "Turkey and Vegetable Stuffed Sweet Potatoes"),
      ingredients: [
        { quantity: "4 oz", name: "Ground turkey" },
        { quantity: "1 piece", name: "Sweet potato" },
        { quantity: "1/2 cup", name: "Broccoli" },
      ],
      instructions: ["Bake the sweet potato, cook the turkey safely with broccoli, then stuff the sweet potato with the turkey and vegetable filling."],
    };
    const proposal = { summary: "Coherent stuffed-potato dinner.", days: [{ day: 1, meals: [meal("Smoothie"), meal("Breakfast"), meal("Lunch"), meal("Snack"), dinner] }] };
    assert.doesNotThrow(() => validateMealPlanProposal(proposal, context));
  });

  it("keeps meatballs and stuffed sweet potatoes distinct from a generic baked dinner format", () => {
    assert.notEqual(culinaryFormatKey({ meal: "Dinner", food: "Baked Turkey Meatballs with Spaghetti" }), culinaryFormatKey({ meal: "Dinner", food: "Baked Salmon Plate" }));
    assert.notEqual(culinaryFormatKey({ meal: "Dinner", food: "Turkey and Vegetable Stuffed Sweet Potatoes" }), culinaryFormatKey({ meal: "Dinner", food: "Baked Salmon Plate" }));
  });
});
