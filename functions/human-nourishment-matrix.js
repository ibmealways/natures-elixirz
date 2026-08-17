const normalize = (value) => String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

export const HUMAN_NOURISHMENT_MATRIX = Object.freeze({
  cellular: { label: "Cellular nourishment", patterns: ["protein", "colorful-produce", "unsaturated-fat"], pathway: "Protein turnover, cellular membranes, and antioxidant-defense systems" },
  energy: { label: "Energy metabolism", patterns: ["energy", "protein", "hydration"], pathway: "Energy substrate delivery and normal cellular energy metabolism" },
  muscle: { label: "Muscle nutrition", patterns: ["protein", "energy", "hydration"], pathway: "Protein synthesis and normal muscle-tissue turnover" },
  bone: { label: "Bone nutrition", patterns: ["bone-pattern", "protein", "vitamin-c-pattern"], pathway: "Bone matrix maintenance and mineral-supportive nutrition" },
  connective: { label: "Connective-tissue nutrition", patterns: ["protein", "vitamin-c-pattern", "colorful-produce"], pathway: "Normal collagen synthesis and connective-tissue protein turnover" },
  nervous: { label: "Brain & nervous-system nutrition", patterns: ["unsaturated-fat", "energy", "colorful-produce"], pathway: "Neural membranes, energy supply, and micronutrient delivery" },
  cardiovascular: { label: "Cardiovascular nutrition", patterns: ["fiber", "unsaturated-fat", "colorful-produce"], pathway: "Fiber-rich, unsaturated-fat, and polyphenol-containing food patterns" },
  microbiome: { label: "Gut & microbiome nutrition", patterns: ["fiber", "colorful-produce", "hydration"], pathway: "Diverse fermentable substrates and bowel regularity support" },
  immune: { label: "Immune nourishment", patterns: ["protein", "colorful-produce", "vitamin-c-pattern"], pathway: "Adequate protein and micronutrients used in normal immune function" },
});

const SIGNALS = [
  [/protein|collagen|yogurt|milk|egg|tofu|hemp|chia|flax|peanut|almond/, ["protein"]],
  [/banana|mango|pineapple|grape|apple|pear|oat|rice|quinoa|potato/, ["energy"]],
  [/berry|blueberr|strawberr|raspberr|blackberr|acai|cherr|grape|spinach|kale|carrot|cacao/, ["colorful-produce"]],
  [/spinach|kale|broccoli|bean|lentil|oat|chia|flax|apple|pear|berry/, ["fiber"]],
  [/chia|flax|hemp seed|walnut|avocado|olive|peanut|almond|salmon/, ["unsaturated-fat"]],
  [/water|milk|cucumber|melon|orange|berry/, ["hydration"]],
  [/yogurt|fortified|soy milk|tofu|chia|broccoli|kale/, ["bone-pattern"]],
  [/orange|kiwi|strawberr|broccoli|mango|pineapple|lemon|lime|bell pepper/, ["vitamin-c-pattern"]],
];

export function nourishmentPatternsFor(names = []) {
  return [...new Set(names.flatMap((item) => {
    const name = normalize(item?.name || item);
    return SIGNALS.flatMap(([pattern, tags]) => pattern.test(name) ? tags : []);
  }))];
}

export function evaluateHumanNourishmentMatrix(ingredients = []) {
  const names = ingredients.map((item) => item?.name || item).filter(Boolean);
  const patterns = nourishmentPatternsFor(names);
  const systems = Object.entries(HUMAN_NOURISHMENT_MATRIX).map(([id, system]) => {
    const matched = system.patterns.filter((pattern) => patterns.includes(pattern));
    return { id, label: system.label, pathway: system.pathway, score: Math.round((matched.length / system.patterns.length) * 100), matched, missing: system.patterns.filter((pattern) => !patterns.includes(pattern)) };
  });
  const synergies = [
    patterns.includes("protein") && patterns.includes("vitamin-c-pattern") && "Protein sources paired with vitamin-C-rich produce support normal collagen synthesis and tissue protein turnover.",
    patterns.includes("colorful-produce") && patterns.includes("unsaturated-fat") && "Unsaturated-fat sources accompany fat-soluble plant compounds such as carotenoids.",
    patterns.includes("protein") && patterns.includes("energy") && "Protein is paired with a carbohydrate-energy source for a more complete nourishment pattern.",
    patterns.includes("fiber") && patterns.includes("hydration") && "Fiber is paired with fluid; individual digestive tolerance still depends on portion and usual intake.",
  ].filter(Boolean);
  const gaps = [
    !patterns.includes("protein") && { pattern: "protein", message: "Add an appropriate protein source to improve structural and muscle nourishment." },
    !patterns.includes("unsaturated-fat") && { pattern: "unsaturated-fat", message: "Consider a modest seed, nut-butter, or other unsaturated-fat source when appropriate." },
    !patterns.includes("fiber") && { pattern: "fiber", message: "Add a tolerated whole fruit, vegetable, seed, legume, or whole grain for fiber." },
    !patterns.includes("hydration") && { pattern: "hydration", message: "Add an appropriate liquid foundation." },
  ].filter(Boolean);
  const averageScore = Math.round(systems.reduce((sum, system) => sum + system.score, 0) / systems.length);
  return {
    version: "human-nourishment-matrix-v1",
    score: averageScore,
    systems,
    patterns,
    synergies,
    gaps,
    saturation: names.length > 12 ? { detected: true, ingredientCount: names.length, message: `${names.length} ingredients may reduce useful portions, flavor coherence, and digestive tolerance. Optimize rather than stack more ingredients.` } : { detected: false, ingredientCount: names.length },
    evidenceConfidence: "Ingredient-pattern model",
    boundary: "Scores describe formulation coverage, not disease treatment, clinical adequacy, absorption, or an individual health outcome. Exact nutrient conclusions require verified identities, quantities, and product labels.",
  };
}
