export const FOOD_IDENTITY_METADATA = Object.freeze({
  version: "usda-food-identity-v2",
  verifiedOn: "2026-08-07",
  source: "USDA FoodData Central",
  sourceUrl: "https://fdc.nal.usda.gov/",
  dataset: "Foundation Foods and SR Legacy (April 2018)",
});

const nutrients = (energyKcal, proteinG, fatG, carbohydrateG, fiberG, sugarG, potassiumMg, sodiumMg, extra = {}) => ({
  energyKcal, proteinG, fatG, carbohydrateG, fiberG, sugarG, potassiumMg, sodiumMg, ...extra,
});

// Household weights and nutrients are tied to the exact named preparation.
// Do not reuse an entry for a different preparation or branded product.
export const USDA_FOOD_IDENTITIES = Object.freeze({
  blueberries: { fdcId: 2346411, description: "Blueberries, raw", dataType: "Foundation", preparationState: "raw", measures: { cup: { grams: 148, modifier: "whole" } } },
  strawberries: { fdcId: 167762, description: "Strawberries, raw", dataType: "SR Legacy", preparationState: "raw", measures: { cup: { grams: 166, modifier: "sliced" } }, nutrientsPer100g: nutrients(32, 0.67, 0.3, 7.68, 2, 4.89, 153, 1, { saturatedFatG: 0.015, phosphorusMg: 24, calciumMg: 16, ironMg: 0.41, vitaminKMcg: 2.2 }) },
  banana: { fdcId: 173944, description: "Bananas, raw", dataType: "SR Legacy", preparationState: "raw", measures: { cup: { grams: 150, modifier: "sliced" } }, nutrientsPer100g: nutrients(89, 1.09, 0.33, 22.84, 2.6, 12.23, 358, 1, { saturatedFatG: 0.112, phosphorusMg: 22, calciumMg: 5, ironMg: 0.26, vitaminKMcg: 0.5 }) },
  mango: { fdcId: 169910, description: "Mangos, raw", dataType: "SR Legacy", preparationState: "raw", measures: { cup: { grams: 165, modifier: "pieces" } }, nutrientsPer100g: nutrients(60, 0.82, 0.38, 14.98, 1.6, 13.66, 168, 1, { saturatedFatG: 0.092, phosphorusMg: 14, calciumMg: 11, ironMg: 0.16, vitaminKMcg: 4.2 }) },
  pineapple: { fdcId: 2346398, description: "Pineapple, raw", dataType: "Foundation", preparationState: "raw", measures: { cup: { grams: 165, modifier: "chunks" } } },
  apple: { fdcId: 1750340, description: "Apples, Fuji, with skin, raw", dataType: "Foundation", preparationState: "raw with skin", measures: { cup: { grams: 109, modifier: "sliced" } } },
  spinach: { fdcId: 168462, description: "Spinach, raw", dataType: "SR Legacy", preparationState: "raw", measures: { cup: { grams: 30, modifier: "whole leaves" } }, nutrientsPer100g: nutrients(23, 2.86, 0.39, 3.63, 2.2, 0.42, 558, 79, { saturatedFatG: 0.063, phosphorusMg: 49, calciumMg: 99, ironMg: 2.71, vitaminKMcg: 482.9 }) },
  kale: { fdcId: 168421, description: "Kale, raw", dataType: "SR Legacy", preparationState: "raw", measures: { cup: { grams: 67, modifier: "chopped" } }, nutrientsPer100g: nutrients(35, 2.92, 1.49, 4.42, 4.1, 0.99, 348, 53, { saturatedFatG: 0.178, phosphorusMg: 55, calciumMg: 254, ironMg: 1.6, vitaminKMcg: 389.6 }) },
  broccoli: { fdcId: 747447, description: "Broccoli, raw", dataType: "Foundation", preparationState: "raw", measures: { cup: { grams: 91, modifier: "chopped" } } },
  carrot: { fdcId: 170393, description: "Carrots, raw", dataType: "SR Legacy", preparationState: "raw", measures: { cup: { grams: 128, modifier: "chopped" } }, nutrientsPer100g: nutrients(41, 0.93, 0.24, 9.58, 2.8, 4.74, 320, 69, { saturatedFatG: 0.032, phosphorusMg: 35, calciumMg: 33, ironMg: 0.3, vitaminKMcg: 13.2 }) },
  "rolled oats": { fdcId: 173904, description: "Cereals, oats, regular and quick, not fortified, dry", dataType: "SR Legacy", preparationState: "dry", measures: { cup: { grams: 81, modifier: "dry" } }, nutrientsPer100g: nutrients(379, 13.15, 6.52, 67.7, 10.1, 0.99, 362, 6, { saturatedFatG: 1.11, phosphorusMg: 410, calciumMg: 52, ironMg: 4.25, vitaminKMcg: 2 }) },
  "chia seeds": { fdcId: 170554, description: "Seeds, chia seeds, dried", dataType: "SR Legacy", preparationState: "dried", measures: { oz: { grams: 28.35, modifier: "dry" } }, nutrientsPer100g: nutrients(486, 16.54, 30.74, 42.12, 34.4, null, 407, 16, { saturatedFatG: 3.33, phosphorusMg: 860, calciumMg: 631, ironMg: 7.72 }) },
  "ground flaxseed": { fdcId: 169414, description: "Seeds, flaxseed", dataType: "SR Legacy", preparationState: "ground", measures: { tbsp: { grams: 7, modifier: "ground" }, tsp: { grams: 2.5, modifier: "ground" } }, nutrientsPer100g: nutrients(534, 18.29, 42.16, 28.88, 27.3, 1.55, 813, 30, { saturatedFatG: 3.663, phosphorusMg: 642, calciumMg: 255, ironMg: 5.73, vitaminKMcg: 4.3 }) },
  "peanut butter": { fdcId: 174266, description: "Peanut butter, smooth style, with salt", dataType: "SR Legacy", preparationState: "smooth, salted", measures: { tbsp: { grams: 16, modifier: "smooth" }, cup: { grams: 258, modifier: "smooth" } }, nutrientsPer100g: nutrients(598, 22.21, 51.36, 22.31, 5, 10.49, 558, 426) },
  "cooked brown rice": { fdcId: 169704, description: "Rice, brown, long-grain, cooked", dataType: "SR Legacy", preparationState: "cooked", measures: { cup: { grams: 202, modifier: "cooked" } }, nutrientsPer100g: nutrients(123, 2.74, 0.97, 25.58, 1.6, 0.24, 86, 4) },
  "cooked quinoa": { fdcId: 168917, description: "Quinoa, cooked", dataType: "SR Legacy", preparationState: "cooked", measures: { cup: { grams: 185, modifier: "cooked" } }, nutrientsPer100g: nutrients(120, 4.4, 1.92, 21.3, 2.8, 0.87, 172, 7) },
  "cooked lentils": { fdcId: 172421, description: "Lentils, mature seeds, cooked, boiled, without salt", dataType: "SR Legacy", preparationState: "cooked without salt", measures: { cup: { grams: 198, modifier: "cooked" }, tbsp: { grams: 12.3, modifier: "cooked" } }, nutrientsPer100g: nutrients(116, 9.02, 0.38, 20.13, 7.9, 1.8, 369, 2) },
  "cooked black beans": { fdcId: 173735, description: "Beans, black, mature seeds, cooked, boiled, without salt", dataType: "SR Legacy", preparationState: "cooked without salt", measures: { cup: { grams: 172, modifier: "cooked" } }, nutrientsPer100g: nutrients(132, 8.86, 0.54, 23.71, 8.7, 0.32, 355, 1) },
  "whole milk greek yogurt": { fdcId: 171304, description: "Yogurt, Greek, plain, whole milk", dataType: "SR Legacy", preparationState: "plain whole milk", measures: { g: { grams: 1, modifier: "mass" } }, nutrientsPer100g: nutrients(97, 9, 5, 3.98, 0, 4, 141, 35) },
  "coconut water": { fdcId: 174831, description: "Beverages, coconut water, ready-to-drink, unsweetened", dataType: "SR Legacy", preparationState: "ready-to-drink unsweetened", measures: { cup: { grams: 245, modifier: "ready-to-drink" } }, nutrientsPer100g: nutrients(18, 0.22, 0, 4.24, 0, 3.92, 165, 26) },
  "olive oil": { fdcId: 171413, description: "Oil, olive, salad or cooking", dataType: "SR Legacy", preparationState: "oil", measures: { tbsp: { grams: 13.5, modifier: "tablespoon" }, tsp: { grams: 4.5, modifier: "teaspoon" }, cup: { grams: 216, modifier: "cup" } }, nutrientsPer100g: nutrients(884, 0, 100, 0, 0, 0, 1, 2) },
  "hard boiled egg": { fdcId: 173424, description: "Egg, whole, cooked, hard-boiled", dataType: "SR Legacy", preparationState: "hard-boiled", measures: { each: { grams: 50, modifier: "large" }, cup: { grams: 136, modifier: "chopped" }, tbsp: { grams: 8.5, modifier: "chopped" } }, nutrientsPer100g: nutrients(155, 12.58, 10.61, 1.12, 0, 1.12, 126, 124) },
  "roasted chicken breast": { fdcId: 171477, description: "Chicken breast, meat only, cooked, roasted", dataType: "SR Legacy", preparationState: "cooked roasted", measures: { cup: { grams: 140, modifier: "chopped or diced" } }, nutrientsPer100g: nutrients(165, 31.02, 3.57, 0, 0, 0, 256, 74) },
  "cooked wild atlantic salmon": { fdcId: 171998, description: "Fish, salmon, Atlantic, wild, cooked, dry heat", dataType: "SR Legacy", preparationState: "cooked dry heat", measures: { oz: { grams: 28.3333, modifier: "cooked" } }, nutrientsPer100g: nutrients(182, 25.44, 8.13, 0, 0, null, 628, 56) },
});

