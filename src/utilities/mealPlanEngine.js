import { generatePersonalizedSmoothie, pantryCatalog, profileVariationSeed } from "./personalizedSmoothieEngine";

const goalAccents = {
  focus: ["blueberries", "spinach", "roasted broccoli", "fresh herbs"],
  cellular: ["mixed berries", "red cabbage", "broccoli", "three-color vegetables"],
  energy: ["banana", "sweet potato", "black beans", "roasted peppers"],
  heart: ["mixed berries", "tomatoes", "leafy greens", "roasted broccoli"],
  digestion: ["banana", "cooked carrots", "blueberries", "soft herbs"],
  liver: ["broccoli", "beets", "leafy greens", "oats"],
  kidney: ["cauliflower", "red peppers", "cabbage", "blueberries"],
  lungs: ["apples", "tomatoes", "leafy greens", "mixed berries"],
  eyes: ["carrots", "spinach", "sweet potato", "red peppers"],
  bones: ["plain yogurt", "calcium-set tofu", "collard greens", "white beans"],
  muscles: ["plain yogurt", "lentils", "salmon", "sweet potato"],
  joints: ["mixed berries", "salmon", "leafy greens", "broccoli"],
  skin: ["mixed berries", "sweet potato", "avocado", "cucumber"],
  immune: ["red peppers", "broccoli", "mixed berries", "beans"],
  blood: ["lentils", "spinach", "beans", "red peppers"],
  nervous: ["banana", "oats", "leafy greens", "beans"],
  metabolic: ["oats", "beans", "leafy greens", "mixed berries"],
  weightLoss: ["beans", "leafy greens", "mixed berries", "whole grains"],
  healthyWeight: ["plain yogurt", "oats", "sweet potato", "nut butter"],
  circulation: ["beets", "leafy greens", "mixed berries", "beans"],
  calm: ["banana", "cucumber", "mixed berries", "roasted vegetables"],
  general: ["seasonal fruit", "three-color vegetables", "leafy greens", "fresh herbs"],
};

const mealBases = {
  Breakfast: [
    "Egg and whole-grain waffle plate", "Overnight oats", "Vegetable scramble with whole-grain toast",
    "Quinoa breakfast bowl", "Plain yogurt and oat bowl", "Chia-oat breakfast pudding",
  ],
  Lunch: [
    "Tuna salad on whole-grain bread", "Chickpea and greens bowl", "Brown-rice vegetable bowl",
    "White-bean herb salad", "Whole-grain vegetable wrap", "Vegetable soup with beans",
  ],
  Snack: [
    "Fresh fruit with seed butter", "Plain yogurt with fruit", "Vegetables with hummus",
    "Roasted chickpeas with fruit", "Oat-and-seed snack bowl", "Apple with sunflower seed butter",
  ],
  Dinner: [
    "Baked salmon with a whole grain", "Chicken and roasted vegetable plate", "Tofu and brown-rice bowl",
    "White-bean and vegetable skillet", "Lentil pasta with vegetables", "Quinoa-stuffed vegetables",
  ],
};

const smoothieGoalCycles = {
  focus: ["focus", "energy", "general", "mindfulness", "focus", "digestion"],
  cellular: ["general", "inflammation", "immune", "skin", "general", "hydration"],
  energy: ["energy", "focus", "general", "digestion", "energy", "calm"],
  heart: ["heart", "general", "inflammation", "energy", "heart", "digestion"],
  digestion: ["digestion", "general", "calm", "energy", "digestion", "focus"],
  liver: ["general", "inflammation", "digestion", "general", "immune", "hydration"],
  kidney: ["hydration", "general", "heart", "digestion", "hydration", "general"],
  lungs: ["immune", "general", "inflammation", "hydration", "immune", "general"],
  eyes: ["skin", "general", "immune", "inflammation", "skin", "general"],
  bones: ["protein", "general", "healthyWeight", "protein", "general", "digestion"],
  muscles: ["protein", "energy", "healthyWeight", "painSupport", "protein", "hydration"],
  joints: ["inflammation", "painSupport", "general", "hydration", "inflammation", "protein"],
  skin: ["skin", "hydration", "immune", "general", "skin", "inflammation"],
  immune: ["immune", "general", "inflammation", "digestion", "immune", "hydration"],
  blood: ["energy", "general", "immune", "focus", "energy", "general"],
  nervous: ["calm", "focus", "general", "digestion", "calm", "energy"],
  metabolic: ["digestion", "protein", "general", "energy", "heart", "digestion"],
  weightLoss: ["metabolic", "protein", "digestion", "general", "heart", "energy"],
  healthyWeight: ["protein", "energy", "bones", "general", "protein", "digestion"],
  circulation: ["heart", "blood", "inflammation", "general", "heart", "energy"],
  protein: ["protein", "muscles", "bones", "energy", "protein", "general"],
  calm: ["calm", "digestion", "general", "mindfulness", "calm", "focus"],
  general: ["general", "energy", "focus", "digestion", "calm", "heart"],
};

