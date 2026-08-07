import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { defineBoolean, defineJsonSecret, defineSecret, defineString } from "firebase-functions/params";
import { HttpsError, onCall, onRequest } from "firebase-functions/v2/https";
import { logger } from "firebase-functions";
import { createHash, randomUUID } from "node:crypto";
import OpenAI from "openai";
import Stripe from "stripe";
import { priceKey, tierFromPrice } from "./subscription.js";
import { aggregateReachRecords } from "./reach.js";
import { buildSmoothieAiContext, buildSmoothieInstructions, smoothieRecipeSchema, validateSmoothieProposal } from "./smoothie-ai.js";
import { buildMealPlanContext, buildMealPlanInstructions, mealPlanSchema, validateMealPlanProposal } from "./meal-plan-ai.js";
import {
  ASTRA_SYSTEM_INSTRUCTIONS,
  buildJourneyContext,
  buildProfileContext,
  hasTierAccess,
  isActiveTierOne,
  validateConversation,
} from "./astra.js";

initializeApp();
const db = getFirestore();
const stripeSecret = defineSecret("STRIPE_SECRET_KEY");
const webhookSecret = defineSecret("STRIPE_WEBHOOK_SECRET");
const appUrl = defineString("APP_URL", { default: "http://localhost:5173" });
const stripePrices = defineJsonSecret("STRIPE_PRICES");
const openaiSecret = defineSecret("OPENAI_API_KEY");
const openaiModel = defineString("OPENAI_MODEL", { default: "gpt-5.6-terra" });
const openaiImageModel = defineString("OPENAI_IMAGE_MODEL", { default: "gpt-image-2" });
const enforceAppCheck = defineBoolean("ENFORCE_APP_CHECK", { default: false });
const VIP_FAMILY_OFFER_LIMIT = 5000;
const VIP_FAMILY_SEAT_LIMIT = 2;

function verificationEmailHtml(link) {
  return `<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;padding:32px;color:#10241f"><p style="font-size:12px;letter-spacing:2px;color:#087f65">NATURE'S ELIXIRZ OS</p><h1 style="font-size:30px">Verify your email address</h1><p>Welcome to Nature's Elixirz. Confirm this email address to protect your wellness profile and unlock subscriber features.</p><p style="margin:30px 0"><a href="${link}" style="background:#12b886;color:#fff;padding:14px 22px;border-radius:999px;text-decoration:none;font-weight:700">Verify my email</a></p><p style="font-size:13px;color:#53645f">If you did not create this account, you can safely ignore this message. Nature's Elixirz will never ask for your password by email.</p></div>`;
}

