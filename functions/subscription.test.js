import test from "node:test";
import assert from "node:assert/strict";
import { billingModeFromPrice, CANONICAL_PLAN_CATALOG, canonicalPlan, canonicalPlanForCheckout, foundingReservationDecision, hasActiveBetaTestingAccess, hasKernelAccess, priceKey, SELECTABLE_KERNELS, tierFromPrice, validateKernelSelection, validatePlanningSelection } from "./subscription.js";

test("active beta testing access bypasses generation quotas only until expiration", () => {
  const now = Date.parse("2026-08-12T12:00:00Z");
  assert.equal(hasActiveBetaTestingAccess({ accessSource: "beta-testing", status: "active", betaExpiresAt: "2026-09-01T00:00:00Z" }, now), true);
  assert.equal(hasActiveBetaTestingAccess({ accessSource: "beta-testing", status: "active", betaExpiresAt: "2026-08-01T00:00:00Z" }, now), false);
  assert.equal(hasActiveBetaTestingAccess({ accessSource: "stripe", status: "active" }, now), false);
  assert.equal(hasActiveBetaTestingAccess({ accessSource: "beta-testing", status: "inactive" }, now), false);
});

test("priceKey validates and formats selections", () => {
  assert.equal(priceKey(5, "yearly"), "STRIPE_PRICE_TIER_5_YEARLY");
  assert.throws(() => priceKey(6, "monthly"));
});

test("canonical catalog locks all twelve billing variants and keeps equal prices from defining identity", () => {
  assert.deepEqual(Object.fromEntries(Object.entries(CANONICAL_PLAN_CATALOG).map(([id, plan]) => [id, [plan.monthlyCents, plan.yearlyCents]])), {
    "level-1": [1599, 15000], "level-2": [2999, 30000], "level-3": [4499, 48000],
    "level-4": [5999, 65000], "vip-founding": [5999, 65000], "vip-regular": [9999, 108000],
  });
  assert.equal(canonicalPlan("level-4", "monthly").amountCents, canonicalPlan("vip-founding", "monthly").amountCents);
  assert.notEqual(canonicalPlan("level-4", "monthly").billingVariantId, canonicalPlan("vip-founding", "monthly").billingVariantId);
  assert.equal(canonicalPlanForCheckout(5, "yearly", { foundingVip: true }).billingVariantId, "vip-founding-yearly");
  assert.deepEqual(canonicalPlanForCheckout(5, "monthly").kernels, [...SELECTABLE_KERNELS, "vip"]);
});

test("all fifteen non-empty core-Kernel combinations validate at their matching level", () => {
  for (let mask = 1; mask < 16; mask += 1) {
    const selection = SELECTABLE_KERNELS.filter((_, index) => mask & (1 << index));
    assert.deepEqual(validateKernelSelection(selection.length, selection), selection);
  }
});

test("monthly and yearly founding variants share one atomic 5,000-member allocation boundary", () => {
  assert.deepEqual(foundingReservationDecision({ completed: 2500, reserved: 2499 }), { available: true, allocated: 4999, nextNumber: 5000, remaining: 1 });
  assert.deepEqual(foundingReservationDecision({ completed: 4999, reserved: 1 }), { available: false, allocated: 5000, nextNumber: null, remaining: 0 });
  assert.equal(canonicalPlan("vip-founding", "monthly").planId, canonicalPlan("vip-founding", "yearly").planId);
});

test("tierFromPrice resolves server-configured prices", () => {
  const configured = {
    STRIPE_PRICE_TIER_5_MONTHLY: "price_vip_monthly",
    STRIPE_PRICE_TIER_5_YEARLY: "price_vip_yearly",
  };
  assert.equal(tierFromPrice("price_vip_monthly", configured), 5);
  assert.equal(tierFromPrice("price_vip_yearly", configured), 5);
  assert.equal(billingModeFromPrice("price_vip_yearly", configured), "yearly");
  assert.equal(tierFromPrice("unknown", configured), 0);
});

test("planning windows distinguish monthly and annual subscriptions", () => {
  assert.deepEqual(validatePlanningSelection({ billingMode: "monthly" }, { planningMonth: 1, days: 30 }), { billingMode: "monthly", planningMonth: 1, days: 30, maximumMonth: 1 });
  assert.equal(validatePlanningSelection({ billingMode: "yearly" }, { planningMonth: 12, days: 30 }).maximumMonth, 12);
  assert.throws(() => validatePlanningSelection({ billingMode: "monthly" }, { planningMonth: 2, days: 7 }), /current 30-day/);
  assert.throws(() => validatePlanningSelection({ billingMode: "yearly" }, { planningMonth: 13, days: 7 }), /months 1 through 12/);
});

test("flexible Kernel selection matches the paid membership level", () => {
  assert.deepEqual(validateKernelSelection(1, ["meals"]), ["meals"]);
  assert.deepEqual(validateKernelSelection(2, ["meals", "smoothies"]), ["meals", "smoothies"]);
  assert.throws(() => validateKernelSelection(2, ["meals"]), /exactly one Kernel/);
});

test("explicit Kernel access overrides legacy order while legacy accounts remain compatible", () => {
  assert.equal(hasKernelAccess({ tier: 1, kernels: ["meals"], status: "active" }, "meals"), true);
  assert.equal(hasKernelAccess({ tier: 1, kernels: ["meals"], status: "active" }, "smoothies"), false);
  assert.equal(hasKernelAccess({ tier: 3, status: "active" }, "meals"), true);
});