const seasoningByGoal = {
  focus: ["rosemary", "black pepper", "basil"],
  energy: ["paprika", "cumin", "oregano"],
  heart: ["oregano", "basil", "garlic"],
  digestion: ["ginger", "mint", "cinnamon"],
  liver: ["rosemary", "cumin", "parsley"],
  kidney: ["basil", "parsley", "oregano"],
  lungs: ["thyme", "rosemary", "basil"],
  eyes: ["basil", "oregano", "black pepper"],
  bones: ["thyme", "basil", "parsley"],
  muscles: ["paprika", "rosemary", "black pepper"],
  joints: ["ginger", "turmeric", "black pepper"],
  skin: ["basil", "parsley", "cinnamon"],
  immune: ["ginger", "garlic", "thyme"],
  blood: ["cumin", "parsley", "black pepper"],
  nervous: ["basil", "thyme", "cinnamon"],
  metabolic: ["cinnamon", "cumin", "oregano"],
  cellular: ["rosemary", "basil", "oregano"],
  calm: ["basil", "thyme", "parsley"],
  general: ["thyme", "oregano", "black pepper"],
};

export function recommendCulinarySeasoning(profile = {}, goal = "general", food = "") {
  const normalizedFood = food.toLowerCase();
  const mealMatches = /salmon|fish|tuna/.test(normalizedFood)
    ? ["dill", "parsley", "lemon zest"]
    : /chicken|turkey/.test(normalizedFood)
      ? ["thyme", "paprika", "garlic"]
      : /bean|lentil|chickpea|tofu|tempeh/.test(normalizedFood)
        ? ["cumin", "smoked paprika", "oregano"]
        : ["basil", "thyme", "black pepper"];
  const restrictions = `${profile.allergies || ""} ${profile.avoidIngredients || ""}`.toLowerCase();
  const medicationText = `${profile.medications || ""}`.toLowerCase();
  const cautious = /warfarin|coumadin|anticoagulant|blood thinner/.test(medicationText)
    || [...(profile.conditions || []), profile.otherHealthConditions || ""].some((condition) => /pregnan|kidney|liver/i.test(condition));
  const cautiousIngredients = new Set(["garlic", "ginger", "turmeric"]);
  const choices = [...new Set([...mealMatches, ...(seasoningByGoal[goal] || seasoningByGoal.general)])]
    .filter((item) => !restrictions.includes(item) && !(cautious && cautiousIngredients.has(item)))
    .slice(0, 3);
  const herbs = choices.length ? choices : ["basil", "thyme", "parsley"];
  return {
    name: `salt-free ${herbs.join(", ")} blend`,
    herbs,
    rationale: `Selected for the ${goal === "general" ? "everyday wellness" : goal} goal and the foods in this meal.`,
    safetyNote: profile.medications || cautious
      ? "Use ordinary culinary amounts only. Confirm food and herb restrictions with a pharmacist or clinician; do not substitute concentrated extracts or supplements."
      : "Use as a culinary seasoning, not as an herbal supplement or treatment.",
  };
}

const dailyHarvests = [
  "zucchini", "carrots", "tomatoes", "cucumber", "broccoli", "cauliflower",
  "red cabbage", "green beans", "asparagus", "mushrooms", "beets", "celery",
  "butternut squash", "yellow squash", "Brussels sprouts", "bok choy", "okra",
  "turnips", "radishes", "fennel", "eggplant", "snap peas", "collard greens",
  "Swiss chard", "arugula", "romaine", "watercress", "parsley", "cilantro", "basil",
];

const veganize = (text) => text
  .replaceAll("Plain yogurt", "Unsweetened soy yogurt")
  .replaceAll("Baked salmon", "Baked tofu")
  .replaceAll("Chicken and", "Tempeh and");

function restrictionText(profile = {}) {
  return `${profile.allergies || ""} ${profile.avoidIngredients || ""}`.toLowerCase();
}

