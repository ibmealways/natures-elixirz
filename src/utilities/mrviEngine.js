// src/utilities/mrviEngine.js
// ===========================================================
// MRVI Engine v1.0 — Motion Resonance Vitality Index
// Deterministic, privacy-first wellness analytics.
// No identity. No diagnosis. No cross-user comparisons.
// ===========================================================

export const MRVI_VERSION = "1.0.0";

export const THRESHOLDS = Object.freeze({
  mobility: { improve: 0.06, decline: -0.06 },     // +6% improve, -6% decline
  balance: { improve: -0.06, decline: 0.06 },      // sway down is good, sway up is bad
  symmetry: { improve: -0.05, decline: 0.05 },     // asymmetry down is good
  energyFlow: { improve: 0.07, decline: -0.07 },   // +7% improve, -7% decline
  smoothness: { improve: -0.08, decline: 0.08 },   // jerk down is good
});

export const WEIGHTS = Object.freeze({
  mobility: 0.30,
  balance: 0.20,
  symmetry: 0.20,
  energyFlow: 0.15,
  smoothness: 0.15,
});

export const FOCUS = Object.freeze({
  JOINT_REPAIR: "JOINT_REPAIR",
  ENERGY_RESTORATION: "ENERGY_RESTORATION",
  BALANCE_STABILITY: "BALANCE_STABILITY",
  PERFORMANCE_VITALITY: "PERFORMANCE_VITALITY",
  MAINTENANCE: "MAINTENANCE",
});

export function safeNumber(n, fallback = 1) {
  const x = Number(n);
  return Number.isFinite(x) && x > 0 ? x : fallback;
}

/**
 * Converts a ratio metric vs baseline into a delta (fractional).
 * Example: current=0.94 baseline=1.0 => delta=-0.06 (-6%)
 */
export function deltaRatio(current, baseline) {
  const c = safeNumber(current, 1);
  const b = safeNumber(baseline, 1);
  return (c - b) / b;
}

export function evaluateComponentStatus(key, currentRatio, baselineRatio) {
  const t = THRESHOLDS[key];
  if (!t) return { status: "STABLE", delta: 0 };

  const d = deltaRatio(currentRatio, baselineRatio);

  if (d >= t.improve) return { status: "IMPROVING", delta: d };
  if (d <= t.decline) return { status: "DECLINING", delta: d };

  return { status: "STABLE", delta: d };
}

/**
 * Significant decline is > 1.5x threshold magnitude (v1.0 rule)
 */
export function isSignificantDecline(key, delta) {
  const t = THRESHOLDS[key];
  if (!t) return false;

  const declineThreshold = t.decline; // negative for some, positive for others
  const magnitude = Math.abs(declineThreshold);
  return Math.abs(delta) >= magnitude * 1.5;
}

/**
 * Trend confirmation: require direction persistence across last 2 scans.
 * history array entries are { metrics: { mobility, balance, ... }, timestamp }
 */
export function confirmTrend(history, key, direction) {
  if (!Array.isArray(history) || history.length < 2) return false;
  const lastTwo = history.slice(-2);

  return lastTwo.every((scan) => {
    const v = safeNumber(scan?.metrics?.[key], 1);
    if (direction === "DECLINING") return v < 1;
    if (direction === "IMPROVING") return v > 1;
    return false;
  });
}

/**
 * MRVI composite score.
 * Start 100, penalize declines by weight*100, reward improves by weight*50.
 * Clamp 0..100.
 */
