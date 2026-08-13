import { FOOD_IDENTITY_METADATA, calculateVerifiedNutrients, foodIdentityFor, normalizeIngredientMass } from "./food-identity.js";

export const EVIDENCE_SOURCES = Object.freeze({
  usdaFdc: { id: "USDA-FDC", organization: "U.S. Department of Agriculture, Agricultural Research Service", title: "FoodData Central", url: "https://fdc.nal.usda.gov/", use: "Food identity, nutrient composition, and portion-weight reference data." },
  nihOds: { id: "NIH-ODS", organization: "National Institutes of Health, Office of Dietary Supplements", title: "Dietary Supplement Fact Sheets", url: "https://ods.od.nih.gov/factsheets/list-all/", use: "Established nutrient functions, intake context, and safety background." },
  niddkGerd: { id: "NIDDK-GERD", organization: "National Institute of Diabetes and Digestive and Kidney Diseases", title: "Eating, Diet, & Nutrition for GER & GERD", url: "https://www.niddk.nih.gov/health-information/digestive-diseases/acid-reflux-ger-gerd-adults/eating-diet-nutrition", use: "Common, individually variable reflux trigger categories and meal-timing guidance." },
  pubmed: { id: "NLM-PUBMED", organization: "U.S. National Library of Medicine", title: "PubMed", url: "https://pubmed.ncbi.nlm.nih.gov/", use: "Stable identifiers and abstracts for peer-reviewed human and laboratory research." },
});

export const EVIDENCE_CATALOG_METADATA = Object.freeze({
  version: "ingredient-evidence-v2",
  released: "2026-08-07",
  servingBasis: "Recipe household measures; exact nutrient calculations require a matched USDA FoodData Central food identifier, gram weight, preparation state, and brand label when applicable.",
  evidenceScale: Object.freeze({
    human_intervention: "A controlled human intervention measured the stated biomarker or pathway in a defined population.",
    human_observational: "A human observational study found an association; it cannot establish cause and effect.",
    preclinical: "Laboratory, cell, or animal research supports a plausible mechanism that has not been established as an individual human outcome.",
    traditional_use: "Documented culinary or traditional use; not proof of efficacy.",
    nutrient_composition: "The food contains the listed nutrient or compound; composition alone does not prove a health outcome.",
  }),
});

const RESEARCH_EVIDENCE = Object.freeze({
  blueberries: [{ level: "human_intervention", pmid: "34000994", doi: "10.1186/s12263-021-00688-2", preparation: "50 g/day freeze-dried highbush blueberry powder for 8 weeks", population: "49 adults at risk of metabolic syndrome", measurements: ["fasting-blood gene expression", "plasma metabolomics", "cardiometabolic markers"], finding: "Gene-expression and metabolite changes were observed, while most conventional cardiometabolic outcomes were not significantly improved versus placebo.", studyUse: "Candidate transcriptomic and metabolomic endpoints; not proof that an ordinary mixed smoothie produces the same response." }],
  broccoli: [{ level: "human_intervention", pmid: "30982861", doi: "10.1093/ajcn/nqz012", preparation: "weekly glucoraphanin-rich broccoli soup for 12 months", population: "49 men on active surveillance for localized prostate cancer", measurements: ["prostate-tissue RNA sequencing", "gene-set enrichment"], finding: "The intervention was associated with dose-dependent differences in tissue gene-expression pathways; the study was not powered to establish clinical progression benefit.", studyUse: "Supports a measurable food-to-transcriptome research hypothesis only for the studied preparation and population." }],
  "ground flaxseed": [{ level: "human_intervention", pmid: "33482045", doi: "10.1111/ijcp.14035", preparation: "30 g/day ground flaxseed for 12 weeks", population: "adults with ulcerative colitis in an open-label randomized trial", measurements: ["inflammatory biomarkers", "TLR4 mRNA", "clinical disease score"], finding: "Some inflammatory and clinical measures changed, but TLR4 mRNA expression did not differ at week 12.", studyUse: "A useful example of including both positive and null molecular outcomes in a future protocol." }],
});