function adaptForRestrictions(text, profile = {}) {
  const restrictions = restrictionText(profile);
  let result = text;
  const avoidsNuts = /\b(nut|nuts|peanut|peanuts|tree nut|almond|walnut|cashew|pecan)\b/.test(restrictions);
  const avoidsDairy = /\b(dairy|milk|lactose|yogurt)\b/.test(restrictions);
  const avoidsSoy = /\b(soy|tofu|tempeh)\b/.test(restrictions);
  const avoidsEgg = /\b(egg|eggs)\b/.test(restrictions);
  const avoidsFish = /\b(fish|salmon|seafood|shellfish)\b/.test(restrictions);
  const avoidsGluten = /\b(gluten|wheat|celiac)\b/.test(restrictions);

  if (avoidsNuts) result = result.replace(/\bnut butter\b/gi, "sunflower seed butter");
  if (avoidsDairy) result = result.replace(/\bplain yogurt\b/gi, avoidsSoy ? "unsweetened oat yogurt" : "unsweetened soy yogurt");
  if (avoidsSoy) result = result.replace(/\btofu\b/gi, "white beans").replace(/\btempeh\b/gi, "lentils").replace(/\bsoy yogurt\b/gi, "oat yogurt");
  if (avoidsEgg) result = result.replace(/\bvegetable scramble\b/gi, avoidsSoy ? "bean and vegetable hash" : "tofu and vegetable scramble");
  if (avoidsEgg) result = result.replace(/\beggs?\b/gi, avoidsSoy ? "bean patties" : "tofu");
  if (avoidsFish) result = result.replace(/\bbaked salmon\b/gi, profile.dietaryPattern === "vegan" ? "baked white beans" : "baked chicken").replace(/\btuna\b/gi, profile.dietaryPattern === "vegan" ? "mashed chickpeas" : "chicken");
  if (avoidsGluten) result = result
    .replace(/\bwhole-grain toast\b/gi, "certified gluten-free toast")
    .replace(/\bwhole-grain vegetable wrap\b/gi, "corn-tortilla vegetable wrap")
    .replace(/\blentil pasta\b/gi, "certified gluten-free lentil pasta");
  return result;
}

function recognizeKitchen(items = []) {
  return items.map((source) => {
    const normalized = source.toLowerCase().trim();
    const match = pantryCatalog.find((entry) => entry.aliases.some((alias) => alias === normalized)
      || entry.name.toLowerCase() === normalized);
    if (match) return { ...match, source };
    if (/\b(black pepper|white pepper|sea salt|salt|cinnamon|turmeric|ginger|paprika|cumin|oregano|basil|thyme|rosemary|dill|parsley|garlic powder|onion powder|seasoning|spice)\b/.test(normalized)) return { name: source, group: "Spice", source };
    if (/egg|chicken|turkey|tuna|salmon|fish|steak|beef|pork|sausage|bacon|ground meat|ground beef/.test(normalized)) return { name: source, group: "Protein", source };
    if (/bread|toast|tortilla|waffle|pancake|rice|quinoa|pasta|potato/.test(normalized)) return { name: source, group: "Grain", source };
    if (/lettuce|pepper|onion|tomato|broccoli|carrot|zucchini|cabbage|asparagus|mushroom|beet|spinach|kale|celery|cucumber|squash|green bean|pea|okra|turnip|radish|eggplant/.test(normalized)) return { name: source, group: "Vegetable", source };
    if (/apple|banana|berry|berries|grape|orange|mango|pineapple|melon|peach|pear|kiwi|papaya|cherry|cherries|fruit/.test(normalized)) return { name: source, group: "Fruit", source };
    if (/milk|yogurt|cheese|cottage cheese/.test(normalized)) return { name: source, group: "Protein", source };
    if (/bean|lentil|chickpea|tofu|tempeh/.test(normalized)) return { name: source, group: "Protein", source };
    if (/oil|avocado/.test(normalized)) return { name: source, group: "Fat", source };
    return null;
  }).filter(Boolean);
}

function pantryEligible(item, profile = {}) {
  const name = item.name.toLowerCase();
  const restrictions = restrictionText(profile);
  if (restrictions.split(/[,;\n]/).map((value) => value.trim()).filter(Boolean).some((value) => name.includes(value) || value.includes(name))) return false;
  if (profile.dietaryPattern === "vegan" && /egg|chicken|turkey|tuna|salmon|fish|beef|steak|pork|sausage|bacon|milk|yogurt|cheese/.test(name)) return false;
  if (profile.dietaryPattern === "vegetarian" && /chicken|turkey|tuna|salmon|fish|beef|steak|pork|sausage|bacon/.test(name)) return false;
  return true;
}

function pickKitchen(items, groups, offset, reject = /$^/) {
  const matches = items.filter((item) => groups.includes(item.group) && !reject.test(item.name.toLowerCase()));
  return matches.length ? matches[offset % matches.length] : null;
}

function pantryQuantity(item, fallback = "1 cup") {
  if (!item) return fallback;
  const name = item.name.toLowerCase();
  if (item.group === "Seed") return "2 tbsp";
  if (item.group === "Nut butter") return "1 tbsp";
  if (item.group === "Spice") return "1/2 tsp";
  if (item.group === "Protein" && /powder|collagen/.test(name)) return "1 scoop";
  if (item.group === "Protein" && /egg/.test(name)) return "2";
  if (item.group === "Protein" && /yogurt|cottage cheese/.test(name)) return "3/4 cup";
  if (item.group === "Protein") return "4 oz";
  if (item.group === "Grain") return "3/4 cup cooked";
  if (item.group === "Fat") return "1 tbsp";
  if (item.group === "Fruit" || item.group === "Vegetable") return "1 cup";
  return fallback;
}

