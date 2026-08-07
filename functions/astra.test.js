import test from "node:test";
import assert from "node:assert/strict";
import { buildJourneyContext, buildProfileContext, hasTierAccess, isActiveTierOne, validateConversation } from "./astra.js";

test("conversation validation trims and limits history", () => {
  const result = validateConversation({
    message: "  Make a focus smoothie  ",
    history: Array.from({ length: 12 }, (_, index) => ({ role: index % 2 ? "assistant" : "user", content: `m${index}` })),
  });
  assert.equal(result.message, "Make a focus smoothie");
  assert.equal(result.history.length, 10);
});

test("profile context excludes sensitive fields unless expressly enabled", () => {
  const profile = { healthGoals: ["energy"], medications: "example medicine", conditions: ["kidney"], allergies: "peanut" };
  assert.equal(buildProfileContext(profile).medications, undefined);
  assert.equal(buildProfileContext(profile, true).medications, "example medicine");
});

test("AI access requires a paid or trialing tier", () => {
  assert.equal(isActiveTierOne({ tier: 1, status: "active" }), true);
  assert.equal(isActiveTierOne({ tier: 5, status: "preview" }), false);
});

test("tier access rejects insufficient tiers and expired beta access", () => {
  const now = Date.parse("2026-08-03T12:00:00Z");
  assert.equal(hasTierAccess({ tier: 3, status: "active" }, 3, now), true);
  assert.equal(hasTierAccess({ tier: 2, status: "active" }, 3, now), false);
  assert.equal(hasTierAccess({ tier: 5, status: "trialing", betaExpiresAt: "2026-08-03T11:59:59Z" }, 3, now), false);
});

test("journey context includes only bounded cross-tier selections", () => {
  const context = buildJourneyContext({
    smoothie: { goal: "focus", sizeOz: 24, recipeName: "private free text" },
    frequency: { hz: 528 },
    movement: { focus: "BALANCE_STABILITY", score: 82 },
  });
  assert.deepEqual(context, {
    smoothieGoal: "focus",
    smoothieSizeOz: 24,
    frequencyHz: 528,
    movementFocus: "BALANCE_STABILITY",
    movementScore: 82,
  });
});

test("journey context accepts bounded Kernel memory signals without raw inputs", () => {
  const context = buildJourneyContext({
    exchange: { signals: { smoothie: { goal: "energy", selection: "Berry blend", rawFrames: [1, 2] } } },
  });
  assert.equal(context.kernelSignals.smoothie.goal, "energy");
  assert.equal(context.kernelSignals.smoothie.selection, "Berry blend");
  assert.equal(context.kernelSignals.smoothie.rawFrames, undefined);
});
