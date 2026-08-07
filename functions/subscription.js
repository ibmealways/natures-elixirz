export const TIER_IDS = [1, 2, 3, 4, 5];
export const BILLING_MODES = ["monthly", "yearly"];

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