function goalAccentQuantity(name = "") {
  const normalized = String(name).toLowerCase();
  if (/nut butter|peanut butter|almond butter|seed butter/.test(normalized)) return "1 tbsp";
  if (/seed/.test(normalized)) return "2 tbsp";
  if (/oil/.test(normalized)) return "1 tbsp";
  if (/spice|cinnamon|turmeric|ginger/.test(normalized)) return "1/2 tsp";
  if (/chicken|turkey|beef|fish|salmon|tuna|tofu|tempeh/.test(normalized)) return "4 oz";
  if (/egg/.test(normalized)) return "2 count";
  return "1 cup";
}

function accentFitsMoment(accent = "", moment = "") {
  const value = accent.toLowerCase();
  if (moment === "Snack") return !/beans?|lentils?|chickpeas?|tofu|tempeh|rice|potato|meat|chicken|fish|tuna/.test(value);
  if (moment === "Breakfast") return !/beans?|lentils?|chickpeas?|fish|tuna|cold cuts?|pork ribs/.test(value);
  return !/oats?|nut butter|seed butter|plain yogurt|mixed berries|banana/.test(value);
}

function chooseGoalAccent(goal, offset, moment) {
  const accents = goalAccents[goal] || goalAccents.general;
  return accents.map((_, index) => accents[(offset + index) % accents.length])
    .find((accent) => accentFitsMoment(accent, moment)) || accents[offset % accents.length];
}

function proteinPreparationInstruction(name = "") {
  const value = name.toLowerCase();
  if (/canned tuna|canned salmon|canned chicken/.test(value)) return `Drain ${name} and serve it chilled or gently warmed; it is already cooked, so follow its package directions.`;
  if (/cold cuts?|deli|ham|pepperoni/.test(value)) return `Keep ${name} refrigerated and serve according to its ready-to-eat package directions; heat only if the label or subscriber preference calls for it.`;
  if (/chicken|turkey|poultry/.test(value)) return `Cook ${name} to 165°F (74°C).`;
  if (/ground meat|ground beef|ground pork/.test(value)) return `Cook ${name} to 160°F (71°C).`;
  if (/pork|steak|beef/.test(value)) return `Cook ${name} to at least 145°F (63°C), then rest whole cuts for 3 minutes.`;
  if (/fish|salmon|tuna/.test(value)) return `Cook ${name} to 145°F (63°C), or until opaque and easily flaked.`;
  if (/egg/.test(value)) return `Cook ${name} until the whites and yolks are set.`;
  return `Cook or warm ${name} according to its package directions until safely prepared and steaming where applicable.`;
}

