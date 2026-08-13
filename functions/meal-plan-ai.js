import { assessNutritionSelection, assertNutritionSafety, createNutritionBrief } from "./nutrition-intelligence.js";

const MEAL_TYPES = ["Smoothie", "Breakfast", "Lunch", "Snack", "Dinner"];

const ingredientSchema = {
  type: "object",
  additionalProperties: false,
  required: ["quantity", "name", "availability"],
  properties: {
    quantity: { type: "string", minLength: 1, maxLength: 32 },
    name: { type: "string", minLength: 1, maxLength: 80 },
    availability: { type: "string", enum: ["on-hand", "needed"] },
  },
};

const mealSchema = {
  type: "object",
  additionalProperties: false,
  required: ["meal", "food", "ingredients", "instructions", "requiresCooking", "rationale"],
  properties: {
    meal: { type: "string", enum: MEAL_TYPES },
    food: { type: "string", minLength: 3, maxLength: 150 },
    ingredients: { type: "array", minItems: 2, maxItems: 14, items: ingredientSchema },
    instructions: { type: "array", minItems: 1, maxItems: 7, items: { type: "string", minLength: 3, maxLength: 220 } },
    requiresCooking: { type: "boolean" },
    rationale: { type: "string", minLength: 10, maxLength: 320 },
  },
};

export const mealPlanSchema = {
  type: "object",
  additionalProperties: false,
  required: ["days", "summary", "medicationSafety"],
  properties: {
    summary: { type: "string", minLength: 10, maxLength: 400 },
    medicationSafety: {
      type: "object", additionalProperties: false, required: ["reviewRequired", "status", "note", "foodsAvoided"],
      properties: {
        reviewRequired: { type: "boolean" },
        status: { type: "string", enum: ["No medication information provided", "Pharmacist review advised", "Potential interaction avoided"] },
        note: { type: "string", minLength: 10, maxLength: 400 },
        foodsAvoided: { type: "array", maxItems: 10, items: { type: "string", maxLength: 80 } },
      },
    },
    days: {
      type: "array",
      minItems: 1,
      maxItems: 7,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["day", "meals"],
        properties: {
          day: { type: "integer", minimum: 1, maximum: 7 },
          meals: { type: "array", minItems: 5, maxItems: 5, items: mealSchema },
        },
      },
    },
  },
};

const cleanList = (items, limit = 160) => [...new Set((Array.isArray(items) ? items : [])
  .map((item) => String(item || "").trim()).filter(Boolean))].slice(0, limit);

export function buildMealPlanContext(profile = {}, request = {}) {
  const requestedDays = Math.min(7, Math.max(1, Number(request.days) || 1));
  const rawCrossTier = request.crossTierContext && typeof request.crossTierContext === "object"
    ? request.crossTierContext
    : {};
  const rawSmoothie = rawCrossTier.smoothie && typeof rawCrossTier.smoothie === "object"
    ? rawCrossTier.smoothie
    : null;
  const includeFrequency = rawCrossTier.frequencyIncludedBySubscriber === true;
  const context = {
    goal: String(request.goal || "general").slice(0, 40),
    goalLabel: String(request.goalLabel || request.goal || "Everyday nutrition").slice(0, 80),
    days: requestedDays,
    planningMonth: Math.min(12, Math.max(1, Math.floor(Number(request.planningMonth) || 1))),
    variation: Math.max(0, Number(request.variationSeed) || 0),
    kitchenItems: cleanList(request.kitchenItems),
    smoothieContext: rawSmoothie ? {
      recipeName: String(rawSmoothie.recipeName || "").slice(0, 120),
      goal: String(rawSmoothie.goal || "").slice(0, 60),
      selectedGoals: cleanList(rawSmoothie.selectedGoals, 12),
      ingredients: (rawSmoothie.ingredients || []).slice(0, 24).map((item) => ({
        name: String(typeof item === "string" ? item : item?.name || "").trim().slice(0, 120),
        quantity: String(typeof item === "string" ? "quantity saved in Tier 1" : `${item?.amount ?? ""} ${item?.unit || ""}`.trim() || item?.quantity || "quantity saved in Tier 1").slice(0, 40),
      })).filter((item) => item.name),
      nutrition: rawSmoothie.nutrition && typeof rawSmoothie.nutrition === "object"
        ? {
            calories: Number(rawSmoothie.nutrition.calories) || 0,
            protein: Number(rawSmoothie.nutrition.protein) || 0,
            fiber: Number(rawSmoothie.nutrition.fiber) || 0,
            sugar: Number(rawSmoothie.nutrition.sugar) || 0,
          }
        : null,
    } : null,
    frequencyContext: includeFrequency && rawCrossTier.frequency &&
      typeof rawCrossTier.frequency === "object"
      ? {
          hz: Number(rawCrossTier.frequency.hz) || null,
          title: String(rawCrossTier.frequency.title || "").slice(0, 120),
          goal: String(rawCrossTier.frequency.goal || "").slice(0, 60),
        }
      : null,
    frequencyIncludedBySubscriber: includeFrequency,
    profile: {
      age: String(profile.age || "").slice(0, 8),
      weight: String(profile.weight || "").slice(0, 12),
      height: String(profile.height || "").slice(0, 12),
      dietaryPattern: String(profile.dietaryPattern || "omnivore").slice(0, 40),
      activity: String(profile.activity || "moderate").slice(0, 30),
      healthGoals: cleanList(profile.healthGoals, 20),
      conditions: cleanList(profile.conditions, 20),
      otherHealthConditions: String(profile.otherHealthConditions || "").slice(0, 1000),
      surgicalHistory: String(profile.surgicalHistory || "").slice(0, 1000),
      allergies: String(profile.allergies || "").slice(0, 500),
      avoidIngredients: String(profile.avoidIngredients || "").slice(0, 500),
      medications: String(profile.medications || "").slice(0, 500),
    },
  };
  context.nutritionBrief = createNutritionBrief(context.profile, [context.goal]);
  return context;
}

