import { smoothieProtocols } from "../data/smoothieProtocols";

const round = (value) => Math.round(value * 100) / 100;
const includesAny = (text, terms) => terms.some((term) => text.includes(term));
const normalizeList = (value = "") => value.toLowerCase().split(/[,;\n]/).map((item) => item.trim()).filter(Boolean);
const normalizeIngredientName = (value = "") => value.toLowerCase()
  .replace(/\b(fresh|frozen|baby|plain|unsweetened|ripe|raw|red|green|seedless)\b/g, " ")
  .replace(/[^a-z0-9]+/g, " ").trim();

export const pantryCatalog = [
  ["Passion fruit", "Fruit", ["passion fruit", "passionfruit"]],
  ["Dragon fruit", "Fruit", ["dragon fruit", "dragonfruit", "pitaya"]],
  ["Mango", "Fruit", ["mango", "mangoes"]],
  ["Mixed berries", "Fruit", ["mixed berries", "berry mix"]],
  ["Strawberries", "Fruit", ["strawberry", "strawberries"]],
  ["Pineapple", "Fruit", ["pineapple"]],
  ["Peaches", "Fruit", ["peach", "peaches"]],
  ["Honeydew melon", "Fruit", ["honeydew", "honeydew melon", "honey dew", "honey dew melon"]],
  ["Grapes", "Fruit", ["grape", "grapes"]],
  ["Blueberries", "Fruit", ["blueberry", "blueberries", "blue berry", "blue berries"]],
  ["Blackberries", "Fruit", ["blackberry", "blackberries", "black berry", "black berries"]],
  ["Raspberries", "Fruit", ["raspberry", "raspberries"]],
  ["Acai berries", "Fruit", ["acai", "acai berry", "acai berries"]],
  ["Acai blend", "Fruit", ["acai blend"]],
  ["Acai Energizing Power blend", "Fruit", ["acai energizing power", "acai energizing power blend"]],
  ["Triple Berry blend", "Fruit", ["triple berry", "triple berry blend"]],
  ["Energy Boost blend", "Fruit", ["energy boost", "energy boost blend"]],
  ["Fit & Wellness blend", "Fruit", ["fit wellness", "fit and wellness", "fit & wellness blend"]],
  ["Immunity blend", "Fruit", ["immunity blend"]],
  ["Banana", "Fruit", ["banana", "bananas"]],
  ["Cherries", "Fruit", ["cherry", "cherries"]],
  ["Apple", "Fruit", ["apple", "apples"]],
  ["Orange", "Fruit", ["orange", "oranges"]],
  ["Papaya", "Fruit", ["papaya", "papayas"]],
  ["Kiwi", "Fruit", ["kiwi", "kiwis", "kiwifruit"]],
  ["Pear", "Fruit", ["pear", "pears"]],
  ["Watermelon", "Fruit", ["watermelon"]],
  ["Cantaloupe", "Fruit", ["cantaloupe"]],
  ["Lemon", "Fruit", ["lemon", "lemons"]],
  ["Lime", "Fruit", ["lime", "limes"]],
  ["Spinach", "Vegetable", ["spinach"]],
  ["Kale", "Vegetable", ["kale"]],
  ["Carrot", "Vegetable", ["carrot", "carrots"]],
  ["Beet", "Vegetable", ["beet", "beets"]],
  ["Cucumber", "Vegetable", ["cucumber", "cucumbers"]],
  ["Celery", "Vegetable", ["celery"]],
  ["Romaine lettuce", "Vegetable", ["romaine", "romaine lettuce"]],
  ["Swiss chard", "Vegetable", ["chard", "swiss chard"]],
  ["Collard greens", "Vegetable", ["collards", "collard greens"]],
  ["Arugula", "Vegetable", ["arugula"]],
  ["Zucchini", "Vegetable", ["zucchini"]],
  ["Sweet potato", "Vegetable", ["sweet potato", "sweet potatoes"]],
  ["Avocado", "Fruit", ["avocado", "avocados"]],
  ["Greek yogurt", "Protein", ["greek yogurt", "yogurt"]],
  ["Soy yogurt", "Protein", ["soy yogurt"]],
  ["Protein powder", "Protein", ["protein powder"]],
  ["Hemp protein", "Protein", ["hemp protein", "hemp protein powder"]],
  ["Collagen peptides", "Protein", ["collagen", "collagen peptide", "collagen peptides", "collagen powder", "collogen", "collogen peptide", "collogen peptides"]],
  ["Rolled oats", "Grain", ["oats", "rolled oats", "oatmeal"]],
  ["Chia seeds", "Seed", ["chia", "chia seed", "chia seeds"]],
  ["Ground flaxseed", "Seed", ["flax", "flax seed", "flax seeds", "flaxseed", "ground flax", "ground flaxseed"]],
  ["Hemp seeds", "Seed", ["hemp", "hemp seed", "hemp seeds", "hemp heart", "hemp hearts"]],
  ["Pumpkin seeds", "Seed", ["pumpkin seed", "pumpkin seeds", "pepitas"]],
  ["Sunflower seeds", "Seed", ["sunflower seed", "sunflower seeds"]],
  ["Sesame seeds", "Seed", ["sesame", "sesame seed", "sesame seeds"]],
  ["Peanut butter", "Nut butter", ["peanut butter"]],
  ["Almond butter", "Nut butter", ["almond butter"]],
  ["Soy milk", "Liquid", ["soy milk"]],
  ["Oat milk", "Liquid", ["oat milk"]],
  ["Almond milk", "Liquid", ["almond milk"]],
  ["Coconut water", "Liquid", ["coconut water"]],
  ["Cashew milk", "Liquid", ["cashew milk"]],
  ["Coconut milk", "Liquid", ["coconut milk"]],
  ["V8 Berry Blend", "Liquid", ["v8 berry", "v8 berry blend"]],
  ["Rice milk", "Liquid", ["rice milk"]],
  ["Green tea", "Liquid", ["green tea"]],
  ["Water", "Liquid", ["water", "spring water", "filtered water", "mineral water"]],
  ["Ice", "Liquid", ["ice"]],
  ["Ginger", "Spice", ["ginger"]],
  ["Turmeric", "Spice", ["turmeric"]],
  ["Cinnamon", "Spice", ["cinnamon"]],
  ["Paprika", "Spice", ["paprika"]],
  ["Nutmeg", "Spice", ["nutmeg"]],
  ["Cardamom", "Spice", ["cardamom"]],
  ["Mint", "Spice", ["mint", "mint leaves"]],
  ["Basil", "Spice", ["basil"]],
  ["Cacao powder", "Spice", ["cacao", "cacao powder", "cocoa", "cocoa powder"]],
  ["Honey", "Sweetener", ["honey", "raw honey"]],
  ["Maple syrup", "Sweetener", ["maple syrup"]],
  ["Dates", "Sweetener", ["date", "dates", "medjool date", "medjool dates"]],
].map(([name, group, aliases]) => ({ name, group, aliases }));