export const requestVerificationEmail = onCall({ invoker: "public", enforceAppCheck }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Sign in before requesting verification.");
  if (request.auth.token.email_verified) return { queued: false, alreadyVerified: true };
  const uid = request.auth.uid;
  const email = String(request.auth.token.email || "").trim().toLowerCase();
  if (!email) throw new HttpsError("failed-precondition", "This account does not have an email address.");
  const throttleRef = db.doc(`users/${uid}/private/emailVerification`);
  const now = Date.now();
  await db.runTransaction(async (transaction) => {
    const prior = (await transaction.get(throttleRef)).data() || {};
    const lastRequestedAt = Number(prior.lastRequestedAt || 0);
    if (now - lastRequestedAt < 60 * 1000) throw new HttpsError("resource-exhausted", "Please wait one minute before requesting another verification email.");
    transaction.set(throttleRef, { lastRequestedAt: now, requestCount: FieldValue.increment(1), updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  });
  const link = await getAuth().generateEmailVerificationLink(email, {
    url: `${appUrl.value()}/account`,
    handleCodeInApp: false,
  });
  await db.collection("mail").add({
    to: [email],
    message: {
      subject: "Verify your Nature's Elixirz email",
      text: `Welcome to Nature's Elixirz. Verify your email address using this secure link: ${link}\n\nIf you did not create this account, ignore this message.`,
      html: verificationEmailHtml(link),
    },
    createdAt: FieldValue.serverTimestamp(),
    category: "account-email-verification",
    uid,
  });
  return { queued: true };
});

function publicHouseholdRequest(snapshot) {
  const value = snapshot.data() || {};
  return {
    id: snapshot.id,
    ownerEmail: value.ownerEmail || "",
    memberEmail: value.memberEmail || "",
    status: value.status || "pending",
    createdAt: value.createdAt?.toDate?.()?.toISOString?.() || null,
  };
}

async function queueHouseholdAlert({ to, memberEmail, requestId }) {
  const accountUrl = `${appUrl.value()}/account?household=${encodeURIComponent(requestId)}`;
  await db.collection("mail").add({
    to: [to],
    message: {
      subject: "V.I.P. family access request for Nature's Elixirz",
      text: `${memberEmail} requested a family account using your subscriber email. Sign in to review the request: ${accountUrl}\n\nIf you recognize and authorize this person, approve the request from your account. If you do not recognize or authorize them, block the request. No family access is granted until you approve it.`,
      html: `<p><strong>${memberEmail}</strong> requested a family account using your Nature's Elixirz subscriber email.</p><p>If you recognize and authorize this person, sign in and approve the request. If you do not recognize or authorize them, block it.</p><p><a href="${accountUrl}">Review family access request</a></p><p>No family access is granted until you approve it.</p>`,
    },
    createdAt: FieldValue.serverTimestamp(),
    category: "vip-household-access",
  });
}

async function updateVipFamilyEntitlements(ownerUid, ownerEntitlement) {
  const household = await db.doc(`vipHouseholds/${ownerUid}`).get();
  const members = Array.isArray(household.data()?.memberUids) ? household.data().memberUids.slice(0, VIP_FAMILY_SEAT_LIMIT) : [];
  if (!members.length) return;
  const active = Number(ownerEntitlement?.tier) === 5 && ["active", "trialing"].includes(ownerEntitlement?.status);
  const batch = db.batch();
  members.forEach((memberUid) => batch.set(db.doc(`users/${memberUid}/private/entitlement`), {
    tier: active ? 5 : 0,
    status: active ? "active" : "inactive",
    accessSource: "vip-family",
    householdOwnerUid: ownerUid,
    giftsEligible: false,
    canGenerateImages: false,
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true }));
  await batch.commit();
}

function validateMealVisual(meal, index) {
  const allowedMeals = ["Smoothie", "Breakfast", "Lunch", "Snack", "Dinner"];
  const mealType = String(meal?.meal || allowedMeals[index] || "Meal").slice(0, 24);
  if (!allowedMeals.includes(mealType)) throw new HttpsError("invalid-argument", "Invalid meal type.");
  const food = String(meal?.food || "").trim().slice(0, 180);
  if (!food) throw new HttpsError("invalid-argument", "Each meal needs a name.");
  const ingredients = Array.isArray(meal?.ingredients) ? meal.ingredients.slice(0, 16).map((item) => ({ name: String(item?.name || "").trim().slice(0, 80), quantity: String(item?.quantity || "").trim().slice(0, 40) })).filter((item) => item.name) : [];
  return { meal: mealType, food, ingredients };
}

function mealImagePrompt(meal) {
  const ingredients = meal.ingredients.map((item) => `${item.quantity} ${item.name}`.trim()).join(", ");
  const presentation = meal.meal === "Smoothie"
    ? "Show the blended smoothie in a premium clear glass mug with a reusable straw and the exact readable words Nature's Elixirz tastefully printed on the mug."
    : "Show the complete plated meal with every named major ingredient visibly represented; do not include a smoothie or beverage.";
  return `Create a literal realistic food photograph of this newly specified recipe, not a generic meal and not a prior composition. MEAL TYPE: ${meal.meal}. DISH NAME: ${meal.food}. REQUIRED VISIBLE INGREDIENTS: ${ingredients}. ${presentation} The identity of the protein, grain, fruit, and vegetables must exactly match the required list. Do not show any unlisted dominant food. Never substitute a different meat, fish, grain, fruit, vegetable, breakfast, salad, soup, or smoothie. Make this composition visually distinct from other meal types. Dark celestial botanical wellness setting, emerald and subtle violet accents, premium natural lighting, overhead or three-quarter food photography, no people. No captions, labels, ingredient text, menus, watermarks, or typography anywhere in the image${meal.meal === "Smoothie" ? " except the required Nature's Elixirz mug logo" : ""}.`;
}

function validateSmoothieVisual(data = {}) {
  const name = String(data.name || "Personalized smoothie").trim().slice(0, 80);
  const sizeOz = Math.min(64, Math.max(8, Number(data.sizeOz) || 16));
  const ingredients = Array.isArray(data.ingredients) ? data.ingredients.slice(0, 14).map((item) => ({
    name: String(item?.name || "").trim().slice(0, 80),
    quantity: String(item?.quantity || "").trim().slice(0, 40),
  })).filter((item) => item.name) : [];
  if (ingredients.length < 2) throw new HttpsError("invalid-argument", "At least two smoothie ingredients are required.");
  return { name, sizeOz, ingredients };
}

function smoothieImagePrompt(smoothie) {
  const ingredients = smoothie.ingredients.map((item) => `${item.quantity} ${item.name}`.trim()).join(", ");
  return `Create a realistic premium food photograph of the exact smoothie formula named ${smoothie.name}. Finished batch: ${smoothie.sizeOz} oz. Ingredients: ${ingredients}. Infer the blended color and texture from these exact ingredients; berries, greens, dragon fruit, cacao, turmeric, liquids, seeds, oats, and nut butter must visibly influence the final smoothie appropriately. Show one serving in a premium clear handled glass mug with condensation and a reusable clear straw, with remaining batch volume suggested only when this is a multi-serving batch. Tasteful dark celestial botanical Nature's Elixirz setting with emerald accents, natural food-photography lighting, no people. Do not show whole ingredients floating inside the drink. No captions, ingredient labels, nutrition numbers, unrelated food, watermark, or typography.`;
}

async function consumeSmoothieVisualGeneration(uid) {
  const usageRef = db.doc(`users/${uid}/private/smoothieVisualUsage`);
  const today = new Date().toISOString().slice(0, 10);
  await db.runTransaction(async (transaction) => {
    const usage = (await transaction.get(usageRef)).data() || {};
    const count = usage.day === today ? Number(usage.generationCount || 0) : 0;
    if (count >= 5) {
      logger.warn("security.quota.smoothie_visuals", { uid, day: today, count });
      throw new HttpsError("resource-exhausted", "Daily smoothie-image limit reached. Previously generated images remain available.");
    }
    transaction.set(usageRef, { day: today, generationCount: count + 1, updatedAt: FieldValue.serverTimestamp() });
  });
}

async function consumeMealVisualGeneration(uid) {
  const usageRef = db.doc(`users/${uid}/private/mealVisualUsage`);
  const today = new Date().toISOString().slice(0, 10);
  await db.runTransaction(async (transaction) => {
    const usage = (await transaction.get(usageRef)).data() || {};
    const count = usage.day === today ? Number(usage.successfulCount || 0) : 0;
    if (count >= 20) {
      logger.warn("security.quota.meal_visuals", { uid, day: today, count });
      throw new HttpsError("resource-exhausted", "Daily meal-image limit reached. Previously generated images remain available.");
    }
    transaction.set(usageRef, { day: today, successfulCount: count + 1, updatedAt: FieldValue.serverTimestamp() });
  });
}

async function consumeMealPlanGeneration(uid) {
  const usageRef = db.doc(`users/${uid}/private/mealPlanUsage`);
  const today = new Date().toISOString().slice(0, 10);
  await db.runTransaction(async (transaction) => {
    const usage = (await transaction.get(usageRef)).data() || {};
    const count = usage.day === today ? Number(usage.count || 0) : 0;
    if (count >= 12) throw new HttpsError("resource-exhausted", "Daily AI meal-plan limit reached. Existing plans remain available.");
    transaction.set(usageRef, { day: today, count: count + 1, updatedAt: FieldValue.serverTimestamp() });
  });
}

async function requireBetaAdmin(request) {
  if (!request.auth) throw new HttpsError("unauthenticated", "Sign in as a beta administrator.");
  const snapshot = await db.doc(`betaAdmins/${request.auth.uid}`).get();
  if (!snapshot.exists || snapshot.data()?.enabled !== true) throw new HttpsError("permission-denied", "Beta administrator access is required.");
  return request.auth.uid;
}

function safeTester(testUser, record = {}) {
  const expiration = record.expiresAt || null;
  const expired = Boolean(expiration && Date.parse(expiration) <= Date.now());
  return { uid: testUser.uid, email: testUser.email || record.email || "", emailVerified: Boolean(testUser.emailVerified), status: expired ? "expired" : record.status || "not-granted", tier: expired ? 0 : Number(record.tier || 0), expiresAt: expiration, grantedAt: record.grantedAt || null };
}

export const manageBetaTesters = onCall({ invoker: "public", enforceAppCheck }, async (request) => {
  const adminUid = await requireBetaAdmin(request);
  const action = String(request.data?.action || "list");
  const email = String(request.data?.email || "").trim().toLowerCase();
  if (action === "list") {
    const snapshot = await db.collection("betaTesters").orderBy("grantedAt", "desc").limit(100).get();
    const testers = await Promise.all(snapshot.docs.map(async (document) => {
      try { return safeTester(await getAuth().getUser(document.id), document.data()); }
      catch { return { uid: document.id, email: document.data().email || "", emailVerified: false, status: "account-missing", tier: 0, expiresAt: document.data().expiresAt || null }; }
    }));
    return { testers };
  }
  if (action === "reach") {
    const snapshot = await db.collection("users").select("profile.reach").get();
    return { reach: aggregateReachRecords(snapshot.docs.map((document) => ({ reach: document.data()?.profile?.reach }))) };
  }
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new HttpsError("invalid-argument", "Enter a valid tester email.");
  let testUser;
  try { testUser = await getAuth().getUserByEmail(email); }
  catch { throw new HttpsError("not-found", "That person must create a Nature's Elixirz account first."); }
  if (action === "lookup") {
    const record = (await db.doc(`betaTesters/${testUser.uid}`).get()).data() || {};
    return { tester: safeTester(testUser, record) };
  }
  if (action === "grant") {
    const expiresAt = String(request.data?.expiresAt || "");
    if (!expiresAt || !Number.isFinite(Date.parse(expiresAt)) || Date.parse(expiresAt) <= Date.now()) throw new HttpsError("invalid-argument", "Choose a future expiration date.");
    const now = new Date().toISOString();
    const batch = db.batch();
    batch.set(db.doc(`users/${testUser.uid}/private/entitlement`), { tier: 5, status: "active", accessSource: "beta-testing", betaExpiresAt: expiresAt, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    batch.set(db.doc(`betaTesters/${testUser.uid}`), { email, tier: 5, status: "active", expiresAt, grantedAt: now, grantedBy: adminUid, emailVerified: testUser.emailVerified }, { merge: true });
    batch.set(db.collection("betaAdminAudit").doc(), { action: "grant", testerUid: testUser.uid, testerEmail: email, expiresAt, adminUid, createdAt: FieldValue.serverTimestamp() });
    await batch.commit();
    return { tester: safeTester(testUser, { tier: 5, status: "active", expiresAt, grantedAt: now }) };
  }
  if (action === "revoke") {
    const now = new Date().toISOString();
    const batch = db.batch();
    batch.set(db.doc(`users/${testUser.uid}/private/entitlement`), { tier: 0, status: "inactive", accessSource: "beta-revoked", betaExpiresAt: null, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    batch.set(db.doc(`betaTesters/${testUser.uid}`), { email, tier: 0, status: "revoked", revokedAt: now, revokedBy: adminUid }, { merge: true });
    batch.set(db.collection("betaAdminAudit").doc(), { action: "revoke", testerUid: testUser.uid, testerEmail: email, adminUid, createdAt: FieldValue.serverTimestamp() });
    await batch.commit();
    return { tester: safeTester(testUser, { tier: 0, status: "revoked" }) };
  }
  throw new HttpsError("invalid-argument", "Unknown beta administration action.");
});

export const registerBetaActivity = onCall({ invoker: "public", enforceAppCheck }, async (request) => {
  return { tracked: false, disabled: true };
});

function requireRecentAccountAuth(request) {
  if (!request.auth) throw new HttpsError("unauthenticated", "Sign in to manage your account.");
  const authTime = Number(request.auth.token.auth_time || 0) * 1000;
  if (!authTime || Date.now() - authTime > 5 * 60 * 1000) throw new HttpsError("failed-precondition", "Sign in again before deleting your account.");
  return request.auth.uid;
}

const snapshotData = (snapshot) => snapshot.docs.map((document) => ({ id: document.id, ...document.data() }));

export const exportSubscriberData = onCall({ invoker: "public", enforceAppCheck }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Sign in to export your data.");
  const uid = request.auth.uid;
  const userRef = db.doc(`users/${uid}`);
  const [account, recipes, privateRecords, mealVisualSets, smoothieVisualSets, betaAccess] = await Promise.all([
    userRef.get(), userRef.collection("recipes").get(), userRef.collection("private").get(), userRef.collection("mealVisualSets").get(),
    userRef.collection("smoothieVisualSets").get(), db.doc(`betaTesters/${uid}`).get(),
  ]);
  return {
    exportVersion: 1,
    exportedAt: new Date().toISOString(),
    account: { uid, email: request.auth.token.email || "", emailVerified: Boolean(request.auth.token.email_verified) },
    wellness: account.exists ? account.data() : null,
    recipes: snapshotData(recipes),
    accountRecords: snapshotData(privateRecords),
    mealVisualSets: snapshotData(mealVisualSets),
    smoothieVisualSets: snapshotData(smoothieVisualSets),
    betaAccess: betaAccess.exists ? ((record) => ({ email: record.email || "", tier: record.tier || 0, status: record.status || "", expiresAt: record.expiresAt || null, grantedAt: record.grantedAt || null, revokedAt: record.revokedAt || null }))(betaAccess.data()) : null,
  };
});

export const deleteSubscriberAccount = onCall({ secrets: [stripeSecret], invoker: "public", enforceAppCheck }, async (request) => {
  const uid = requireRecentAccountAuth(request);
  if (request.data?.confirmation !== "DELETE MY ACCOUNT") throw new HttpsError("invalid-argument", "Deletion confirmation did not match.");
  const userRef = db.doc(`users/${uid}`);
  const entitlement = (await userRef.collection("private").doc("entitlement").get()).data() || {};
  if (entitlement.stripeSubscriptionId) {
    const stripe = new Stripe(stripeSecret.value());
    try { await stripe.subscriptions.cancel(entitlement.stripeSubscriptionId); }
    catch (error) {
      if (error?.code !== "resource_missing") {
        console.error("Subscription cancellation before account deletion failed", { uid, code: error?.code });
        throw new HttpsError("unavailable", "Subscription cancellation could not be confirmed. Account deletion was stopped to prevent continued billing.");
      }
    }
  }
  try {
    await Promise.all([
      getStorage().bucket().deleteFiles({ prefix: `meal-visuals/${uid}/` }),
      getStorage().bucket().deleteFiles({ prefix: `smoothie-visuals/${uid}/` }),
    ]);
  }
  catch (error) { console.error("Meal image cleanup failed during account deletion", { uid, code: error?.code }); }
  await db.recursiveDelete(userRef);
  await Promise.allSettled([
    db.doc(`betaTesters/${uid}`).delete(),
    db.doc(`betaAdmins/${uid}`).delete(),
  ]);
  await getAuth().deleteUser(uid);
  return { deleted: true };
});

async function consumeAstraMessage(uid) {
  const usageRef = db.doc(`users/${uid}/private/astraUsage`);
  const now = Date.now();
  const windowMs = 10 * 60 * 1000;
  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(usageRef);
    const usage = snapshot.data() || {};
    const windowStart = Number(usage.windowStart || 0);
    const withinWindow = now - windowStart < windowMs;
    const count = withinWindow ? Number(usage.count || 0) : 0;
    const today = new Date(now).toISOString().slice(0, 10);
    const dailyCount = usage.day === today ? Number(usage.dailyCount || 0) : 0;
    if (count >= 20 || dailyCount >= 100) {
      logger.warn("security.quota.astra", { uid, windowCount: count, dailyCount, day: today });
      throw new HttpsError("resource-exhausted", dailyCount >= 100 ? "Daily Astra Guide limit reached. Please return tomorrow." : "Astra Guide needs a short rest. Try again in a few minutes.");
    }
    transaction.set(usageRef, {
      windowStart: withinWindow ? windowStart : now,
      count: count + 1,
      day: today,
      dailyCount: dailyCount + 1,
      updatedAt: FieldValue.serverTimestamp(),
    });
  });
}

async function consumeSmoothieRecipeGeneration(uid) {
  const usageRef = db.doc(`users/${uid}/private/smoothieRecipeUsage`);
  const today = new Date().toISOString().slice(0, 10);
  await db.runTransaction(async (transaction) => {
    const usage = (await transaction.get(usageRef)).data() || {};
    const count = usage.day === today ? Number(usage.count || 0) : 0;
    if (count >= 20) throw new HttpsError("resource-exhausted", "Daily AI smoothie limit reached. Saved recipes remain available.");
    transaction.set(usageRef, { day: today, count: count + 1, updatedAt: FieldValue.serverTimestamp() });
  });
}

export const askAstraGuide = onCall({ secrets: [openaiSecret], timeoutSeconds: 60, invoker: "public", enforceAppCheck }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Sign in to speak with Astra Guide.");
  if (!request.auth.token.email_verified) throw new HttpsError("failed-precondition", "Verify your email before using Astra Guide.");

  const entitlementSnapshot = await db.doc(`users/${request.auth.uid}/private/entitlement`).get();
  if (!isActiveTierOne(entitlementSnapshot.data())) {
    throw new HttpsError("permission-denied", "An active Nature's Elixirz membership is required.");
  }

  let conversation;
  try {
    conversation = validateConversation(request.data);
  } catch (error) {
    throw new HttpsError("invalid-argument", error.message);
  }
  await consumeAstraMessage(request.auth.uid);

  const includeProfile = request.data?.includeProfile === true;
  const includeSensitive = includeProfile && request.data?.includeSensitive === true;
  const profileContext = includeProfile
    ? buildProfileContext(request.data?.profile, includeSensitive)
    : null;
  const journeyContext = includeProfile
    ? buildJourneyContext(request.data?.journey)
    : null;
  const supportedLanguages = new Set(["English", "Español", "Français", "Português", "Deutsch", "中文", "العربية", "हिन्दी"]);
  const languageCandidate = String(request.data?.languageName || "English");
  const requestedLanguage = supportedLanguages.has(languageCandidate) ? languageCandidate : "English";
  const input = [
    ...conversation.history,
    ...(profileContext ? [{
      role: "user",
      content: `Optional subscriber context (use only when relevant): ${JSON.stringify(profileContext)}`,
    }] : []),
    ...(journeyContext && Object.keys(journeyContext).length ? [{
      role: "user",
      content: `Optional cross-tier journey context (use only when relevant): ${JSON.stringify(journeyContext)}`,
    }] : []),
    { role: "user", content: `Reply in ${requestedLanguage}. Keep ingredient names and measurements unambiguous.` },
    { role: "user", content: conversation.message },
  ];

  const client = new OpenAI({ apiKey: openaiSecret.value() });
  try {
    const response = await client.responses.create({
      model: openaiModel.value(),
      instructions: ASTRA_SYSTEM_INSTRUCTIONS,
      input,
      reasoning: { effort: "low" },
      text: { verbosity: "medium" },
      safety_identifier: createHash("sha256").update(request.auth.uid).digest("hex"),
      max_output_tokens: 900,
    });
    return { reply: response.output_text || "I could not form a response. Please try again." };
  } catch (error) {
    console.error("Astra Guide request failed", { status: error.status, code: error.code });
    throw new HttpsError("unavailable", "Astra Guide is temporarily unavailable. Please try again.");
  }
});

export const generateSmartSmoothie = onCall({ secrets: [openaiSecret], timeoutSeconds: 90, invoker: "public", enforceAppCheck }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Sign in to generate a personalized smoothie.");
  if (!request.auth.token.email_verified) throw new HttpsError("failed-precondition", "Verify your email before generating a personalized smoothie.");
  const uid = request.auth.uid;
  const entitlement = (await db.doc(`users/${uid}/private/entitlement`).get()).data();
  if (!hasTierAccess(entitlement, 1)) throw new HttpsError("permission-denied", "Tier 1 access is required for AI smoothie generation.");
  const accountSnapshot = await db.doc(`users/${uid}`).get();
  const account = accountSnapshot.data() || {};
  if (!account.profile?.completedAt || !account.profile?.name) throw new HttpsError("failed-precondition", "Complete and synchronize your profile before generating.");
  const [savedRecipes, generatedHistory] = await Promise.all([
    db.collection(`users/${uid}/recipes`).limit(12).get(),
    db.collection(`users/${uid}/smoothieAiHistory`).orderBy("createdAt", "desc").limit(12).get(),
  ]);
  const recentRecipes = [...generatedHistory.docs.map((item) => item.data()), ...savedRecipes.docs.map((item) => item.data())]
    .filter((item, index, all) => all.findIndex((candidate) => candidate.name === item.name) === index)
    .slice(0, 12);
  const context = buildSmoothieAiContext(account.profile, request.data || {}, recentRecipes, account.kitchen || {});
  await consumeSmoothieRecipeGeneration(uid);
  const client = new OpenAI({ apiKey: openaiSecret.value() });
  let validationFeedback = "";
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await client.responses.create({
        model: openaiModel.value(),
        instructions: buildSmoothieInstructions(context),
        input: validationFeedback || "Generate the requested smoothie now.",
        reasoning: { effort: "low" },
        text: { verbosity: "medium", format: { type: "json_schema", name: "personalized_smoothie", strict: true, schema: smoothieRecipeSchema } },
        safety_identifier: createHash("sha256").update(uid).digest("hex"),
        max_output_tokens: 2200,
      });
      const proposal = validateSmoothieProposal(JSON.parse(response.output_text), context);
      await db.collection(`users/${uid}/smoothieAiHistory`).add({
        name: proposal.name,
        ingredients: proposal.ingredients.map(({ name, group }) => ({ name, group })),
        goals: context.request.goals,
        createdAt: FieldValue.serverTimestamp(),
      });
      logger.info("ai.smoothie_recipe.generated", { uid, ingredientCount: proposal.ingredients.length, attempt: attempt + 1 });
      return { recipe: proposal, source: "openai", model: response.model || openaiModel.value() };
    } catch (error) {
      validationFeedback = `The prior proposal failed application validation: ${String(error.message || "invalid recipe").slice(0, 240)}. Create a different corrected recipe.`;
      if (attempt === 1) {
        logger.error("ai.smoothie_recipe.failed", { uid, status: error?.status, code: error?.code, message: error?.message });
        throw new HttpsError("unavailable", "AI smoothie generation could not produce a validated recipe. A clearly labeled fallback can still be used.");
      }
    }
  }
  throw new HttpsError("unavailable", "AI smoothie generation is temporarily unavailable.");
});

