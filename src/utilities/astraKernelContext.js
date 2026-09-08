import { getKitchenInventory } from "./kitchenInventory";
import { getMealKitchenInventory } from "./mealKitchenInventory";
import { getSavedRecipes } from "./recipeStorage";
import { getTaiChiProgress, getWellnessJourney } from "./wellnessJourney";
import { buildKernelBrief, buildLearningProfile, getWellnessExchange } from "./wellnessExchange";

function summarizeRecipe(recipe = {}) {
  return {
    name: recipe.name,
    sizeOz: recipe.sizeOz,
    ingredients: (recipe.ingredients || []).slice(0, 16).map((item) => ({
      name: item.name,
      quantity: item.quantity || [item.amount, item.unit].filter(Boolean).join(" "),
    })),
  };
}

export function buildAstraKernelContext(scope = "guest") {
  const journey = getWellnessJourney(scope);
  const kernelBrief = buildKernelBrief(scope, "astra");
  const exchange = getWellnessExchange(scope);
  return {
    smoothieKitchen: getKitchenInventory(scope),
    mealPlanKitchen: getMealKitchenInventory(scope),
    savedSmoothies: getSavedRecipes(scope).slice(-8).reverse().map(summarizeRecipe),
    currentMealPlan: {
      goal: journey.meals?.goal,
      days: journey.meals?.days,
      plan: Array.isArray(journey.meals?.plan) ? journey.meals.plan.slice(0, 7) : [],
    },
    frequency: journey.frequency || {},
    taiChi: { current: journey.taiChi || {}, progress: getTaiChiProgress(scope) },
    movement: journey.movement || {},
    kernelSignals: {
      signals: kernelBrief.signals,
      kernelMemory: kernelBrief.kernelMemory,
      learningProfiles: {
        smoothie: buildLearningProfile(exchange, "smoothie"),
        meals: buildLearningProfile(exchange, "meals"),
      },
      updatedAt: kernelBrief.updatedAt,
    },
  };
}