function recognizePantryItem(item, protocolIngredients) {
  const normalized = normalizeIngredientName(item);
  const protocolMatch = protocolIngredients.find((ingredient) => {
    const candidate = normalizeIngredientName(ingredient.name);
    return candidate === normalized || candidate.includes(normalized) || normalized.includes(candidate);
  });
  if (protocolMatch) return { ...protocolMatch, pantrySource: item };
  const catalogMatch = pantryCatalog.find((entry) => entry.aliases.some((alias) => normalizeIngredientName(alias) === normalized));
  return catalogMatch ? { ...catalogMatch, pantrySource: item } : null;
}

const pantryGoalPreferences = {
  healthyWeight: ["Hemp protein", "Protein powder", "Greek yogurt", "Peanut butter", "Rolled oats", "Banana", "Coconut milk", "Hemp seeds"],
  hydration: ["Cucumber", "Pineapple", "Coconut water", "Lime", "Mint", "Chia seeds"],
  protein: ["Greek yogurt", "Soy yogurt", "Hemp protein", "Protein powder", "Banana", "Rolled oats", "Hemp seeds"],
  immune: ["Orange", "Strawberries", "Kiwi", "Mango", "Spinach", "Ginger"],
  skin: ["Mango", "Strawberries", "Blueberries", "Carrot", "Hemp seeds", "Chia seeds"],
  focus: ["Blueberries", "Blackberries", "Acai berries", "Mango", "Spinach", "Hemp protein", "Ground flaxseed"],
  mindfulness: ["Blueberries", "Blackberries", "Acai berries", "Dragon fruit", "Banana", "Hemp protein", "Chia seeds"],
  energy: ["Banana", "Mango", "Pineapple", "Rolled oats", "Hemp protein", "Chia seeds"],
  heart: ["Blueberries", "Strawberries", "Grapes", "Apple", "Ground flaxseed", "Chia seeds"],
  circulation: ["Cooked beet", "Blueberries", "Grapes", "Spinach", "Ground flaxseed", "Coconut water"],
  weightLoss: ["Mixed berries", "Apple", "Spinach", "Greek yogurt", "Ground flaxseed", "Water"],
  healthyWeight: ["Banana", "Mango", "Greek yogurt", "Rolled oats", "Peanut butter", "Soy milk"],
  joints: ["Cherries", "Blueberries", "Pineapple", "Ground flaxseed", "Ginger", "Turmeric"],
  blood: ["Strawberries", "Kiwi", "Spinach", "Pumpkin seeds", "Hemp seeds", "Greek yogurt"],
  bones: ["Greek yogurt", "Soy milk", "Chia seeds", "Kale", "Strawberries", "Hemp seeds"],
  cellular: ["Mixed berries", "Dragon fruit", "Spinach", "Chia seeds", "Hemp protein", "Coconut water"],
  digestion: ["Pineapple", "Papaya", "Peaches", "Ginger", "Rolled oats"],
  painSupport: ["Pineapple", "Cherries", "Ginger", "Turmeric", "Ground flaxseed"],
  inflammation: ["Blueberries", "Pineapple", "Cherries", "Ginger", "Turmeric"],
  calm: ["Blueberries", "Banana", "Cherries", "Rolled oats", "Chia seeds"],
  general: ["Mixed berries", "Banana", "Spinach", "Hemp protein", "Chia seeds"],
};

