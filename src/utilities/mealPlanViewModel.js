const asArray = (value) => (Array.isArray(value) ? value : []);

export function normalizeRestoredMealPlan(value) {
  if (!Array.isArray(value)) return null;

  return value
    .filter((day) => day && typeof day === "object")
    .map((day, index) => ({
      ...day,
      day: day.day ?? index + 1,
      meals: asArray(day.meals)
        .filter((meal) => meal && typeof meal === "object")
        .map((meal) => ({
          ...meal,
          ingredients: asArray(meal.ingredients),
          instructions: asArray(meal.instructions),
        })),
    }));
}

export function normalizeDailyNutrition(value) {
  const dailyNutrition = value?.dailyNutrition;
  if (!dailyNutrition || typeof dailyNutrition !== "object") return null;

  return {
    ...dailyNutrition,
    targets:
      dailyNutrition.targets && typeof dailyNutrition.targets === "object"
        ? dailyNutrition.targets
        : {},
    days: asArray(dailyNutrition.days)
      .filter((day) => day && typeof day === "object")
      .map((day) => ({
        ...day,
        totals: day.totals && typeof day.totals === "object" ? day.totals : {},
        nutrientCoveragePercent:
          day.nutrientCoveragePercent && typeof day.nutrientCoveragePercent === "object"
            ? day.nutrientCoveragePercent
            : {},
      })),
  };
}

const roundNutritionValue = (value) => Math.round(Number(value || 0) * 10) / 10;

// These comparisons are deliberately limited to targets that the server has
// calculated from the saved profile. A zero-coverage nutrient stays unknown;
// it is never presented as a dietary shortfall.
export function dailyAllowanceComparison(day = {}, targets = {}) {
  const totals = day?.totals || {};
  const coverage = day?.nutrientCoveragePercent || {};
  const reference = targets?.dailyReference || {};
  const lowerTargets = [
    ["Calories", "energyKcal", targets.energyKcal, "kcal"],
    ["Protein", "proteinG", targets.proteinG?.minimum, "g"],
    ["Fiber", "fiberG", reference.fiberG, "g"],
    ["Potassium", "potassiumMg", reference.potassiumMg, "mg"],
    ["Phosphorus", "phosphorusMg", reference.phosphorusMg, "mg"],
    ["Calcium", "calciumMg", reference.calciumMg, "mg"],
    ["Iron", "ironMg", reference.ironMg, "mg"],
    ["Vitamin K", "vitaminKMcg", reference.vitaminKMcg, "mcg"],
  ];
  const upperLimits = [
    ["Sodium", "sodiumMg", reference.sodiumMgUpper, "mg"],
    ["Added sugar", "addedSugarG", reference.addedSugarGUpper, "g"],
    ["Saturated fat", "saturatedFatG", reference.saturatedFatGUpper, "g"],
  ];
  const comparison = (label, key, target, unit, kind) => {
    const measured = Number(coverage[key]) > 0;
    const total = roundNutritionValue(totals[key]);
    const targetValue = Number(target);
    if (!Number.isFinite(targetValue) || targetValue <= 0) return null;
    if (!measured) return { label, key, unit, target: targetValue, total: null, coverage: 0, kind, status: "Unknown — no verified ingredient values" };
    const difference = roundNutritionValue(targetValue - total);
    return kind === "upper"
      ? { label, key, unit, target: targetValue, total, coverage: Number(coverage[key]), kind, difference: Math.max(0, difference), status: difference >= 0 ? `${Math.max(0, difference)} ${unit} before limit` : `${Math.abs(difference)} ${unit} over limit` }
      : { label, key, unit, target: targetValue, total, coverage: Number(coverage[key]), kind, difference: Math.max(0, difference), status: difference > 0 ? `${Math.max(0, difference)} ${unit} estimated remaining` : "Target reached" };
  };
  return [
    ...lowerTargets.map((item) => comparison(...item, "lower")),
    ...upperLimits.map((item) => comparison(...item, "upper")),
  ].filter(Boolean);
}

export function normalizeGroceryList(value) {
  const groceryList = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  return {
    ...groceryList,
    foundations: asArray(groceryList.foundations),
    missing: asArray(groceryList.missing),
    available: asArray(groceryList.available),
    missingDetails: asArray(groceryList.missingDetails),
    availableDetails: asArray(groceryList.availableDetails),
    stapleDetails: asArray(groceryList.stapleDetails),
    plannedMeals: asArray(groceryList.plannedMeals),
    pantryMatches: asArray(groceryList.pantryMatches),
  };
}

export function validateGeneratedPlanSection(plan, maximumDays) {
  if (!Array.isArray(plan) || plan.length < 1 || plan.length > maximumDays) {
    throw new Error(`Astra returned ${Array.isArray(plan) ? plan.length : 0} usable days for a section of up to ${maximumDays}.`);
  }
  plan.forEach((day, index) => {
    if (Number(day?.day) !== index + 1 || !Array.isArray(day?.meals) || day.meals.length !== 5) {
      throw new Error(`Section day ${index + 1} did not satisfy the complete five-meal response contract.`);
    }
  });
  return plan;
}

export function mergeValidatedMealPlanSection(acceptedDays, section, startDay, maximumDays) {
  const existing = asArray(acceptedDays);
  const validated = validateGeneratedPlanSection(section, maximumDays);
  if (startDay !== existing.length + 1) {
    throw new Error(`Meal-plan section ${startDay} is out of sequence; ${existing.length} days are currently accepted.`);
  }
  return [...existing, ...validated.map((day, index) => ({ ...day, day: startDay + index }))];
}

// Generation is sent in three-day sections, while a swap is selected from a
// calendar-day plan. Convert the target only for the section that owns it so
// the model receives a valid local day number (1 through sectionDays).
export function replacementForMealPlanSection(replacement, sectionStart, sectionDays) {
  if (!replacement || typeof replacement !== "object") return null;
  const targetDay = Number(replacement.day);
  const sectionEnd = sectionStart + sectionDays - 1;
  if (!Number.isInteger(targetDay) || targetDay < sectionStart || targetDay > sectionEnd) return null;

  return { ...replacement, day: targetDay - sectionStart + 1 };
}

export async function requestMealPlanSectionWithRetry(requestSection, options = {}) {
  const maximumAttempts = Math.max(1, Number(options.maximumAttempts) || 3);
  let lastError = null;
  for (let attempt = 1; attempt <= maximumAttempts; attempt += 1) {
    try {
      return await requestSection(attempt);
    } catch (error) {
      lastError = error;
      if (attempt < maximumAttempts) options.onRetry?.(error, attempt, maximumAttempts);
    }
  }
  throw lastError || new Error("Meal-plan section generation failed.");
}
