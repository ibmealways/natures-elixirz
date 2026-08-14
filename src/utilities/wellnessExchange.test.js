import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildKernelBrief, buildLearningProfile, getWellnessExchange, publishWellnessSignal, recordWellnessFeedback } from "./wellnessExchange";

const storage = () => {
  const values = new Map();
  return { getItem: (key) => values.get(key) || null, setItem: (key, value) => values.set(key, value), removeItem: (key) => values.delete(key) };
};

describe("wellness exchange", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", storage());
    vi.stubGlobal("window", { dispatchEvent: vi.fn() });
    vi.stubGlobal("CustomEvent", class { constructor(type, options) { this.type = type; this.detail = options.detail; } });
  });

  it("isolates subscribers", () => {
    publishWellnessSignal("ivan", "smoothie", { goal: "energy" });
    expect(getWellnessExchange("ivan").signals.smoothie.goal).toBe("energy");
    expect(getWellnessExchange("heather").signals.smoothie).toBeUndefined();
  });

  it("shares summaries but excludes the target kernel and raw data", () => {
    publishWellnessSignal("ivan", "movement", { focus: "balance", scoreBand: "steady", rawFrames: [1, 2] });
    publishWellnessSignal("ivan", "meals", { goal: "heart", selection: "7 days", plan: ["private"] });
    const brief = buildKernelBrief("ivan", "meals");
    expect(brief.signals.meals).toBeUndefined();
    expect(brief.signals.movement.rawFrames).toBeUndefined();
    expect(brief.boundaries.rawInputsShared).toBe(false);
  });

  it("builds bounded, inspectable memory for each kernel", () => {
    publishWellnessSignal("ivan", "smoothie", { goal: "energy", selection: "Berry blend" });
    publishWellnessSignal("ivan", "smoothie", { goal: "focus", selection: "Green blend" });
    const memory = buildKernelBrief("ivan", "smoothie").kernelMemory;
    expect(memory.interactionCount).toBe(2);
    expect(memory.goals).toEqual(["energy", "focus"]);
    expect(memory.selections).toEqual(["Berry blend", "Green blend"]);
    expect(memory.recent).toHaveLength(2);
  });

  it("builds learning only from explicit subscriber feedback", () => {
    recordWellnessFeedback("ivan", "smoothie", { sentiment: "positive", selection: "Berry blend", ingredients: ["Blueberries", "Hemp seeds"] });
    recordWellnessFeedback("ivan", "smoothie", { sentiment: "negative", selection: "Very green blend", ingredients: ["Kale"] });
    const learning = buildLearningProfile(getWellnessExchange("ivan"), "smoothie");
    expect(learning.likedSelections).toEqual(["Berry blend"]);
    expect(learning.dislikedSelections).toEqual(["Very green blend"]);
    expect(learning.preferredIngredients).toContain("Blueberries");
    expect(learning.cautionIngredients).toEqual(["Kale"]);
    expect(learning.source).toBe("explicit-subscriber-feedback");
  });
});
