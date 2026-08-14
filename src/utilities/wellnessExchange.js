const PREFIX = "naturesElixirz.exchange.v2";
const MAX_EVENTS = 40;
const MAX_KERNEL_EVENTS = 20;
const MAX_FEEDBACK_EVENTS = 30;
import { notifyCloudChange } from "./cloudChange";

const keyFor = (scope = "guest") => `${PREFIX}.${scope}`;

export function getWellnessExchange(scope = "guest") {
  try {
    const value = JSON.parse(localStorage.getItem(keyFor(scope)));
    return value && typeof value === "object" ? value : { signals: {}, events: [], memories: {} };
  } catch {
    return { signals: {}, events: [], memories: {} };
  }
}

export function publishWellnessSignal(scope, kernel, summary = {}) {
  const current = getWellnessExchange(scope);
  const safeSummary = {
    goal: summary.goal || null,
    focus: summary.focus || null,
    selection: summary.selection || null,
    duration: Number(summary.duration) || null,
    scoreBand: summary.scoreBand || null,
    recordedAt: new Date().toISOString(),
  };
  const next = {
    signals: { ...current.signals, [kernel]: safeSummary },
    events: [...(current.events || []), { kernel, ...safeSummary }].slice(-MAX_EVENTS),
    memories: {
      ...(current.memories || {}),
      [kernel]: {
        interactionCount: Number(current.memories?.[kernel]?.interactionCount || 0) + 1,
        goals: [...new Set([...(current.memories?.[kernel]?.goals || []), safeSummary.goal].filter(Boolean))].slice(-8),
        focuses: [...new Set([...(current.memories?.[kernel]?.focuses || []), safeSummary.focus].filter(Boolean))].slice(-8),
        selections: [...new Set([...(current.memories?.[kernel]?.selections || []), safeSummary.selection].filter(Boolean))].slice(-12),
        recent: [...(current.memories?.[kernel]?.recent || []), safeSummary].slice(-MAX_KERNEL_EVENTS),
        updatedAt: safeSummary.recordedAt,
      },
    },
    updatedAt: safeSummary.recordedAt,
  };
  localStorage.setItem(keyFor(scope), JSON.stringify(next));
  notifyCloudChange(scope);
  window.dispatchEvent(new CustomEvent("natures-elixirz:exchange", { detail: { scope, kernel } }));
  return next;
}

export function recordWellnessFeedback(scope, kernel, feedback = {}) {
  if (!["positive", "negative"].includes(feedback.sentiment)) throw new Error("Choose positive or negative feedback.");
  const current = getWellnessExchange(scope);
  const entry = {
    sentiment: feedback.sentiment,
    selection: String(feedback.selection || "").trim().slice(0, 120),
    ingredients: [...new Set((Array.isArray(feedback.ingredients) ? feedback.ingredients : [])
      .map((item) => String(item || "").trim()).filter(Boolean))].slice(0, 24),
    recordedAt: new Date().toISOString(),
  };
  const feedbackByKernel = current.feedback || {};
  const next = {
    ...current,
    feedback: { ...feedbackByKernel, [kernel]: [...(feedbackByKernel[kernel] || []), entry].slice(-MAX_FEEDBACK_EVENTS) },
    updatedAt: entry.recordedAt,
  };
  localStorage.setItem(keyFor(scope), JSON.stringify(next));
  notifyCloudChange(scope);
  window.dispatchEvent(new CustomEvent("naturesElixirz:exchange", { detail: { scope, kernel, feedback: true } }));
  return next;
}

export function buildLearningProfile(exchange = {}, kernel) {
  const feedback = (Array.isArray(exchange.feedback?.[kernel]) ? exchange.feedback[kernel] : []).slice(-MAX_FEEDBACK_EVENTS);
  const positive = feedback.filter((item) => item.sentiment === "positive");
  const negative = feedback.filter((item) => item.sentiment === "negative");
  const counts = (items) => items.flatMap((item) => item.ingredients || []).reduce((result, item) => {
    const key = String(item).trim(); if (key) result[key] = (result[key] || 0) + 1; return result;
  }, {});
  return {
    feedbackCount: feedback.length,
    likedSelections: [...new Set(positive.map((item) => item.selection).filter(Boolean))].slice(-10),
    dislikedSelections: [...new Set(negative.map((item) => item.selection).filter(Boolean))].slice(-10),
    preferredIngredients: Object.entries(counts(positive)).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([name]) => name),
    cautionIngredients: Object.entries(counts(negative)).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([name]) => name),
    source: "explicit-subscriber-feedback",
  };
}

export function buildKernelBrief(scope, targetKernel) {
  const exchange = getWellnessExchange(scope);
  const signals = Object.fromEntries(
    Object.entries(exchange.signals || {}).filter(([kernel]) => kernel !== targetKernel),
  );
  return {
    targetKernel,
    kernelMemory: exchange.memories?.[targetKernel] || null,
    learningProfile: buildLearningProfile(exchange, targetKernel),
    signals,
    boundaries: {
      rawInputsShared: false,
      recipesShared: false,
      biometricFramesShared: false,
      summarizedSelectionsOnly: true,
    },
    updatedAt: exchange.updatedAt || null,
  };
}

export function restoreWellnessExchange(value, scope = "guest") {
  const safe = value && typeof value === "object" ? value : { signals: {}, events: [], memories: {} };
  const restored = {
    signals: safe.signals || {},
    events: Array.isArray(safe.events) ? safe.events.slice(-MAX_EVENTS) : [],
    memories: safe.memories || {},
    feedback: Object.fromEntries(Object.entries(safe.feedback || {}).map(([kernel, items]) => [kernel, Array.isArray(items) ? items.slice(-MAX_FEEDBACK_EVENTS) : []])),
    updatedAt: safe.updatedAt || null,
  };
  localStorage.setItem(keyFor(scope), JSON.stringify(restored));
  return restored;
}

export function clearWellnessExchange(scope = "guest") {
  localStorage.removeItem(keyFor(scope));
  notifyCloudChange(scope);
}
