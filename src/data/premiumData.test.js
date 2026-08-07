import { describe, expect, it } from "vitest";
import { tiers } from "./premiumData";
import { editorialStandards } from "./vipContent";

describe("subscription tiers", () => {
  it("defines five cumulative tiers", () => {
    expect(tiers).toHaveLength(5);
    expect(tiers.map((tier) => tier.id)).toEqual([1, 2, 3, 4, 5]);
    expect(tiers.slice(1).every((tier, index) => tier.features[0] === `Everything in Tier ${index + 1}`)).toBe(true);
  });

  it("includes the V.I.P. briefing and physical member benefit", () => {
    const vip = tiers[4];
    expect(vip.name).toContain("V.I.P.");
    expect(vip.features.some((feature) => feature.includes("Biweekly"))).toBe(true);
    expect(vip.features.some((feature) => feature.includes("gift"))).toBe(true);
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
