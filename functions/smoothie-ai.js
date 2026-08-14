import { assessNutritionSelection, assertNutritionSafety, createNutritionBrief } from "./nutrition-intelligence.js";

const GROUPS = ["Fruit", "Vegetable", "Protein", "Seed", "Liquid", "Spice", "Grain", "Nut butter", "Sweetener"];
const UNITS = ["cup", "tbsp", "tsp", "scoop", "piece"];

const textList = (value) => Array.isArray(value)
  ? value.map((item) => String(item).trim()).filter(Boolean)
  : String(value || "").split(/[,;\n]/).map((item) => item.trim()).filter(Boolean);

export const smoothieRecipeSchema = {
  type: "object",
  additionalProperties: false,
  required: ["name", "description", "type", "ingredients", "benefits", "preparation", "practicalTips", "reflux", "medicationSafety"],
  properties: {
    name: { type: "string", minLength: 3, maxLength: 80 },
    description: { type: "string", minLength: 20, maxLength: 320 },
    type: { type: "string", minLength: 3, maxLength: 90 },
    ingredients: {
      type: "array", minItems: 5, maxItems: 12,
      items: {
        type: "object", additionalProperties: false,
        required: ["name", "group", "amount", "unit", "reason"],
        properties: {
          name: { type: "string", minLength: 2, maxLength: 80 },
          group: { type: "string", enum: GROUPS },
          amount: { type: "number", exclusiveMinimum: 0, maximum: 8 },
          unit: { type: "string", enum: UNITS },
          reason: { type: "string", minLength: 8, maxLength: 180 },
        },
      },
    },
    benefits: {
      type: "array", minItems: 3, maxItems: 6,
      items: {
        type: "object", additionalProperties: false, required: ["label", "level", "detail"],
        properties: {
          label: { type: "string", maxLength: 60 },
          level: { type: "string", enum: ["Supportive", "Strong", "Moderate", "Limited"] },
          detail: { type: "string", maxLength: 220 },
        },
      },
    },
    preparation: { type: "array", minItems: 3, maxItems: 6, items: { type: "string", maxLength: 180 } },
    practicalTips: { type: "array", minItems: 1, maxItems: 5, items: { type: "string", maxLength: 180 } },
    reflux: {
      type: "object", additionalProperties: false, required: ["level", "summary", "triggers", "adjustments"],
      properties: {
        level: { type: "string", enum: ["Lower trigger potential", "Moderate trigger potential", "Higher trigger potential"] },
        summary: { type: "string", maxLength: 240 },
        triggers: { type: "array", maxItems: 5, items: { type: "string", maxLength: 140 } },
        adjustments: { type: "array", maxItems: 5, items: { type: "string", maxLength: 140 } },
      },
    },
    medicationSafety: {
      type: "object", additionalProperties: false, required: ["reviewRequired", "status", "note", "foodsAvoided"],
      properties: {
        reviewRequired: { type: "boolean" },
        status: { type: "string", enum: ["No medication information provided", "Pharmacist review advised", "Potential interaction avoided"] },
        note: { type: "string", minLength: 10, maxLength: 320 },
        foodsAvoided: { type: "array", maxItems: 8, items: { type: "string", maxLength: 80 } },
      },
    },
  },
};

export function buildSmoothieAiContext(profile = {}, request = {}, recentRecipes = [], kitchen = {}) {
  const goals = textList(request.goals).slice(0, 8);
  const pantry = ["pantry", "fridge", "freezer"].flatMap((zone) => textList(kitchen?.[zone])).slice(0, 160);
  const context = {
    profile: {
      age: String(profile.age || "").slice(0, 3),
      weightLb: String(profile.weight || "").slice(0, 6),
      heightIn: String(profile.height || "").slice(0, 6),
      activity: String(profile.activity || "moderate").slice(0, 30),
      dietaryPattern: String(profile.dietaryPattern || "omnivore").slice(0, 40),
      healthGoals: textList(profile.healthGoals).slice(0, 10),
      conditions: textList(profile.conditions).slice(0, 10),
      otherHealthConditions: String(profile.otherHealthConditions || "").slice(0, 1000),
      surgicalHistory: String(profile.surgicalHistory || "").slice(0, 1000),
      medications: String(profile.medications || "").slice(0, 800),
      allergies: textList(profile.allergies).slice(0, 20),
      avoidIngredients: textList(profile.avoidIngredients).slice(0, 30),
    },
    request: {
      goals,
      sizeOz: Math.min(64, Math.max(8, Number(request.sizeOz) || 16)),
      pantryOnly: request.pantryOnly === true,
      keptIngredients: textList(request.keptIngredients).slice(0, 20),
      replacements: request.replacements && typeof request.replacements === "object" ? request.replacements : {},
      alternateIndex: Math.min(50, Math.max(0, Number(request.alternateIndex) || 0)),
    },
    pantry,
    recentRecipes: recentRecipes.slice(0, 12).map((recipe) => ({
      name: String(recipe?.name || "").slice(0, 80),
      ingredients: Array.isArray(recipe?.ingredients) ? recipe.ingredients.map((item) => String(item?.name || "")).filter(Boolean).slice(0, 12) : [],
    })),
    learning: {
      feedbackCount: Math.min(30, Math.max(0, Number(request.learning?.feedbackCount) || 0)),
      likedSelections: textList(request.learning?.likedSelections).slice(0, 10),
      dislikedSelections: textList(request.learning?.dislikedSelections).slice(0, 10),
      preferredIngredients: textList(request.learning?.preferredIngredients).slice(0, 12),
      cautionIngredients: textList(request.learning?.cautionIngredients).slice(0, 12),
      source: request.learning?.source === "explicit-subscriber-feedback" ? "explicit-subscriber-feedback" : "none",
    },
  };
  context.nutritionBrief = createNutritionBrief(context.profile, goals);
  return context;
}