export const generateSmartMealPlan = onCall({ secrets: [openaiSecret], timeoutSeconds: 180, memory: "1GiB", invoker: "public", enforceAppCheck }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Sign in to generate a personalized meal plan.");
  if (!request.auth.token.email_verified) throw new HttpsError("failed-precondition", "Verify your email before generating a personalized meal plan.");
  const uid = request.auth.uid;
  const entitlement = (await db.doc(`users/${uid}/private/entitlement`).get()).data();
  if (!hasTierAccess(entitlement, 3)) throw new HttpsError("permission-denied", "Tier 3 access is required for AI meal planning.");
  const account = (await db.doc(`users/${uid}`).get()).data() || {};
  if (!account.profile?.completedAt || !account.profile?.name) throw new HttpsError("failed-precondition", "Complete and synchronize your profile before generating.");
  const context = buildMealPlanContext(account.profile, request.data || {});
  await consumeMealPlanGeneration(uid);
  const client = new OpenAI({ apiKey: openaiSecret.value() });
  let feedback = "Generate the requested meal plan now.";
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await client.responses.create({
        model: openaiModel.value(),
        instructions: buildMealPlanInstructions(context),
        input: feedback,
        reasoning: { effort: "medium" },
        text: { verbosity: "medium", format: { type: "json_schema", name: "personalized_meal_plan", strict: true, schema: mealPlanSchema } },
        safety_identifier: createHash("sha256").update(uid).digest("hex"),
        max_output_tokens: context.days > 3 ? 10000 : 6000,
      });
      const plan = validateMealPlanProposal(JSON.parse(response.output_text), context);
      await db.collection(`users/${uid}/mealPlanAiHistory`).add({ goal: context.goal, days: context.days, summary: response.output_text.slice(0, 500), createdAt: FieldValue.serverTimestamp() });
      logger.info("ai.meal_plan.generated", { uid, goal: context.goal, days: context.days, attempt: attempt + 1 });
      return { plan, medicationSafety: JSON.parse(response.output_text).medicationSafety, source: "openai", model: response.model || openaiModel.value() };
    } catch (error) {
      feedback = `The prior plan failed application validation: ${String(error.message || "invalid plan").slice(0, 300)}. Produce a different corrected plan.`;
      if (attempt === 1) {
        logger.error("ai.meal_plan.failed", { uid, goal: context.goal, status: error?.status, code: error?.code, message: error?.message });
        throw new HttpsError("unavailable", "AI meal planning could not produce a validated plan. A clearly labeled rules-based backup can still be shown.");
      }
    }
  }
  throw new HttpsError("unavailable", "AI meal planning is temporarily unavailable.");
});