function selectBalancedPantry(recognized, goal) {
  const goals = Array.isArray(goal) ? goal : [goal];
  const preference = [...new Set(goals.flatMap((item) => pantryGoalPreferences[item] || pantryGoalPreferences.general))];
  const ranked = [...recognized].sort((left, right) => {
    const leftRank = preference.indexOf(left.name);
    const rightRank = preference.indexOf(right.name);
    return (leftRank < 0 ? 999 : leftRank) - (rightRank < 0 ? 999 : rightRank);
  });
  const limits = { Fruit: 3, Vegetable: 1, Protein: 1, Seed: 1, Grain: 1, "Nut butter": 1, Liquid: 1, Spice: 1, Sweetener: 0 };
  const selected = [];
  const counts = {};
  ranked.forEach((ingredient) => {
    const limit = limits[ingredient.group] ?? 1;
    if ((counts[ingredient.group] || 0) >= limit) return;
    selected.push(ingredient);
    counts[ingredient.group] = (counts[ingredient.group] || 0) + 1;
  });
  return selected;
}

function pantryAmount(group, count, scale, name, goal) {
  const digestionSelected = Array.isArray(goal) ? goal.includes("digestion") : goal === "digestion";
  // Calibrated around finished blender yield. Powders, seeds, and nut butter
  // displace liquid, so raw ingredient volume cannot simply equal cup size.
  if (group === "Fruit") return { amount: round((1 / count) * scale), unit: "cup" };
  if (group === "Vegetable") return { amount: round((0.5 / count) * scale), unit: "cup" };
  if (group === "Liquid") return { amount: round((name === "Ice" ? 0.5 : 0.75) * scale), unit: "cup" };
  if (group === "Protein") {
    const isPowder = ["Protein powder", "Hemp protein", "Collagen peptides"].includes(name);
    return { amount: round((isPowder ? 1 : 0.5) * scale), unit: isPowder ? "scoop" : "cup" };
  }
  if (group === "Grain") return { amount: round(0.25 * scale), unit: "cup" };
  if (group === "Seed") return { amount: round(((digestionSelected ? 0.5 : 1) / count) * scale), unit: "tbsp" };
  if (group === "Nut butter") return { amount: round((1 / count) * scale), unit: "tbsp" };
  if (group === "Sweetener") return { amount: round((0.5 / count) * scale), unit: "tbsp" };
  return { amount: round(((digestionSelected ? 0.25 : 0.5) / count) * scale), unit: "tsp" };
}

function buildCombinedProtocol(goalInput) {
  const requested = Array.isArray(goalInput) ? goalInput : [goalInput];
  const selectedGoals = [...new Set(requested.filter((goal) => smoothieProtocols[goal]))];
  if (!selectedGoals.length) selectedGoals.push("general");
  const protocols = selectedGoals.map((goal) => smoothieProtocols[goal]);
  if (protocols.length === 1) return { ...protocols[0], selectedGoals };
  const limits = { Fruit: 2, Vegetable: 1, Protein: 1, Seed: 1, Grain: 1, "Nut butter": 1, Liquid: 2, Spice: 2, Sweetener: 0 };
  const ingredients = [];
  const counts = {};
  const addIngredient = (ingredient) => {
    if (ingredients.some((item) => normalizeIngredientName(item.name) === normalizeIngredientName(ingredient.name))) return;
    if ((counts[ingredient.group] || 0) >= (limits[ingredient.group] ?? 1) || ingredients.length >= 9) return;
    ingredients.push({ ...ingredient });
    counts[ingredient.group] = (counts[ingredient.group] || 0) + 1;
  };
  protocols.forEach((protocol, index) => {
    const candidates = index === 0 ? protocol.ingredients : [
      ...protocol.ingredients.filter((item) => item.group !== "Liquid"), ...protocol.ingredients,
    ];
    candidates.forEach(addIngredient);
  });
  const nutrition16 = Object.fromEntries(Object.keys(protocols[0].nutrition16).map((key) => [key,
    Math.round(protocols.reduce((sum, protocol) => sum + protocol.nutrition16[key], 0) / protocols.length),
  ]));
  return {
    name: "Personal Intention Constellation",
    description: `A balanced formula combining ${selectedGoals.length} selected intentions while avoiding unnecessary ingredient duplication.`,
    ingredients, benefits: [...new Set(protocols.flatMap((protocol) => protocol.benefits))], nutrition16, selectedGoals,
  };
}