function buildPantryFirstMeal(moment, profile, goal, dayIndex, recognized, occasionIndex, variationSeed, smoothieIngredients = new Set()) {
  const eligible = recognized.filter((item) => pantryEligible(item, profile));
  const complementary = eligible.filter((item) => !smoothieIngredients.has(item.name.toLowerCase()));
  const available = complementary.length >= 4 ? complementary : eligible;
  const offset = dayIndex * 3 + occasionIndex + variationSeed;
  const proteinReject = moment === "Dinner"
    ? /powder|collagen|cold cuts?|deli|pepperoni/
    : moment === "Snack"
      ? /powder|collagen|cold cuts?|deli|pepperoni|chicken|turkey|pork|beef|steak|tuna|salmon|fish/
      : moment === "Breakfast"
        ? /powder|collagen|cold cuts?|deli|pepperoni|tuna|salmon|fish|pork ribs?|steak|ground meat|ground beef/
        : /powder|collagen/;
  const grainReject = moment === "Lunch" || moment === "Dinner" ? /waffle|pancake|oats?/ : moment === "Breakfast" ? /knorr|rice sides?|mashed potato/ : /$^/;
  const protein = pickKitchen(available, ["Protein"], offset, proteinReject);
  const grain = pickKitchen(available, ["Grain"], offset + 1, grainReject);
  const vegetable = pickKitchen(available, ["Vegetable"], offset + 2);
  const secondVegetable = pickKitchen(available, ["Vegetable"], offset + 5);
  const fruit = pickKitchen(available, ["Fruit"], offset + 3);
  const seed = pickKitchen(available, ["Seed", "Nut butter"], offset + 4);
  const targetAccent = chooseGoalAccent(goal, offset, moment);
  const isWaffleBreakfast = moment === "Breakfast" && /waffle/i.test(grain?.name || "");
  const isSavoryProtein = /chicken|turkey|sausage|egg|tofu|tempeh/i.test(protein?.name || "");
  const sweetBreakfast = moment === "Breakfast" && /yogurt|cottage cheese/i.test(protein?.name || "");
  const chosen = moment === "Breakfast"
    ? sweetBreakfast ? [protein, grain, fruit, seed] : [protein, grain, vegetable, fruit]
    : moment === "Lunch"
      ? [protein, grain, vegetable, secondVegetable]
      : moment === "Snack"
        ? [fruit, protein, seed]
        : [protein, grain, vegetable, secondVegetable];
  const unique = [...new Map(chosen.filter(Boolean).map((item) => [item.name.toLowerCase(), item])).values()];
  const hasGoalAccent = unique.some((item) => item.name.toLowerCase().includes(targetAccent.toLowerCase()) || targetAccent.toLowerCase().includes(item.name.toLowerCase()));
  const ingredients = unique.map((item) => ({ quantity: pantryQuantity(item), name: item.name, availability: "on-hand" }));
  const incompatibleWaffleAccent = isWaffleBreakfast && isSavoryProtein && /nut butter|seed butter/i.test(targetAccent);
  const compatibleAccent = accentFitsMoment(targetAccent, moment)
    && !(moment === "Snack" && /yogurt|fruit|berry|kiwi|apple|banana/i.test(unique.map((item) => item.name).join(" ")) && /beans?|lentils?|chickpeas?/.test(targetAccent.toLowerCase()));
  if (!hasGoalAccent && !incompatibleWaffleAccent && compatibleAccent) ingredients.push({ quantity: goalAccentQuantity(targetAccent), name: targetAccent, availability: "needed" });
  const names = ingredients.map((item) => item.name);
  const vegetableNames = [vegetable?.name, secondVegetable?.name].filter(Boolean).join(" and ");
  const eggRiceDinner = moment === "Dinner" && /egg/i.test(protein?.name || "") && /rice/i.test(grain?.name || "");
  const food = moment === "Breakfast"
    ? sweetBreakfast ? `${fruit?.name || "Fruit"} yogurt breakfast bowl with ${grain?.name || "oats"} and ${seed?.name || "seeds"}` : `${names.slice(0, 2).join(" and ")} breakfast${names.slice(2).length ? ` with ${names.slice(2).join(" and ")}` : ""}`
    : moment === "Snack"
      ? /yogurt/i.test(protein?.name || "") ? `${fruit?.name || "Fruit"} yogurt cup with ${seed?.name || "seeds"}` : `${names.slice(0, 2).join(" with ")}${names[2] ? ` and ${names[2]}` : ""}`
      : eggRiceDinner ? `Vegetable egg fried rice with ${vegetableNames}` : `${names[0] || "Whole-food protein"} ${/cold cuts?|deli|ham|pepperoni/i.test(names[0] || "") ? "plate" : `${moment.toLowerCase()} bowl`} with ${names.slice(1).join(", ")}`;
  const requiresCooking = moment !== "Snack" && (moment !== "Breakfast" || Boolean(grain || /egg/.test(protein?.name.toLowerCase() || "")));
  const seasoningRecommendation = requiresCooking ? recommendCulinarySeasoning(profile, goal, food) : null;
  if (seasoningRecommendation) ingredients.push({ quantity: "1/2 tsp", name: seasoningRecommendation.name, availability: "needed" });
  const instructions = requiresCooking ? [
    "Gather the ingredients marked on hand and the items listed as still needed.",
    "Cook the grain according to its package directions and prepare the protein to its safe internal temperature.",
    "Cut vegetables evenly, then roast or sauté until tender and lightly browned.",
    "Combine the cooked components, add the profile-aware seasoning, and serve one planned portion.",
    "Refrigerate perishable leftovers within two hours.",
  ] : ["Measure the listed ingredients.", "Combine them in one snack portion and serve promptly."];
  const proteinName = protein?.name || "the protein";
  const grainName = grain?.name || "the grain";
  const specificInstructions = eggRiceDinner ? [
    proteinPreparationInstruction(proteinName),
    `Cook ${grainName} according to its package directions and cool it briefly so the grains stay separate.`,
    `SautÃ© ${vegetableNames || "the vegetables"} until tender, add the rice, then stir in the cooked egg until evenly combined.`,
    seasoningRecommendation ? `Season the fried rice lightly with ${seasoningRecommendation.name} to taste.` : "Season lightly and serve as one composed dish.",
    "Serve one planned portion and refrigerate perishable leftovers within two hours.",
  ] : requiresCooking ? moment === "Breakfast" ? [
    proteinPreparationInstruction(proteinName),
    isWaffleBreakfast ? `Toast or heat ${grainName} until crisp.` : `Cook or warm ${grainName} according to its package directions.`,
    fruit ? `Wash and portion ${fruit.name} as a fresh side.` : `Prepare ${vegetable?.name || "the produce"} as listed.`,
    seasoningRecommendation ? `Use ${seasoningRecommendation.name} on the savory protein only, then plate the components together.` : "Plate the cooked and fresh components together as one serving.",
    "Refrigerate perishable leftovers within two hours.",
  ] : [
    proteinPreparationInstruction(proteinName),
    `Cook ${grainName} according to its package directions.`,
    vegetableNames ? `Cut ${vegetableNames} evenly, then roast or sauté until tender and lightly browned.` : "Prepare the listed produce and fresh garnishes.",
    seasoningRecommendation ? `Combine the cooked components and season with ${seasoningRecommendation.name} to taste.` : "Combine the cooked components and season lightly to taste.",
    "Serve one planned portion and refrigerate perishable leftovers within two hours.",
  ] : ["Measure the listed ingredients for one serving.", `Combine ${names.join(", ")} in a coherent snack plate or bowl and serve promptly.`];
  return { meal: moment, food: adaptForRestrictions(food, profile), pantryMatch: unique.map((item) => item.source).join(", "), ingredients, instructions: specificInstructions, requiresCooking, seasoningRecommendation, pantryDriven: true };
}