export const generateMealPlanVisuals = onCall({ secrets: [openaiSecret], timeoutSeconds: 300, memory: "1GiB", invoker: "public", enforceAppCheck }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Sign in to generate meal visuals.");
  if (!request.auth.token.email_verified) throw new HttpsError("failed-precondition", "Verify your email before generating meal visuals.");
  const entitlement = (await db.doc(`users/${request.auth.uid}/private/entitlement`).get()).data();
  if (!hasTierAccess(entitlement, 3)) throw new HttpsError("permission-denied", "Tier 3 access is required for personalized meal visuals.");
  if (entitlement?.canGenerateImages === false) throw new HttpsError("permission-denied", "Family accounts use meal-matched reference visuals and do not consume image-generation credits.");

  const meals = Array.isArray(request.data?.meals) ? request.data.meals.slice(0, 5).map(validateMealVisual) : [];
  if (meals.length !== 5) throw new HttpsError("invalid-argument", "A complete five-meal day is required.");
  const signature = createHash("sha256").update(JSON.stringify({ visualPromptVersion: 2, meals })).digest("hex");
  const cacheRef = db.doc(`users/${request.auth.uid}/mealVisualSets/${signature}`);
  const cached = await cacheRef.get();
  if (cached.exists && Array.isArray(cached.data()?.images) && cached.data().images.length === 5) return { images: cached.data().images, cached: true };

  const client = new OpenAI({ apiKey: openaiSecret.value() });
  const bucket = getStorage().bucket();
  try {
    const images = await Promise.all(meals.map(async (meal, index) => {
      const response = await client.images.generate({ model: openaiImageModel.value(), prompt: mealImagePrompt(meal), size: "1024x1024", quality: "low", output_format: "webp" });
      const encoded = response.data?.[0]?.b64_json;
      if (!encoded) throw new Error("Image response did not contain image data.");
      const token = randomUUID();
      const path = `meal-visuals/${request.auth.uid}/${signature}/${index + 1}.webp`;
      await bucket.file(path).save(Buffer.from(encoded, "base64"), { resumable: false, contentType: "image/webp", metadata: { cacheControl: "private,max-age=31536000", metadata: { firebaseStorageDownloadTokens: token } } });
      return `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(path)}?alt=media&token=${token}`;
    }));
    await consumeMealVisualGeneration(request.auth.uid);
    await cacheRef.set({ images, meals: meals.map(({ meal, food }) => ({ meal, food })), createdAt: FieldValue.serverTimestamp() });
    logger.info("ai.meal_visuals.generated", { uid: request.auth.uid, imageCount: images.length, signature });
    return { images, cached: false };
  } catch (error) {
    console.error("Meal visual generation failed", { status: error.status, code: error.code, message: error.message });
    if (error.status === 401 && String(error.message || "").includes("api.model.images.request")) {
      throw new HttpsError("failed-precondition", "Image generation permission is not enabled on the Nature's Elixirz OpenAI key.");
    }
    throw new HttpsError("unavailable", "Meal visuals could not be generated right now. Please try again.");
  }
});