function estimatePantryNutrition(ingredients) {
  const totals = { calories: 0, protein: 0, fiber: 0, totalSugar: 0 };
  const perCup = {
    Fruit: [80, 1, 3, 15], Vegetable: [30, 2, 3, 3], Liquid: [55, 3, 1, 4],
    Protein: [180, 28, 0, 8], Grain: [300, 10, 8, 2],
  };
  ingredients.forEach((ingredient) => {
    if (["Water", "Ice"].includes(ingredient.name)) return;
    let values;
    let factor = ingredient.amount;
    if (ingredient.unit === "tbsp") {
      values = ingredient.group === "Seed"
        ? [60, 2, 4, 0]
        : ingredient.group === "Nut butter"
          ? [95, 4, 1, 1]
          : ingredient.group === "Sweetener" ? [64, 0, 0, 17] : [5, 0, 0, 0];
    } else if (ingredient.unit === "tsp") {
      values = [3, 0, 0, 0]; factor = ingredient.amount;
    } else if (ingredient.unit === "scoop") {
      values = [120, 24, 1, 2]; factor = ingredient.amount;
    } else {
      values = perCup[ingredient.group] || [40, 1, 1, 4];
    }
    ["calories", "protein", "fiber", "totalSugar"].forEach((key, index) => { totals[key] += values[index] * factor; });
  });
  return Object.fromEntries(Object.entries(totals).map(([key, value]) => [key, Math.round(value)]));
}

export const estimateSmoothieNutrition = (ingredients = []) => estimatePantryNutrition(ingredients);

const ingredientBenefits = {
  Blueberries: "Provides anthocyanin-rich fruit and bright berry flavor.",
  Blackberries: "Adds fiber, vitamin C, and a deep berry profile.",
  "Acai berries": "Contributes polyphenol-rich fruit and a creamy berry body.",
  "Acai blend": "Adds berry flavor and plant compounds; the package label determines its exact fruit mix and nutrition.",
  "Acai Energizing Power blend": "Combines acai, berries, apple, and kale; use its package label for exact nutrients and added-sugar information.",
  "Triple Berry blend": "Provides a convenient mix of deeply colored berries and fruit fiber.",
  "Energy Boost blend": "Adds convenient frozen produce; verify the package ingredients because branded blends vary.",
  "Fit & Wellness blend": "Adds convenient frozen produce; its package label determines the exact ingredients and nutrition.",
  "Immunity blend": "Adds varied frozen produce; the name is a product label, not a guarantee of immune protection.",
  "Dragon fruit": "Adds mild fruit flavor, fiber, vitamin C, magnesium, and vivid color.",
  Grapes: "Add hydration, natural sweetness, and polyphenol-containing fruit.",
  Carrot: "Provides carotenoids, fiber, and gentle sweetness.",
  Cucumber: "Adds fluid, a fresh flavor, and a lighter slush-like texture.",
  "Coconut water": "Adds fluid, potassium, and carbohydrate; electrolyte levels vary by brand.",
  "Peanut butter": "Adds calorie density, unsaturated fat, protein, and creaminess.",
  "Rolled oats": "Adds complex carbohydrate, soluble fiber, and calorie density.",
  "Protein powder": "Raises protein; serving size and ingredients must be checked on the product label.",
  Banana: "Adds potassium, carbohydrate energy, sweetness, and texture.",
  Mango: "Provides vitamin C, carotenoids, and natural sweetness.",
  Pineapple: "Adds vitamin C, fluid, acidity, and tropical brightness.",
  Spinach: "Adds folate, vitamin K, carotenoids, and leafy-green volume.",
  Kale: "Contributes vitamins C and K plus leafy-green fiber.",
  "Chia seeds": "Adds fiber, plant omega-3 fats, and thickness.",
  "Ground flaxseed": "Adds fiber, lignans, plant omega-3 fats, and body.",
  "Hemp seeds": "Contributes plant protein, unsaturated fats, and creaminess.",
  "Hemp protein": "Raises plant protein while helping the blend feel substantial.",
  "Collagen peptides": "Adds supplemental protein without much flavor.",
  Turmeric: "Adds earthy flavor and naturally occurring curcuminoids.",
  Ginger: "Adds aromatic warmth and balances sweet fruit.",
  Cinnamon: "Adds warm flavor that can reduce the need for extra sweetener.",
  Water: "Provides the liquid needed for blending without added sugar.",
};

const groupBenefits = {
  Fruit: "Contributes fruit fiber, micronutrients, fluid, and natural flavor.",
  Vegetable: "Adds vegetable fiber and a broader range of micronutrients.",
  Protein: "Adds protein to make the blend more filling and balanced.",
  Seed: "Adds fiber, unsaturated fats, texture, and plant nutrients.",
  Grain: "Adds complex carbohydrate and soluble fiber.",
  "Nut butter": "Adds creaminess, unsaturated fat, and protein.",
  Liquid: "Creates a drinkable texture and supports hydration.",
  Spice: "Builds flavor and aromatic complexity without much sugar.",
  Sweetener: "Adds sweetness; a small amount is usually sufficient.",
};

function describeIngredientBenefits(ingredients) {
  return ingredients.map((ingredient) => ({
    name: ingredient.name,
    benefit: ingredientBenefits[ingredient.name] || groupBenefits[ingredient.group] || "Adds flavor and variety to the whole-food blend.",
  }));
}