function pantryMatchFor(moment, recognized, dayIndex) {
  const allowed = {
    Breakfast: ["Fruit", "Grain", "Protein", "Seed", "Nut butter", "Spice"],
    Lunch: ["Vegetable", "Grain", "Protein", "Seed", "Spice"],
    Snack: ["Fruit", "Protein", "Seed", "Nut butter"],
    Dinner: ["Vegetable", "Grain", "Protein", "Seed", "Spice"],
  }[moment];
  const candidates = recognized.filter((item) => allowed.includes(item.group));
  return candidates.length ? candidates[dayIndex % candidates.length] : null;
}

function buildMeal(moment, profile, goal, dayIndex, recognized, occasionIndex, variationSeed = 0, smoothieIngredients = new Set()) {
  if (recognized.filter((item) => pantryEligible(item, profile)).length >= 4) {
    return buildPantryFirstMeal(moment, profile, goal, dayIndex, recognized, occasionIndex, variationSeed, smoothieIngredients);
  }
  const bases = mealBases[moment];
  const base = bases[(dayIndex + occasionIndex * 2 + variationSeed) % bases.length];
  const pantryMatch = pantryMatchFor(moment, recognized, dayIndex + occasionIndex + Math.floor(variationSeed / 3));
  const accents = goalAccents[goal] || goalAccents.general;
  const accent = pantryMatch?.name || accents[(dayIndex + occasionIndex + Math.floor(variationSeed / 7)) % accents.length];
  const restrictions = restrictionText(profile);
  const harvestOffset = (dayIndex + variationSeed * 5) % dailyHarvests.length;
  const harvest = dailyHarvests
    .slice(harvestOffset)
    .concat(dailyHarvests.slice(0, harvestOffset))
    .find((item) => !restrictions.includes(item.toLowerCase())) || "seasonal vegetables";
  const isPlantBased = ["vegan", "vegetarian"].includes(profile.dietaryPattern);
  const food = adaptForRestrictions(isPlantBased ? veganize(`${base} with ${accent} and ${harvest}`) : `${base} with ${accent} and ${harvest}`, profile);
  const details = buildMealDetails(moment, base, accent, harvest, profile, pantryMatch, goal);
  return {
    meal: moment,
    food,
    pantryMatch: pantryMatch?.source || null,
    ingredients: details.ingredients,
    instructions: details.instructions,
    requiresCooking: details.requiresCooking,
    seasoningRecommendation: details.seasoningRecommendation,
  };
}

function smoothieContextSeed(context = {}) {
  const signature = JSON.stringify({
    recipeName: context.recipeName || "",
    ingredients: (context.ingredients || []).map((item) => typeof item === "string"
      ? item.toLowerCase()
      : `${item.name || ""}:${item.amount ?? ""}:${item.unit || ""}`.toLowerCase()),
  });
  let hash = 0;
  for (let index = 0; index < signature.length; index += 1) hash = ((hash * 31) + signature.charCodeAt(index)) >>> 0;
  return hash % 997;
}

