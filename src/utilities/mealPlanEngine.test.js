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

  it("keeps a pantry-built chicken and waffles breakfast coherent and recipe-specific", () => {
    const breakfast = generateMealPlan({}, "healthyweight", 1, {
      kitchenItems: ["Chicken thighs", "Waffles", "Apple", "Peanut butter", "Spinach"],
    })[0].meals.find((meal) => meal.meal === "Breakfast");
    if (/chicken/i.test(breakfast.food) && /waffle/i.test(breakfast.food)) {
      expect(breakfast.ingredients.map((item) => item.name).join(" ")).not.toMatch(/peanut butter/i);
      expect(breakfast.instructions.join(" ")).toMatch(/chicken|poultry/i);
      expect(breakfast.instructions.join(" ")).toMatch(/waffle/i);
      expect(breakfast.instructions.join(" ")).not.toMatch(/gather the ingredients/i);
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
