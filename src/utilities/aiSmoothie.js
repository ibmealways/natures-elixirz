import { estimateSmoothieNutrition } from "./personalizedSmoothieEngine";

const ingredientKey = (item) => String(item?.name || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");

export function dedupeSmoothieIngredients(items = []) {
  const unique = [];
  items.forEach((item) => {
    const key = ingredientKey(item);
    if (!key) return;
    const existing = unique.find((candidate) => ingredientKey(candidate) === key);
    if (!existing) {
      unique.push({ ...item, name: String(item.name).trim() });
    } else if (existing.unit === item.unit && existing.group === item.group) {
      existing.amount = Math.round((Number(existing.amount) + Number(item.amount)) * 8) / 8;
    }
  });
  return unique;
}

export function mergeAiSmoothieProposal(proposal, fallback) {
  const ingredients = dedupeSmoothieIngredients(Array.isArray(proposal?.ingredients) ? proposal.ingredients.map((item) => ({
    name: String(item.name), group: String(item.group), amount: Number(item.amount), unit: String(item.unit),
  })) : []);
  if (ingredients.length < 5) throw new Error("AI smoothie response was incomplete.");
  return {
    ...fallback,
    name: String(proposal.name || fallback.name).slice(0, 80),
    description: String(proposal.description || fallback.description).slice(0, 320),
    ingredients,
    nutrition: estimateSmoothieNutrition(ingredients),
    benefits: ingredients.map((ingredient) => ({
      name: ingredient.name,
      benefit: String(proposal.ingredients.find((candidate) => ingredientKey(candidate) === ingredientKey(ingredient))?.reason || "Included to support the balance, flavor, and texture of this formula."),
    })),
    preparation: proposal.preparation,
    practicalTips: proposal.practicalTips,
    medicationSafety: proposal.medicationSafety,
    nutritionIntelligence: proposal.nutritionIntelligence,
    optionalPowerUps: [],
    assessment: {
      type: proposal.type,
      summary: `A ${ingredients.length}-ingredient ${proposal.type.toLowerCase()} shaped around the selected intentions, dietary needs, and kitchen preferences. Nutrition values are estimates based on standard ingredient-category averages.`,
      highlights: proposal.benefits,
      ...(proposal.reflux ? { reflux: proposal.reflux } : {}),
    },
    whatHappens: [
      "Blending breaks the foods into smaller particles and disperses their water, fiber, carbohydrate, fat, protein, vitamins, minerals, and plant compounds.",
      "Digestion and absorption vary with the exact products, serving size, preparation, medications, health conditions, and the individual subscriber.",
    ],
    quantumContext: "At the molecular level, ordinary chemistry and physics govern bonds, enzyme reactions, nutrient transport, and energy metabolism. Ingredient-specific quantum-health effects from a smoothie have not been established in human clinical research.",
    generationSource: "ai",
    unusedPantry: [],
    unmatchedPantry: [],
    incompleteFormula: false,
    formulaNeeds: [],
    fiberNotice: null,
  };
}
