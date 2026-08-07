const PREFIX = "naturesElixirz.exchange.v2";
const MAX_EVENTS = 40;
const MAX_KERNEL_EVENTS = 20;
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

export function buildKernelBrief(scope, targetKernel) {
  const exchange = getWellnessExchange(scope);
  const signals = Object.fromEntries(
    Object.entries(exchange.signals || {}).filter(([kernel]) => kernel !== targetKernel),
  );
  return {
    targetKernel,
    kernelMemory: exchange.memories?.[targetKernel] || null,
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
    updatedAt: safe.updatedAt || null,
  };
  localStorage.setItem(keyFor(scope), JSON.stringify(restored));
  return restored;
}

export function clearWellnessExchange(scope = "guest") {
  localStorage.removeItem(keyFor(scope));
  notifyCloudChange(scope);
}