export function buildMealPlanInstructions(context) {
  return `You are the dedicated Nature's Elixirz Meal Plan intelligence layer. Create a practical, coherent, whole-food meal plan for the exact selected nourishment rhythm.

SELECTED RHYTHM: ${context.goalLabel} (${context.goal})
DAYS: ${context.days}
SUBSCRIPTION PLANNING MONTH: ${context.planningMonth} (month 1 begins on the subscriber's current subscription anniversary date)
SUBSCRIBER PROFILE: ${JSON.stringify(context.profile)}
AVAILABLE PANTRY, FRIDGE, AND FREEZER ITEMS: ${JSON.stringify(context.kitchenItems)}
LATEST TIER 1 SMOOTHIE CONTEXT: ${JSON.stringify(context.smoothieContext)}
OPTIONAL TIER 2 FREQUENCY CONTEXT: ${context.frequencyIncludedBySubscriber ? JSON.stringify(context.frequencyContext) : "Not included—the subscriber came directly from Tier 1 or did not choose Frequency."}
ALTERNATE REQUEST NUMBER: ${context.variation}

Requirements:
- When a latest Tier 1 smoothie is supplied, use that exact smoothie as Day 1's Smoothie entry with its saved name and ingredients. Coordinate the other meals directly with it: complement its nutritional pattern, account for its estimated nutrients, and avoid unnecessary repetition of its main ingredients. Tier 1 can communicate directly with Tier 3; visiting Tier 2 is never required.
- Use Tier 2 Frequency context only when frequencyIncludedBySubscriber is true. Treat it solely as optional experiential context. Never infer medical, nutritional, physiological, diagnostic, or treatment effects from a Hz value.
- The selected rhythm must materially control food selection. For muscle nourishment, distribute meaningful protein across breakfast, lunch, snack, and dinner and include useful carbohydrate around recovery; do not merely rename an ordinary plan.
- Respect every allergy, intolerance, dietary pattern, avoided ingredient, and relevant condition. Never claim treatment, prevention, detoxification, or guaranteed organ benefit.
- Prefer coherent recognizable dishes. Never create pairings such as meat with fruit as a snack, beans with waffles unless it is a recognizable savory recipe, or ingredients that do not make culinary sense together.
- Use available kitchen items where they fit naturally. Mark them on-hand. You may add goal-supportive missing foods and mark them needed so the app can build a shopping list.
- Pantry availability must not override safety, dietary restrictions, culinary coherence, or the selected rhythm.
- Exactly five entries per day in this order: Smoothie, Breakfast, Lunch, Snack, Dinner. Avoid repeating the same dish or dominant ingredients across days.
- Quantities are for one adult serving and must use familiar English measurements such as 1 cup, 3/4 cup, 1/2 cup, 1/4 cup, tbsp, tsp, oz, piece, or count. Do not use decimals.
- Smoothies require blending instructions. Cooked meals need concise, food-safe instructions. Include ordinary culinary herbs or spices where appropriate; do not prescribe supplements or medicinal doses.
- Never select foods to amplify, boost, complement, or counteract a medication's pharmacologic effect.
- Review the exact medication text for possible food interactions. Avoid a recognized conflict when a safe ordinary-food substitute exists; otherwise set medicationSafety.reviewRequired to true and advise confirmation with a pharmacist.
- For warfarin, do not simply eliminate leafy greens or other vitamin K foods. Stable vitamin K intake is important, so warn against major intake changes and require pharmacist/prescriber confirmation.
- Grapefruit, pomelo, tangelo, and Seville orange interact with some, not all, medicines. Exclude them when the entered medicine or its label warrants it; if uncertain, request pharmacist review rather than guessing.
- Do not declare the plan medication-safe. Do not recommend changing medication dose or timing. Only the pharmacist or prescriber can confirm individual compatibility.
- rationale must briefly explain why the complete meal fits the selected rhythm, using cautious educational language.
- The output is educational wellness guidance, not diagnosis or medical treatment.

Return only schema-valid JSON.`;
}

