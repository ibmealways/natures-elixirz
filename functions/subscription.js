export const TIER_IDS = [1, 2, 3, 4, 5];
export const BILLING_MODES = ["monthly", "yearly"];
export const SELECTABLE_KERNELS = ["smoothies", "frequencies", "meals", "movement"];
export const LEGACY_KERNELS_BY_TIER = {
  1: ["smoothies"], 2: ["smoothies", "frequencies"], 3: ["smoothies", "frequencies", "meals"],
  4: [...SELECTABLE_KERNELS], 5: [...SELECTABLE_KERNELS, "vip"],
};

export const CANONICAL_PLAN_CATALOG = Object.freeze({
  "level-1": Object.freeze({ planId: "level-1", tier: 1, monthlyCents: 1599, yearlyCents: 15000 }),
  "level-2": Object.freeze({ planId: "level-2", tier: 2, monthlyCents: 2999, yearlyCents: 30000 }),
  "level-3": Object.freeze({ planId: "level-3", tier: 3, monthlyCents: 4499, yearlyCents: 48000 }),
  "level-4": Object.freeze({ planId: "level-4", tier: 4, monthlyCents: 5999, yearlyCents: 65000 }),
  "vip-founding": Object.freeze({ planId: "vip-founding", tier: 5, founding: true, monthlyCents: 5999, yearlyCents: 65000 }),
  "vip-regular": Object.freeze({ planId: "vip-regular", tier: 5, founding: false, monthlyCents: 9999, yearlyCents: 108000 }),
});

export function canonicalPlan(planId, billingMode) {
  const plan = CANONICAL_PLAN_CATALOG[String(planId)];
  if (!plan || !BILLING_MODES.includes(billingMode)) throw new Error("Invalid canonical billing variant.");
  return Object.freeze({
    ...plan,
    billingMode,
    amountCents: billingMode === "monthly" ? plan.monthlyCents : plan.yearlyCents,
    billingVariantId: `${plan.planId}-${billingMode}`,
    kernels: plan.tier === 5 ? [...SELECTABLE_KERNELS, "vip"] : null,
  });
}

export function canonicalPlanForCheckout(tierId, billingMode, { foundingVip = false } = {}) {
  const tier = Number(tierId);
  const planId = tier === 5 ? (foundingVip ? "vip-founding" : "vip-regular") : `level-${tier}`;
  return canonicalPlan(planId, billingMode);
}

export function foundingReservationDecision({ completed = 0, reserved = 0, limit = 5000 } = {}) {
  const completedCount = Math.max(0, Math.floor(Number(completed) || 0));
  const reservedCount = Math.max(0, Math.floor(Number(reserved) || 0));
  const poolLimit = Math.max(1, Math.floor(Number(limit) || 5000));
  const allocated = completedCount + reservedCount;
  return Object.freeze({ available: allocated < poolLimit, allocated, nextNumber: allocated < poolLimit ? allocated + 1 : null, remaining: Math.max(0, poolLimit - allocated) });
}

export function sanitizeKernelIds(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map(String).filter((id) => SELECTABLE_KERNELS.includes(id)))];
}

export function validateKernelSelection(tierId, value) {
  const tier = Number(tierId);
  const kernels = sanitizeKernelIds(value);
  if (tier === 5) return [...SELECTABLE_KERNELS, "vip"];
  if (![1, 2, 3, 4].includes(tier) || kernels.length !== tier) throw new Error("Choose exactly one Kernel for each membership level.");
  return kernels;
}

export function kernelsForEntitlement(entitlement = {}) {
  const explicit = sanitizeKernelIds(entitlement.kernels);
  return explicit.length ? explicit : (LEGACY_KERNELS_BY_TIER[Number(entitlement.tier) || 0] || []);
}

export function hasKernelAccess(entitlement = {}, kernelId, now = Date.now()) {
  const expiration = entitlement.betaExpiresAt ? Date.parse(entitlement.betaExpiresAt) : null;
  return ["active", "trialing"].includes(entitlement.status)
    && (!expiration || expiration > now)
    && kernelsForEntitlement(entitlement).includes(kernelId);
}

export function hasActiveBetaTestingAccess(entitlement = {}, now = Date.now()) {
  if (entitlement.accessSource !== "beta-testing" || !["active", "trialing"].includes(entitlement.status)) return false;
  const expiration = Date.parse(entitlement.betaExpiresAt || "");
  return !Number.isFinite(expiration) || expiration > now;
}

export function priceKey(tierId, billingMode) {
  const tier = Number(tierId);
  if (!TIER_IDS.includes(tier) || !BILLING_MODES.includes(billingMode)) throw new Error("Invalid subscription selection.");
  return `STRIPE_PRICE_TIER_${tier}_${billingMode.toUpperCase()}`;
}

export function tierFromPrice(priceId, priceMap) {
  const match = Object.entries(priceMap).find(([, configuredPrice]) => configuredPrice === priceId);
  if (!match) return 0;
  const key = String(match[0]);
  const explicitTier = key.match(/^STRIPE_PRICE_TIER_([1-5])_(MONTHLY|YEARLY)$/)?.[1];
  const compactTier = key.match(/^[1-5]$/)?.[0];
  return Number(explicitTier || compactTier || 0);
}

export function billingModeFromPrice(priceId, priceMap) {
  const match = Object.entries(priceMap).find(([, configuredPrice]) => configuredPrice === priceId);
  if (!match) return null;
  return String(match[0]).match(/^STRIPE_PRICE_TIER_[1-5]_(MONTHLY|YEARLY)$/)?.[1]?.toLowerCase() || null;
}

export function validatePlanningSelection(entitlement = {}, request = {}) {
  const billingMode = entitlement.billingMode === "yearly" ? "yearly" : "monthly";
  const planningMonth = Math.floor(Number(request.planningMonth) || 1);
  const days = Math.floor(Number(request.days) || 1);
  const maximumMonth = billingMode === "yearly" ? 12 : 1;
  if (planningMonth < 1 || planningMonth > maximumMonth) throw new Error(billingMode === "yearly" ? "Annual planning is limited to months 1 through 12 of the current subscription year." : "Monthly memberships can plan only within the current 30-day subscription window.");
  if (days < 1 || days > 30) throw new Error("A single generated plan is limited to 30 days.");
  return { billingMode, planningMonth, days, maximumMonth };
}