function buildMealDetails(moment, base, accent, harvest, profile = {}, pantryMatch = null, goal = "general") {
  const plantBased = ["vegan", "vegetarian"].includes(profile.dietaryPattern);
  const accentQuantity = (() => {
    const group = pantryMatch?.group;
    const normalized = accent.toLowerCase();
    if (group === "Seed" || /seed|flax/.test(normalized)) return "2 tbsp";
    if (group === "Nut butter") return "1 tbsp";
    if (group === "Spice") return "1 tsp";
    if (group === "Protein" && /powder|collagen|hemp protein/.test(normalized)) return "1 scoop";
    if (group === "Protein" && /yogurt/.test(normalized)) return "3/4 cup";
    if (group === "Protein") return "4 oz";
    if (group === "Grain") return "3/4 cup cooked";
    return "1 cup";
  })();
  const requiresCooking = moment === "Dinner"
    || (moment === "Breakfast" && /waffle|scramble|quinoa/i.test(base))
    || (moment === "Lunch" && /rice|soup/i.test(base));
  const seasoningRecommendation = requiresCooking
    ? recommendCulinarySeasoning(profile, goal, `${base} ${accent} ${harvest}`)
    : null;
  const details = {
    Breakfast: base.includes("waffle")
      ? [["2", "eggs"], ["2", "whole-grain waffles"], ["2 links", plantBased ? "plant-based breakfast sausage" : "chicken or turkey sausage"], ["1 cup", "fresh fruit"], [accentQuantity, accent]]
      : base.includes("scramble")
      ? [["2", plantBased ? "tofu scramble portions" : "eggs"], ["2 slices", "whole-grain toast"], [accentQuantity, accent], ["1 cup", "fresh fruit"]]
      : [["1 cup cooked", base.toLowerCase()], [accentQuantity, accent], ["2 tbsp", "seeds or chopped walnuts"], ["1 cup", "fresh fruit"]],
    Lunch: base.includes("Tuna salad")
      ? [["5 oz", "tuna"], ["2 slices", "whole-grain bread"], ["1 tbsp", "plain yogurt or olive-oil dressing"], ["1 cup", harvest], ["1 piece", "whole fruit"]]
      : base.includes("wrap")
      ? [["1 large", "whole-grain wrap"], ["3/4 cup", plantBased ? "chickpeas or hummus" : "chicken, tuna, or chickpeas"], ["1 cup", harvest], [accentQuantity, accent], ["1 piece", "whole fruit"]]
      : [["1 cup cooked", base.toLowerCase()], ["1 cup", harvest], [accentQuantity, accent], ["1 tbsp", "olive-oil herb dressing"]],
    Snack: [["1 serving", base.toLowerCase()], [accentQuantity, accent], ["2 tbsp", "seeds, hummus, or seed butter"]],
    Dinner: [["6 oz", plantBased ? "beans, lentils, tofu, or tempeh" : base.includes("salmon") ? "salmon" : base.includes("Chicken") ? "chicken" : "protein listed in meal"], ["1 cup cooked", "whole grain or potato"], ["2 cups", harvest], ["1 tbsp", "olive oil"]],
  }[moment];
  if (accent && !details.some(([, name]) => name.toLowerCase().includes(accent.toLowerCase()) || accent.toLowerCase().includes(name.toLowerCase()))) {
    details.push([accentQuantity, accent]);
  }
  if (seasoningRecommendation) details.push([moment === "Dinner" ? "1 tsp" : "1/2 tsp", seasoningRecommendation.name]);
  const instructions = moment === "Dinner" ? [
    "Preheat the oven to 400°F (205°C), or warm a covered skillet over medium heat.",
    "Measure the ingredients, cut vegetables into even pieces, and season lightly with the listed olive oil, herbs, and spices.",
    "Cook poultry to 165°F (74°C) or fish to 145°F (63°C). Heat plant proteins until steaming throughout.",
    "Cook the grain or potato until tender and roast or sauté the vegetables until browned at the edges.",
    "Plate one serving and refrigerate perishable leftovers within two hours.",
  ] : moment === "Breakfast" ? [
    "Measure and prepare all ingredients before heating the pan or appliance.",
    "Cook eggs or tofu in a lightly oiled skillet over medium heat until set and steaming throughout.",
    "Toast or warm the grain component according to its package directions.",
    "Add fresh fruit after cooking and serve promptly.",
  ] : [
    "Prepare the grain or soup base according to its package directions, using unsalted water or broth when practical.",
    "Cook until the grain is tender or the soup reaches a steady simmer and all ingredients are steaming throughout.",
    "Fold in prepared vegetables and protein, season to taste, and serve one planned portion.",
    "Refrigerate perishable leftovers within two hours.",
  ];
  return {
    ingredients: details.map(([quantity, name]) => ({ quantity, name: adaptForRestrictions(name, profile) })),
    instructions,
    requiresCooking,
    seasoningRecommendation,
  };
}

