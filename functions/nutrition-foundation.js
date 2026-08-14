const text = (value) => String(value || "").toLowerCase();
const profileText = (profile = {}) => [
  ...(Array.isArray(profile.conditions) ? profile.conditions : []),
  profile.otherHealthConditions,
  profile.surgicalHistory,
  profile.medications,
].map(text).join(" | ");

const HIGH_RISK_RULES = Object.freeze([
  { id: "pregnancy", label: "Pregnancy or breastfeeding", pattern: /pregnan|breastfeed|nursing|lactat/, level: "review" },
  { id: "diabetes", label: "Diabetes or glucose-lowering medication", pattern: /diabet|insulin|metformin|glipizide|glyburide|semaglutide|tirzepatide/, level: "review" },
  { id: "kidney", label: "Kidney disease or dialysis", pattern: /kidney|renal|dialysis|hemodialysis|peritoneal dialysis/, level: "block" },
  { id: "liver", label: "Liver disease", pattern: /cirrhos|liver disease|hepatic failure|portal hypertension/, level: "block" },
  { id: "heart-failure", label: "Heart failure or fluid restriction", pattern: /heart failure|congestive|fluid restrict|edema/, level: "block" },
  { id: "hypertension", label: "Hypertension or sodium restriction", pattern: /hypertension|high blood pressure|low sodium|sodium restrict/, level: "review" },
  { id: "anticoagulant", label: "Anticoagulant use", pattern: /warfarin|coumadin|anticoagul|blood thinner|apixaban|eliquis|rivaroxaban|xarelto/, level: "review" },
  { id: "eating-disorder", label: "Eating-disorder history", pattern: /eating disorder|anorexia|bulimia|binge eating|arfid/, level: "block" },
  { id: "bariatric", label: "Bariatric surgery", pattern: /bariatric|gastric bypass|gastric sleeve|sleeve gastrectomy/, level: "block" },
  { id: "swallowing", label: "Swallowing difficulty", pattern: /dysphagia|swallowing difficult|aspiration|thickened liquid/, level: "block" },
  { id: "severe-gi", label: "Severe reflux or gastrointestinal disease", pattern: /severe reflux|severe gerd|crohn|ulcerative colitis|gastroparesis|bowel obstruction|short bowel/, level: "block" },
  { id: "frailty", label: "Frailty or malnutrition risk", pattern: /frail|malnutrition|underweight|unintentional weight loss/, level: "block" },
]);

export function assessHighRiskNutritionProfile(profile = {}) {
  const combined = profileText(profile);
  const age = Number(profile.age);
  const flags = HIGH_RISK_RULES.filter((rule) => rule.pattern.test(combined)).map(({ pattern, ...rule }) => rule);
  if (Number.isFinite(age) && age < 18) flags.push({ id: "minor", label: "Child or adolescent", level: "block" });
  const allergies = text(profile.allergies);
  const intolerances = text(profile.intolerances || "");
  if (allergies.trim()) flags.push({ id: "allergy", label: "Food allergy", level: "review" });
  if (intolerances.trim() || /food intolerance/.test(combined)) flags.push({ id: "intolerance", label: "Food intolerance", level: "review" });
  const blocking = flags.filter((flag) => flag.level === "block");
  return {
    version: "nutrition-risk-screen-v1",
    flags,
    generationLimited: blocking.length > 0,
    clinicianTargetsRequired: blocking.map((flag) => flag.label),
    message: blocking.length
      ? `Personalized meal generation is paused because ${blocking.map((flag) => flag.label).join(", ")} requires clinician-established nutrition or texture targets.`
      : flags.length
        ? "Generation may continue with prominent review warnings; saved allergies and restrictions remain mandatory."
        : "No high-risk profile category was identified from the saved profile.",
    boundary: "This deterministic screen is conservative and cannot diagnose a condition or establish a medical diet.",
  };
}

const activityFactor = Object.freeze({ low: 1.2, moderate: 1.55, high: 1.725 });
const round = (value, digits = 0) => Number(Number(value).toFixed(digits));

