const normalize = (value) => String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

export const nourishmentSystems = Object.freeze([
  ["cellular", "Cellular nourishment", ["protein", "colorful-produce", "unsaturated-fat"], "Protein turnover, cellular membranes, and antioxidant-defense systems"],
  ["energy", "Energy metabolism", ["energy", "protein", "hydration"], "Energy substrate delivery and normal cellular energy metabolism"],
  ["muscle", "Muscle nutrition", ["protein", "energy", "hydration"], "Protein synthesis and normal muscle-tissue turnover"],
  ["bone", "Bone nutrition", ["bone-pattern", "protein", "vitamin-c-pattern"], "Bone matrix maintenance and mineral-supportive nutrition"],
  ["connective", "Connective-tissue nutrition", ["protein", "vitamin-c-pattern", "colorful-produce"], "Normal collagen synthesis and connective-tissue protein turnover"],
  ["nervous", "Brain & nervous-system nutrition", ["unsaturated-fat", "energy", "colorful-produce"], "Neural membranes, energy supply, and micronutrient delivery"],
  ["cardiovascular", "Cardiovascular nutrition", ["fiber", "unsaturated-fat", "colorful-produce"], "Fiber-rich, unsaturated-fat, and polyphenol-containing food patterns"],
  ["microbiome", "Gut & microbiome nutrition", ["fiber", "colorful-produce", "hydration"], "Diverse fermentable substrates and bowel regularity support"],
  ["immune", "Immune nourishment", ["protein", "colorful-produce", "vitamin-c-pattern"], "Adequate protein and micronutrients used in normal immune function"],
]);

const signals = [
  [/protein|collagen|yogurt|milk|egg|tofu|hemp|chia|flax|peanut|almond/, ["protein"]],
  [/banana|mango|pineapple|grape|apple|pear|oat|rice|quinoa|potato/, ["energy"]],
  [/berry|blueberr|strawberr|raspberr|blackberr|acai|cherr|grape|spinach|kale|carrot|cacao/, ["colorful-produce"]],
  [/spinach|kale|broccoli|bean|lentil|oat|chia|flax|apple|pear|berry/, ["fiber"]],
  [/chia|flax|hemp seed|walnut|avocado|olive|peanut|almond|salmon/, ["unsaturated-fat"]],
  [/water|milk|cucumber|melon|orange|berry/, ["hydration"]],
  [/yogurt|fortified|soy milk|tofu|chia|broccoli|kale/, ["bone-pattern"]],
  [/orange|kiwi|strawberr|broccoli|mango|pineapple|lemon|lime|bell pepper/, ["vitamin-c-pattern"]],
];

export function evaluateNourishmentMatrix(ingredients = []) {
  const names = ingredients.map((item) => item?.name || item).filter(Boolean);
  const patterns = [...new Set(names.flatMap((item) => signals.flatMap(([pattern, tags]) => pattern.test(normalize(item)) ? tags : [])))];
  const systems = nourishmentSystems.map(([id, label, required, pathway]) => {
    const matched = required.filter((pattern) => patterns.includes(pattern));
    return { id, label, pathway, score: Math.round((matched.length / required.length) * 100) };
  });
  const synergies = [
    patterns.includes("protein") && patterns.includes("vitamin-c-pattern") && "Protein sources plus vitamin-C-rich produce support normal collagen synthesis and tissue protein turnover.",
    patterns.includes("colorful-produce") && patterns.includes("unsaturated-fat") && "Unsaturated-fat sources accompany fat-soluble plant compounds such as carotenoids.",
    patterns.includes("protein") && patterns.includes("energy") && "Protein is paired with a carbohydrate-energy source for a more complete nourishment pattern.",
    patterns.includes("fiber") && patterns.includes("hydration") && "Fiber is paired with fluid; digestive tolerance still depends on portion and usual intake.",
  ].filter(Boolean);
  const gaps = [
    !patterns.includes("protein") && "Protein link missing: add an appropriate protein source.",
    !patterns.includes("unsaturated-fat") && "Essential-fat link limited: consider a modest seed or nut-butter portion when appropriate.",
    !patterns.includes("fiber") && "Fiber link missing: add a tolerated whole plant food.",
    !patterns.includes("hydration") && "Liquid foundation missing: add an appropriate fluid.",
  ].filter(Boolean);
  return {
    version: "human-nourishment-matrix-v1",
    score: Math.round(systems.reduce((sum, system) => sum + system.score, 0) / systems.length), systems, synergies, gaps,
    saturation: names.length > 12 ? `${names.length} ingredients detected. Optimize portions, flavor, and tolerance rather than assuming more is healthier.` : "",
  };
}
