import { describe, expect, it } from "vitest";
import { tiers } from "./premiumData";
import { editorialStandards } from "./vipContent";

describe("subscription tiers", () => {
  it("defines four choose-your-Kernel levels plus V.I.P.", () => {
    expect(tiers).toHaveLength(5);
    expect(tiers.map((tier) => tier.id)).toEqual([1, 2, 3, 4, 5]);
    expect(tiers.slice(0, 3).every((tier, index) => tier.name === `${["One", "Two", "Three"][index]} Kernel${index ? "s" : ""}`)).toBe(true);
    expect(tiers[3].features).toEqual(["Smoothies", "Frequencies", "Meal Plans", "Tai Chi + Movement"]);
  });

  it("includes the V.I.P. briefing and physical member benefit", () => {
    const vip = tiers[4];
    expect(vip.name).toContain("V.I.P.");
    expect(vip.features.some((feature) => feature.includes("Biweekly"))).toBe(true);
    expect(vip.features.some((feature) => feature.includes("gift"))).toBe(true);
    expect(vip.features.some((feature) => feature.includes("Household Circle"))).toBe(true);
    expect(vip.foundingMonthly).toBe(59.99);
    expect(vip.foundingYearly).toBe(650);
    expect(vip.monthly).toBe(99.99);
  });
});

describe("V.I.P. editorial standards", () => {
  it("requires sources, human review, and medical boundaries", () => {
    const charter = editorialStandards.join(" ").toLowerCase();
    expect(charter).toContain("original study");
    expect(charter).toContain("human editorial review");
    expect(charter).toContain("never instruct");
  });
});
