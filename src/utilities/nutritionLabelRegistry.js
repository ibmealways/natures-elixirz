import { notifyCloudChange } from "./cloudChange";

const KEY_PREFIX = "naturesElixirz.nutritionLabels.v1";
export const NUTRIENT_FIELDS = [
  ["energyKcal", "Calories", "kcal", true], ["proteinG", "Protein", "g", true], ["fatG", "Total fat", "g", true], ["carbohydrateG", "Total carbohydrate", "g", true],
  ["fiberG", "Dietary fiber", "g"], ["sugarG", "Total sugars", "g"], ["addedSugarG", "Added sugars", "g"], ["saturatedFatG", "Saturated fat", "g"],
  ["sodiumMg", "Sodium", "mg", true], ["potassiumMg", "Potassium", "mg"], ["phosphorusMg", "Phosphorus", "mg"], ["calciumMg", "Calcium", "mg"], ["ironMg", "Iron", "mg"], ["vitaminKMcg", "Vitamin K", "mcg"],
];
const keyFor = (scope) => `${KEY_PREFIX}.${String(scope || "guest").replace(/[^a-zA-Z0-9_-]/g, "_")}`;
const cleanNumber = (value) => value === "" || value == null ? null : Number(value);
export function validateLabelEntry(input = {}) {
  const requiredText = ["brand", "productName", "ingredientName"];
  for (const key of requiredText) if (!String(input[key] || "").trim()) throw new Error("Brand, product name, and linked pantry ingredient are required.");
  const servingAmount = Number(input.servingAmount), servingGrams = Number(input.servingGrams);
  if (!(servingAmount > 0) || !String(input.servingUnit || "").trim() || !(servingGrams > 0 && servingGrams <= 2000)) throw new Error("Enter the label serving amount, unit, and gram weight.");
  const nutrients = Object.fromEntries(NUTRIENT_FIELDS.map(([key]) => [key, cleanNumber(input.nutrients?.[key])]));
  for (const [key, , , required] of NUTRIENT_FIELDS) if (required && nutrients[key] == null) throw new Error("Calories, protein, total fat, carbohydrate, and sodium are required.");
  for (const value of Object.values(nutrients)) if (value != null && (!Number.isFinite(value) || value < 0)) throw new Error("Nutrient values must be zero or greater.");
  const brand = String(input.brand).trim(), productName = String(input.productName).trim();
  return { id: input.id || `${brand}-${productName}-${Date.now()}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 150), brand, productName, ingredientName: String(input.ingredientName).trim(), aliases: (Array.isArray(input.aliases) ? input.aliases : String(input.aliases || "").split(/[,;\n]/)).map((item) => String(item).trim()).filter(Boolean).slice(0, 20), servingAmount, servingUnit: String(input.servingUnit).trim().toLowerCase(), servingGrams, nutrients, lotOrVersion: String(input.lotOrVersion || "").trim(), sourceType: "subscriber-entered-nutrition-facts", validationStatus: "schema-validated-label-entry", labelCheckedAt: input.labelCheckedAt || new Date().toISOString() };
}
export function getNutritionLabels(scope) { try { const value = JSON.parse(localStorage.getItem(keyFor(scope)) || "[]"); return Array.isArray(value) ? value : []; } catch { return []; } }
export function saveNutritionLabels(labels, scope) { const safe = labels.slice(0, 100).map(validateLabelEntry); localStorage.setItem(keyFor(scope), JSON.stringify(safe)); notifyCloudChange(scope); return safe; }
export function restoreNutritionLabels(labels, scope) { const safe = Array.isArray(labels) ? labels.slice(0, 100).map(validateLabelEntry) : []; localStorage.setItem(keyFor(scope), JSON.stringify(safe)); return safe; }
