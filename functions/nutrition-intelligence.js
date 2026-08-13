import { findIngredientEvidence, ingredientEvidenceSummary, refluxProfileEnabled } from "./ingredient-evidence.js";

const normalize = (value) => String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

const asList = (value) => (Array.isArray(value) ? value : String(value || "").split(/[,;\n]/))
  .map((item) => String(item || "").trim()).filter(Boolean);

const INGREDIENT_SIGNALS = [
  { pattern: /chicken|turkey|salmon|tuna|sardine|egg|yogurt|kefir|tofu|tempeh|lentil|bean|hemp protein|protein powder|collagen/, tags: ["protein"] },
  { pattern: /oat|brown rice|quinoa|farro|barley|whole grain|sweet potato|banana|mango|pineapple|grape/, tags: ["energy"] },
  { pattern: /berry|blueberr|strawberr|blackberr|raspberr|cherr|grape|cacao|colorful/, tags: ["colorful-produce"] },
  { pattern: /spinach|kale|bok choy|broccoli|greens|asparagus|bean|lentil|oat|chia|flax|apple|pear/, tags: ["fiber"] },
  { pattern: /chia|flax|hemp seed|walnut|avocado|olive oil|salmon|sardine|peanut butter|almond butter/, tags: ["unsaturated-fat"] },
  { pattern: /coconut water|water|cucumber|watermelon|melon|orange|grape|berry/, tags: ["hydration"] },
  { pattern: /yogurt|kefir|fortified milk|soy milk|tofu|sardine|chia|broccoli/, tags: ["bone-pattern"] },
  { pattern: /lentil|bean|spinach|tofu|pumpkin seed|hemp|beef|turkey/, tags: ["iron-pattern"] },
  { pattern: /orange|kiwi|strawberr|bell pepper|broccoli|mango|pineapple|lemon|lime/, tags: ["vitamin-c-pattern"] },
  { pattern: /ginger|turmeric|cinnamon|rosemary|garlic|basil|parsley|oregano/, tags: ["culinary-herb"] },
];

const GOAL_RULES = {
  muscles: { label: "Muscle nourishment", required: ["protein", "energy"], helpful: ["hydration"] },
  protein: { label: "Protein & strength", required: ["protein"], helpful: ["energy", "hydration"] },
  healthyweight: { label: "Healthy weight gain support", required: ["protein", "energy"], helpful: ["unsaturated-fat", "bone-pattern"] },
  weightloss: { label: "Healthy weight loss support", required: ["protein", "fiber"], helpful: ["colorful-produce", "hydration"] },
  heart: { label: "Heart-supportive nutrition", required: ["fiber", "unsaturated-fat"], helpful: ["colorful-produce"] },
  circulation: { label: "Aorta & vascular-supportive nutrition", required: ["colorful-produce", "fiber"], helpful: ["hydration", "unsaturated-fat"] },
  blood: { label: "Blood-building nutrition", required: ["iron-pattern", "vitamin-c-pattern"], helpful: ["protein"] },
  bones: { label: "Bone-supportive nutrition", required: ["bone-pattern", "protein"], helpful: ["colorful-produce"] },
  joints: { label: "Joint-supportive nutrition", required: ["protein", "colorful-produce"], helpful: ["unsaturated-fat", "culinary-herb"] },
  inflammation: { label: "Anti-inflammatory eating pattern", required: ["colorful-produce", "unsaturated-fat"], helpful: ["culinary-herb", "fiber"] },
  painsupport: { label: "Comfort-supportive nutrition", required: ["colorful-produce"], helpful: ["unsaturated-fat", "culinary-herb"] },
  digestion: { label: "Digestive wellness", required: ["fiber"], helpful: ["hydration"] },
  kidney: { label: "Kidney-aware nutrition", required: [], helpful: ["colorful-produce"], clinicianReview: true },
  liver: { label: "Liver-supportive eating pattern", required: ["fiber", "colorful-produce"], helpful: [] },
  brain: { label: "Brain & cognition", required: ["unsaturated-fat", "colorful-produce"], helpful: ["energy"] },
  focus: { label: "Focus-supportive nutrition", required: ["energy"], helpful: ["hydration", "protein"] },
  energy: { label: "Everyday energy", required: ["energy"], helpful: ["protein", "hydration"] },
  immune: { label: "Immune nourishment", required: ["protein", "colorful-produce"], helpful: ["vitamin-c-pattern"] },
  cellular: { label: "Cellular nourishment", required: ["colorful-produce", "protein"], helpful: ["fiber"] },
  general: { label: "Everyday nutrition", required: ["protein", "colorful-produce"], helpful: ["fiber", "hydration"] },
};

const goalKey = (value) => normalize(value).replace(/\s/g, "");

function ingredientTags(name) {
  const normalized = normalize(name);
  const catalog = findIngredientEvidence(name);
  return [...new Set([...(catalog?.tags || []), ...INGREDIENT_SIGNALS.flatMap((signal) => signal.pattern.test(normalized) ? signal.tags : [])])];
}

function restrictionMatches(name, restrictions) {
  const candidate = normalize(name);
  return restrictions.filter((restriction) => {
    const term = normalize(restriction);
    return term.length > 2 && (candidate.includes(term) || term.includes(candidate));
  });
}

