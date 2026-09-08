import { assessNutritionSelection, assertNutritionSafety, createNutritionBrief } from "./nutrition-intelligence.js";
import { validateMealDayQuantities, validateMealIngredientQuantity } from "./meal-quantity-validation.js";
import { assessHighRiskNutritionProfile, summarizeMultiDayNutrition } from "./nutrition-foundation.js";
import { validateNutritionLabels } from "./branded-nutrition.js";

const MEAL_TYPES = ["Smoothie", "Breakfast", "Lunch", "Snack", "Dinner"];
const HOUSEHOLD_STAPLES = new Set(["water", "tap water", "filtered water", "ice", "ice cube", "ice cubes"]);
const VEGETARIAN_ANIMAL_FLESH = /\b(chicken|turkey|beef|veal|pork|lamb|mutton|venison|bison|duck|goose|rabbit|ham|bacon|sausage|pepperoni|prosciutto|salami|fish|salmon|tuna|cod|tilapia|trout|halibut|anchov(?:y|ies)|sardine|shrimp|prawn|crab|lobster|scallop|clam|mussel|oyster|gelatin)\b/i;
const VEGAN_ANIMAL_PRODUCTS = /\b(egg|eggs|milk|cheese|yogurt|butter|ghee|cream|whey|casein|honey)\b/i;

export function isHouseholdStapleIngredient(value) {
  return HOUSEHOLD_STAPLES.has(String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim());
}

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
      maxItems: 30,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["day", "meals"],
        properties: {
          day: { type: "integer", minimum: 1, maximum: 30 },
          meals: { type: "array", minItems: 5, maxItems: 5, items: mealSchema },
        },
      },
    },
  },
};

export function mealPlanSchemaForDays(days) {
  const exactDays = Math.min(30, Math.max(1, Math.floor(Number(days) || 1)));
  return {
    ...mealPlanSchema,
    properties: {
      ...mealPlanSchema.properties,
      days: {
        ...mealPlanSchema.properties.days,
        minItems: exactDays,
        maxItems: exactDays,
      },
    },
  };
}

export function mealPlanGenerationChunks(days, maximumChunkDays = 3) {
  const total = Math.min(30, Math.max(1, Math.floor(Number(days) || 1)));
  const maximum = Math.min(7, Math.max(1, Math.floor(Number(maximumChunkDays) || 3)));
  const chunks = [];
  for (let startDay = 1; startDay <= total; startDay += maximum) {
    chunks.push({ startDay, days: Math.min(maximum, total - startDay + 1) });
  }
  return chunks;
}

