import { assessNutritionSelection, assertNutritionSafety, createNutritionBrief } from "./nutrition-intelligence.js";
import { validateMealDayQuantities, validateMealIngredientQuantity } from "./meal-quantity-validation.js";
import { assessHighRiskNutritionProfile, summarizeMultiDayNutrition } from "./nutrition-foundation.js";
import { validateNutritionLabels } from "./branded-nutrition.js";

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

const EIGHTH_FRACTIONS = ["", "1/8", "1/4", "3/8", "1/2", "5/8", "3/4", "7/8"];
export function formatTierOneQuantity(item = {}) {
  if (typeof item === "string") return "quantity saved in Tier 1";
  const amount = Number(item?.amount);
  const unit = String(item?.unit || "").trim();
  if (!Number.isFinite(amount) || amount <= 0) return String(item?.quantity || "quantity saved in Tier 1").trim();
  const eighths = Math.round(amount * 8);
  if (Math.abs(amount - (eighths / 8)) > 0.011) return `${amount} ${unit}`.trim();
  const whole = Math.floor(eighths / 8);
  const fraction = EIGHTH_FRACTIONS[eighths % 8];
  return `${whole || ""}${whole && fraction ? " " : ""}${fraction} ${unit}`.trim();
}

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
    astraRequest: request.astraRequest && typeof request.astraRequest === "object" ? {
      title: String(request.astraRequest.title || "").slice(0, 100),
      ingredients: (request.astraRequest.ingredients || []).slice(0, 24).map((item) => String(item?.name || "").slice(0, 80)).filter(Boolean),
      notes: cleanList(request.astraRequest.notes, 8),
    } : null,
    kitchenItems: cleanList(request.kitchenItems),
    nutritionLabels: validateNutritionLabels(request.nutritionLabels),
    smoothieContext: rawSmoothie ? {
      recipeName: String(rawSmoothie.recipeName || "").slice(0, 120),
      goal: String(rawSmoothie.goal || "").slice(0, 60),
      selectedGoals: cleanList(rawSmoothie.selectedGoals, 12),
      ingredients: (rawSmoothie.ingredients || []).slice(0, 24).map((item) => ({
        name: String(typeof item === "string" ? item : item?.name || "").trim().slice(0, 120),
        quantity: formatTierOneQuantity(item).slice(0, 40),
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
      sex: String(profile.sex || profile.biologicalSex || "").slice(0, 20),
      weight: String(profile.weight || "").slice(0, 12),
      height: String(profile.height || "").slice(0, 12),
      dietaryPattern: String(profile.dietaryPattern || "omnivore").slice(0, 40),
      activity: String(profile.activity || "moderate").slice(0, 30),
      healthGoals: cleanList(profile.healthGoals, 20),
      conditions: cleanList(profile.conditions, 20),
      otherHealthConditions: String(profile.otherHealthConditions || "").slice(0, 1000),
      surgicalHistory: String(profile.surgicalHistory || "").slice(0, 1000),
      allergies: String(profile.allergies || "").slice(0, 500),
      intolerances: String(profile.intolerances || "").slice(0, 500),
      avoidIngredients: String(profile.avoidIngredients || "").slice(0, 500),
      medications: String(profile.medications || "").slice(0, 500),
    },
    learning: {
      feedbackCount: Math.min(30, Math.max(0, Number(request.learning?.feedbackCount) || 0)),
      likedSelections: cleanList(request.learning?.likedSelections, 10),
      dislikedSelections: cleanList(request.learning?.dislikedSelections, 10),
      preferredIngredients: cleanList(request.learning?.preferredIngredients, 12),
      cautionIngredients: cleanList(request.learning?.cautionIngredients, 12),
      source: request.learning?.source === "explicit-subscriber-feedback" ? "explicit-subscriber-feedback" : "none",
    },
  };
  context.nutritionBrief = createNutritionBrief(context.profile, [context.goal]);
  context.highRiskScreen = assessHighRiskNutritionProfile(context.profile);
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
EXPLICIT SUBSCRIBER FEEDBACK: ${JSON.stringify(context.learning)}
SUBSCRIBER-ENTERED PACKAGE NUTRITION FACTS: ${JSON.stringify(context.nutritionLabels)}
ALTERNATE REQUEST NUMBER: ${context.variation}

Requirements:
- When a latest Tier 1 smoothie is supplied, use that exact smoothie as Day 1's Smoothie entry with its saved name and ingredients. Coordinate the other meals directly with it: complement its nutritional pattern, account for its estimated nutrients, and avoid unnecessary repetition of its main ingredients. Tier 1 can communicate directly with Tier 3; visiting Tier 2 is never required.
- Use Tier 2 Frequency context only when frequencyIncludedBySubscriber is true. Treat it solely as optional experiential context. Never infer medical, nutritional, physiological, diagnostic, or treatment effects from a Hz value.
- The selected rhythm must materially control food selection. For muscle nourishment, distribute meaningful protein across breakfast, lunch, snack, and dinner and include useful carbohydrate around recovery; do not merely rename an ordinary plan.
- Respect every allergy, intolerance, dietary pattern, avoided ingredient, and relevant condition. Never claim treatment, prevention, detoxification, or guaranteed organ benefit.
- Prefer coherent recognizable dishes. Never create pairings such as meat with fruit as a snack, beans with waffles unless it is a recognizable savory recipe, or ingredients that do not make culinary sense together.
- Every non-garnish ingredient in a cooked meal must have a clear role in the cooking or plating instructions. Do not append unused pantry foods merely to increase ingredient or nutrient coverage.
- Do not combine a savory meat-and-starch breakfast with multiple unrelated sweet items. Choose one cohesive breakfast format and place at most one simple fruit side with it.
- Do not list both a specific green such as spinach and generic "leafy greens." Name one exact vegetable. Mashed-potato and legume meals must be a recognizable preparation such as a shepherd-style pie, stew, or croquette—not a generic inventory bowl.
- A pantry label containing several different deli meats or meats plus cheese is not one valid recipe protein. Select one exact protein and give it a defined role in a sandwich, wrap, salad, or composed plate.
- Snacks containing raw eggs, oats, seeds, and fruit must become a recognizable cooked preparation such as an oat muffin or baked oat cup. Do not present unprepared recipe components as a finished snack.
- Use available kitchen items where they fit naturally. Mark them on-hand. You may add goal-supportive missing foods and mark them needed so the app can build a shopping list.
- Treat explicit feedback as a soft preference: avoid repeating disliked plan selections and favor preferred foods only when they remain safe, balanced, coherent, and suitable for the current goal. Feedback never overrides allergies, avoid lists, medication cautions, or professional-review flags.
- Pantry availability must not override safety, dietary restrictions, culinary coherence, or the selected rhythm.
- Exactly five entries per day in this order: Smoothie, Breakfast, Lunch, Snack, Dinner.
- Every day must use a different culinary format for Breakfast, Lunch, Snack, and Dinner. Changing only the fruit, vegetable, yogurt flavor, seasoning, or side does not create a different dish. For example, do not repeat eggs with toast on multiple days, tuna sandwiches on multiple days, yogurt cups on multiple days, or fried rice on multiple days.
- Across a multi-day plan, rotate cooking methods and recognizable formats such as an omelet, oatmeal, parfait, toast, soup, wrap, grain bowl, salad, roasted plate, skillet, and baked snack while keeping each choice appropriate to its meal occasion.
- Quantities are for one adult serving and must use familiar English measurements such as 1 cup, 3/4 cup, 1/2 cup, 1/4 cup, tbsp, tsp, pinch, oz, piece, or count. Do not use decimals.
- For a linked branded product, use its exact linked ingredient name and a compatible label serving unit. Package values are subscriber-entered and schema-validated, not independently laboratory-verified.
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

const CULINARY_GARNISH = /\b(salt|pepper|seasoning|spice|herb|thyme|paprika|garlic|cumin|oregano|basil|rosemary|cinnamon|oil)\b/;
const SAVORY_PROTEIN = /\b(chicken|turkey|beef|pork|ham|sausage|fish|salmon|tuna|shrimp)\b/;
const SWEET_BREAKFAST_COMPONENT = /\b(banana|berries|berry|mango|dragon fruit|melon|peach|pear|apple|pineapple|nut butter|peanut butter|maple|honey)\b/;
const LEGUME = /\b(bean|beans|lentil|lentils|chickpea|chickpeas)\b/;
const EGG = /\b(egg|eggs)\b/;
const DAIRY_PROTEIN = /\b(yogurt|cottage cheese)\b/;
const FRUIT = /\b(apple|banana|berries|berry|blueberr|strawberr|raspberr|blackberr|mango|orange|peach|pear|pineapple|melon|kiwi|fruit)\b/;
const BREAKFAST_GRAIN = /\b(oat|oats|oatmeal|bread|toast|waffle|pancake|quinoa)\b/;
const RECOGNIZABLE_DISH = /\b(scramble|omelet|frittata|oatmeal|overnight oats|pudding|parfait|bowl|yogurt cup|toast|sandwich|wrap|salad|soup|stew|chili|taco|burrito|curry|stir fry|fried rice|skillet|pasta|roast|roasted|baked|grilled|plate|chicken and waffles)\b/;

function culinaryFormatKey(meal) {
  const dish = normalize(meal.food);
  const formats = [
    "overnight oats", "fried rice", "chicken and waffles", "breakfast sandwich", "breakfast burrito",
    "egg bite", "snack plate", "grain bowl", "yogurt cup", "yogurt breakfast bowl",
    "omelet", "frittata", "scramble", "oatmeal", "pudding", "parfait", "toast", "sandwich",
    "wrap", "salad", "soup", "stew", "chili", "taco", "burrito", "curry", "stir fry",
    "skillet", "pasta", "roast", "roasted", "baked", "grilled", "bowl", "plate",
  ];
  const format = formats.find((candidate) => dish.includes(candidate)) || dish;
  return `${meal.meal}:${format}`;
}

function assertCulinaryCoherence(meal, ingredients, dayNumber) {
  if (meal.meal === "Smoothie") return;
  const dish = normalize(meal.food);
  const ingredientNames = ingredients.map((item) => normalize(item.name));
  const instructions = normalize((meal.instructions || []).join(" "));
  const label = `Day ${dayNumber} ${meal.meal}`;
  const substantiveNames = ingredientNames.filter((name) => name && !CULINARY_GARNISH.test(name));

  const hasGenericGreens = ingredientNames.some((name) => /\bleafy greens\b/.test(name));
  const hasSpecificGreens = ingredientNames.some((name) => /\b(spinach|kale|collard|chard|arugula)\b/.test(name));
  if (hasGenericGreens && hasSpecificGreens) {
    throw new Error(`${label} duplicated leafy greens instead of defining one coherent vegetable.`);
  }

  const ambiguousDeliMix = ingredientNames.some((name) => {
    const deliMatches = name.match(/\b(ham|pepperoni|salami|chicken|turkey|bologna|cheese)\b/g) || [];
    return /cold cuts|deli meat/.test(name) && new Set(deliMatches).size > 1;
  });
  if (ambiguousDeliMix) {
    throw new Error(`${label} used an ambiguous multi-protein deli assortment instead of one defined recipe ingredient.`);
  }

  if (meal.meal === "Snack") {
    const hasEgg = ingredientNames.some((name) => /\begg|eggs\b/.test(name));
    const hasBakingComponents = ingredientNames.some((name) => /\b(oat|oats|flour)\b/.test(name)) && ingredientNames.some((name) => /\b(berry|berries|blueberr|strawberr|raspberr|blackberr|fruit)/.test(name));
    const isDefinedEggSnack = /\b(muffin|baked|oat cup|frittata|egg bite|hard boiled|deviled)\b/.test(dish);
    if (hasEgg && hasBakingComponents && (!meal.requiresCooking || !isDefinedEggSnack)) {
      throw new Error(`${label} listed egg, grain, and fruit components without defining a cooked snack recipe.`);
    }
    const hasMealProtein = substantiveNames.some((name) => SAVORY_PROTEIN.test(name));
    const isDefinedSavorySnack = /\b(egg bite|frittata|deviled|hard boiled|snack plate|lettuce wrap)\b/.test(dish);
    if (hasMealProtein && !isDefinedSavorySnack) {
      throw new Error(`${label} used a lunch-or-dinner protein without defining a recognizable savory snack.`);
    }
    if (substantiveNames.length > 4) throw new Error(`${label} included too many unrelated components for one snack.`);
    if (!RECOGNIZABLE_DISH.test(dish)) throw new Error(`${label} did not identify a recognizable prepared dish.`);
    return;
  }

  if (meal.requiresCooking && ingredients.length >= 4) {
    const omitted = ingredientNames.filter((name) => {
      if (!name || CULINARY_GARNISH.test(name)) return false;
      const meaningful = name.split(" ").filter((token) => token.length >= 4 && !/^(fresh|frozen|cooked|whole|plain|sliced|chopped)$/.test(token));
      return meaningful.length > 0 && !meaningful.some((token) => instructions.includes(token));
    });
    if (omitted.length) {
      throw new Error(`${label} cooking instructions did not account for: ${omitted.join(", ")}.`);
    }
  }

  if (meal.meal === "Breakfast" && ingredientNames.some((name) => SAVORY_PROTEIN.test(name))) {
    const sweetComponents = ingredientNames.filter((name) => SWEET_BREAKFAST_COMPONENT.test(name));
    if (sweetComponents.length > 1 && !/\b(hash|sandwich|wrap|taco|burrito)\b/.test(dish)) {
      throw new Error(`${label} combined a savory meat plate with too many unrelated sweet breakfast components.`);
    }
  }

  if (meal.meal === "Breakfast") {
    const hasBreakfastFoundation = substantiveNames.some((name) => EGG.test(name) || DAIRY_PROTEIN.test(name) || BREAKFAST_GRAIN.test(name));
    const hasNonBreakfastProtein = substantiveNames.some((name) => /\b(tuna|salmon|fish|pork ribs?|cold cuts?|pepperoni|deli meat|kidney beans?)\b/.test(name));
    const definedSavoryBreakfast = /\b(hash|breakfast sandwich|breakfast burrito|breakfast taco|salmon toast|beans on toast)\b/.test(dish);
    if (!hasBreakfastFoundation && !definedSavoryBreakfast) throw new Error(`${label} lacked a credible breakfast foundation.`);
    if (hasNonBreakfastProtein && !definedSavoryBreakfast) throw new Error(`${label} used a lunch-or-dinner protein without a recognized breakfast preparation.`);
  }

  if (["Lunch", "Dinner"].includes(meal.meal)) {
    const fruitComponents = substantiveNames.filter((name) => FRUIT.test(name));
    const fruitHasCulinaryRole = /\b(salad|salsa|chutney|glaze|relish|roasted|stuffed)\b/.test(dish)
      && fruitComponents.every((name) => name.split(" ").some((token) => token.length >= 4 && instructions.includes(token)));
    if (fruitComponents.length > 0 && !fruitHasCulinaryRole) {
      throw new Error(`${label} added fruit without a defined culinary role in the dish.`);
    }
  }

  if (!RECOGNIZABLE_DISH.test(dish)) {
    throw new Error(`${label} did not identify a recognizable prepared dish.`);
  }

  const hasMash = ingredientNames.some((name) => /\bmashed potato/.test(name));
  const hasLegume = ingredientNames.some((name) => LEGUME.test(name));
  const vegetableCount = ingredientNames.filter((name) => /\b(carrot|spinach|kale|greens|broccoli|cauliflower|pepper|tomato|zucchini)\b/.test(name)).length;
  if (["Lunch", "Dinner"].includes(meal.meal) && hasMash && hasLegume && vegetableCount > 2 && !/\b(shepherd|cottage|pie|stew|croquette)\b/.test(dish)) {
    throw new Error(`${label} was an undefined inventory bowl rather than a recognizable mashed-potato and legume recipe.`);
  }
}

export function validateMealPlanProposal(proposal, context) {
  if (!proposal || !Array.isArray(proposal.days) || proposal.days.length !== context.days) throw new Error("Incorrect number of days.");
  const restrictions = `${context.profile.allergies},${context.profile.intolerances},${context.profile.avoidIngredients}`
    .split(/[,;\n]/).map(normalize).filter((item) => item.length > 2);
  const kitchen = context.kitchenItems.map(normalize);
  const planDishes = new Set();
  const planFormats = new Set();
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
        const quantity = String(ingredient.quantity).trim();
        const quantityValidation = validateMealIngredientQuantity({ quantity, name });
        return { quantity, name, availability: onHand ? "on-hand" : "needed", quantityValidation };
      });
      assertCulinaryCoherence(meal, ingredients, dayIndex + 1);
      const dishKey = normalize(meal.food);
      if (seen.has(dishKey)) throw new Error("Duplicate dish in the same day.");
      if (planDishes.has(dishKey)) throw new Error("The AI plan repeated a dish across multiple days.");
      const formatKey = culinaryFormatKey(meal);
      if (planFormats.has(formatKey)) throw new Error(`The AI plan repeated the same ${meal.meal.toLowerCase()} culinary format across multiple days.`);
      seen.add(dishKey);
      planDishes.add(dishKey);
      planFormats.add(formatKey);
      const nutritionIntelligence = assertNutritionSafety(assessNutritionSelection({
        ingredients,
        profile: context.profile,
        goals: [context.goal],
        kind: meal.meal.toLowerCase(),
        nutritionLabels: context.nutritionLabels,
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
    const quantityValidation = validateMealDayQuantities(meals);
    const dailyGoalFit = Math.round(meals.reduce((total, meal) => total + meal.nutritionIntelligence.goalFitScore, 0) / meals.length);
    if (dailyGoalFit < 35) throw new Error(`Day ${dayIndex + 1} did not meaningfully fit the selected nourishment goal.`);
    return { day: dayIndex + 1, reviewedProfile: true, reviewedKitchenItems: context.kitchenItems.length, dailyGoalFit, quantityValidation, meals, generationSource: "openai" };
  });
}

export function summarizeMealPlanIntelligence(plan, context) {
  const assessments = plan.flatMap((day) => day.meals.map((meal) => meal.nutritionIntelligence));
  const averageGoalFit = assessments.length
    ? Math.round(assessments.reduce((total, item) => total + item.goalFitScore, 0) / assessments.length)
    : 0;
  return {
    version: "nutrition-intelligence-v2",
    selectedGoal: context.goal,
    averageGoalFit,
    mealsReviewed: assessments.length,
    professionalReviewRequired: assessments.some((item) => item.requiresProfessionalReview),
    warnings: [...new Set(assessments.flatMap((item) => item.warnings))],
    highRiskScreen: context.highRiskScreen || assessHighRiskNutritionProfile(context.profile),
    dailyNutrition: summarizeMultiDayNutrition(plan, context.profile),
    goalFitBoundary: "Goal fit measures ingredient-pattern alignment only. It is not a nutrient-adequacy score.",
    boundary: "Educational food guidance only. A qualified clinician or pharmacist must confirm individual medical and medication compatibility.",
  };
}
