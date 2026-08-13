export const TIER_IDS = [1, 2, 3, 4, 5];
export const BILLING_MODES = ["monthly", "yearly"];

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