export function generateMealPlan(profile = {}, goal = "general", days = 1, options = {}) {
  const count = Math.min(30, Math.max(1, Number(days)));
  const kitchenItems = Array.isArray(options.kitchenItems) ? options.kitchenItems : [];
  const recognized = recognizeKitchen(kitchenItems);
  const pantryText = kitchenItems.join(", ");
  const smoothieCycle = smoothieGoalCycles[goal] || smoothieGoalCycles.general;
  const subscriberSeed = profileVariationSeed(profile);
  const requestedVariation = Number.isInteger(options.variationSeed) ? options.variationSeed : 0;
  const pairedSmoothieSeed = options.smoothieContext?.recipeName ? smoothieContextSeed(options.smoothieContext) : 0;
  const variationSeed = subscriberSeed + requestedVariation + pairedSmoothieSeed;
  const pairedSmoothieIngredients = new Set((options.smoothieContext?.ingredients || [])
    .map((item) => (typeof item === "string" ? item : item?.name))
    .filter(Boolean)
    .map((name) => name.toLowerCase()));

  return Array.from({ length: count }, (_, dayIndex) => {
    const smoothieGoal = smoothieCycle[dayIndex % smoothieCycle.length];
    const smoothie = generatePersonalizedSmoothie(profile, smoothieGoal, 16, {
      pantryText,
      // The smoothie engine already applies the subscriber seed. This value is
      // only the day/alternate offset so the seed is not counted twice.
      variationIndex: dayIndex + requestedVariation,
      mealPlanMode: true,
    });
    const smoothiePantryMatches = smoothie.pantryMatches || [];
    const pairedSmoothie = dayIndex === 0 && options.smoothieContext?.recipeName
      ? {
          meal: "Smoothie",
          food: options.smoothieContext.recipeName,
          pantryMatch: null,
          ingredients: (options.smoothieContext.ingredients || []).map((ingredient) => ({
            quantity: typeof ingredient === "string" ? "Saved Tier 1 quantity" : `${ingredient.amount ?? ""} ${ingredient.unit || ""}`.trim() || ingredient.quantity || "Saved Tier 1 quantity",
            name: typeof ingredient === "string" ? ingredient : ingredient.name,
          })),
          instructions: ["Use the exact Tier 1 smoothie formulation already generated for this pairing."],
          generationSource: "tier-1-handoff",
        }
      : null;
    return {
      day: dayIndex + 1,
      reviewedProfile: Boolean(profile.completedAt),
      reviewedKitchenItems: kitchenItems.length,
      meals: [
        pairedSmoothie || {
          meal: "Smoothie",
          food: `${smoothie.name} · 16 oz`,
          smoothie,
          pantryMatch: smoothiePantryMatches.length ? smoothiePantryMatches.join(", ") : null,
          ingredients: smoothie.ingredients.map((ingredient) => ({ quantity: `${ingredient.amount} ${ingredient.unit}`, name: ingredient.name })),
          instructions: ["Add liquid first, followed by soft ingredients, frozen produce, and ice.", "Blend for 45–60 seconds until smooth.", "Pour and serve promptly."],
        },
        ...["Breakfast", "Lunch", "Snack", "Dinner"].map((moment, occasionIndex) =>
          buildMeal(moment, profile, goal, dayIndex, recognized, occasionIndex, variationSeed, pairedSmoothieIngredients)),
      ],
    };
  });
}

const groceryNoise = /\b(fresh|frozen|cooked|roasted|baked|plain|unsweetened|salt-free|large|whole-grain|whole|listed in meal|or|and)\b/g;
const normalizedGroceryName = (value) => String(value || "").toLowerCase().replace(groceryNoise, " ").replace(/[^a-z0-9]+/g, " ").trim().replace(/s\b/g, "");

function kitchenContains(needed, kitchenItems, recognizedKitchen) {
  const target = normalizedGroceryName(needed);
  if (!target || /protein listed|seasonal vegetable/.test(target)) return false;
  if (/fruit/.test(target) && recognizedKitchen.some((item) => item.group === "Fruit")) return true;
  if (/vegetable|green/.test(target) && recognizedKitchen.some((item) => item.group === "Vegetable")) return true;
  return kitchenItems.some((item) => {
    const available = normalizedGroceryName(item);
    return available && (available.includes(target) || target.includes(available));
  });
}

export function buildGroceryList(plan, kitchenItems = []) {
  const foods = plan.flatMap((day) => day.meals.map((item) => item.food));
  const pantryMatches = plan.flatMap((day) => day.meals.map((item) => item.pantryMatch).filter(Boolean));
  const requiredIngredients = [...new Map(plan.flatMap((day) => day.meals.flatMap((meal) => meal.ingredients || []))
    .filter((item) => item.name && !/water|ice|protein listed in meal/i.test(item.name))
    .map((item) => [normalizedGroceryName(item.name), item.name])).values()];
  const recognizedKitchen = recognizeKitchen(kitchenItems);
  const available = requiredIngredients.filter((item) => kitchenContains(item, kitchenItems, recognizedKitchen));
  const missing = requiredIngredients.filter((item) => !kitchenContains(item, kitchenItems, recognizedKitchen));
  return { foundations: missing, missing, available, plannedMeals: [...new Set(foods)], pantryMatches: [...new Set(pantryMatches)] };
}