function describeWhatHappens(ingredients) {
  const groups = new Set(ingredients.map((ingredient) => ingredient.group));
  const names = ingredients.map((ingredient) => ingredient.name.toLowerCase());
  const has = (...terms) => terms.some((term) => names.some((name) => name.includes(term)));
  const notes = ["Blending breaks plant tissue into smaller particles. Digestion then releases sugars, amino acids, fatty acids, vitamins, minerals, and plant compounds for absorption and normal metabolism."];
  if (has("spinach", "kale") && has("berry", "strawber", "orange", "kiwi", "mango", "pineapple")) notes.push("Vitamin C from fruit may improve absorption of non-heme iron from leafy greens.");
  if ((groups.has("Seed") || groups.has("Nut butter") || has("avocado", "hemp")) && has("spinach", "kale", "mango", "carrot")) notes.push("Dietary fat may improve absorption of fat-soluble carotenoids from colorful produce.");
  if (groups.has("Fruit") && (groups.has("Protein") || groups.has("Seed") || groups.has("Nut butter"))) notes.push("Protein, fiber, and fat may slow digestion compared with fruit juice alone, while fruit supplies carbohydrate for energy.");
  if (has("chia", "flax", "oat") && notes.length < 3) notes.push("Water-holding fiber adds thickness; fiber reaching the colon may be fermented by gut microbes into short-chain fatty acids.");
  return notes.slice(0, 3);
}

function buildSmoothieAssessment(ingredients, nutrition, selectedGoals, profile = {}) {
  const names = ingredients.map((item) => item.name.toLowerCase());
  const has = (...terms) => terms.some((term) => names.some((name) => name.includes(term)));
  const groups = new Set(ingredients.map((item) => item.group));
  const berry = has("blueber", "strawber", "raspber", "blackber", "mixed berr", "acai");
  const tropical = has("mango", "pineapple", "papaya", "passion fruit", "dragon fruit", "coconut");
  const leafy = has("spinach", "kale");
  const protein = groups.has("Protein") || nutrition.protein >= 20;
  const recovery = selectedGoals.some((goal) => ["painSupport", "inflammation", "joints"].includes(goal));
  const flavorFamily = berry ? "berry" : tropical ? "tropical" : leafy ? "green" : "whole-food";
  const type = `${flavorFamily}${leafy && flavorFamily !== "green" ? " green" : ""}${protein ? " protein" : ""}${recovery ? " recovery" : ""} smoothie`.replace(/^./, (letter) => letter.toUpperCase());
  const highlights = [
    protein && { label: "Muscle & recovery", level: nutrition.protein >= 25 ? "Strong" : "Supportive", detail: `About ${nutrition.protein} g estimated protein supplies amino acids used in normal muscle and tissue protein turnover.` },
    berry && { label: "Antioxidant-rich produce", level: "Strong", detail: "Berries contribute vitamin C and colorful polyphenols, including anthocyanins." },
    (has("flax", "chia", "hemp", "peanut", "oat") || leafy) && { label: "Heart-supportive pattern", level: "Supportive", detail: "Fiber, unsaturated fats, and produce can fit a heart-supportive eating pattern; one smoothie is not a treatment." },
    (berry || has("grape")) && { label: "Brain & focus nutrition", level: "Supportive", detail: "Fruit carbohydrate provides fuel and colorful produce contributes micronutrients and polyphenols; effects on focus vary." },
    (groups.has("Liquid") || has("cucumber")) && { label: "Hydration", level: "Supportive", detail: "Liquid and water-rich produce contribute fluid; electrolyte content depends on the exact products used." },
    nutrition.calories >= 450 && { label: "Healthy weight support", level: "Calorie-dense", detail: `About ${nutrition.calories} estimated calories may help increase energy intake when that matches the subscriber's goal.` },
  ].filter(Boolean).slice(0, 5);
  const triggers = [];
  const adjustments = [];
  if (has("mint", "peppermint")) { triggers.push("Mint can worsen reflux for some people."); adjustments.push("Remove mint first."); }
  if (has("peanut butter", "nut butter", "coconut milk", "avocado")) { triggers.push("A larger high-fat portion can be a trigger for some people."); adjustments.push("Reduce nut butter or another concentrated fat if it is a known trigger."); }
  if (has("strawber", "pineapple", "orange", "lemon", "lime", "grapefruit")) { triggers.push("Acidic fruit tolerance varies."); adjustments.push("Swap a troublesome acidic fruit for banana, pear, or melon."); }
  if (has("cocoa", "coffee", "chocolate")) { triggers.push("Chocolate or caffeine can trigger symptoms for some people."); adjustments.push("Omit cocoa, chocolate, or coffee."); }
  const refluxEnabled = [...(profile.conditions || []), profile.otherHealthConditions || ""]
    .some((condition) => /acid reflux|heartburn|\bgerd\b|gastroesophageal reflux/i.test(condition));
  return {
    type,
    summary: `${ingredients.length} ingredients form a ${protein ? "protein-forward" : "produce-forward"} blend with about ${nutrition.calories} calories, ${nutrition.protein} g protein, and ${nutrition.fiber} g fiber in the full batch.`,
    highlights,
    ...(refluxEnabled ? { reflux: {
      level: triggers.length >= 3 ? "Higher trigger potential" : triggers.length ? "Moderate trigger potential" : "Lower trigger potential",
      summary: triggers.length ? "This formula is not universally reflux-safe because it contains one or more common, individually variable triggers." : "No common trigger stands out, but personal tolerance, portion size, and timing still matter.",
      triggers,
      adjustments,
    } } : {}),
  };
}

