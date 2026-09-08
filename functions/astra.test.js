import test from "node:test";
import assert from "node:assert/strict";
import { buildJourneyContext, buildKernelContext, buildProfileContext, hasTierAccess, isActiveTierOne, requiredKernelTransferType, validateAstraReply, validateConversation } from "./astra.js";

test("Astra reply validation preserves an explicit Kernel transfer", () => {
  const result = validateAstraReply({ reply: "Ready for review.", transfer: { type: "smoothie", ingredients: [{ name: "Pear" }, { name: "Spinach" }, { name: "Hemp seeds" }, { name: "Soy milk" }, { name: "Ginger" }] } });
  assert.equal(result.transfer.type, "smoothie");
  assert.equal(result.transfer.ingredients[1].name, "Spinach");
});

test("Astra reply validation treats no transfer as ordinary chat", () => {
  assert.deepEqual(validateAstraReply({ reply: "General guidance.", transfer: { type: "none" } }), { reply: "General guidance.", transfer: null });
});

test("explicit Smoothie Kernel requests require a structured transfer", () => {
  assert.equal(requiredKernelTransferType({ message: "Send this smoothie over to Smoothies Kernel." }), "smoothie");
});

test("a confirmation retains the preceding Kernel transfer requirement", () => {
  assert.equal(requiredKernelTransferType({
    message: "Yes do that now please.",
    history: [{ role: "user", content: "Send this smoothie ingredients over to Smoothies Kernel." }],
  }), "smoothie");
});

test("a missing-review complaint retries the preceding Kernel transfer", () => {
  assert.equal(requiredKernelTransferType({
    message: "I don't see anything for me to review in Smoothies Kernel.",
    history: [{ role: "user", content: "Send this smoothie ingredients over to Smoothies Kernel." }],
  }), "smoothie");
});

test("conversation validation trims and limits history", () => {
  const result = validateConversation({
    message: "  Make a focus smoothie  ",
    history: Array.from({ length: 12 }, (_, index) => ({ role: index % 2 ? "assistant" : "user", content: `m${index}` })),
  });
  assert.equal(result.message, "Make a focus smoothie");
  assert.equal(result.history.length, 10);
});

test("conversation validation accepts a supported attachment without text", () => {
  const result = validateConversation({
    message: "",
    attachments: [{
      name: "hand.jpg",
      type: "image/jpeg",
      size: 128,
      dataUrl: "data:image/jpeg;base64,YQ==",
    }],
  });
  assert.equal(result.message, "");
  assert.equal(result.attachments[0].kind, "image");
});

test("conversation validation rejects unsupported attachment types", () => {
  assert.throws(() => validateConversation({
    attachments: [{ name: "unsafe.exe", type: "application/x-msdownload", size: 128, dataUrl: "data:application/x-msdownload;base64,YQ==" }],
  }), /supported file/);
});

test("profile context excludes sensitive fields unless expressly enabled", () => {
  const profile = { healthGoals: ["energy"], medications: "example medicine", conditions: ["kidney"], allergies: "peanut" };
  assert.equal(buildProfileContext(profile).medications, undefined);
  assert.equal(buildProfileContext(profile, true).medications, "example medicine");
});

test("Kernel context includes inventories but strips account and billing data", () => {
  const context = buildKernelContext({
    smoothieKitchen: { pantry: ["blueberries", "spinach"], password: "never" },
    mealPlanKitchen: { pantry: ["rice"], fridge: ["eggs"], freezer: ["salmon"] },
    currentMealPlan: { goal: "muscle", billingId: "hidden" },
    email: "hidden@example.com",
  });
  assert.deepEqual(context.smoothieKitchen.pantry, ["blueberries", "spinach"]);
  assert.deepEqual(context.mealPlanKitchen.fridge, ["eggs"]);
  assert.equal(context.smoothieKitchen.password, undefined);
  assert.equal(context.currentMealPlan.billingId, undefined);
  assert.equal(context.email, undefined);
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