export function buildSmoothieInstructions(context) {
  return `Create one genuinely personalized whole-food smoothie for the supplied subscriber context.

Success means:
- honor every allergy, avoided ingredient, dietary pattern, and pantry-only constraint
- produce the requested finished batch size with realistic household quantities
- use the selected intentions as nutrition goals, never as treatment claims
- materially differ from recent recipes in both its main fruit/produce combination and overall ingredient set
- use explicit subscriber feedback as a soft preference: do not repeat disliked selections, and favor preferred ingredients only when they fit the current goal and safety constraints
- safety rules, dietary restrictions, pantry-only mode, nutrition balance, and variety always outrank learned preferences
- keep subscriber-facing names, reasons, and descriptions natural; never mention prompts, validation, recent-recipe comparison, internal history, or prior attempts
- explain why each ingredient belongs in this exact formula
- only include reflux guidance when nutritionBrief.refluxScreeningEnabled is true; otherwise return an empty lower-trigger reflux object because the application will suppress it
- when reflux screening is enabled, screen common triggers conservatively and acknowledge individual variation
- use ordinary foods and culinary herbs only; do not prescribe supplements, diagnose, promise healing, or replace professional care
- never choose foods to intensify, boost, complement, or counteract a medication's pharmacologic effect
- review the exact medication text for possible food interactions. Avoid a recognized conflict where a safe ordinary-food alternative exists; otherwise mark pharmacist review required
- for warfarin, do not simply remove vitamin K foods: emphasize that consistency matters and require clinician/pharmacist confirmation before a major intake change
- grapefruit, pomelo, tangelo, and Seville orange can interact with some—not all—medications. Exclude them only when the entered medicine or its label warrants it; if uncertain, require pharmacist review
- do not infer that a recipe is medication-safe from the drug class alone. Medication timing and dose decisions belong to the subscriber's pharmacist or prescriber
- if conditions or medications create uncertainty, choose a conservative ordinary-food formula and say review is required rather than attempting treatment
- never claim detoxification, disease reversal, quantum healing, chakra opening, or guaranteed outcomes
- do not invent pantry items when pantryOnly is true

Subscriber context:
${JSON.stringify(context)}`;
}

const normalized = (value) => String(value || "").toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim()
  .split(" ").map((word) => word.endsWith("ies") ? `${word.slice(0, -3)}y` : word.length > 3 && word.endsWith("s") ? word.slice(0, -1) : word).join(" ");

export function validateSmoothieProposal(proposal, context) {
  if (!proposal || !Array.isArray(proposal.ingredients)) throw new Error("The AI recipe was incomplete.");
  const prohibited = [...context.profile.allergies, ...context.profile.avoidIngredients].map(normalized).filter(Boolean);
  const pantry = new Set(context.pantry.map(normalized));
  const seen = new Set();
  const ingredients = proposal.ingredients.map((item) => {
    const name = String(item?.name || "").trim().slice(0, 80);
    const normalizedName = normalized(name);
    if (!name || seen.has(normalizedName)) throw new Error("The AI recipe contained a missing or duplicate ingredient.");
    seen.add(normalizedName);
    if (prohibited.some((term) => normalizedName.includes(term) || term.includes(normalizedName))) throw new Error(`The AI recipe included a prohibited ingredient: ${name}.`);
    if (context.request.pantryOnly && ![...pantry].some((available) => available.includes(normalizedName) || normalizedName.includes(available))) throw new Error(`The AI recipe used ${name}, which is not in the selected kitchen inventory.`);
    if (!GROUPS.includes(item.group) || !UNITS.includes(item.unit) || !Number.isFinite(item.amount) || item.amount <= 0) throw new Error(`The AI recipe supplied an invalid quantity for ${name}.`);
    return { ...item, name, amount: Math.round(item.amount * 8) / 8 };
  });
  if (!ingredients.some((item) => item.group === "Liquid")) throw new Error("The AI recipe did not include a liquid.");
  if (!ingredients.some((item) => ["Protein", "Seed", "Grain", "Nut butter"].includes(item.group))) throw new Error("The AI recipe did not include a protein or fiber component.");
  const recentSignatures = context.recentRecipes.map((recipe) => new Set(recipe.ingredients.map(normalized)));
  const tooSimilar = recentSignatures.some((prior) => {
    const overlap = ingredients.filter((item) => prior.has(normalized(item.name))).length;
    return prior.size && overlap / Math.min(prior.size, ingredients.length) >= 0.7;
  });
  if (tooSimilar) throw new Error("The AI recipe was too similar to a recent recipe.");
  const nutritionIntelligence = assertNutritionSafety(assessNutritionSelection({
    ingredients,
    profile: context.profile,
    goals: context.request.goals,
    kind: "smoothie",
  }));
  if (nutritionIntelligence.goalFitScore < 45) throw new Error("The AI recipe did not meaningfully fit the selected nutrition goals.");
  const reflux = context.nutritionBrief.refluxScreeningEnabled ? proposal.reflux : undefined;
  return { ...proposal, ingredients, reflux, nutritionIntelligence };
}
