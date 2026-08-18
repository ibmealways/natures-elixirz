import test from "node:test";
import assert from "node:assert/strict";
import { billingModeFromPrice, hasActiveBetaTestingAccess, hasKernelAccess, priceKey, tierFromPrice, validateKernelSelection, validatePlanningSelection } from "./subscription.js";

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