const canonicalUnit = (value) => {
  const unit = String(value || "").toLowerCase().replace(/\./g, "").trim();
  if (["g", "gram", "grams"].includes(unit)) return "g";
  if (["oz", "ounce", "ounces"].includes(unit)) return "oz";
  if (["cup", "cups"].includes(unit)) return "cup";
  if (["tbsp", "tablespoon", "tablespoons"].includes(unit)) return "tbsp";
  if (["tsp", "teaspoon", "teaspoons"].includes(unit)) return "tsp";
  if (["egg", "eggs", "large", "each", "item", "items"].includes(unit)) return "each";
  if (["count", "counts"].includes(unit)) return "count";
  if (["piece", "pieces"].includes(unit)) return "piece";
  if (["slice", "slices"].includes(unit)) return "slice";
  if (["can", "cans"].includes(unit)) return "can";
  if (["scoop", "scoops"].includes(unit)) return "scoop";
  return unit;
};

const parseNumber = (value) => {
  const text = String(value || "").trim();
  if (/^\d+\s+\d+\/\d+$/.test(text)) {
    const [whole, fraction] = text.split(/\s+/); const [a, b] = fraction.split("/").map(Number);
    return Number(whole) + a / b;
  }
  if (/^\d+\/\d+$/.test(text)) { const [a, b] = text.split("/").map(Number); return a / b; }
  return Number(text);
};

