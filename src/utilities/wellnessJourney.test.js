import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getMovementContinuation, getSuggestedGoal, getTaiChiProgress, getWellnessJourney,
  recordMovementJourney, recordSmoothieJourney, recordTaiChiSession,
} from "./wellnessJourney";

function storage() {
  const values = new Map();
  return {
    getItem: vi.fn((key) => values.get(key) ?? null),
    setItem: vi.fn((key, value) => values.set(key, String(value))),
    removeItem: vi.fn((key) => values.delete(key)),
  };
}

describe("wellness journey handoffs", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", storage());
    vi.stubGlobal("sessionStorage", storage());
  });

  it("carries a smoothie intention into later realms", () => {
    recordSmoothieJourney("focus", { name: "Cosmic Clarity", sizeOz: 24 });
    expect(getSuggestedGoal()).toBe("focus");
    expect(getWellnessJourney().smoothie.recipeName).toBe("Cosmic Clarity");
  });

  it("maps a movement result to all downstream realms", () => {
    recordMovementJourney("BALANCE_STABILITY", { mrviScore: 84, confidence: "MEDIUM" });
    expect(getMovementContinuation()).toMatchObject({
      goal: "calm", frequencyHz: 396, mealGoal: "calm", taiChiFocus: "balance",
    });
    expect(getSuggestedGoal()).toBe("calm");
  });

  it("tracks completed Tai Chi sessions and minutes per subscriber", () => {
    recordTaiChiSession("balance", 12, "ivan");
    recordTaiChiSession("mindfulness", 10, "ivan");
    expect(getTaiChiProgress("ivan")).toMatchObject({ sessions: 2, minutes: 22, streak: 1, pathways: { balance: 1, mindfulness: 1 } });
    expect(getTaiChiProgress("heather").sessions).toBe(0);
  });
});