function recommendPowerUps(ingredients, selectedGoals) {
  const present = new Set(ingredients.map((ingredient) => ingredient.name));
  const candidates = [
    ...(selectedGoals.some((goal) => ["protein", "healthyWeight", "painSupport", "joints", "bones"].includes(goal)) ? [
      ["Protein powder", "Adds concentrated protein; follow the package serving size."],
      ["Rolled oats", "Adds complex carbohydrate and calorie density for a more substantial blend."],
      ["Peanut butter", "Adds calories, protein, and unsaturated fat."],
    ] : []),
    ...(selectedGoals.some((goal) => ["painSupport", "inflammation", "joints"].includes(goal)) ? [
      ["Turmeric", "Adds culinary curcuminoids and earthy flavor; it is not a pain treatment."],
      ["Ground flaxseed", "Adds fiber and plant omega-3 fat."],
    ] : []),
    ...(selectedGoals.includes("hydration") ? [["Coconut water", "Adds fluid and potassium; check the label for sugar and sodium."]] : []),
  ];
  return candidates.filter(([name], index) => !present.has(name) && candidates.findIndex(([candidate]) => candidate === name) === index)
    .slice(0, 4).map(([name, reason]) => ({ name, reason }));
}

const replacements = [
  { match: "plain greek yogurt", triggers: ["vegan", "dairy", "milk", "lactose"], replacement: { name: "Unsweetened soy yogurt", group: "Protein" } },
  { match: "plain kefir", triggers: ["vegan", "dairy", "milk", "lactose"], replacement: { name: "Unsweetened soy yogurt", group: "Protein" } },
  { match: "unsweetened soy milk", triggers: ["soy"], replacement: { name: "Unsweetened oat milk", group: "Liquid" } },
  { match: "ground flaxseed", triggers: ["flax", "seed"], replacement: { name: "Rolled oats", group: "Grain" } },
  { match: "chia seeds", triggers: ["chia", "seed"], replacement: { name: "Rolled oats", group: "Grain" } },
];

export function assessSafety(profile) {
  const conditions = [...(profile.conditions || []), profile.otherHealthConditions || ""].join(" ").toLowerCase();
  const medications = (profile.medications || "").toLowerCase();
  const allergies = (profile.allergies || "").toLowerCase();
  const notices = [];
  const exclusions = [];
  let clinicianReviewRequired = false;
  if (includesAny(medications, ["statin", "atorvastatin", "simvastatin", "blood pressure", "amiodarone"])) {
    exclusions.push("grapefruit", "pomelo", "seville orange");
    notices.push("Grapefruit-family ingredients are excluded because they can interact with some medicines.");
  }
  if (includesAny(medications, ["warfarin", "coumadin", "blood thinner", "anticoagulant"])) {
    clinicianReviewRequired = true;
    notices.push("Blood-thinning medication may require consistent vitamin K intake and review of concentrated spices.");
  }
  if (includesAny(conditions, ["kidney", "renal", "dialysis"])) {
    clinicianReviewRequired = true;
    notices.push("Kidney conditions can require individualized potassium, phosphorus, fluid, and protein limits.");
  }
  if (includesAny(conditions, ["diabetes", "hypoglycemia", "blood sugar"])) notices.push("Monitor serving size and glucose response; use this with your clinician's carbohydrate guidance.");
  if (profile.age && Number(profile.age) < 18) {
    clinicianReviewRequired = true;
    notices.push("Recipes for minors require review by a pediatric clinician or registered dietitian.");
  }
  return { notices, exclusions, allergies, clinicianReviewRequired };
}

function personalizeIngredients(ingredients, profile, safety) {
  const restrictions = [...normalizeList(profile.allergies), ...normalizeList(profile.avoidIngredients), ...(profile.dietaryPattern === "vegan" ? ["vegan", "dairy", "milk"] : [])];
  const substitutions = [];
  const removed = [];
  const personalized = ingredients.map((original) => {
    let ingredient = { ...original };
    for (const rule of replacements) {
      if (ingredient.name.toLowerCase().includes(rule.match) && rule.triggers.some((trigger) => restrictions.some((item) => item.includes(trigger)))) {
        const prior = ingredient.name;
        ingredient = { ...ingredient, ...rule.replacement };
        substitutions.push(`${prior} → ${ingredient.name}`);
      }
    }
    return ingredient;
  }).filter((ingredient) => {
    const name = ingredient.name.toLowerCase();
    const unsafe = safety.exclusions.some((item) => name.includes(item));
    const restricted = restrictions.some((item) => name.includes(item) || (item.length > 3 && item.includes(name)));
    if (unsafe || restricted) removed.push(ingredient.name);
    return !unsafe && !restricted;
  });
  return { personalized, substitutions, removed };
}