export function calculateMRVIScore(statusMap) {
  let score = 100;

  Object.keys(WEIGHTS).forEach((k) => {
    const status = statusMap?.[k]?.status || "STABLE";
    if (status === "DECLINING") score -= WEIGHTS[k] * 100;
    if (status === "IMPROVING") score += WEIGHTS[k] * 50;
  });

  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Confidence heuristic (not medical): based on persistence + magnitude.
 */
export function calculateConfidence({ statusMap, deltas, history }) {
  const decliningKeys = Object.keys(statusMap).filter(
    (k) => statusMap[k]?.status === "DECLINING"
  );

  if (decliningKeys.length === 0) return "MEDIUM";

  const persistent = decliningKeys.filter((k) => confirmTrend(history, k, "DECLINING"));
  const significant = decliningKeys.filter((k) => isSignificantDecline(k, deltas[k] ?? 0));

  if (persistent.length >= 2 || significant.length >= 1) return "HIGH";
  return "MEDIUM";
}

export function determineFocus(statusMap) {
  const declining = Object.keys(statusMap).filter(
    (k) => statusMap[k]?.status === "DECLINING"
  );

  // JOINT_REPAIR: mobility ↓ and smoothness ↓
  if (declining.includes("mobility") && declining.includes("smoothness")) {
    return FOCUS.JOINT_REPAIR;
  }

  // ENERGY_RESTORATION: energyFlow ↓
  if (declining.includes("energyFlow")) {
    return FOCUS.ENERGY_RESTORATION;
  }

  // BALANCE_STABILITY: balance ↓
  if (declining.includes("balance")) {
    return FOCUS.BALANCE_STABILITY;
  }

  // PERFORMANCE_VITALITY: >=3 improving and no declines
  const improvingCount = Object.keys(statusMap).filter(
    (k) => statusMap[k]?.status === "IMPROVING"
  ).length;

  if (improvingCount >= 3 && declining.length === 0) {
    return FOCUS.PERFORMANCE_VITALITY;
  }

  return FOCUS.MAINTENANCE;
}

/**
 * Trigger rules (Locked v1.0):
 * Activate Focus Plan if:
 * - >=2 components declining OR
 * - >=1 component declining significantly OR
 * - decline persists across 3 scans (handled by history check in caller)
 */
export function shouldTriggerPlan({ statusMap, deltas, history }) {
  const decliningKeys = Object.keys(statusMap).filter(
    (k) => statusMap[k]?.status === "DECLINING"
  );

  if (decliningKeys.length >= 2) return true;

  const anySignificant = decliningKeys.some((k) => isSignificantDecline(k, deltas[k] ?? 0));
  if (anySignificant) return true;

  // persistence across 3 scans: last 3 are <1 for same key
  if (Array.isArray(history) && history.length >= 3) {
    const last3 = history.slice(-3);
    const persistent3 = decliningKeys.some((k) =>
      last3.every((scan) => safeNumber(scan?.metrics?.[k], 1) < 1)
    );
    if (persistent3) return true;
  }

  return false;
}

export function buildMessage({ focus, confidence, statusMap }) {
  const decliningCount = Object.values(statusMap).filter((v) => v.status === "DECLINING").length;

  if (focus === FOCUS.MAINTENANCE && decliningCount === 0) {
    return "Your motion patterns look stable relative to your baseline. Maintain your current cycle.";
  }

  const focusText = {
    [FOCUS.JOINT_REPAIR]:
      "Your motion patterns suggest increased joint load. A recovery-focused cycle is recommended.",
    [FOCUS.ENERGY_RESTORATION]:
      "Your motion patterns suggest reduced movement efficiency. A gentle energy restoration cycle is recommended.",
    [FOCUS.BALANCE_STABILITY]:
      "Your motion patterns suggest reduced stability. A grounding and balance-support cycle is recommended.",
    [FOCUS.PERFORMANCE_VITALITY]:
      "Your motion patterns suggest strong momentum. A performance and vitality cycle is recommended.",
    [FOCUS.MAINTENANCE]:
      "Your motion patterns are mixed. Maintain a balanced cycle and re-scan soon for confirmation.",
  }[focus];

  if (confidence === "HIGH") return focusText;
  return `${focusText} (Re-scan to confirm trend.)`;
}

/**
 * Main evaluation function.
 * input = { metrics, baseline, history, timestamp }
 */
export function evaluateMRVI(input) {
  const timestamp = input?.timestamp || new Date().toISOString();
  const metrics = input?.metrics || {};
  const baseline = input?.baseline || {};
  const history = Array.isArray(input?.history) ? input.history : [];

  const keys = Object.keys(WEIGHTS);

  const statusMap = {};
  const deltas = {};

  keys.forEach((k) => {
    const currentRatio = safeNumber(metrics[k], 1);
    const baselineRatio = safeNumber(baseline[k], 1);
    const { status, delta } = evaluateComponentStatus(k, currentRatio, baselineRatio);
    statusMap[k] = { status, delta };
    deltas[k] = delta;
  });

  const mrviScore = calculateMRVIScore(statusMap);

  const confidence = calculateConfidence({
    statusMap,
    deltas,
    history,
  });

  const focus = determineFocus(statusMap);

  const triggerPlan = shouldTriggerPlan({ statusMap, deltas, history });

  const message = buildMessage({ focus: triggerPlan ? focus : FOCUS.MAINTENANCE, confidence, statusMap });

  return {
    version: MRVI_VERSION,
    timestamp,
    mrviScore,
    components: Object.fromEntries(Object.entries(statusMap).map(([k, v]) => [k, v.status])),
    deltas,
    focus: triggerPlan ? focus : FOCUS.MAINTENANCE,
    confidence,
    triggerPlan,
    message,
  };
}
