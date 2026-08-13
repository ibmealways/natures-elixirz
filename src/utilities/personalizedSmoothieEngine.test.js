import { describe, expect, it } from "vitest";
import { assessSafety, generatePersonalizedSmoothie, profileVariationSeed } from "./personalizedSmoothieEngine";

const profile = {
  age: "40",
  conditions: [],
  medications: "",
  allergies: "",
  avoidIngredients: "",
};

describe("generatePersonalizedSmoothie", () => {
  it("maps weight-management nutrition to a fiber-forward supportive formula", () => {
    const recipe = generatePersonalizedSmoothie(profile, "weightLoss", 16);

    expect(recipe.goal).toBe("weightLoss");
    expect(recipe.name).toContain("Fiber-Forward Berry Balance");
    expect(recipe.ingredients.map((item) => item.name).join(" ")).toMatch(/berries/i);
    expect(recipe.description).toMatch(/balanced eating pattern/i);
    expect(recipe.description).toMatch(/not a weight-loss treatment/i);
  });

  it("keeps each subscriber on a stable and distinct formulation path", () => {
    const shared = { ...profile, dietaryPattern: "omnivore", healthGoals: ["heart"] };
    const ivan = { ...shared, name: "Ivan Perez", age: "59", weight: "102", height: "60", activity: "Moderate" };
    const heather = { ...shared, name: "Heather Fraley", age: "43", weight: "130", height: "64", activity: "Moderate" };
    expect(profileVariationSeed(ivan)).toBe(profileVariationSeed({ ...ivan }));
    expect(profileVariationSeed(ivan)).not.toBe(profileVariationSeed(heather));
    expect(generatePersonalizedSmoothie(ivan, "heart", 16).ingredients.map((item) => item.name))
      .not.toEqual(generatePersonalizedSmoothie(heather, "heart", 16).ingredients.map((item) => item.name));
  });

  it("creates a different ingredient combination for an alternate", () => {
    const original = generatePersonalizedSmoothie(profile, "heart", 16);
    const alternate = generatePersonalizedSmoothie(profile, "heart", 16, { variationIndex: 2 });
    expect(alternate.ingredients.map((item) => item.name)).not.toEqual(original.ingredients.map((item) => item.name));
  });

  it("names a tropical protein formula from its actual ingredients without inventing a recovery intention", () => {
    const recipe = generatePersonalizedSmoothie(profile, ["protein", "healthyWeight"], 24, {
      pantryText: "Banana, Mango, Pineapple, Hemp protein, Chia seeds, Coconut water, Mint, Peanut butter, Baby spinach",
      useOnlyPantry: true,
    });
    expect(recipe.assessment.type).toBe("Tropical green protein smoothie");
    expect(recipe.assessment.type).not.toContain("recovery");
  });
  it("scales a 16 oz formula to 24 oz", () => {
    const sixteen = generatePersonalizedSmoothie(profile, "heart", 16);
    const twentyFour = generatePersonalizedSmoothie(profile, "heart", 24);
    expect(twentyFour.ingredients[0].amount).toBe(sixteen.ingredients[0].amount * 1.5);
    expect(twentyFour.sizeOz).toBe(24);
  });

  it("substitutes a subscriber allergy when a practical replacement exists", () => {
    const recipe = generatePersonalizedSmoothie({ ...profile, allergies: "flaxseed" }, "heart", 16);
    expect(recipe.ingredients.some((item) => item.name.includes("flaxseed"))).toBe(false);
    expect(recipe.ingredients.some((item) => item.name === "Rolled oats")).toBe(true);
    expect(recipe.substitutions[0]).toContain("Ground flaxseed");
  });

  it("falls back to the general protocol for an unknown goal", () => {
    expect(generatePersonalizedSmoothie(profile, "unknown", 16).name).toBe("Daily Foundation Blend");
  });

  it("provides scaled nutrition estimates", () => {
    const recipe = generatePersonalizedSmoothie(profile, "general", 32);
    expect(recipe.nutrition.calories).toBe(590);
    expect(recipe.nutrition.protein).toBe(30);
  });

  it("labels large recipes as multiple-serving batches", () => {
    const recipe = generatePersonalizedSmoothie(profile, "general", 64);
    expect(recipe.servings).toBe(3);
    expect(recipe.batchNotice).toContain("3-serving batch");
  });

  it("replaces dairy ingredients for vegan subscribers", () => {
    const recipe = generatePersonalizedSmoothie({ ...profile, dietaryPattern: "vegan" }, "energy", 16);
    expect(recipe.ingredients.some((item) => item.name === "Unsweetened soy yogurt")).toBe(true);
    expect(recipe.ingredients.some((item) => item.name === "Plain Greek yogurt")).toBe(false);
  });

  it("uses subscriber ingredient replacements in an intention preview", () => {
    const preview = generatePersonalizedSmoothie(profile, "digestion", 16);
    const fruit = preview.ingredients.find((item) => item.group === "Fruit");
    const recipe = generatePersonalizedSmoothie(profile, "digestion", 16, {
      selectedNames: preview.ingredients.map((item) => item.name),
      ingredientReplacements: { [fruit.name]: "Papaya" },
    });
    expect(recipe.ingredients.some((item) => item.name === "Papaya")).toBe(true);
    expect(recipe.ingredients.some((item) => item.name === fruit.name)).toBe(false);
  });

  it("supports the expanded clarity and mindfulness goals", () => {
    expect(generatePersonalizedSmoothie(profile, "focus", 16).name).toBe("Cosmic Clarity");
    expect(generatePersonalizedSmoothie(profile, "mindfulness", 16).name).toBe("Indigo Awakening Ritual");
  });

  it("combines multiple intentions into one deduplicated balanced formula", () => {
    const recipe = generatePersonalizedSmoothie(profile, ["mindfulness", "focus", "energy", "digestion"], 16);
    expect(recipe.goals).toEqual(["mindfulness", "focus", "energy", "digestion"]);
    expect(recipe.name).toBe("Personal Intention Constellation");
    expect(new Set(recipe.ingredients.map((item) => item.name)).size).toBe(recipe.ingredients.length);
    expect(recipe.ingredients.length).toBeLessThanOrEqual(9);
    expect(recipe.ingredients.some((item) => item.group === "Liquid")).toBe(true);
    expect(recipe.ingredients.some((item) => ["Protein", "Seed", "Grain"].includes(item.group))).toBe(true);
  });

  it("can build from matched pantry ingredients", () => {
    const recipe = generatePersonalizedSmoothie(profile, "focus", 16, {
      pantryText: "blueberries, spinach, soy milk",
      useOnlyPantry: true,
    });
    expect(recipe.ingredients.map((item) => item.name)).toEqual([
      "Frozen blueberries",
      "Baby spinach",
      "Unsweetened soy milk",
    ]);
    expect(recipe.incompleteFormula).toBe(true);
  });

  it("explains evidence-aware molecular nutrient interactions", () => {
    const recipe = generatePersonalizedSmoothie({}, "general", 16);
    expect(recipe.whatHappens.length).toBeLessThanOrEqual(3);
    expect(recipe.whatHappens.some((note) => note.includes("normal metabolism"))).toBe(true);
    expect(recipe.quantumContext).toContain("Quantum physics underlies molecular bonds");
    expect(recipe.assessment.type).toContain("smoothie");
  });

  it("flags ingredient-specific reflux considerations and gentler changes", () => {
    const recipe = generatePersonalizedSmoothie({ ...profile, conditions: ["Acid reflux / GERD"] }, "digestion", 16, {
      pantryText: "Blueberries, Strawberries, Grapes, Ground flaxseed, Coconut water, Mint, Hemp protein, Peanut butter, Baby spinach",
      useOnlyPantry: true,
    });
    expect(recipe.assessment.reflux.level).toBe("Higher trigger potential");
    expect(recipe.assessment.reflux.triggers.join(" ")).toContain("Mint");
    expect(recipe.assessment.reflux.adjustments.join(" ")).toContain("Remove mint");
  });

  it("does not show reflux guidance unless the subscriber saved reflux in the profile", () => {
    const recipe = generatePersonalizedSmoothie(profile, "digestion", 16, {
      pantryText: "Blueberries, Strawberries, Coconut water, Mint, Hemp protein",
      useOnlyPantry: true,
    });
    expect(recipe.assessment.reflux).toBeUndefined();
  });

  it("builds a sized pantry-only blend from a subscriber fruit list", () => {
    const recipe = generatePersonalizedSmoothie(profile, "focus", 24, {
      pantryText: "Passion fruit, Dragon Fruit, Mango, Mixed berries, Strawberries, PineApple, Peaches, Honey Dew Melon, Red Seedless Grapes",
      useOnlyPantry: true,
    });
    expect(recipe.ingredients).toHaveLength(3);
    expect(recipe.ingredients.map((item) => item.name)).toContain("Dragon fruit");
    expect(recipe.unusedPantry).toContain("honey dew melon");
    expect(recipe.unmatchedPantry).toEqual([]);
    expect(recipe.nutrition.calories).toBeGreaterThan(0);
    expect(recipe.formulaNeeds).toEqual(["at least four recognized ingredients", "a liquid", "a protein or fiber ingredient"]);
  });

  it("recognizes common pantry spellings, supplements, spices, and spring water", () => {
    const recipe = generatePersonalizedSmoothie(profile, "mindfulness", 32, {
      pantryText: "blue berries\nblack berries\nacai berries\nflax seed\nhemp hearts\nhemp protein\ncollagen peptide\npaprika\nhoney\nspring water",
      useOnlyPantry: true,
    });
    expect(recipe.unmatchedPantry).toEqual([]);
    expect(recipe.ingredients.map((item) => item.name)).toEqual([
      "Blueberries", "Blackberries", "Acai berries", "Hemp protein",
      "Ground flaxseed", "Paprika", "Water",
    ]);
    expect(recipe.unusedPantry).toEqual(["hemp hearts", "collagen peptide", "honey"]);
    expect(recipe.pantryOnly).toBe(true);
  });

  it("does not report a recognized duplicate liquid alias as unmatched", () => {
    const recipe = generatePersonalizedSmoothie(profile, "general", 16, {
      pantryText: "water, spring water, blueberries, chia seeds",
      useOnlyPantry: true,
    });
    expect(recipe.ingredients.filter((item) => item.name === "Water")).toHaveLength(1);
    expect(recipe.unmatchedPantry).toEqual([]);
  });

  it("recognizes the subscriber's collogen spelling and limits a large pantry to a balanced subset", () => {
    const recipe = generatePersonalizedSmoothie(profile, "mindfulness", 32, {
      pantryText: "strawberries, blue berries, black berries, mango, banana, dragon fruit, acai berries, peaches, pineapple, apple, grapes, chia seeds, flax seed, hemp hearts, hemp protein, collogen peptide, turmeric, paprika, honey, spring water",
      useOnlyPantry: true,
    });
    expect(recipe.unmatchedPantry).toEqual([]);
    expect(recipe.ingredients.length).toBeLessThan(10);
    expect(recipe.ingredients.filter((item) => item.group === "Fruit")).toHaveLength(3);
    expect(recipe.ingredients.filter((item) => item.group === "Protein")).toHaveLength(1);
    expect(recipe.ingredients.filter((item) => item.group === "Seed")).toHaveLength(1);
    expect(recipe.ingredients.filter((item) => item.group === "Liquid")).toHaveLength(1);
    expect(recipe.unusedPantry).toContain("collogen peptide");
  });

  it("calibrates a gentle 16 oz pantry blend without an excessive initial fiber load", () => {
    const recipe = generatePersonalizedSmoothie(profile, "digestion", 16, {
      pantryText: "pineapple, peaches, chia seeds, turmeric, hemp protein, peanut butter, pear, water, spinach",
      useOnlyPantry: true,
    });
    expect(recipe.ingredients.filter((item) => item.group === "Fruit").map((item) => item.amount))
      .toEqual([0.33, 0.33, 0.33]);
    expect(recipe.ingredients.find((item) => item.name === "Chia seeds").amount).toBe(0.5);
    expect(recipe.ingredients.find((item) => item.name === "Spinach").amount).toBe(0.5);
    expect(recipe.nutrition.fiber).toBeLessThan(10);
    expect(recipe.name).toBe("Gentle Gut Blend");
    expect(recipe.fiberNotice).toBeNull();
  });

  it("does not label a high-fiber digestive batch as gentle", () => {
    const recipe = generatePersonalizedSmoothie(profile, "digestion", 32, {
      pantryText: "pineapple, peaches, chia seeds, turmeric, hemp protein, peanut butter, pear, water, spinach",
      useOnlyPantry: true,
    });
    expect(recipe.name).toBe("Fiber-Rich Digestive Blend");
    expect(recipe.fiberNotice).toContain("substantial");
  });
  it("recognizes branded frozen blends and creates a named multi-goal recovery formula", () => {
    const recipe = generatePersonalizedSmoothie(profile, ["inflammation", "protein", "focus", "hydration"], 42, {
      pantryText: "Triple Berry, Dragon Fruit, Acai Energizing Power blend, frozen cucumber, coconut water, hemp protein, chia seeds, turmeric",
      useOnlyPantry: true,
      customName: "Titan Focus Recovery Smoothie",
    });
    expect(recipe.name).toBe("Titan Focus Recovery Smoothie");
    expect(recipe.unmatchedPantry).toEqual([]);
    expect(recipe.ingredients.map((item) => item.name)).toContain("Triple Berry blend");
    expect(recipe.ingredients.map((item) => item.name)).toContain("Cucumber");
    expect(recipe.servings).toBe(2);
    expect(recipe.practicalTips.some((tip) => tip.includes("two stages"))).toBe(true);
  });

  it("grounds third-eye language in ordinary mindfulness and focus", () => {
    const recipe = generatePersonalizedSmoothie(profile, ["mindfulness", "focus"], 24);
    expect(recipe.realityCheck).toContain("cannot literally open a third eye");
  });
});

describe("assessSafety", () => {
  it("flags kidney disease for clinician review", () => {
    expect(assessSafety({ ...profile, conditions: ["Kidney disease"] }).clinicianReviewRequired).toBe(true);
  });

  it("excludes grapefruit-family ingredients for relevant medication categories", () => {
    const safety = assessSafety({ ...profile, medications: "atorvastatin" });
    expect(safety.exclusions).toContain("grapefruit");
  });

  it("flags blood-thinning medicine for review", () => {
    expect(assessSafety({ ...profile, medications: "warfarin" }).clinicianReviewRequired).toBe(true);
  });
});