export function calculatePersonalizedNutritionTargets(profile = {}) {
  const age = Number(profile.age);
  const pounds = Number(profile.weight);
  const inches = Number(profile.height);
  const sex = text(profile.sex || profile.biologicalSex);
  const required = [age, pounds, inches].every((value) => Number.isFinite(value) && value > 0) && /male|female/.test(sex);
  const risk = assessHighRiskNutritionProfile(profile);
  if (!required || age < 18 || risk.generationLimited) {
    return {
      status: risk.generationLimited ? "clinician-targets-required" : "insufficient-profile-data",
      energyKcal: null,
      proteinG: null,
      risk,
      missing: [!age && "age", !pounds && "weight", !inches && "height", !/male|female/.test(sex) && "sex"].filter(Boolean),
      boundary: "Individual energy and protein targets are not calculated when required profile data or clinician-established high-risk targets are missing.",
    };
  }
  const kg = pounds * 0.45359237;
  const cm = inches * 2.54;
  const basal = (10 * kg) + (6.25 * cm) - (5 * age) + (sex === "male" ? 5 : -161);
  const energyKcal = Math.max(1200, round(basal * (activityFactor[profile.activity] || activityFactor.moderate)));
  const proteinMultiplier = age >= 65 ? [1, 1.2] : profile.activity === "high" ? [1.2, 1.6] : profile.activity === "moderate" ? [0.8, 1.2] : [0.8, 1];
  const proteinG = proteinMultiplier.map((value) => round(kg * value));
  const female = sex === "female";
  return {
    status: "general-wellness-estimate",
    energyKcal,
    proteinG: { minimum: proteinG[0], upperPlanningRange: proteinG[1], basisGPerKg: proteinMultiplier },
    macroDistributionPercent: { carbohydrate: [45, 65], fat: [20, 35], protein: [10, 35] },
    dailyReference: {
      sodiumMgUpper: 2300,
      potassiumMg: female ? 2600 : 3400,
      phosphorusMg: 700,
      calciumMg: age >= 71 || (female && age >= 51) ? 1200 : 1000,
      ironMg: female && age <= 50 ? 18 : 8,
      vitaminKMcg: female ? 90 : 120,
      addedSugarGUpper: round(energyKcal * 0.1 / 4, 1),
      saturatedFatGUpper: round(energyKcal * 0.1 / 9, 1),
      fiberG: round(energyKcal / 1000 * 14, 1),
    },
    method: "Mifflin-St Jeor energy estimate, general adult activity factor, and general adult DRI/Dietary Guidelines reference ranges.",
    risk,
    boundary: "A planning estimate, not a prescription. Illness, pregnancy, medication, laboratory values, body-composition goals, and clinician-set restrictions can materially change requirements.",
  };
}

const NUTRIENT_KEYS = Object.freeze(["energyKcal", "proteinG", "fatG", "carbohydrateG", "fiberG", "sugarG", "addedSugarG", "saturatedFatG", "sodiumMg", "potassiumMg", "phosphorusMg", "calciumMg", "ironMg", "vitaminKMcg"]);

export function summarizeMultiDayNutrition(plan = [], profile = {}) {
  const targets = calculatePersonalizedNutritionTargets(profile);
  const days = plan.map((day) => {
    const estimates = day.meals.map((meal) => meal.nutritionIntelligence?.evidence?.verifiedNutrientEstimate).filter(Boolean);
    const totals = Object.fromEntries(NUTRIENT_KEYS.map((key) => [key, 0]));
    const coverage = Object.fromEntries(NUTRIENT_KEYS.map((key) => [key, { measured: 0, possible: 0 }]));
    for (const estimate of estimates) {
      for (const key of NUTRIENT_KEYS) {
        totals[key] += Number(estimate.totals?.[key]) || 0;
        coverage[key].measured += Number(estimate.nutrientCoverage?.[key]?.measuredIngredientCount) || 0;
        coverage[key].possible += Number(estimate.totalIngredientCount) || 0;
      }
    }
    for (const key of NUTRIENT_KEYS) totals[key] = round(totals[key], 1);
    const nutrientCoveragePercent = Object.fromEntries(NUTRIENT_KEYS.map((key) => [key, coverage[key].possible ? Math.round(coverage[key].measured / coverage[key].possible * 100) : 0]));
    const completeEnoughForAdequacy = nutrientCoveragePercent.energyKcal >= 80 && nutrientCoveragePercent.proteinG >= 80;
    return { day: day.day, totals, nutrientCoveragePercent, adequacyStatus: completeEnoughForAdequacy ? "estimated-reference-comparison" : "insufficient-coverage", completeEnoughForAdequacy };
  });
  return {
    version: "daily-nutrition-foundation-v1",
    targets,
    days,
    multiDayAdequacyStatus: days.length && days.every((day) => day.completeEnoughForAdequacy) ? "estimated-reference-comparison" : "insufficient-coverage",
    catalogBoundary: "Totals include only ingredients with a verified food identity, verified household mass, and a value for that nutrient. Missing values are not zero.",
    brandedFoodBoundary: "Protein powders, fortified foods, packaged products, scoop sizes, and brand-specific items require subscriber-entered Nutrition Facts or a verified brand record; Nature's Elixirz does not guess them.",
  };
}