const records = [
  ["blueberries", ["blueberry", "mixed berries"], ["colorful-produce", "fiber"], ["vitamin C", "fiber", "anthocyanin-containing pigments"], "fruit"],
  ["strawberries", ["strawberry", "mixed berries"], ["colorful-produce", "fiber", "vitamin-c-pattern"], ["vitamin C", "fiber", "folate"], "fruit", "acidic-food"],
  ["raspberries", ["raspberry", "mixed berries"], ["colorful-produce", "fiber"], ["fiber", "vitamin C", "manganese"], "fruit"],
  ["blackberries", ["blackberry", "mixed berries"], ["colorful-produce", "fiber"], ["fiber", "vitamin C", "vitamin K"], "fruit"],
  ["banana", [], ["energy", "fiber"], ["carbohydrate", "potassium", "vitamin B6"], "fruit"],
  ["mango", [], ["energy", "colorful-produce", "vitamin-c-pattern"], ["vitamin C", "carotenoids", "carbohydrate"], "fruit"],
  ["pineapple", [], ["energy", "vitamin-c-pattern"], ["vitamin C", "manganese", "carbohydrate"], "fruit", "acidic-food"],
  ["orange", ["citrus"], ["vitamin-c-pattern", "colorful-produce"], ["vitamin C", "folate", "fiber when whole"], "fruit", "acidic-food"],
  ["grapefruit", ["pomelo", "seville orange", "tangelo"], ["vitamin-c-pattern", "colorful-produce"], ["vitamin C", "fiber when whole"], "fruit", "acidic-food", true],
  ["apple", [], ["energy", "fiber"], ["fiber", "carbohydrate", "vitamin C"], "fruit"],
  ["pear", [], ["energy", "fiber"], ["fiber", "carbohydrate", "copper"], "fruit"],
  ["spinach", ["baby spinach", "leafy greens"], ["fiber", "iron-pattern", "colorful-produce"], ["vitamin K", "folate", "carotenoids", "non-heme iron"], "vegetable"],
  ["kale", ["leafy greens"], ["fiber", "colorful-produce", "bone-pattern"], ["vitamin K", "vitamin C", "carotenoids"], "vegetable"],
  ["broccoli", [], ["fiber", "vitamin-c-pattern", "bone-pattern"], ["vitamin C", "vitamin K", "folate", "fiber"], "vegetable"],
  ["carrot", ["baby carrots"], ["colorful-produce", "fiber"], ["beta-carotene", "fiber", "potassium"], "vegetable"],
  ["cucumber", [], ["hydration"], ["water", "vitamin K"], "vegetable"],
  ["rolled oats", ["oats", "oatmeal"], ["energy", "fiber"], ["beta-glucan fiber", "carbohydrate", "manganese"], "grain"],
  ["brown rice", [], ["energy"], ["carbohydrate", "manganese", "magnesium"], "grain"],
  ["quinoa", [], ["energy", "protein", "fiber"], ["carbohydrate", "protein", "fiber", "magnesium"], "grain"],
  ["lentils", ["lentil"], ["protein", "fiber", "iron-pattern"], ["protein", "fiber", "folate", "non-heme iron"], "legume"],
  ["beans", ["black beans", "kidney beans", "pink beans", "white beans"], ["protein", "fiber", "iron-pattern"], ["protein", "fiber", "folate", "non-heme iron"], "legume"],
  ["salmon", [], ["protein", "unsaturated-fat"], ["protein", "EPA and DHA omega-3 fats", "vitamin B12", "selenium"], "protein"],
  ["chicken", ["chicken breast", "chicken thigh"], ["protein"], ["protein", "niacin", "vitamin B6", "selenium"], "protein"],
  ["eggs", ["egg"], ["protein"], ["protein", "choline", "vitamin B12"], "protein"],
  ["plain greek yogurt", ["greek yogurt", "plain yogurt", "kefir"], ["protein", "bone-pattern"], ["protein", "calcium", "vitamin B12"], "dairy"],
  ["unsweetened soy milk", ["soy milk"], ["protein", "bone-pattern"], ["protein", "calcium and vitamin D when fortified"], "liquid"],
  ["hemp protein", ["protein powder"], ["protein"], ["protein; exact amount depends on product label"], "protein"],
  ["chia seeds", ["chia"], ["fiber", "unsaturated-fat", "bone-pattern"], ["fiber", "alpha-linolenic acid", "calcium"], "seed"],
  ["ground flaxseed", ["flaxseed", "flax"], ["fiber", "unsaturated-fat"], ["fiber", "alpha-linolenic acid", "lignans"], "seed"],
  ["peanut butter", ["nut butter", "almond butter"], ["protein", "unsaturated-fat", "energy"], ["unsaturated fat", "protein", "magnesium"], "nut-butter", "high-fat-food"],
  ["avocado", [], ["unsaturated-fat", "fiber"], ["monounsaturated fat", "fiber", "folate", "potassium"], "fruit", "high-fat-food"],
  ["coconut water", [], ["hydration", "energy"], ["water", "potassium", "carbohydrate; amounts vary by product"], "liquid"],
  ["mint", ["peppermint"], ["culinary-herb"], ["culinary aromatic compounds"], "herb", "mint"],
  ["cocoa", ["chocolate", "cacao powder"], ["colorful-produce"], ["polyphenols", "magnesium; amounts vary by product"], "flavor", "chocolate"],
  ["tomato", ["tomatoes"], ["colorful-produce", "vitamin-c-pattern"], ["vitamin C", "potassium", "lycopene"], "vegetable", "acidic-food"],
  ["turmeric", [], ["culinary-herb"], ["culinary curcuminoids; not a treatment dose"], "spice", "spicy-food"],
  ["ginger", [], ["culinary-herb"], ["culinary gingerols and aromatic compounds"], "spice", "spicy-food"],
].map(([name, aliases, tags, nutrients, culinaryGroup, refluxCategory = null, medicationCaution = false]) => ({ name, aliases, tags, nutrients, culinaryGroup, refluxCategory, medicationCaution, sources: ["USDA-FDC", "NIH-ODS"], nutrientDataStatus: "qualitative-reference", usdaSearchTerm: name, foodIdentity: foodIdentityFor(name), researchEvidence: RESEARCH_EVIDENCE[name] || [] }));

