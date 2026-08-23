import { parseHouseholdQuantity } from "./food-identity.js";

const LIMITS = Object.freeze({ g: 700, oz: 16, cup: 4, tbsp: 8, tsp: 12, pinch: 6, each: 8, count: 8, piece: 6, slice: 6, can: 2, scoop: 2 });
const UNIT_ALIASES = Object.freeze({
  counts: "count",
  pieces: "piece",
  slices: "slice",
  cans: "can",
  scoops: "scoop",
  pinches: "pinch",
  clove: "piece",
  cloves: "piece",
  tortilla: "count",
  tortillas: "count",
  leaf: "piece",
  leaves: "piece",
  wedge: "piece",
  wedges: "piece",
});

const CLOVE_FOODS = /\bgarlic\b/i;
const LEAF_COUNT_FOODS = /\b(mint|basil|sage)\s+leaves?\b/i;
const CONCENTRATED_SEASONINGS = /\b(black pepper|white pepper|salt|paprika|cumin|turmeric|cinnamon|garlic powder|onion powder|dried oregano|dried basil|dried thyme|dried rosemary|seasoning|spice blend)\b/;

function inferCountUnit(raw, ingredientName) {
  const wholeCount = raw.match(/^(\d+(?:\s+\d+\/\d+)?|\d+\/\d+)\s+wholes?\.?$/i);
  if (wholeCount) {
    return { quantity: `${wholeCount[1]} count`, inferredUnit: "count" };
  }
  const amountOnly = raw.match(/^(\d+(?:\s+\d+\/\d+)?|\d+\/\d+)$/);
  if (!amountOnly) return null;
  const name = String(ingredientName || "").trim();
  if (CLOVE_FOODS.test(name)) return { quantity: `${raw} piece`, inferredUnit: "piece" };
  if (LEAF_COUNT_FOODS.test(name)) return { quantity: `${raw} piece`, inferredUnit: "piece" };
  // A bare number in a structured ingredient record is an item count. This is
  // grammar, not food taxonomy: unfamiliar produce and culturally specific
  // foods must not need an application vocabulary entry before they validate.
  return { quantity: `${raw} count`, inferredUnit: "count" };
}

export function validateMealIngredientQuantity(ingredient = {}) {
  const raw = String(ingredient.quantity || "").trim();
  // Structured output occasionally terminates a bare whole-number count with
  // sentence punctuation (for example, "2." eggs). Ignore only that terminal
  // punctuation; decimals and genuinely ambiguous quantities remain invalid.
  const parseableRaw = /^\d+\.$/.test(raw) ? raw.slice(0, -1) : raw;
  if (!raw) throw new Error(`Missing quantity for ${ingredient.name || "ingredient"}.`);
  if (/\b(to|or|about|approximately|as needed|handful|serving)\b|[-–—]/i.test(raw)) throw new Error(`Ambiguous quantity for ${ingredient.name}: ${raw}.`);
  const name = String(ingredient.name || "").toLowerCase();
  // In ordinary recipes, a bare "pinch" is an established household amount.
  // Normalize it only for concentrated seasonings so missing quantities for
  // other foods remain invalid instead of silently becoming one unit.
  const barePinch = /^pinch\.?$/i.test(raw) && CONCENTRATED_SEASONINGS.test(name);
  const inferred = barePinch
    ? { quantity: "1 pinch", inferredUnit: "pinch" }
    : inferCountUnit(parseableRaw, ingredient.name);
  const parsed = parseHouseholdQuantity({ quantity: inferred?.quantity || parseableRaw });
  const unit = UNIT_ALIASES[parsed.unit] || parsed.unit;
  if (!Number.isFinite(parsed.amount) || parsed.amount <= 0 || !LIMITS[unit]) throw new Error(`Unrecognized household quantity for ${ingredient.name}: ${raw}.`);
  if (parsed.amount > LIMITS[unit]) throw new Error(`Excessive quantity for ${ingredient.name}: ${raw} exceeds the per-meal ${unit} limit.`);
  // Product descriptors such as "no-salt-added" describe how a food was
  // processed; they do not turn that food into a concentrated seasoning.
  const seasoningIdentity = name.replace(/\bno[-\s]?salt(?:[-\s]?added)?\b/g, "");
  const concentratedSeasoning = CONCENTRATED_SEASONINGS.test(seasoningIdentity);
  if (concentratedSeasoning && !["tsp", "pinch"].includes(unit)) throw new Error(`Excessive seasoning quantity for ${ingredient.name}: use teaspoons or pinches, not ${unit}.`);
  if (concentratedSeasoning && unit === "tsp" && parsed.amount > 2) throw new Error(`Excessive seasoning quantity for ${ingredient.name}: ${raw}.`);
  if (/\b(black pepper|white pepper|salt)\b/.test(seasoningIdentity) && unit === "tsp" && parsed.amount > 1) throw new Error(`Excessive seasoning quantity for ${ingredient.name}: ${raw}.`);
  return { raw, amount: parsed.amount, unit, maximum: LIMITS[unit], status: inferred ? "validated-inferred-count" : "validated-household-quantity" };
}

export function validateMealDayQuantities(meals = []) {
  const validations = meals.flatMap((meal) => meal.ingredients.map((ingredient) => validateMealIngredientQuantity(ingredient)));
  const ounces = validations.filter((item) => item.unit === "oz").reduce((sum, item) => sum + item.amount, 0);
  const calorieDenseSpoons = validations.filter((item) => ["tbsp", "scoop"].includes(item.unit)).reduce((sum, item) => sum + item.amount, 0);
  if (ounces > 40) throw new Error(`Excessive ounce-based portions across the day: ${ounces} oz.`);
  if (calorieDenseSpoons > 18) throw new Error("Excessive tablespoon/scoop quantities across the day.");
  return { status: "validated", ingredientCount: validations.length };
}
