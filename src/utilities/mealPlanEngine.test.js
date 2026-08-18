import { describe, expect, it } from "vitest";
import { buildGroceryList, generateMealPlan, recommendCulinarySeasoning } from "./mealPlanEngine";

describe("generateMealPlan", () => {
  it("does not give two named subscribers the same household plan", () => {
    const shared = { dietaryPattern: "omnivore", healthGoals: ["heart"], conditions: [], allergies: "", avoidIngredients: "" };
    const kitchenItems = ["Eggs", "Rice", "Chicken", "Spinach"];
    const ivan = generateMealPlan({ ...shared, name: "Ivan Perez", age: "59", weight: "102", height: "60" }, "heart", 1, { kitchenItems });
    const heather = generateMealPlan({ ...shared, name: "Heather Fraley", age: "43", weight: "130", height: "64" }, "heart", 1, { kitchenItems });
    expect(ivan[0].meals.map((meal) => meal.food)).not.toEqual(heather[0].meals.map((meal) => meal.food));
  });

  it("creates a materially different alternate plan", () => {
    const original = generateMealPlan({}, "general", 1, { variationSeed: 0 });
    const alternate = generateMealPlan({}, "general", 1, { variationSeed: 1 });
    expect(alternate[0].meals.map((meal) => meal.food)).not.toEqual(original[0].meals.map((meal) => meal.food));
  });
  it("generates the requested number of days up to thirty", () => {
    expect(generateMealPlan({}, "general", 3)).toHaveLength(3);
    expect(generateMealPlan({}, "general", 99)).toHaveLength(30);
  });

  it("coordinates a focus plan with the selected goal", () => {
    const plan = generateMealPlan({}, "focus", 1);
    expect(plan[0].meals.map((meal) => meal.meal)).toEqual(["Smoothie", "Breakfast", "Lunch", "Snack", "Dinner"]);
    expect(plan[0].meals[0].smoothie).toBeTruthy();
    expect(plan[0].meals).toHaveLength(5);
  });

  it("marks cooked meals and supplies subscriber cooking steps", () => {
    const meals = generateMealPlan({}, "general", 1)[0].meals;
    const dinner = meals.find((meal) => meal.meal === "Dinner");
    const snack = meals.find((meal) => meal.meal === "Snack");
    expect(dinner.requiresCooking).toBe(true);
    expect(dinner.instructions.length).toBeGreaterThanOrEqual(4);
    expect(snack.requiresCooking).toBe(false);
  });

  it("uses ingredient-appropriate units for pantry seeds and powders", () => {
    const seedPlan = generateMealPlan({}, "general", 1, { kitchenItems: ["Ground flaxseed"] });
    const seedQuantities = seedPlan[0].meals.flatMap((meal) => meal.ingredients).filter((item) => item.name === "Ground flaxseed").map((item) => item.quantity);
    expect(seedQuantities).toContain("2 tbsp");
    expect(seedQuantities).not.toContain("1 cup");
    const powderPlan = generateMealPlan({}, "general", 1, { kitchenItems: ["Protein powder"] });
    const powderQuantities = powderPlan[0].meals.flatMap((meal) => meal.ingredients).filter((item) => item.name === "Protein powder").map((item) => item.quantity);
    expect(powderQuantities).toContain("1 scoop");
  });

  it("never assigns cup quantities to seed or powder pantry ingredients", () => {
    for (const ingredient of ["Ground flaxseed", "Chia seeds", "Hemp seeds", "Protein powder", "Collagen peptides"]) {
      const plan = generateMealPlan({}, "general", 6, { kitchenItems: [ingredient] });
      const matches = plan.flatMap((day) => day.meals).flatMap((meal) => meal.ingredients).filter((item) => item.name === ingredient);
      expect(matches.length).toBeGreaterThan(0);
      expect(matches.every((item) => !item.quantity.includes("cup"))).toBe(true);
    }
  });

  it("personalizes culinary herbs while respecting profile restrictions", () => {
    const standard = recommendCulinarySeasoning({ avoidIngredients: "garlic" }, "heart", "baked chicken and vegetables");
    expect(standard.herbs).not.toContain("garlic");
    expect(standard.name).toContain("salt-free");
    const cautious = recommendCulinarySeasoning({ medications: "warfarin" }, "digestion", "bean bowl");
    expect(cautious.herbs).not.toContain("ginger");
    expect(cautious.safetyNote).toMatch(/pharmacist|clinician/);
  });

  it("creates a different smoothie and four different meals every day for a month", () => {
    const plan = generateMealPlan({ completedAt: "today" }, "general", 30);
    for (const moment of ["Smoothie", "Breakfast", "Lunch", "Snack", "Dinner"]) {
      const foods = plan.map((day) => day.meals.find((meal) => meal.meal === moment).food);
      expect(new Set(foods).size).toBe(30);
    }
  });

  it("reviews and marks subscriber kitchen ingredients", () => {
    const plan = generateMealPlan({ completedAt: "today" }, "general", 1, {
      kitchenItems: ["Blueberries", "Spinach", "Oats"],
    });
    expect(plan[0].reviewedProfile).toBe(true);
    expect(plan[0].reviewedKitchenItems).toBe(3);
    expect(plan[0].meals.some((meal) => meal.pantryMatch)).toBe(true);
  });

  it("changes and complements fallback meals when the paired smoothie changes", () => {
    const kitchenItems = ["Chicken thighs", "Tuna", "Eggs", "Waffles", "Bread", "Oats", "Apple", "Banana", "Spinach", "Broccoli", "Carrot", "Cucumber"];
    const pearPlan = generateMealPlan({}, "healthyWeight", 1, { kitchenItems, smoothieContext: {
      recipeName: "Pear Hemp Smoothie",
      ingredients: [{ name: "Banana", amount: 0.5, unit: "cup" }, { name: "Spinach", amount: 1, unit: "cup" }],
    } });
    const dragonPlan = generateMealPlan({}, "healthyWeight", 1, { kitchenItems, smoothieContext: {
      recipeName: "Dragon Passion Smoothie",
      ingredients: [{ name: "Carrot", amount: 0.5, unit: "cup" }, { name: "Cucumber", amount: 1, unit: "cup" }],
    } });
    const companionFoods = (plan) => plan[0].meals.slice(1).map((meal) => meal.food);
    expect(companionFoods(pearPlan)).not.toEqual(companionFoods(dragonPlan));
    expect(companionFoods(pearPlan).join(" ").toLowerCase()).not.toContain("banana");
    expect(companionFoods(pearPlan).join(" ").toLowerCase()).not.toContain("spinach");
  });

  it("rejects ambiguous deli assortments while keeping oats, waffles, and pork in coherent roles", () => {
    const kitchenItems = ["Cold Cuts (Ham, Cheese, Pepperoni, Buffalo Chicken)", "Pork tenderloin", "Eggs", "Rice", "Waffles", "Oats", "Idaho Mashed Potatoes", "Blackberries", "Broccoli", "Spinach", "Cherry tomatoes", "Nut butter"];
    const meals = Array.from({ length: 20 }, (_, variationSeed) => generateMealPlan({}, "healthyWeight", 1, { kitchenItems, variationSeed })[0].meals).flat();
    const deliMeals = meals.filter((meal) => /cold cuts?/i.test(meal.food));
    expect(deliMeals).toHaveLength(0);
    expect(meals.flatMap((meal) => meal.ingredients).map((item) => item.name).join(" ")).not.toMatch(/Cold Cuts \(Ham, Cheese, Pepperoni, Buffalo Chicken\)/i);
    deliMeals.forEach((meal) => {
      expect(meal.food).not.toMatch(/oats?/i);
      expect(meal.instructions.join(" ")).not.toMatch(/165°F/);
      expect(meal.instructions.join(" ")).toMatch(/ready-to-eat package directions/i);
    });
    const porkDinners = meals.filter((meal) => meal.meal === "Dinner" && /pork/i.test(meal.food));
    expect(porkDinners.length).toBeGreaterThan(0);
    porkDinners.forEach((meal) => {
      expect(meal.food).not.toMatch(/waffle|nut butter|oats?/i);
      expect(meal.instructions.join(" ")).toMatch(/145°F/);
    });
  });

  it("keeps a pantry-built chicken and waffles breakfast coherent and recipe-specific", () => {
    const breakfast = generateMealPlan({}, "healthyweight", 1, {
      kitchenItems: ["Chicken thighs", "Waffles", "Apple", "Peanut butter", "Spinach"],
    })[0].meals.find((meal) => meal.meal === "Breakfast");
    if (/chicken/i.test(breakfast.food) && /waffle/i.test(breakfast.food)) {
      expect(breakfast.ingredients.map((item) => item.name).join(" ")).not.toMatch(/peanut butter/i);
      expect(breakfast.ingredients.map((item) => item.name).join(" ")).not.toMatch(/nut butter/i);
      expect(breakfast.instructions.join(" ")).toMatch(/chicken|poultry/i);
      expect(breakfast.instructions.join(" ")).toMatch(/waffle/i);
      expect(breakfast.instructions.join(" ")).not.toMatch(/gather the ingredients/i);
    }
  });

  it("uses a spoon-sized portion for a nut-butter goal accent", () => {
    const plan = generateMealPlan({}, "healthyWeight", 1, {
      kitchenItems: ["Greek yogurt", "Oats", "Banana"],
    });
    const accent = plan[0].meals.flatMap((meal) => meal.ingredients)
      .find((item) => /nut butter/i.test(item.name));
    if (accent) expect(accent.quantity).toBe("1 tbsp");
  });

  it("treats black pepper as seasoning rather than a cup of vegetables", () => {
    const plan = generateMealPlan({}, "metabolic", 7, { kitchenItems: ["Eggs", "Rice", "Chicken thighs", "Black Pepper", "Carrot", "Spinach", "Apple", "Greek yogurt", "Kiwi", "Chia seeds"] });
    const pepper = plan.flatMap((day) => day.meals).flatMap((meal) => meal.ingredients).filter((item) => /black pepper/i.test(item.name));
    expect(pepper.every((item) => /tsp|pinch/i.test(item.quantity))).toBe(true);
  });

  it("never serves canned tuna or savory packaged rice as breakfast", () => {
    const plans = Array.from({ length: 12 }, (_, variationSeed) => generateMealPlan({}, "metabolic", 1, { kitchenItems: ["Canned Tuna", "Knorr Rice Sides", "Eggs", "Bread", "Apple", "Mixed berries", "Hemp seeds"], variationSeed }));
    plans.forEach((plan) => expect(plan[0].meals.find((meal) => meal.meal === "Breakfast").food).not.toMatch(/tuna|knorr|rice sides/i));
  });

  it("does not add beans to a fruit yogurt snack", () => {
    const plans = Array.from({ length: 12 }, (_, variationSeed) => generateMealPlan({}, "metabolic", 1, { kitchenItems: ["Greek yogurt", "Kiwi", "Mixed berries", "Chia seeds", "Beans", "Eggs", "Rice", "Spinach"], variationSeed }));
    plans.forEach((plan) => {
      const snack = plan[0].meals.find((meal) => meal.meal === "Snack");
      if (/yogurt/i.test(snack.food)) expect(snack.ingredients.map((item) => item.name).join(" ")).not.toMatch(/beans?/i);
    });
  });

  it("does not instruct subscribers to recook canned tuna", () => {
    const plan = generateMealPlan({}, "general", 7, { kitchenItems: ["Canned Tuna", "Rice", "Spinach", "Carrot", "Apple", "Eggs", "Bread"] });
    const tunaMeals = plan.flatMap((day) => day.meals).filter((meal) => /canned tuna/i.test(meal.food));
    tunaMeals.forEach((meal) => {
      expect(meal.instructions.join(" ")).not.toMatch(/145/);
      expect(meal.instructions.join(" ")).toMatch(/already cooked|package directions/i);
    });
  });

  it("keeps goal accents from corrupting complete pantry recipes", () => {
    const kitchenItems = ["Red Kidney Beans", "Bread", "Eggs", "Rice", "Chicken Thighs", "Plain Greek yogurt", "Kiwi", "Chia seeds", "Cucumber", "Apple", "Broccoli", "Spinach", "Cherry tomatoes"];
    const plans = Array.from({ length: 16 }, (_, variationSeed) => generateMealPlan({}, "joints", 1, { kitchenItems, variationSeed }));
    plans.forEach((plan) => {
      const breakfast = plan[0].meals.find((meal) => meal.meal === "Breakfast");
      const lunch = plan[0].meals.find((meal) => meal.meal === "Lunch");
      const snack = plan[0].meals.find((meal) => meal.meal === "Snack");
      expect(breakfast.food).not.toMatch(/kidney beans?/i);
      expect(lunch.ingredients.filter((item) => /chicken|salmon|tuna|fish/i.test(item.name)).length).toBeLessThanOrEqual(1);
      if (/yogurt/i.test(snack.food)) expect(snack.ingredients.map((item) => item.name).join(" ")).not.toMatch(/salmon|fish|beans?/i);
    });
  });

  it("uses slice and cup units for bread and cooked legumes", () => {
    const plan = generateMealPlan({}, "general", 5, { kitchenItems: ["Eggs", "Bread", "Red Kidney Beans", "Rice", "Spinach", "Apple"] });
    const ingredients = plan.flatMap((day) => day.meals).flatMap((meal) => meal.ingredients);
    ingredients.filter((item) => /bread/i.test(item.name)).forEach((item) => expect(item.quantity).toMatch(/slice/));
    ingredients.filter((item) => /kidney beans/i.test(item.name)).forEach((item) => expect(item.quantity).toMatch(/cup/));
  });

  it("builds a full pantry week exclusively from recognizable recipe archetypes", () => {
    const kitchenItems = ["Eggs", "Plain Greek yogurt", "Chicken thighs", "Pork tenderloin", "Canned Tuna", "Red Kidney Beans", "Bread", "Waffles", "Oats", "Rice", "Kiwi", "Apple", "Mixed berries", "Spinach", "Broccoli", "Carrot", "Cucumber", "Cherry tomatoes", "Chia seeds", "Peanut butter"];
    const plan = generateMealPlan({}, "joints", 7, { kitchenItems });
    const meals = plan.flatMap((day) => day.meals.filter((meal) => meal.meal !== "Smoothie"));
    expect(meals).toHaveLength(28);
    expect(meals.every((meal) => meal.recipeArchetype === true)).toBe(true);
    expect(meals.map((meal) => meal.food).join(" ")).not.toMatch(/breakfast with .* and .* and .* and|coherent snack plate or bowl/i);
  });

  it("rotates meal formats instead of treating a fruit swap as a new dish", () => {
    const kitchenItems = ["Eggs", "Plain Greek yogurt", "Chicken thighs", "Canned Tuna", "Red Kidney Beans", "Bread", "Oats", "Rice", "Apple", "Mixed berries", "Blueberries", "Spinach", "Broccoli", "Carrot", "Cucumber", "Chia seeds", "Peanut butter"];
    const plan = generateMealPlan({}, "metabolic", 3, { kitchenItems });
    for (const moment of ["Breakfast", "Lunch", "Snack", "Dinner"]) {
      const dishes = plan.map((day) => day.meals.find((meal) => meal.meal === moment).food);
      expect(new Set(dishes).size).toBe(3);
    }
  });

  it("substitutes animal foods for vegan profiles", () => {
    const plan = generateMealPlan({ dietaryPattern: "vegan" }, "heart", 1);
    expect(plan[0].meals.some((meal) => meal.food.includes("salmon"))).toBe(false);
    expect(plan[0].meals.some((meal) => meal.food.includes("tofu"))).toBe(true);
  });

  it("removes declared common allergens and avoided ingredients", () => {
    const profile = {
      dietaryPattern: "vegan",
      allergies: "tree nuts, soy, dairy",
      avoidIngredients: "gluten",
    };
    const foods = generateMealPlan(profile, "heart", 1)[0].meals.map((meal) => meal.food.toLowerCase()).join(" ");
    expect(foods).not.toMatch(/walnut|almond|tofu|tempeh|soy yogurt|whole-grain toast/);
    expect(foods).toMatch(/seed|flax/);
  });

  it("builds a deduplicated grocery foundation", () => {
    const list = buildGroceryList(generateMealPlan({}, "general", 3));
    expect(list.foundations.length).toBeGreaterThan(3);
    expect(new Set(list.plannedMeals).size).toBe(list.plannedMeals.length);
  });
});
