const JOURNEY_KEY = "naturesElixirz.journey.v2";
const keyFor = (scope = "guest") => `${JOURNEY_KEY}.${scope}`;

export const VALID_GOALS = ["focus", "energy", "mindfulness", "painSupport", "calm", "heart", "circulation", "digestion", "inflammation", "general", "cellular", "liver", "kidney", "lungs", "eyes", "bones", "muscles", "joints", "skin", "immune", "blood", "nervous", "metabolic"];

const movementMap = {
  JOINT_REPAIR: { goal: "painSupport", frequencyHz: 174, mealGoal: "general", taiChiFocus: "recovery" },
  ENERGY_RESTORATION: { goal: "energy", frequencyHz: 528, mealGoal: "energy", taiChiFocus: "recovery" },
  BALANCE_STABILITY: { goal: "calm", frequencyHz: 396, mealGoal: "calm", taiChiFocus: "balance" },
  PERFORMANCE_VITALITY: { goal: "energy", frequencyHz: 528, mealGoal: "energy", taiChiFocus: "flexibility" },
  MAINTENANCE: { goal: "general", frequencyHz: 432, mealGoal: "general", taiChiFocus: "mindfulness" },
};

const safeGoal = (goal) => VALID_GOALS.includes(goal) ? goal : "general";

export function getWellnessJourney(scope = "guest") {
  try {
    const parsed = JSON.parse(localStorage.getItem(keyFor(scope)));
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function updateJourney(patch, scope = "guest") {
  const next = { ...getWellnessJourney(scope), ...patch, updatedAt: new Date().toISOString() };
  localStorage.setItem(keyFor(scope), JSON.stringify(next));
  notifyCloudChange(scope);
  return next;
}

export function restoreWellnessJourney(value, scope = "guest") {
  const safe = value && typeof value === "object" ? value : {};
  localStorage.setItem(keyFor(scope), JSON.stringify(safe));
  return safe;
}

export function recordSmoothieJourney(goal, recipe = null, scope = "guest") {
  const selectedGoal = safeGoal(goal);
  sessionStorage.setItem("naturesElixirz.latestSmoothieGoal", selectedGoal);
  return updateJourney({
    smoothie: {
      goal: selectedGoal,
      recipeName: recipe?.name || null,
      sizeOz: recipe?.sizeOz || null,
      recordedAt: new Date().toISOString(),
    },
  }, scope);
}

export function recordMovementJourney(focus, output = null, scope = "guest") {
  const normalizedFocus = movementMap[focus] ? focus : "MAINTENANCE";
  return updateJourney({
    movement: {
      focus: normalizedFocus,
      ...movementMap[normalizedFocus],
      score: output?.mrviScore ?? null,
      confidence: output?.confidence ?? null,
      recordedAt: new Date().toISOString(),
    },
  }, scope);
}

export function recordFrequencyJourney(hz, goal, scope = "guest") {
  return updateJourney({ frequency: { hz: Number(hz), goal: safeGoal(goal), recordedAt: new Date().toISOString() } }, scope);
}

export function recordMealJourney(goal, days, plan = null, scope = "guest") {
  return updateJourney({
    meals: {
      goal: safeGoal(goal),
      days: Number(days) || 1,
      plan: Array.isArray(plan) ? plan.slice(0, 7) : null,
      recordedAt: new Date().toISOString(),
    },
  }, scope);
}

export function recordTaiChiJourney(focus, scope = "guest") {
  return updateJourney({ taiChi: { focus, recordedAt: new Date().toISOString() } }, scope);
}

export function recordTaiChiSession(focus, minutes, scope = "guest") {
  const journey = getWellnessJourney(scope);
  const duration = Math.max(1, Math.min(180, Math.round(Number(minutes) || 1)));
  const completedAt = new Date().toISOString();
  const history = [...(Array.isArray(journey.taiChiHistory) ? journey.taiChiHistory : []), { focus, minutes: duration, completedAt }].slice(-180);
  return updateJourney({ taiChi: { focus, recordedAt: completedAt }, taiChiHistory: history }, scope);
}

export function getTaiChiProgress(scope = "guest") {
  const history = Array.isArray(getWellnessJourney(scope).taiChiHistory) ? getWellnessJourney(scope).taiChiHistory : [];
  const valid = history.filter((session) => session?.completedAt && Number(session.minutes) > 0);
  const practicedDays = [...new Set(valid.map((session) => new Date(session.completedAt).toLocaleDateString("en-CA")))].sort().reverse();
  let streak = 0;
  const cursor = new Date();
  const todayKey = cursor.toLocaleDateString("en-CA");
  if (practicedDays[0] !== todayKey) cursor.setDate(cursor.getDate() - 1);
  while (practicedDays.includes(cursor.toLocaleDateString("en-CA"))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  const pathways = valid.reduce((counts, session) => ({ ...counts, [session.focus]: (counts[session.focus] || 0) + 1 }), {});
  return {
    sessions: valid.length,
    minutes: valid.reduce((total, session) => total + Number(session.minutes), 0),
    streak,
    pathways,
    recent: valid.slice(-5).reverse(),
  };
}

export function getSuggestedGoal(scope = "guest") {
  const journey = getWellnessJourney(scope);
  const goal = journey.movement?.goal || journey.smoothie?.goal;
  return goal ? safeGoal(goal) : null;
}

export function getMovementContinuation(scope = "guest") {
  return getWellnessJourney(scope).movement || null;
}
import { notifyCloudChange } from "./cloudChange";