const normalize = (value) => String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

export function validateMealPlanProposal(proposal, context) {
  if (!proposal || !Array.isArray(proposal.days) || proposal.days.length !== context.days) throw new Error("Incorrect number of days.");
  const restrictions = `${context.profile.allergies},${context.profile.avoidIngredients}`
    .split(/[,;\n]/).map(normalize).filter((item) => item.length > 2);
  const kitchen = context.kitchenItems.map(normalize);
  const planDishes = new Set();
  return proposal.days.map((day, dayIndex) => {
    if (!Array.isArray(day.meals) || day.meals.length !== 5) throw new Error(`Day ${dayIndex + 1} must have five meals.`);
    const seen = new Set();
    const meals = day.meals.map((proposedMeal, mealIndex) => {
      const pairedSmoothie = dayIndex === 0 && mealIndex === 0 && context.smoothieContext?.recipeName
        ? {
            ...proposedMeal,
            food: context.smoothieContext.recipeName,
            ingredients: context.smoothieContext.ingredients,
            instructions: ["Use the exact Tier 1 smoothie formulation already generated and saved for this pairing."],
            requiresCooking: false,
            rationale: `This is the subscriber's exact Tier 1 smoothie; the remaining meals are coordinated around it.`,
          }
        : null;
      const meal = pairedSmoothie || proposedMeal;
      if (meal.meal !== MEAL_TYPES[mealIndex]) throw new Error(`Meal order is invalid on day ${dayIndex + 1}.`);
      const ingredients = meal.ingredients.map((ingredient) => {
        const name = String(ingredient.name || "").trim();
        const normalized = normalize(name);
        if (!name || restrictions.some((item) => normalized.includes(item))) throw new Error(`Restricted ingredient proposed: ${name}`);
        const onHand = kitchen.some((item) => item && (item.includes(normalized) || normalized.includes(item)));
        return { quantity: String(ingredient.quantity).trim(), name, availability: onHand ? "on-hand" : "needed" };
      });
      const dishKey = normalize(meal.food);
      if (seen.has(dishKey)) throw new Error("Duplicate dish in the same day.");
      if (planDishes.has(dishKey)) throw new Error("The AI plan repeated a dish across multiple days.");
      seen.add(dishKey);
      planDishes.add(dishKey);
      const nutritionIntelligence = assertNutritionSafety(assessNutritionSelection({
        ingredients,
        profile: context.profile,
        goals: [context.goal],
        kind: meal.meal.toLowerCase(),
      }));
      return {
        meal: meal.meal,
        food: String(meal.food).trim(),
        ingredients,
        instructions: meal.instructions.map((step) => String(step).trim()),
        requiresCooking: Boolean(meal.requiresCooking),
        rationale: String(meal.rationale).trim(),
        pantryDriven: ingredients.some((item) => item.availability === "on-hand"),
        generationSource: "openai",
        nutritionIntelligence,
      };
    });
    const dailyGoalFit = Math.round(meals.reduce((total, meal) => total + meal.nutritionIntelligence.goalFitScore, 0) / meals.length);
    if (dailyGoalFit < 35) throw new Error(`Day ${dayIndex + 1} did not meaningfully fit the selected nourishment goal.`);
    return { day: dayIndex + 1, reviewedProfile: true, reviewedKitchenItems: context.kitchenItems.length, dailyGoalFit, meals, generationSource: "openai" };
  });
}

export function summarizeMealPlanIntelligence(plan, context) {
  const assessments = plan.flatMap((day) => day.meals.map((meal) => meal.nutritionIntelligence));
  const averageGoalFit = assessments.length
    ? Math.round(assessments.reduce((total, item) => total + item.goalFitScore, 0) / assessments.length)
    : 0;
  return {
    version: "nutrition-intelligence-v1",
    selectedGoal: context.goal,
    averageGoalFit,
    mealsReviewed: assessments.length,
    professionalReviewRequired: assessments.some((item) => item.requiresProfessionalReview),
    warnings: [...new Set(assessments.flatMap((item) => item.warnings))],
    boundary: "Educational food guidance only. A qualified clinician or pharmacist must confirm individual medical and medication compatibility.",
  };
}