export const generateSmoothieVisual = onCall({ secrets: [openaiSecret], timeoutSeconds: 120, memory: "1GiB", invoker: "public", enforceAppCheck }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Sign in to generate a smoothie visual.");
  if (!request.auth.token.email_verified) throw new HttpsError("failed-precondition", "Verify your email before generating smoothie visuals.");
  const entitlement = (await db.doc(`users/${request.auth.uid}/private/entitlement`).get()).data();
  if (!hasTierAccess(entitlement, 1)) throw new HttpsError("permission-denied", "Tier 1 access is required for personalized smoothie visuals.");
  if (entitlement?.canGenerateImages === false) throw new HttpsError("permission-denied", "Family accounts use the ingredient-matched reference visual and do not consume image-generation credits.");
  const smoothie = validateSmoothieVisual(request.data);
  const signature = createHash("sha256").update(JSON.stringify(smoothie)).digest("hex");
  const cacheRef = db.doc(`users/${request.auth.uid}/smoothieVisualSets/${signature}`);
  const cached = await cacheRef.get();
  if (cached.exists && cached.data()?.imageUrl) return { imageUrl: cached.data().imageUrl, cached: true };
  await consumeSmoothieVisualGeneration(request.auth.uid);
  const client = new OpenAI({ apiKey: openaiSecret.value() });
  try {
    const response = await client.images.generate({ model: openaiImageModel.value(), prompt: smoothieImagePrompt(smoothie), size: "1024x1024", quality: "low", output_format: "webp" });
    const encoded = response.data?.[0]?.b64_json;
    if (!encoded) throw new Error("Image response did not contain image data.");
    const token = randomUUID();
    const bucket = getStorage().bucket();
    const path = `smoothie-visuals/${request.auth.uid}/${signature}.webp`;
    await bucket.file(path).save(Buffer.from(encoded, "base64"), { resumable: false, contentType: "image/webp", metadata: { cacheControl: "private,max-age=31536000", metadata: { firebaseStorageDownloadTokens: token } } });
    const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(path)}?alt=media&token=${token}`;
    await cacheRef.set({ imageUrl, smoothie, createdAt: FieldValue.serverTimestamp() });
    logger.info("ai.smoothie_visual.generated", { uid: request.auth.uid, signature });
    return { imageUrl, cached: false };
  } catch (error) {
    logger.error("ai.smoothie_visual.failed", { uid: request.auth.uid, status: error?.status, code: error?.code, message: error?.message });
    throw new HttpsError("unavailable", "The smoothie visual could not be generated right now. Your recipe is still ready.");
  }
});

export const requestVipFamilyAccess = onCall({ invoker: "public", enforceAppCheck }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Create or sign in to your account first.");
  const memberEmail = String(request.auth.token.email || "").trim().toLowerCase();
  const ownerEmail = String(request.data?.subscriberEmail || "").trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(ownerEmail)) throw new HttpsError("invalid-argument", "Enter the V.I.P. subscriber's email address.");
  if (memberEmail === ownerEmail) throw new HttpsError("invalid-argument", "Use a different email for the family account.");

  let owner;
  try { owner = await getAuth().getUserByEmail(ownerEmail); }
  catch { throw new HttpsError("failed-precondition", "That address is not eligible for V.I.P. family access."); }
  const ownerEntitlement = (await db.doc(`users/${owner.uid}/private/entitlement`).get()).data() || {};
  if (!hasTierAccess(ownerEntitlement, 5)) throw new HttpsError("failed-precondition", "That address is not eligible for V.I.P. family access.");

  const requestId = `${owner.uid}_${request.auth.uid}`;
  const requestRef = db.doc(`vipHouseholdRequests/${requestId}`);
  const householdRef = db.doc(`vipHouseholds/${owner.uid}`);
  const counterRef = db.doc("systemCounters/vipFamilyOffer");
  await db.runTransaction(async (transaction) => {
    const [existingRequest, householdSnapshot, counterSnapshot] = await Promise.all([
      transaction.get(requestRef), transaction.get(householdRef), transaction.get(counterRef),
    ]);
    if (existingRequest.data()?.status === "blocked") throw new HttpsError("permission-denied", "This subscriber has blocked the family access request.");
    const household = householdSnapshot.data() || {};
    const memberUids = Array.isArray(household.memberUids) ? household.memberUids : [];
    if (memberUids.includes(request.auth.uid)) return;
    if (memberUids.length >= VIP_FAMILY_SEAT_LIMIT) throw new HttpsError("resource-exhausted", "This V.I.P. household already has two family members.");
    if (!household.offerNumber) {
      const claimed = Number(counterSnapshot.data()?.claimed || 0);
      if (claimed >= VIP_FAMILY_OFFER_LIMIT) throw new HttpsError("resource-exhausted", "The introductory V.I.P. family offer is fully claimed.");
      transaction.set(counterRef, { claimed: claimed + 1, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
      transaction.set(householdRef, { ownerUid: owner.uid, ownerEmail, offerNumber: claimed + 1, memberUids, createdAt: FieldValue.serverTimestamp() }, { merge: true });
    }
    transaction.set(requestRef, {
      ownerUid: owner.uid, ownerEmail, memberUid: request.auth.uid, memberEmail,
      status: "pending", createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
  });
  await queueHouseholdAlert({ to: ownerEmail, memberEmail, requestId });
  logger.info("vip.household.requested", { ownerUid: owner.uid, memberUid: request.auth.uid });
  return { status: "pending", message: "Request sent. Family access remains locked until the V.I.P. subscriber approves it." };
});

export const getVipFamilyAccess = onCall({ invoker: "public", enforceAppCheck }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Sign in to view family access.");
  const uid = request.auth.uid;
  const [owned, requested] = await Promise.all([
    db.collection("vipHouseholdRequests").where("ownerUid", "==", uid).get(),
    db.collection("vipHouseholdRequests").where("memberUid", "==", uid).get(),
  ]);
  return {
    incoming: owned.docs.map(publicHouseholdRequest),
    outgoing: requested.docs.map(publicHouseholdRequest),
  };
});

export const manageVipFamilyAccess = onCall({ invoker: "public", enforceAppCheck }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Sign in to manage family access.");
  const requestId = String(request.data?.requestId || "").trim();
  const action = String(request.data?.action || "");
  if (!requestId || !["approve", "block", "remove"].includes(action)) throw new HttpsError("invalid-argument", "Choose a valid family-access action.");
  const requestRef = db.doc(`vipHouseholdRequests/${requestId}`);
  const requestSnapshot = await requestRef.get();
  const record = requestSnapshot.data();
  if (!record || record.ownerUid !== request.auth.uid) throw new HttpsError("permission-denied", "Only the V.I.P. subscriber can manage this request.");
  const ownerEntitlement = (await db.doc(`users/${request.auth.uid}/private/entitlement`).get()).data() || {};
  if (action === "approve" && !hasTierAccess(ownerEntitlement, 5)) throw new HttpsError("failed-precondition", "An active V.I.P. subscription is required.");
  const householdRef = db.doc(`vipHouseholds/${request.auth.uid}`);
  await db.runTransaction(async (transaction) => {
    const household = (await transaction.get(householdRef)).data() || {};
    const members = Array.isArray(household.memberUids) ? household.memberUids : [];
    if (action === "approve") {
      if (!members.includes(record.memberUid) && members.length >= VIP_FAMILY_SEAT_LIMIT) throw new HttpsError("resource-exhausted", "Both family seats are already occupied.");
      transaction.set(householdRef, { memberUids: [...new Set([...members, record.memberUid])], updatedAt: FieldValue.serverTimestamp() }, { merge: true });
      transaction.set(requestRef, { status: "approved", decidedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() }, { merge: true });
      transaction.set(db.doc(`users/${record.memberUid}/private/entitlement`), { tier: 5, status: "active", accessSource: "vip-family", householdOwnerUid: request.auth.uid, giftsEligible: false, canGenerateImages: false, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    } else {
      transaction.set(householdRef, { memberUids: members.filter((uid) => uid !== record.memberUid), updatedAt: FieldValue.serverTimestamp() }, { merge: true });
      transaction.set(requestRef, { status: action === "block" ? "blocked" : "removed", decidedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() }, { merge: true });
      transaction.set(db.doc(`users/${record.memberUid}/private/entitlement`), { tier: 0, status: "inactive", accessSource: action === "block" ? "vip-family-blocked" : "vip-family-removed", householdOwnerUid: null, giftsEligible: false, canGenerateImages: false, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    }
  });
  logger.info(`vip.household.${action}`, { ownerUid: request.auth.uid, memberUid: record.memberUid });
  return { status: action === "approve" ? "approved" : action === "block" ? "blocked" : "removed" };
});

export const createCheckoutSession = onCall({ secrets: [stripeSecret, stripePrices], invoker: "public", enforceAppCheck }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Sign in before checkout.");
  if (!request.auth.token.email_verified) throw new HttpsError("failed-precondition", "Verify your email before checkout.");
  const { tierId, billingMode } = request.data || {};
  let key;
  try { key = priceKey(tierId, billingMode); } catch { throw new HttpsError("invalid-argument", "Invalid subscription selection."); }
  const prices = stripePrices.value();
  const price = prices[key];
  if (!price) throw new HttpsError("failed-precondition", "Stripe price is not configured.");

  const stripe = new Stripe(stripeSecret.value());
  const entitlement = (await db.doc(`users/${request.auth.uid}/private/entitlement`).get()).data() || {};
  if (entitlement.stripeSubscriptionId && ["active", "trialing", "past_due"].includes(entitlement.status)) {
    throw new HttpsError("already-exists", "You already have a subscription. Use Manage billing to change or cancel it.");
  }
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price, quantity: 1 }],
    ...(entitlement.stripeCustomerId ? { customer: entitlement.stripeCustomerId } : { customer_email: request.auth.token.email }),
    client_reference_id: request.auth.uid,
    subscription_data: { metadata: { firebaseUid: request.auth.uid, tierId: String(tierId) } },
    metadata: { firebaseUid: request.auth.uid, tierId: String(tierId) },
    success_url: `${appUrl.value()}/premium?checkout=success`,
    cancel_url: `${appUrl.value()}/premium?checkout=cancelled`,
    allow_promotion_codes: true,
  });
  return { url: session.url };
});

export const createBillingPortalSession = onCall({ secrets: [stripeSecret], invoker: "public", enforceAppCheck }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Sign in to manage billing.");
  if (!request.auth.token.email_verified) throw new HttpsError("failed-precondition", "Verify your email before managing billing.");
  const entitlement = (await db.doc(`users/${request.auth.uid}/private/entitlement`).get()).data() || {};
  if (!entitlement.stripeCustomerId) throw new HttpsError("not-found", "No Stripe billing account is linked to this membership.");
  const stripe = new Stripe(stripeSecret.value());
  try {
    const session = await stripe.billingPortal.sessions.create({ customer: entitlement.stripeCustomerId, return_url: `${appUrl.value()}/premium?portal=return` });
    return { url: session.url };
  } catch (error) {
    console.error("Stripe billing portal creation failed", { uid: request.auth.uid, code: error?.code });
    throw new HttpsError("failed-precondition", "The billing portal is not available yet. Please contact support.");
  }
});

async function writeEntitlement(uid, subscription, prices) {
  const priceId = subscription.items?.data?.[0]?.price?.id;
  const tier = tierFromPrice(priceId, prices);
  if (!tier) {
    console.error("Stripe subscription price is not mapped to a Nature's Elixirz tier", { priceId, subscriptionId: subscription.id });
  }
  const nextEntitlement = {
    tier,
    status: tier ? subscription.status : "inactive",
    stripeCustomerId: String(subscription.customer),
    stripeSubscriptionId: subscription.id,
    priceId,
    currentPeriodEnd: subscription.items?.data?.[0]?.current_period_end || null,
    cancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end),
    cancelAt: subscription.cancel_at || null,
    canceledAt: subscription.canceled_at || null,
    accessSource: "stripe",
    updatedAt: FieldValue.serverTimestamp(),
  };
  await db.doc(`users/${uid}/private/entitlement`).set(nextEntitlement, { merge: true });
  await updateVipFamilyEntitlements(uid, nextEntitlement);
}

function chooseRecoverableSubscription(subscriptions) {
  const priority = { active: 5, trialing: 4, past_due: 3, paused: 2, unpaid: 1, canceled: 0, incomplete: 0, incomplete_expired: 0 };
  return [...subscriptions].sort((left, right) => (priority[right.status] || 0) - (priority[left.status] || 0) || Number(right.created || 0) - Number(left.created || 0))[0] || null;
}

export const recoverSubscriptionEntitlement = onCall({ secrets: [stripeSecret, stripePrices], invoker: "public", enforceAppCheck }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Sign in to restore membership access.");
  if (!request.auth.token.email_verified) throw new HttpsError("failed-precondition", "Verify your email before restoring membership access.");
  const uid = request.auth.uid;
  const entitlementRef = db.doc(`users/${uid}/private/entitlement`);
  const current = (await entitlementRef.get()).data() || {};
  if (current.accessSource === "beta-testing" && ["active", "trialing"].includes(current.status)) return { entitlement: current, recovered: false, source: "beta-testing" };
  const stripe = new Stripe(stripeSecret.value());
  let customerId = current.stripeCustomerId || null;
  if (!customerId) {
    const customers = await stripe.customers.list({ email: request.auth.token.email, limit: 10 });
    const owned = customers.data.find((customer) => !customer.deleted && (customer.metadata?.firebaseUid === uid || customer.email === request.auth.token.email));
    customerId = owned?.id || null;
  }
  if (!customerId) return { entitlement: current, recovered: false, source: "none" };
  const subscriptions = await stripe.subscriptions.list({ customer: customerId, status: "all", limit: 20 });
  const ownedSubscriptions = subscriptions.data.filter((subscription) => !subscription.metadata?.firebaseUid || subscription.metadata.firebaseUid === uid);
  const subscription = chooseRecoverableSubscription(ownedSubscriptions);
  if (!subscription) {
    await entitlementRef.set({ tier: 0, status: "inactive", stripeCustomerId: customerId, stripeSubscriptionId: null, accessSource: "stripe", updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  } else {
    await writeEntitlement(uid, subscription, stripePrices.value());
  }
  const refreshed = (await entitlementRef.get()).data() || {};
  return { entitlement: refreshed, recovered: Boolean(subscription), source: "stripe" };
});

export const stripeWebhook = onRequest({ secrets: [stripeSecret, webhookSecret, stripePrices], invoker: "public" }, async (request, response) => {
  const stripe = new Stripe(stripeSecret.value());
  let event;
  try {
    event = stripe.webhooks.constructEvent(request.rawBody, request.headers["stripe-signature"], webhookSecret.value());
  } catch {
    response.status(400).send("Invalid signature");
    return;
  }
  const prices = stripePrices.value();
  logger.info("billing.webhook.received", { eventId: event.id, eventType: event.type });
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const subscription = await stripe.subscriptions.retrieve(session.subscription);
    await writeEntitlement(session.client_reference_id, subscription, prices);
  }
  if (["customer.subscription.created", "customer.subscription.updated", "customer.subscription.deleted", "customer.subscription.paused", "customer.subscription.resumed"].includes(event.type)) {
    const subscription = event.data.object;
    const uid = subscription.metadata?.firebaseUid;
    if (uid) await writeEntitlement(uid, subscription, prices);
  }
  response.status(200).send("ok");
});
