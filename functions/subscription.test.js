import test from "node:test";
import assert from "node:assert/strict";
import { priceKey, tierFromPrice } from "./subscription.js";

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
  assert.equal(tierFromPrice("unknown", configured), 0);
});