// Creates a repeatable recipe path for a subscriber without exposing their
// profile data. A name is required so anonymous previews keep their canonical
// sample recipe and two signed-in household members do not share one template.
export function profileVariationSeed(profile = {}) {
  const name = String(profile.name || "").trim().toLowerCase();
  if (!name) return 0;
  const signature = JSON.stringify({
    name,
    age: String(profile.age || ""),
    weight: String(profile.weight || ""),
    height: String(profile.height || ""),
    activity: String(profile.activity || "").toLowerCase(),
    dietaryPattern: String(profile.dietaryPattern || "").toLowerCase(),
    goals: (Array.isArray(profile.healthGoals)
      ? profile.healthGoals.map((goal) => String(goal).trim().toLowerCase()).filter(Boolean)
      : normalizeList(profile.healthGoals)).sort(),
  });
  let hash = 2166136261;
  for (let index = 0; index < signature.length; index += 1) {
    hash ^= signature.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) % 10007 || 1;
}

export function generatePersonalizedSmoothie(profile, goal = "general", sizeOz = 16, customization = {}) {
  const protocol = buildCombinedProtocol(goal);
  const selectedGoals = protocol.selectedGoals;
  const primaryGoal = selectedGoals[0];
  const safety = assessSafety(profile);
  const selectedSize = Number(sizeOz);
  const scale = selectedSize / 16;
  const mealPlanFruits = [
    "Blueberries", "Strawberries", "Mango", "Pineapple", "Peaches", "Pear", "Apple", "Cherries",
    "Raspberries", "Blackberries", "Papaya", "Kiwi", "Orange", "Banana", "Dragon fruit", "Mixed berries",
  ];
  const restrictions = `${profile.allergies || ""} ${profile.avoidIngredients || ""}`.toLowerCase();
  const safeMealPlanFruits = mealPlanFruits.filter((fruit) => !restrictions.includes(fruit.toLowerCase())
    && !safety.exclusions.some((excluded) => fruit.toLowerCase().includes(excluded)));
  const subscriberSeed = profileVariationSeed(profile);
  const requestedVariation = Number.isInteger(customization.variationIndex) ? customization.variationIndex : 0;
  const variationIndex = subscriberSeed || Number.isInteger(customization.variationIndex)
    ? subscriberSeed + requestedVariation
    : null;
  const variationFruit = variationIndex === null || !safeMealPlanFruits.length
    ? null
    : safeMealPlanFruits[variationIndex % safeMealPlanFruits.length];
  let replacedFruit = false;
  const preferredAlternates = [...new Set(selectedGoals.flatMap((selectedGoal) => pantryGoalPreferences[selectedGoal] || pantryGoalPreferences.general))];
  const sourceIngredients = protocol.ingredients.map((ingredient, ingredientIndex) => {
    if (!variationFruit || replacedFruit || ingredient.group !== "Fruit") return ingredient;
    replacedFruit = true;
    return { ...ingredient, name: variationFruit };
  }).map((ingredient, ingredientIndex) => {
    if (variationIndex === null || ingredientIndex === 0) return ingredient;
    const choices = preferredAlternates
      .map((name) => pantryCatalog.find((entry) => entry.name === name))
      .filter((entry) => entry?.group === ingredient.group && entry.name !== ingredient.name);
    if (!choices.length) return ingredient;
    const alternate = choices[(variationIndex + ingredientIndex) % choices.length];
    return { ...ingredient, name: alternate.name, group: alternate.group, sourceName: ingredient.sourceName || ingredient.name };
  }).map((ingredient) => {
    const sourceName = ingredient.sourceName || ingredient.name;
    const replacementName = customization.ingredientReplacements?.[sourceName]
      || customization.ingredientReplacements?.[ingredient.name];
    const replacement = replacementName && pantryCatalog.find((entry) => entry.name === replacementName);
    return replacement
      ? { ...ingredient, name: replacement.name, group: replacement.group, sourceName: ingredient.name }
      : ingredient;
  });
  const { personalized, substitutions, removed } = personalizeIngredients(sourceIngredients, profile, safety);
  const hasExplicitSelection = Array.isArray(customization.selectedNames);
  const selectedNames = new Set(customization.selectedNames || []);
  const pantry = normalizeList(customization.pantryText);
  let customized = hasExplicitSelection
    ? personalized.filter((ingredient) => selectedNames.has(ingredient.sourceName || ingredient.name)
      || selectedNames.has(ingredient.name))
    : personalized;
  const pantryRecognition = pantry.map((item) => ({ source: item, ingredient: recognizePantryItem(item, personalized) }));
  const recognizedPantry = pantryRecognition.map(({ ingredient }) => ingredient).filter(Boolean)
    .filter((ingredient, index, all) => all.findIndex((candidate) => candidate.name === ingredient.name) === index)
    .filter((ingredient) => !safety.exclusions.some((excluded) => normalizeIngredientName(ingredient.name).includes(excluded))
      && !normalizeList(profile.allergies).some((allergy) => normalizeIngredientName(ingredient.name).includes(normalizeIngredientName(allergy))));
  if (customization.useOnlyPantry && pantry.length) {
    const offset = variationIndex === null || !recognizedPantry.length ? 0 : variationIndex % recognizedPantry.length;
    customized = selectBalancedPantry([...recognizedPantry.slice(offset), ...recognizedPantry.slice(0, offset)], selectedGoals);
  }
  const groupCounts = customized.reduce((counts, ingredient) => ({ ...counts, [ingredient.group]: (counts[ingredient.group] || 0) + 1 }), {});
  const ingredients = customized.map((ingredient) => customization.useOnlyPantry
    ? { ...ingredient, ...pantryAmount(ingredient.group, groupCounts[ingredient.group], scale, ingredient.name, selectedGoals) }
    : { ...ingredient, amount: round(ingredient.amount16 * scale) });
  const servings = Math.max(1, Math.ceil(selectedSize / 24));
  const ingredientRatio = personalized.length ? customized.length / personalized.length : 1;
  const nutrition = customization.useOnlyPantry
    ? estimatePantryNutrition(ingredients)
    : Object.fromEntries(Object.entries(protocol.nutrition16).map(([key, value]) => [key, Math.round(value * scale * ingredientRatio)]));
  const unmatchedPantry = pantryRecognition.filter(({ ingredient }) => !ingredient).map(({ source }) => source);
  const unusedPantry = customization.useOnlyPantry
    ? recognizedPantry.filter((available) => !customized.some((selected) => selected.name === available.name))
      .map((ingredient) => ingredient.pantrySource)
    : [];
  const hasLiquid = ingredients.some((ingredient) => ingredient.group === "Liquid");
  const hasProteinOrFiber = ingredients.some((ingredient) => ["Protein", "Seed", "Grain", "Nut butter"].includes(ingredient.group));
  const formulaNeeds = [
    ingredients.length < 4 && "at least four recognized ingredients",
    !hasLiquid && "a liquid",
    !hasProteinOrFiber && "a protein or fiber ingredient",
  ].filter(Boolean);
  const highFiber = selectedSize <= 32 && nutrition.fiber >= Math.max(10, Math.round(selectedSize * 0.4));
  const presentation = selectedGoals.includes("digestion") && highFiber
    ? {
        name: "Fiber-Rich Digestive Blend",
        description: "A substantial whole-food blend; reduce the seed portion if you are increasing fiber gradually.",
      }
    : {
        name: variationFruit ? `${variationFruit} ${protocol.name}` : protocol.name,
        description: protocol.description,
      };
  const personalizedName = String(customization.customName || "").trim().slice(0, 80);
  const practicalTips = [
    ingredients.some((ingredient) => ingredient.name.toLowerCase().includes("cucumber")) && "Blend cucumber with the liquid first for a smoother texture.",
    ingredients.some((ingredient) => ingredient.name.toLowerCase().includes("chia")) && "Let the finished blend rest 5–10 minutes if you want the chia to thicken it.",
    ingredients.some((ingredient) => ["Rolled oats", "Peanut butter"].includes(ingredient.name)) && "Add extra liquid gradually if oats or nut butter make the blend too thick.",
    selectedSize >= 42 && "Blend in two stages if your blender is smaller than the full batch volume.",
  ].filter(Boolean);
  return {
    ...protocol, ...presentation, goal: primaryGoal, goals: selectedGoals, sizeOz: selectedSize, ingredients, removed, substitutions, servings, nutrition,
    name: personalizedName || presentation.name,
    pantryMatches: recognizedPantry.map((ingredient) => ingredient.pantrySource),
    unmatchedPantry,
    unusedPantry,
    pantryOnly: Boolean(customization.useOnlyPantry && pantry.length),
    incompleteFormula: formulaNeeds.length > 0,
    formulaNeeds,
    fiberNotice: highFiber
      ? `${nutrition.fiber} g of estimated fiber is substantial for this batch. Consider half the seed amount or a smaller serving if increasing fiber intake.`
      : null,
    batchNotice: selectedSize > 32 ? `This is a ${servings}-serving batch. Divide into portions rather than treating it as a routine single serving.` : null,
    safety,
    benefits: describeIngredientBenefits(ingredients),
    whatHappens: describeWhatHappens(ingredients),
    assessment: buildSmoothieAssessment(ingredients, nutrition, selectedGoals, profile),
    quantumContext: "Quantum physics underlies molecular bonds, enzyme reactions, and electron transfer in metabolism. Traditional foodways and holistic practices can inform ingredient use, while specific benefits, amounts, and risks still require ingredient-level evidence.",
    optionalPowerUps: recommendPowerUps(ingredients, selectedGoals),
    practicalTips,
    realityCheck: selectedGoals.includes("mindfulness")
      ? "“Third-eye” is treated as symbolic language for mindfulness and reflection. A smoothie cannot literally open a third eye; hydration, regular meals, sleep, and balanced nutrition can support ordinary concentration and alertness."
      : null,
    preparation: [
      "Wash produce and add liquid to the blender first.",
      "Add soft ingredients, then frozen ingredients and ice.",
      "Blend 45–60 seconds. Add water one tablespoon at a time if needed.",
      `Pour into a measuring vessel and stop at approximately ${selectedSize} oz; produce density and blender performance can change the final yield.`,
      "Enjoy promptly; refrigerate leftovers and use within 24 hours.",
    ],
  };
}