export function parseHouseholdQuantity(ingredient = {}) {
  if (Number.isFinite(Number(ingredient.amount))) return { amount: Number(ingredient.amount), unit: canonicalUnit(ingredient.unit) };
  const text = String(ingredient.quantity || "").trim().replace(/[¼]/g, "1/4").replace(/[½]/g, "1/2").replace(/[¾]/g, "3/4");
  const match = text.match(/^(\d+(?:\.\d+)?(?:\s+\d+\/\d+)?|\d+\/\d+)\s*([a-zA-Z.]+)/);
  if (!match) return { amount: null, unit: "" };
  return { amount: parseNumber(match[1]), unit: canonicalUnit(match[2]) };
}

export function foodIdentityFor(canonicalName) {
  const identity = USDA_FOOD_IDENTITIES[String(canonicalName || "").toLowerCase().trim()];
  return identity
    ? { ...identity, matchStatus: "verified-generic", gramWeightStatus: "verified-household-measure", registryVersion: FOOD_IDENTITY_METADATA.version }
    : { fdcId: null, matchStatus: "search-term-only", preparationState: "unspecified", gramWeightStatus: "unresolved", registryVersion: FOOD_IDENTITY_METADATA.version };
}

export function normalizeIngredientMass(ingredient, identity) {
  const { amount, unit } = parseHouseholdQuantity(ingredient);
  if (!Number.isFinite(amount) || amount <= 0) return { grams: null, status: "unresolved", reason: "Missing numeric amount." };
  if (unit === "g") return { grams: Math.round(amount * 10) / 10, status: "direct-mass", basis: "recipe grams" };
  if (unit === "oz") return { grams: Math.round(amount * 28.3495 * 10) / 10, status: "unit-conversion", basis: "avoirdupois ounce" };
  const measure = identity?.measures?.[unit];
  if (measure?.grams) return { grams: Math.round(amount * measure.grams * 10) / 10, status: "verified-household-measure", basis: `${measure.modifier}; ${measure.grams} g/${unit}`, fdcId: identity.fdcId };
  return { grams: null, status: "unresolved", reason: `No verified mass conversion for ${unit || "unspecified unit"} and this preparation.` };
}

export function calculateVerifiedNutrients(items = []) {
  const keys = ["energyKcal", "proteinG", "fatG", "carbohydrateG", "fiberG", "sugarG", "addedSugarG", "saturatedFatG", "potassiumMg", "sodiumMg", "phosphorusMg", "calciumMg", "ironMg", "vitaminKMcg"];
  const totals = Object.fromEntries(keys.map((key) => [key, 0]));
  const nutrientCoverage = Object.fromEntries(keys.map((key) => [key, { measuredIngredientCount: 0 }]));
  let calculatedIngredientCount = 0;
  for (const item of items) {
    const grams = item?.normalizedServing?.grams;
    const profile = item?.foodIdentity?.nutrientsPer100g;
    if (!Number.isFinite(grams) || !profile) continue;
    calculatedIngredientCount += 1;
    for (const key of keys) if (Number.isFinite(profile[key])) {
      totals[key] += profile[key] * grams / 100;
      nutrientCoverage[key].measuredIngredientCount += 1;
    }
  }
  for (const key of keys) totals[key] = Math.round(totals[key] * 10) / 10;
  for (const key of keys) nutrientCoverage[key].coveragePercent = items.length ? Math.round(nutrientCoverage[key].measuredIngredientCount / items.length * 100) : 0;
  return { totals, nutrientCoverage, calculatedIngredientCount, totalIngredientCount: items.length, coveragePercent: items.length ? Math.round(calculatedIngredientCount / items.length * 100) : 0, status: calculatedIngredientCount === items.length ? "complete-verified-estimate" : calculatedIngredientCount ? "partial-verified-subtotal" : "unavailable", boundary: "USDA reference-food estimate. A missing nutrient value is unknown, not zero. Branded labels, edible yield, preparation, and recipe substitutions can change actual values." };
}