function portionWarnings(ingredients) {
  return ingredients.flatMap((item) => {
    const amount = Number(item.amount);
    if (!Number.isFinite(amount)) return [];
    if (item.unit === "tbsp" && amount > 4) return [`${item.name}: more than 4 tbsp should be reviewed.`];
    if (item.unit === "tsp" && amount > 6) return [`${item.name}: more than 6 tsp should be reviewed.`];
    if (item.unit === "scoop" && amount > 2) return [`${item.name}: more than 2 scoops should follow the product label and professional guidance.`];
    if (item.unit === "cup" && amount > 3) return [`${item.name}: more than 3 cups may not fit the requested serving.`];
    return [];
  });
}

export function createNutritionBrief(profile = {}, goals = []) {
  const selectedGoals = asList(goals).map(goalKey).filter(Boolean);
  const rules = selectedGoals.map((goal) => GOAL_RULES[goal] || { label: goal, required: [], helpful: [] });
  const medicationsPresent = Boolean(String(profile.medications || "").trim());
  const conditions = [...asList(profile.conditions), ...asList(profile.otherHealthConditions)];
  const kidneyAware = conditions.some((item) => /kidney|renal|dialysis/i.test(item)) || rules.some((rule) => rule.clinicianReview);
  return {
    selectedGoals,
    targetPatterns: [...new Set(rules.flatMap((rule) => rule.required || []))],
    helpfulPatterns: [...new Set(rules.flatMap((rule) => rule.helpful || []))],
    prohibitedIngredients: [...new Set([...asList(profile.allergies), ...asList(profile.avoidIngredients)])],
    professionalReviewRequired: medicationsPresent || kidneyAware,
    refluxScreeningEnabled: refluxProfileEnabled(profile),
    reviewReason: medicationsPresent
      ? "Medication information is present. Food–medication compatibility must be confirmed with a pharmacist or prescriber."
      : kidneyAware ? "Kidney-related needs are highly individual and require clinician-approved nutrient and fluid targets." : "",
  };
}

export function assessNutritionSelection({ ingredients = [], profile = {}, goals = [], kind = "recipe" } = {}) {
  const brief = createNutritionBrief(profile, goals);
  const names = ingredients.map((item) => String(item?.name || item || "").trim()).filter(Boolean);
  const prohibitedMatches = names.flatMap((name) => restrictionMatches(name, brief.prohibitedIngredients).map((restriction) => ({ ingredient: name, restriction })));
  const normalizedNames = names.map(normalize);
  const duplicates = names.filter((name, index) => normalizedNames.indexOf(normalize(name)) !== index);
  const presentPatterns = [...new Set(names.flatMap(ingredientTags))];
  const requiredMet = brief.targetPatterns.filter((tag) => presentPatterns.includes(tag));
  const helpfulMet = brief.helpfulPatterns.filter((tag) => presentPatterns.includes(tag));
  const totalTargets = brief.targetPatterns.length + brief.helpfulPatterns.length;
  const weightedHits = (requiredMet.length * 2) + helpfulMet.length;
  const weightedTargets = (brief.targetPatterns.length * 2) + brief.helpfulPatterns.length;
  const goalFitScore = weightedTargets ? Math.round((weightedHits / weightedTargets) * 100) : 70;
  const warnings = [
    ...portionWarnings(ingredients),
    ...(duplicates.length ? [`Duplicate ingredients: ${[...new Set(duplicates)].join(", ")}.`] : []),
    ...(brief.professionalReviewRequired ? [brief.reviewReason] : []),
  ];
  const evidence = ingredientEvidenceSummary(ingredients, profile);
  return {
    version: "nutrition-intelligence-v1",
    kind,
    goalFitScore: Math.max(0, Math.min(100, goalFitScore)),
    matchedPatterns: [...requiredMet, ...helpfulMet],
    missingPriorityPatterns: brief.targetPatterns.filter((tag) => !presentPatterns.includes(tag)),
    prohibitedMatches,
    warnings,
    requiresProfessionalReview: brief.professionalReviewRequired,
    evidenceLevel: "ingredient-pattern screening",
    evidence,
    explanation: prohibitedMatches.length
      ? "This selection conflicts with a saved allergy or avoidance and must not be used."
      : `This ${kind} matches ${requiredMet.length} of ${brief.targetPatterns.length} priority nutrition patterns and ${helpfulMet.length} supporting patterns selected for this subscriber.`,
    boundary: "Educational food guidance only. Individual needs, medication interactions, laboratory values, and clinical outcomes require review by a qualified clinician or pharmacist.",
  };
}

export function assertNutritionSafety(assessment) {
  if (assessment.prohibitedMatches.length) {
    const first = assessment.prohibitedMatches[0];
    throw new Error(`The proposal included ${first.ingredient}, which conflicts with the saved restriction ${first.restriction}.`);
  }
  if (assessment.warnings.some((warning) => warning.startsWith("Duplicate ingredients:"))) {
    throw new Error("The proposal contained duplicate ingredients.");
  }
  if (assessment.warnings.some((warning) => /more than \d/.test(warning))) {
    throw new Error(`The proposal contained an unreasonable quantity: ${assessment.warnings.find((warning) => /more than \d/.test(warning))}`);
  }
  return assessment;
}

export const nutritionGoalRules = GOAL_RULES;
