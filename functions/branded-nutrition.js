import { parseHouseholdQuantity } from "./food-identity.js";

export const LABEL_NUTRIENT_KEYS = Object.freeze(["energyKcal", "proteinG", "fatG", "carbohydrateG", "fiberG", "sugarG", "addedSugarG", "saturatedFatG", "sodiumMg", "potassiumMg", "phosphorusMg", "calciumMg", "ironMg", "vitaminKMcg"]);
const normalize = (value) => String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const numberOrNull = (value) => value === "" || value == null ? null : Number(value);

export function validateNutritionLabel(input = {}) {
  const productName = String(input.productName || "").trim().slice(0, 120);
  const brand = String(input.brand || "").trim().slice(0, 100);
  const ingredientName = String(input.ingredientName || "").trim().slice(0, 100);
  const servingAmount = Number(input.servingAmount);
  const servingUnit = String(input.servingUnit || "").toLowerCase().trim().slice(0, 20);
  const servingGrams = Number(input.servingGrams);
  if (!productName || !brand || !ingredientName) throw new Error("Brand, product name, and linked ingredient are required.");
  if (!Number.isFinite(servingAmount) || servingAmount <= 0 || !servingUnit) throw new Error("A positive label serving amount and unit are required.");
  if (!Number.isFinite(servingGrams) || servingGrams <= 0 || servingGrams > 2000) throw new Error("Serving weight must be between 0 and 2,000 grams.");
  const nutrientValues = Object.fromEntries(LABEL_NUTRIENT_KEYS.map((key) => [key, numberOrNull(input.nutrients?.[key])]));
  for (const [key, value] of Object.entries(nutrientValues)) if (value != null && (!Number.isFinite(value) || value < 0 || value > 100000)) throw new Error(`Invalid ${key} value.`);
  for (const key of ["energyKcal", "proteinG", "fatG", "carbohydrateG", "sodiumMg"]) if (nutrientValues[key] == null) throw new Error(`${key} is required from the Nutrition Facts panel.`);
  const aliases = [...new Set((Array.isArray(input.aliases) ? input.aliases : String(input.aliases || "").split(/[,;\n]/)).map((item) => String(item).trim().slice(0, 100)).filter(Boolean))].slice(0, 20);
  return {
    id: String(input.id || `${normalize(brand)}-${normalize(productName)}`).toLowerCase().replace(/[^a-z0-9_-]/g, "-").slice(0, 160),
    brand, productName, ingredientName, aliases,
    servingAmount, servingUnit, servingGrams,
    nutrients: nutrientValues,
    sourceType: "subscriber-entered-nutrition-facts",
    validationStatus: "schema-validated-label-entry",
    labelCheckedAt: String(input.labelCheckedAt || input.updatedAt || new Date().toISOString()).slice(0, 40),
    lotOrVersion: String(input.lotOrVersion || "").trim().slice(0, 80),
  };
}

export function validateNutritionLabels(labels = []) {
  if (!Array.isArray(labels)) return [];
  return labels.slice(0, 100).map(validateNutritionLabel);
}

export function findNutritionLabel(name, labels = []) {
  const target = normalize(name);
  return labels.find((label) => [label.ingredientName, label.productName, `${label.brand} ${label.productName}`, ...label.aliases]
    .some((candidate) => normalize(candidate) === target)) || null;
}

const ingredientScale = (ingredient, label) => {
  const parsed = parseHouseholdQuantity(ingredient);
  if (!Number.isFinite(parsed.amount) || parsed.amount <= 0) return null;
  const labelUnit = normalize(label.servingUnit);
  if (normalize(parsed.unit) === labelUnit) return parsed.amount / label.servingAmount;
  if (parsed.unit === "g") return parsed.amount / label.servingGrams;
  if (parsed.unit === "oz") return (parsed.amount * 28.3495) / label.servingGrams;
  return null;
};

export function calculateBrandedNutrients(ingredients = [], rawLabels = []) {
  const labels = validateNutritionLabels(rawLabels);
  const totals = Object.fromEntries(LABEL_NUTRIENT_KEYS.map((key) => [key, 0]));
  const nutrientCoverage = Object.fromEntries(LABEL_NUTRIENT_KEYS.map((key) => [key, { measuredIngredientCount: 0 }]));
  const matchedIngredientNames = [];
  const unresolved = [];
  for (const ingredient of ingredients) {
    const label = findNutritionLabel(ingredient.name, labels);
    if (!label) continue;
    const scale = ingredientScale(ingredient, label);
    if (!Number.isFinite(scale)) { unresolved.push({ ingredient: ingredient.name, reason: `Recipe unit does not match ${label.servingAmount} ${label.servingUnit} or ${label.servingGrams} g label serving.` }); continue; }
    matchedIngredientNames.push(ingredient.name);
    for (const key of LABEL_NUTRIENT_KEYS) if (Number.isFinite(label.nutrients[key])) {
      totals[key] += label.nutrients[key] * scale;
      nutrientCoverage[key].measuredIngredientCount += 1;
    }
  }
  for (const key of LABEL_NUTRIENT_KEYS) totals[key] = Math.round(totals[key] * 10) / 10;
  return { totals, nutrientCoverage, matchedIngredientNames, unresolved, labelsReviewed: labels.length, sourceType: "subscriber-entered-nutrition-facts", boundary: "Values are calculated from subscriber-entered package labels and are schema-validated, not independently laboratory-verified. Recheck labels when brands, formulas, or scoop sizes change." };
}
