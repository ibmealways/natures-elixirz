import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  EMPTY_PROFILE, getSubscriberProfile, saveSubscriberProfile,
  listRecoverableLocalProfiles, restoreSubscriberProfile, updateSubscriberEntitlement, updateSubscriberTier,
} from "./profileStorage";

function storage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    get length() { return values.size; },
    key: vi.fn((index) => [...values.keys()][index] ?? null),
    getItem: vi.fn((key) => values.get(key) ?? null),
    setItem: vi.fn((key, value) => values.set(key, String(value))),
    removeItem: vi.fn((key) => values.delete(key)),
  };
}

describe("subscriber profile trust boundaries", () => {
  beforeEach(() => vi.stubGlobal("localStorage", storage()));

  it("does not accept paid access from a profile payload", () => {
    const saved = saveSubscriberProfile({ name: "Member", tier: 5, subscriptionStatus: "active", subscriptionCancelAtPeriodEnd: true, subscriptionAccessSource: "forged" });
    expect(saved).toMatchObject({ name: "Member", tier: 1, subscriptionStatus: "preview", subscriptionCancelAtPeriodEnd: false, subscriptionAccessSource: null });
  });

  it("does not restore billing metadata from cloud profile data", () => {
    const restored = restoreSubscriberProfile({ name: "Member", subscriptionCurrentPeriodEnd: 9999999999, subscriptionAccessSource: "forged" });
    expect(restored).toMatchObject({ name: "Member", subscriptionCurrentPeriodEnd: null, subscriptionAccessSource: null });
  });

  it("accepts normalized server entitlement values", () => {
    const next = updateSubscriberEntitlement(EMPTY_PROFILE, { tier: 4, status: "active" });
    expect(next).toMatchObject({ tier: 4, subscriptionStatus: "active" });
  });

  it("isolates personal profiles between subscriber accounts", () => {
    saveSubscriberProfile({ name: "Ivan" }, "ivan");
    saveSubscriberProfile({ name: "Heather" }, "heather");
    expect(getSubscriberProfile("ivan").name).toBe("Ivan");
    expect(getSubscriberProfile("heather").name).toBe("Heather");
  });

  it("finds meaningful profiles under other local account scopes without changing them", () => {
    saveSubscriberProfile({ name: "Heather", healthGoals: ["energy"] }, "old-heather-id");
    saveSubscriberProfile({ name: "Current" }, "current-id");
    const candidates = listRecoverableLocalProfiles("current-id");
    expect(candidates).toHaveLength(1);
    expect(candidates[0]).toMatchObject({ sourceScope: "old-heather-id", displayName: "Heather" });
    expect(getSubscriberProfile("old-heather-id").name).toBe("Heather");
  });

  it("does not offer empty or cleared local profiles for recovery", () => {
    localStorage.setItem("naturesElixirz.subscriber.v2.empty", JSON.stringify(EMPTY_PROFILE));
    localStorage.setItem("naturesElixirz.subscriber.v2.cleared", JSON.stringify({ ...EMPTY_PROFILE, clearedAt: new Date().toISOString() }));
    expect(listRecoverableLocalProfiles("current-id")).toEqual([]);
  });

  it("discovers an older unscoped subscriber profile for explicit recovery", () => {
    localStorage.setItem("naturesElixirz.subscriber.v1", JSON.stringify({ name: "Heather", allergies: "Example" }));
    expect(listRecoverableLocalProfiles("current-id")[0]).toMatchObject({ displayName: "Heather", sourceScope: "guest", legacy: true });
  });

  it("keeps checkout selection in preview mode", () => {
    const next = updateSubscriberTier({ ...EMPTY_PROFILE, subscriptionStatus: "active" }, 5);
    expect(next).toMatchObject({ tier: 5, subscriptionStatus: "preview" });
    expect(getSubscriberProfile().tier).toBe(5);
  });

  it("defaults and preserves voluntary community reach fields", () => {
    expect(getSubscriberProfile("new").reach).toEqual({ country: "", region: "", referral: "prefer-not-to-say" });
    saveSubscriberProfile({ name: "Member", reach: { country: "United States", region: "Pennsylvania", referral: "friend-family" } }, "member");
    expect(getSubscriberProfile("member").reach).toEqual({ country: "United States", region: "Pennsylvania", referral: "friend-family" });
  });
});