export const mealRepairSchema = {
  type: "object",
  additionalProperties: false,
  required: ["replacement", "medicationSafety"],
  properties: {
    replacement: mealSchema,
    medicationSafety: mealPlanSchema.properties.medicationSafety,
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

const smoothieIngredientKey = (value) => String(value || "")
  .toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

export function normalizeSmoothieHandoffIngredients(items = []) {
  const normalized = [];
  const positions = new Map();
  for (const rawItem of (Array.isArray(items) ? items : []).slice(0, 24)) {
    const item = typeof rawItem === "string" ? { name: rawItem } : (rawItem || {});
    const name = String(item.name || "").trim().slice(0, 120);
    if (!name) continue;
    const amount = Number(item.amount);
    const unit = String(item.unit || "").trim();
    const key = smoothieIngredientKey(name);
    const existingIndex = positions.get(key);
    if (existingIndex === undefined) {
      positions.set(key, normalized.length);
      normalized.push({
        name,
        amount: Number.isFinite(amount) && amount > 0 ? amount : null,
        unit,
        quantity: formatTierOneQuantity(item).slice(0, 40),
      });
      continue;
    }

    const existing = normalized[existingIndex];
    if (existing.amount !== null && Number.isFinite(amount) && amount > 0 &&
        smoothieIngredientKey(existing.unit) === smoothieIngredientKey(unit)) {
      existing.amount += amount;
      existing.quantity = formatTierOneQuantity({ amount: existing.amount, unit: existing.unit }).slice(0, 40);
      continue;
    }

    // Exact duplicate legacy entries are safely collapsed. Incompatible units remain
    // explicit so corrupt upstream data is never silently converted.
    const quantity = formatTierOneQuantity(item).slice(0, 40);
    if (existing.quantity === quantity) continue;
    normalized.push({ name, amount: Number.isFinite(amount) && amount > 0 ? amount : null, unit, quantity });
  }
  return normalized.map(({ name, quantity }) => ({ name, quantity }));
}

export function buildMealPlanContext(profile = {}, request = {}) {
  const requestedDays = Math.min(30, Math.max(1, Number(request.days) || 1));
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
    continuation: request.continuation && typeof request.continuation === "object" ? {
      startDay: Math.min(30, Math.max(1, Math.floor(Number(request.continuation.startDay) || 1))),
      totalDays: Math.min(30, Math.max(1, Math.floor(Number(request.continuation.totalDays) || requestedDays))),
      lockedMeals: cleanList(request.continuation.lockedMeals, 140).map((item) => item.slice(0, 140)),
    } : null,
    astraRequest: request.astraRequest && typeof request.astraRequest === "object" ? {
      title: String(request.astraRequest.title || "").slice(0, 100),
      ingredients: (request.astraRequest.ingredients || []).slice(0, 24).map((item) => String(item?.name || "").slice(0, 80)).filter(Boolean),
      notes: cleanList(request.astraRequest.notes, 8),
    } : null,
    requestedReplacement: request.requestedReplacement && typeof request.requestedReplacement === "object"
      && String(request.requestedReplacement.ingredient || "").trim()
      && String(request.requestedReplacement.replacement || "").trim() ? {
        day: Math.min(30, Math.max(1, Math.floor(Number(request.requestedReplacement.day) || 1))),
        meal: String(request.requestedReplacement.meal || "").trim().slice(0, 30),
        dish: String(request.requestedReplacement.dish || "").trim().slice(0, 120),
        ingredient: String(request.requestedReplacement.ingredient || "").trim().slice(0, 100),
        replacement: String(request.requestedReplacement.replacement || "").trim().slice(0, 100),
      } : null,
    kitchenItems: cleanList(request.kitchenItems).flatMap((source) => {
      if (/cold cuts?|deli meat/i.test(source) && /\(([^)]+)\)/.test(source)) {
        const components = source.match(/\(([^)]+)\)/)?.[1]
          ?.split(/,|\band\b/i)
          .map((name) => name.trim())
          .filter(Boolean) || [];
        if (components.length > 1) return components;
      }
      return [source];
    }),
    nutritionLabels: validateNutritionLabels(request.nutritionLabels),
    smoothieContext: rawSmoothie ? {
      recipeName: String(rawSmoothie.recipeName || "").slice(0, 120),
      goal: String(rawSmoothie.goal || "").slice(0, 60),
      selectedGoals: cleanList(rawSmoothie.selectedGoals, 12),
      ingredients: normalizeSmoothieHandoffIngredients(rawSmoothie.ingredients),
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
LONG-HORIZON CONTINUATION: ${context.continuation ? JSON.stringify(context.continuation) : "This is the complete requested horizon."}
TARGETED INGREDIENT REPLACEMENT: ${context.requestedReplacement ? JSON.stringify(context.requestedReplacement) : "None requested."}

Requirements:
- When a latest Tier 1 smoothie is supplied, use that exact smoothie as Day 1's Smoothie entry with its saved name and ingredients. Coordinate the other meals directly with it: complement its nutritional pattern, account for its estimated nutrients, and avoid unnecessary repetition of its main ingredients. Tier 1 can communicate directly with Tier 3; visiting Tier 2 is never required.
- Use Tier 2 Frequency context only when frequencyIncludedBySubscriber is true. Treat it solely as optional experiential context. Never infer medical, nutritional, physiological, diagnostic, or treatment effects from a Hz value.
- The selected rhythm must materially control food selection. For muscle nourishment, distribute meaningful protein across breakfast, lunch, snack, and dinner and include useful carbohydrate around recovery; do not merely rename an ordinary plan.
- Respect every allergy, intolerance, dietary pattern, avoided ingredient, and relevant condition. Never claim treatment, prevention, detoxification, or guaranteed organ benefit.
- Vegetarian is a hard requirement: never include meat, poultry, fish, shellfish, gelatin, or animal-stock/broth ingredients. Eggs and dairy are allowed unless the subscriber selected vegan or another restriction excludes them. Vegan is a hard requirement: use only plant-derived ingredients, including no eggs, dairy, honey, gelatin, meat, poultry, fish, or shellfish.
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
- When LONG-HORIZON CONTINUATION is present, this response is one verified section of the larger plan. Treat startDay as its first calendar day. Never repeat an exact dish listed in lockedMeals. A format may recur later in a long plan only after several days and with a genuinely different preparation, not a renamed variant.
- When TARGETED INGREDIENT REPLACEMENT identifies a day and meal in this response, replace the named ingredient with the requested replacement only if it is safe and compatible with the subscriber profile. Rebuild that entire dish coherently: update its name, every quantity, whyItFits, availability, and cooking instructions. Never perform a display-only word substitution. Leave other meals nutritionally coordinated with the revised dish.
- Within each dish, list each normalized ingredient exactly once. Do not repeat an ingredient as separate rows; one ingredient row must contain its complete quantity.
- Within this section, every day must use a different culinary format for Breakfast, Lunch, Snack, and Dinner. Changing only the fruit, vegetable, yogurt flavor, seasoning, or side does not create a different dish. Do not use the same format on consecutive calendar days. Across a longer horizon, a familiar format may return after several days only with a meaningfully different preparation.
- Across a multi-day plan, rotate cooking methods and recognizable formats such as an omelet, oatmeal, parfait, toast, soup, wrap, grain bowl, salad, roasted plate, skillet, and baked snack while keeping each choice appropriate to its meal occasion.
- Draw from a broad, respectful culinary repertoire when it fits the subscriber's foods and preferences: Italian, French, Spanish, Portuguese, Greek, Mediterranean, Mexican, Puerto Rican and wider Caribbean, Chinese regional, Japanese, Korean, Vietnamese, Thai, Filipino, Indonesian, Malaysian, Indian regional, Pakistani, Bangladeshi, Sri Lankan, Iranian/Persian, broader Middle Eastern, North African, West African, East African, Ethiopian/Eritrean, Russian, Eastern European, British/Irish, German/Central European, Scandinavian, Canadian, Indigenous-inspired only when accurately sourced and appropriately named, Southern U.S., Creole/Cajun, and Latin American regional traditions.
- Use authentic culinary logic rather than attaching a country label to an ordinary bowl. A named dish must have its defining preparation, compatible ingredients, and culturally recognizable form. Examples include risotto, minestrone, ratatouille, tortilla espanola, tacos, enchiladas, arroz con gandules, mofongo, congee, mapo tofu, donburi, miso soup, bibimbap, japchae, pho, bun, pad kra pao, adobo, nasi goreng, dal, chana masala, biryani, saag, keema, kebab, khoresh, shakshuka, tagine, couscous, jollof rice, groundnut stew, injera with wat, borscht, pierogi, goulash, shepherd's pie, and tourtiere. Do not claim authenticity when substitutions materially change the dish; use wording such as "-inspired" instead.
- Treat religion and dietary practice separately from cuisine. Hindu, Muslim/halal, Jewish/kosher, Jain, Buddhist, vegetarian, and other practices may shape ingredient exclusions or preparation, but never assume observance from ethnicity or nationality. Follow only dietary information the subscriber actually supplied.
- For seven- and thirty-day plans, vary cuisine families as well as dish formats. Do not repeat the same lunch or snack structure with cosmetic ingredient changes.
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

const normalize = (value) => String(value || "")
  .toLowerCase()
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/[^a-z0-9]+/g, " ")
  .trim();

const CULINARY_GARNISH = /\b(salt|pepper|seasoning|spice|herb|thyme|paprika|garlic|cumin|oregano|basil|rosemary|cinnamon|oil)\b/;
const SAVORY_PROTEIN = /\b(chicken|turkey|beef|pork|ham|sausage|fish|salmon|tuna|shrimp)\b/;
const SWEET_BREAKFAST_COMPONENT = /\b(banana|berries|berry|mango|dragon fruit|melon|peach|pear|apple|pineapple|nut butter|peanut butter|maple|honey)\b/;
const LEGUME = /\b(bean|beans|lentil|lentils|chickpea|chickpeas)\b/;
const EGG = /\b(egg|eggs)\b/;
const DAIRY_PROTEIN = /\b(yogurt|cottage cheese)\b/;
const FRUIT = /\b(apple|banana|berries|berry|blueberr|strawberr|raspberr|blackberr|mango|orange|peach|pear|pineapple|melon|kiwi|fruit)\b/;
const BREAKFAST_GRAIN = /\b(oat|oats|oatmeal|bread|toast|waffle|pancake|quinoa)\b/;
const BREAKFAST_SEED_BASE = /\b(chia seeds?|ground chia|flaxseed|ground flaxseed)\b/;
const RECOGNIZABLE_DISH = /\b(scramble|omelet|frittata|hash(?:es)?|oatmeal|overnight oats|pancakes?|waffles?|muffins?|oat cups?|pudding|parfait|bowl|yogurt cup|cottage cheese cup|yogurt dips?|hummus cups?|hummus (?:and|with) [a-z ]+ dippers?|hummus with [a-z ]+ sticks|hummus with (?:vegetable )?crudites|vegetable cups?|veggie cups?|carrot sticks with hummus|rice cakes?(?: toasts?)?|crackers? with (?:yogurt|hummus)|roll[ -]?ups?|toast|tostadas?|sandwich|wrap|salad|soup|stew|chili|tacos?|burrito|curry|stir fry|fried rice|skillet|sheet pan|pasta|roast|roasted|baked|grilled|plate|slices|meatballs?|stuffed (?:red )?peppers?|stuffed (?:sweet )?potatoes?|(?:tuna|salmon|fish) cakes?|chicken and waffles|risotto|minestrone|ratatouille|tortilla espanola|enchiladas?|arroz con gandules|mofongo|congee|mapo tofu|donburi|miso soup|bibimbap|japchae|pho|pad kra pao|adobo|nasi goreng|dal|chana masala|biryani|saag|keema|kebabs?|khoresh|shakshuka|tagine|couscous|jollof rice|groundnut stew|injera|wat|borscht|pierogi|goulash|shepherd s pie|tourtiere)\b/;

export function culinaryFormatKey(meal) {
  const dish = normalize(meal.food);
  const formats = [
    "overnight oats", "fried rice", "chicken and waffles", "breakfast sandwich", "breakfast burrito",
    "stuffed red peppers", "stuffed red pepper", "stuffed peppers", "stuffed pepper", "stuffed sweet potatoes", "stuffed potatoes", "meatballs", "meatball",
    "arroz con gandules", "tortilla espanola", "chana masala", "pad kra pao", "nasi goreng", "jollof rice", "groundnut stew", "shepherd s pie",
    "risotto", "minestrone", "ratatouille", "enchilada", "mofongo", "congee", "mapo tofu", "donburi", "miso soup", "bibimbap", "japchae", "pho", "adobo", "dal", "biryani", "saag", "keema", "kebab", "khoresh", "shakshuka", "tagine", "couscous", "injera", "borscht", "pierogi", "goulash", "tourtiere",
    "egg bite", "snack plate", "grain bowl", "yogurt dip", "yogurt cup", "cottage cheese cup", "yogurt breakfast bowl", "hummus with vegetable crudites", "hummus cups", "oat muffin", "oat cup", "roll ups", "roll-ups",
    "omelet", "frittata", "scramble", "oatmeal", "pancakes", "pancake", "waffles", "waffle", "pudding", "parfait", "tostada", "toast", "sandwich",
    "wrap", "salad", "soup", "stew", "chili", "taco", "burrito", "curry", "stir fry", "tuna cakes", "salmon cakes", "fish cakes", "slices",
    "skillet", "sheet pan", "pasta", "roast", "roasted", "baked", "grilled", "bowl", "plate",
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
    const isDefinedSavorySnack = /\b(egg bite|frittata|deviled|hard boiled|snack plate|lettuce wrap|roll ups?)\b/.test(dish);
    if (hasMealProtein && !isDefinedSavorySnack) {
      throw new Error(`${label} used a lunch-or-dinner protein without defining a recognizable savory snack.`);
    }
    const isDefinedCohesiveSnack = /\b(pudding|parfait|yogurt cup|yogurt dip|snack plate|muffin|baked|oat cup|hummus|crudites|dippers?|rice cakes?|crackers?)\b/.test(dish);
    if (substantiveNames.length > (isDefinedCohesiveSnack ? 6 : 4)) throw new Error(`${label} included too many unrelated components for one snack.`);
    if (!dish || substantiveNames.length === 0) throw new Error(`${label} did not define a cohesive snack preparation.`);
    return;
  }

  if (meal.requiresCooking && ingredients.length >= 4) {
    const omitted = ingredientNames.filter((name) => {
      if (!name || CULINARY_GARNISH.test(name)) return false;
      const meaningful = name.split(" ").filter((token) => token.length >= 4 && !/^(fresh|frozen|cooked|whole|plain|sliced|chopped)$/.test(token));
      return meaningful.length > 0 && !meaningful.some((token) => {
        const singular = token.endsWith("ies") ? `${token.slice(0, -3)}y` : token.endsWith("s") ? token.slice(0, -1) : token;
        return instructions.includes(token) || (singular.length >= 3 && instructions.includes(singular));
      });
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
    const hasBreakfastFoundation = substantiveNames.some((name) => EGG.test(name) || DAIRY_PROTEIN.test(name) || BREAKFAST_GRAIN.test(name) || BREAKFAST_SEED_BASE.test(name));
    const hasNonBreakfastProtein = substantiveNames.some((name) => /\b(tuna|salmon|fish|pork ribs?|cold cuts?|pepperoni|deli meat|kidney beans?)\b/.test(name));
    const definedSavoryBreakfast = /\b(hash|breakfast sandwich|breakfast burrito|breakfast taco|salmon toast|beans on toast)\b/.test(dish);
    if (!hasBreakfastFoundation && !definedSavoryBreakfast) throw new Error(`${label} lacked a credible breakfast foundation.`);
    if (hasNonBreakfastProtein && !definedSavoryBreakfast) throw new Error(`${label} used a lunch-or-dinner protein without a recognized breakfast preparation.`);
  }

  if (["Lunch", "Dinner"].includes(meal.meal)) {
    const fruitComponents = substantiveNames.filter((name) => FRUIT.test(name));
    const fruitHasCulinaryRole = /\b(salad|salsa|chutney|glaze|relish|roasted|stuffed|skillet)\b/.test(dish)
      && fruitComponents.every((name) => name.split(" ").some((token) => token.length >= 4 && instructions.includes(token)));
    if (fruitComponents.length > 0 && !fruitHasCulinaryRole) {
      throw new Error(`${label} added fruit without a defined culinary role in the dish.`);
    }
  }

  // Dish vocabulary is intentionally not a validity gate. Coherence is
  // established from the slot, ingredients, preparation, and structural
  // contradictions above so legitimate regional dishes remain eligible.

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
  const lockedMeals = Array.isArray(context.continuation?.lockedMeals) ? context.continuation.lockedMeals : [];
  const planDishes = new Set(lockedMeals.map((item) => normalize(String(item).replace(/^[^:]+:\s*/, ""))).filter(Boolean));
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
      const dietaryPattern = String(context.profile.dietaryPattern || "omnivore").toLowerCase();
      const dietaryText = [meal.food, ...(meal.ingredients || []).map((ingredient) => ingredient?.name)].join(" ");
      if (["vegetarian", "vegan"].includes(dietaryPattern) && VEGETARIAN_ANIMAL_FLESH.test(dietaryText)) {
        throw new Error(`Day ${dayIndex + 1} ${meal.meal} proposed a ${dietaryPattern}-restricted animal ingredient.`);
      }
      if (dietaryPattern === "vegan" && VEGAN_ANIMAL_PRODUCTS.test(dietaryText)) {
        throw new Error(`Day ${dayIndex + 1} ${meal.meal} proposed a vegan-restricted animal product.`);
      }
      const ingredients = meal.ingredients.map((ingredient) => {
        const name = String(ingredient.name || "").trim();
        const normalized = normalize(name);
        if (!name || restrictions.some((item) => normalized.includes(item))) throw new Error(`Day ${dayIndex + 1} ${meal.meal} proposed a restricted ingredient: ${name}`);
        const onHand = kitchen.some((item) => item && (item.includes(normalized) || normalized.includes(item)));
        const quantity = String(ingredient.quantity).trim();
        let quantityValidation;
        try {
          quantityValidation = validateMealIngredientQuantity({ quantity, name });
        } catch (error) {
          throw new Error(`Day ${dayIndex + 1} ${meal.meal} quantity failed validation: ${error.message}`);
        }
        return { quantity, name, availability: isHouseholdStapleIngredient(name) ? "household-staple" : onHand ? "on-hand" : "needed", quantityValidation };
      });
      assertCulinaryCoherence(meal, ingredients, dayIndex + 1);
      const dishKey = normalize(meal.food);
      if (seen.has(dishKey)) throw new Error(`Day ${dayIndex + 1} ${meal.meal} duplicated a dish in the same day.`);
      if (planDishes.has(dishKey)) throw new Error(`Day ${dayIndex + 1} ${meal.meal} repeated a dish from an earlier day.`);
      const formatKey = culinaryFormatKey(meal);
      seen.add(dishKey);
      planDishes.add(dishKey);
      planFormats.add(formatKey);
      let nutritionIntelligence;
      try {
        nutritionIntelligence = assertNutritionSafety(assessNutritionSelection({
          ingredients,
          profile: context.profile,
          goals: [context.goal],
          kind: meal.meal.toLowerCase(),
          nutritionLabels: context.nutritionLabels,
        }));
      } catch (error) {
        throw new Error(`Day ${dayIndex + 1} ${meal.meal} nutrition safety failed validation: ${error.message}`);
      }
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
    const validationWarnings = dailyGoalFit < 35
      ? [{ validator: "wellness", ruleId: "goal-fit-low", severity: "WARNING", reason: `Day ${dayIndex + 1} has a low nourishment-goal fit score.` }]
      : [];
    return { day: dayIndex + 1, reviewedProfile: true, reviewedKitchenItems: context.kitchenItems.length, dailyGoalFit, quantityValidation, validationWarnings, meals, generationSource: "openai" };
  });
}

export function identifyMealRepairTargets(error, proposal) {
  const message = String(error?.message || error || "");
  const match = message.match(/Day\s+(\d+)\s+(Smoothie|Breakfast|Lunch|Snack|Dinner)\b/i);
  if (!match) return [];
  const dayIndex = Number(match[1]) - 1;
  const mealIndex = MEAL_TYPES.findIndex((type) => type.toLowerCase() === match[2].toLowerCase());
  if (dayIndex < 0 || mealIndex < 0 || !proposal?.days?.[dayIndex]?.meals?.[mealIndex]) return [];
  return [{ dayIndex, mealIndex, day: dayIndex + 1, meal: MEAL_TYPES[mealIndex], finding: message.slice(0, 400) }];
}

export function describeMealPlanValidationFailure(error, proposal, metadata = {}) {
  const message = String(error?.message || error || "Unknown validation failure").slice(0, 500);
  const target = identifyMealRepairTargets(error, proposal)[0] || null;
  const quantityMatch = message.match(/quantity failed validation:\s*(?:Unrecognized household quantity for\s+)?([^:]+):\s*(.+)$/i);
  const restrictedMatch = message.match(/restricted ingredient:\s*(.+)$/i);
  let category = "schema-or-plan";
  if (/quantity/i.test(message)) category = "quantity";
  else if (/culinary|dish|recipe|format|fruit|greens|deli|snack|breakfast/i.test(message)) category = "culinary";
  else if (/nutrition safety|restricted ingredient|goal/i.test(message)) category = "safety-or-nutrition";
  else if (/repeat|duplicat/i.test(message)) category = "diversity";
  else if (/number of days|five meals|meal order/i.test(message)) category = "schema";
  const validator = category === "quantity" ? "quantity"
    : category === "culinary" ? "culinary"
      : category === "diversity" ? "diversity"
        : category === "safety-or-nutrition" ? (/goal/i.test(message) ? "wellness" : "safety")
          : "schema";
  const severity = validator === "wellness" ? "WARNING"
    : validator === "diversity" ? "QUALITY_REPAIR"
      : "REPAIR_REQUIRED";
  const ingredient = restrictedMatch?.[1]?.trim() || quantityMatch?.[1]?.trim() || null;
  const rawQuantity = quantityMatch?.[2]?.trim() || null;
  const mealName = target ? String(proposal?.days?.[target.dayIndex]?.meals?.[target.mealIndex]?.food || "").slice(0, 150) : null;
  return {
    validator,
    ruleId: metadata.ruleId || `${validator}-validation-failed`,
    severity,
    day: target?.day || Number(message.match(/Day\s+(\d+)/i)?.[1]) || metadata.day || null,
    slot: target?.meal || metadata.slot || null,
    mealType: target?.meal || metadata.slot || null,
    dish: mealName,
    mealName,
    category,
    rule: message,
    reason: message,
    ingredient,
    offendingIngredient: ingredient,
    rawQuantity,
    offendingQuantity: rawQuantity,
    normalizedQuantity: metadata.normalizedQuantity || null,
    repairScope: target ? "meal" : "section",
    repairAttempt: metadata.repairAttempt || 0,
    repairResult: metadata.repairResult || "pending",
    finalReason: metadata.finalReason || null,
  };
}

export function mergeTargetedMealRepairs(original, repairProposal, targets) {
  if (!original?.days || !repairProposal || !Array.isArray(targets) || targets.length === 0) {
    throw new Error("A targeted repair requires an original plan, a repair proposal, and at least one target.");
  }
  const merged = structuredClone(original);
  for (const target of targets) {
    const replacement = repairProposal.replacement || repairProposal.days?.[target.dayIndex]?.meals?.[target.mealIndex];
    if (!replacement || replacement.meal !== target.meal) {
      throw new Error(`Targeted repair did not return Day ${target.day} ${target.meal}.`);
    }
    merged.days[target.dayIndex].meals[target.mealIndex] = replacement;
  }
  // Medication review is plan-wide and must reflect any replacement ingredient.
  if (repairProposal.medicationSafety) merged.medicationSafety = repairProposal.medicationSafety;
  return merged;
}

export function buildTargetedMealRepairInput(proposal, targets) {
  const locked = proposal.days.flatMap((day, dayIndex) => day.meals.map((meal, mealIndex) => ({
    day: dayIndex + 1,
    meal: meal.meal,
    locked: !targets.some((target) => target.dayIndex === dayIndex && target.mealIndex === mealIndex),
    food: meal.food,
  })));
  return `TARGETED REPAIR REQUIRED. Return only the replacement meal required by the repair schema plus the updated plan-wide medication review. Do not reproduce or alter any locked meal. Give the replacement a specific, credible dish name and make its ingredients and preparation form one coherent recipe; regional and culturally specific dishes are welcome and do not need to match a fixed vocabulary. Every ingredient quantity must contain a number plus a supported household unit (g, oz, cup, tbsp, tsp, pinch, count, piece, slice, can, or scoop); a bare numeric quantity will be interpreted as a count. A Snack must be one cohesive preparation: use no more than four substantive ingredients ordinarily, or no more than six when they form a clearly named baked, layered, dip-and-dipper, or snack-plate recipe. If the finding says fruit lacks a defined culinary role, either remove that fruit from the replacement ingredients or explicitly describe how it is incorporated; changing only the title is not a repair. Repair finding: ${JSON.stringify(targets[0])}. Locked-slot manifest: ${JSON.stringify(locked)}. PRIOR PROPOSAL: ${JSON.stringify(proposal)}`;
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