export const INGREDIENT_EVIDENCE = Object.freeze(records);
const normalize = (value) => String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

export function findIngredientEvidence(value) {
  const name = normalize(value);
  if (!name) return null;
  return INGREDIENT_EVIDENCE.find((record) => [record.name, ...record.aliases].some((alias) => {
    const candidate = normalize(alias);
    return name === candidate || name.includes(candidate) || candidate.includes(name);
  })) || null;
}

export function refluxProfileEnabled(profile = {}) {
  return (Array.isArray(profile.conditions) ? profile.conditions : []).some((condition) => /acid reflux|heartburn|\bgerd\b|gastroesophageal reflux/i.test(String(condition)));
}

export function ingredientEvidenceSummary(ingredients = [], profile = {}) {
  const matched = ingredients.map((item) => ({ name: String(item?.name || item), evidence: findIngredientEvidence(item?.name || item) })).filter((item) => item.evidence);
  const refluxEnabled = refluxProfileEnabled(profile);
  const matchedIngredients = matched.map(({ name, evidence }) => {
    const original = ingredients.find((item) => String(item?.name || item) === name);
    const originalIdentity = foodIdentityFor(name);
    const cookedIdentity = /\bcooked\b/i.test(String(original?.quantity || "")) ? foodIdentityFor(`cooked ${name}`) : null;
    const foodIdentity = originalIdentity.fdcId ? originalIdentity : cookedIdentity?.fdcId ? cookedIdentity : evidence.foodIdentity;
    return { name, canonicalName: evidence.name, nutrientHighlights: evidence.nutrients, culinaryGroup: evidence.culinaryGroup, evidenceTags: evidence.tags, sources: evidence.sources, nutrientDataStatus: foodIdentity.nutrientsPer100g ? "verified-usda-reference" : evidence.nutrientDataStatus, usdaSearchTerm: evidence.usdaSearchTerm, foodIdentity, normalizedServing: normalizeIngredientMass(original, foodIdentity), researchEvidence: evidence.researchEvidence };
  });
  const verifiedIdentities = matchedIngredients.filter((item) => item.foodIdentity.fdcId);
  const normalizedMasses = matchedIngredients.filter((item) => Number.isFinite(item.normalizedServing.grams));
  return {
    catalogVersion: EVIDENCE_CATALOG_METADATA.version,
    catalogReleased: EVIDENCE_CATALOG_METADATA.released,
    servingBasis: EVIDENCE_CATALOG_METADATA.servingBasis,
    matchedIngredients,
    unmatchedIngredients: ingredients.map((item) => String(item?.name || item)).filter((name) => !findIngredientEvidence(name)),
    refluxScreeningEnabled: refluxEnabled,
    refluxConsiderations: refluxEnabled ? matched.filter(({ evidence }) => evidence.refluxCategory).map(({ name, evidence }) => ({ ingredient: name, category: evidence.refluxCategory, source: "NIDDK-GERD", note: "Some people with GERD report this category as a trigger; individual tolerance varies." })) : [],
    studyReadiness: {
      status: matched.some(({ evidence }) => evidence.researchEvidence.length) ? "candidate-mechanisms-identified" : "composition-only",
      candidateStudies: matched.flatMap(({ name, evidence }) => evidence.researchEvidence.map((study) => ({ ingredient: name, ...study }))),
      requiredForFormulaStudy: ["standardized ingredient identity and preparation", "ingredient gram weights and batch yield", "defined population and comparison group", "pre-registered primary outcomes", "safety monitoring", "appropriate molecular assays such as transcriptomics only when scientifically justified"],
      boundary: "Ingredient studies can support a testable hypothesis. They do not prove that this combined recipe changes DNA, gene expression, disease, or clinical outcomes in an individual.",
    },
    reproducibility: {
      registryVersion: FOOD_IDENTITY_METADATA.version,
      verifiedIdentityCount: verifiedIdentities.length,
      normalizedMassCount: normalizedMasses.length,
      totalIngredientCount: ingredients.length,
      status: normalizedMasses.length === ingredients.length ? "mass-normalized" : normalizedMasses.length ? "partially-normalized" : "identity-pending",
      unresolved: matchedIngredients.filter((item) => !Number.isFinite(item.normalizedServing.grams)).map((item) => ({ ingredient: item.name, reason: item.normalizedServing.reason })),
    },
    verifiedNutrientEstimate: calculateVerifiedNutrients(matchedIngredients),
    sources: [EVIDENCE_SOURCES.usdaFdc, EVIDENCE_SOURCES.nihOds, ...(matched.some(({ evidence }) => evidence.researchEvidence.length) ? [EVIDENCE_SOURCES.pubmed] : []), ...(refluxEnabled ? [EVIDENCE_SOURCES.niddkGerd] : [])],
  };
}
