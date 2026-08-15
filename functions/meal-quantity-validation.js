import { parseHouseholdQuantity } from "./food-identity.js";

const LIMITS = Object.freeze({ g: 700, oz: 16, cup: 4, tbsp: 8, tsp: 12, pinch: 6, each: 8, count: 8, piece: 6, slice: 6, can: 2, scoop: 2 });
const UNIT_ALIASES = Object.freeze({ counts: "count", pieces: "piece", slices: "slice", cans: "can", scoops: "scoop", pinches: "pinch" });

export function validateMealIngredientQuantity(ingredient = {}) {
  const raw = String(ingredient.quantity || "").trim();
  if (!raw) throw new Error(`Missing quantity for ${ingredient.name || "ingredient"}.`);
  if (/\b(to|or|about|approximately|as needed|handful|serving)\b|[-–—]/i.test(raw)) throw new Error(`Ambiguous quantity for ${ingredient.name}: ${raw}.`);
  if (/\d+\.\d+/.test(raw)) throw new Error(`Decimal quantity is not allowed for ${ingredient.name}: ${raw}.`);
  const parsed = parseHouseholdQuantity({ quantity: raw });
  const unit = UNIT_ALIASES[parsed.unit] || parsed.unit;
  if (!Number.isFinite(parsed.amount) || parsed.amount <= 0 || !LIMITS[unit]) throw new Error(`Unrecognized household quantity for ${ingredient.name}: ${raw}.`);
  if (parsed.amount > LIMITS[unit]) throw new Error(`Excessive quantity for ${ingredient.name}: ${raw} exceeds the per-meal ${unit} limit.`);
  return { raw, amount: parsed.amount, unit, maximum: LIMITS[unit], status: "validated-household-quantity" };
}

export function validateMealDayQuantities(meals = []) {
  const validations = meals.flatMap((meal) => meal.ingredients.map((ingredient) => validateMealIngredientQuantity(ingredient)));
  const ounces = validations.filter((item) => item.unit === "oz").reduce((sum, item) => sum + item.amount, 0);
  const calorieDenseSpoons = validations.filter((item) => ["tbsp", "scoop"].includes(item.unit)).reduce((sum, item) => sum + item.amount, 0);
  if (ounces > 40) throw new Error(`Excessive ounce-based portions across the day: ${ounces} oz.`);
  if (calorieDenseSpoons > 18) throw new Error("Excessive tablespoon/scoop quantities across the day.");
  return { status: "validated", ingredientCount: validations.length };
}
