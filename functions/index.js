import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { defineBoolean, defineJsonSecret, defineSecret, defineString } from "firebase-functions/params";
import { HttpsError, onCall, onRequest } from "firebase-functions/v2/https";
import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions";
import * as functionsV1 from "firebase-functions/v1";
import { createHash, randomUUID } from "node:crypto";
import OpenAI from "openai";
import Stripe from "stripe";
import { billingModeFromPrice, hasActiveBetaTestingAccess, hasKernelAccess, priceKey, sanitizeKernelIds, tierFromPrice, validateKernelSelection, validatePlanningSelection } from "./subscription.js";
import { aggregateReachRecords } from "./reach.js";
import { buildSmoothieAiContext, buildSmoothieInstructions, smoothieRecipeSchema, validateSmoothieProposal } from "./smoothie-ai.js";
import { buildMealPlanContext, buildMealPlanInstructions, mealPlanSchema, summarizeMealPlanIntelligence, validateMealPlanProposal } from "./meal-plan-ai.js";
import { assessHighRiskNutritionProfile } from "./nutrition-foundation.js";
import { activeVipFamilyMemberUids, documentData, documentsData, uniqueDocuments } from "./data-lifecycle.js";
import { mailFailureAction, retryableMailPayload } from "./mail-autonomy.js";
import { GoogleAuth } from "google-auth-library";
import { assessGenerationReliability, backupReadiness, shouldReconcileLedger, shouldRecordAiServiceIncident, summarizeAutonomyHealth } from "./operations-autonomy.js";
import {
  ASTRA_SYSTEM_INSTRUCTIONS,
  astraReplySchema,
  buildKernelContext,
  buildJourneyContext,
  buildProfileContext,
  hasTierAccess,
  isActiveTierOne,
  validateConversation,
  validateAstraReply,
  requiredKernelTransferType,
} from "./astra.js";

initializeApp();
const db = getFirestore();
const stripeSecret = defineSecret("STRIPE_SECRET_KEY");
const webhookSecret = defineSecret("STRIPE_WEBHOOK_SECRET");
const appUrl = defineString("APP_URL", { default: "http://localhost:5173" });
const stripePrices = defineJsonSecret("STRIPE_PRICES");
const openaiSecret = defineSecret("OPENAI_API_KEY");
const youtubeDataApiSecret = defineSecret("YOUTUBE_DATA_API_KEY");
const openaiModel = defineString("OPENAI_MODEL", { default: "gpt-5.6-terra" });
const openaiImageModel = defineString("OPENAI_IMAGE_MODEL", { default: "gpt-image-2" });
const enforceAppCheck = defineBoolean("ENFORCE_APP_CHECK", { default: false });

async function recordGenerationOutcome(service, outcome) {
  const allowedServices = new Set(["astraGuide", "smartSmoothie", "smartMealPlan"]);
  const allowedOutcomes = new Set(["generated", "validationFailed", "serviceFailed"]);
  if (!allowedServices.has(service) || !allowedOutcomes.has(outcome)) return;
  const day = new Date().toISOString().slice(0, 10);
  try {
    await db.doc(`systemMetrics/generation-${day}`).set({
      day, [service]: { [outcome]: FieldValue.increment(1) }, updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
  } catch (error) {
    logger.error("operations.generation_metric.failed", { service, outcome, message: error?.message });
  }
}
const publicSignupMode = defineBoolean("PUBLIC_SIGNUP_MODE", { default: false });
const VIP_FAMILY_OFFER_LIMIT = 5000;
const VIP_FAMILY_SEAT_LIMIT = 2;

export const newAccountApprovalAlert = functionsV1.runWith({ failurePolicy: true }).auth.user().onCreate(async (userRecord) => {
  const email = String(userRecord.email || "").trim().toLowerCase();
  if (!email) return;
  const requestRef = db.doc(`betaSignupRequests/${userRecord.uid}`);
  const requestExists = publicSignupMode.value() ? true : (await requestRef.get()).exists;
  const createdAtIso = userRecord.metadata?.creationTime || new Date().toISOString();
  const batch = db.batch();
  if (!requestExists) {
    batch.set(requestRef, {
      uid: userRecord.uid, email, displayName: userRecord.displayName || "",
      emailVerified: Boolean(userRecord.emailVerified), status: "pending",
      source: "firebase-auth", createdAtIso,
      createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
    });
    batch.set(db.collection("mail").doc(), {
      to: ["support@natureselixirz.com"],
      message: {
        subject: "New Nature's Elixirz account awaiting beta approval",
        text: `A new Nature's Elixirz account is waiting for beta authorization.\n\nEmail: ${email}\nCreated: ${createdAtIso}\n\nOpen Beta Admin: https://natures-elixirz-os.web.app/beta-admin`,
      },
      category: "new-beta-account-alert", accountUid: userRecord.uid,
      createdAt: FieldValue.serverTimestamp(),
    });
  }
  await batch.commit();
  if (!userRecord.emailVerified) await queueVerificationEmail({ uid: userRecord.uid, email, source: "account-created" });
});

export const searchTaiChiYouTube = onCall({
  secrets: [youtubeDataApiSecret], invoker: "public", enforceAppCheck, timeoutSeconds: 30,
}, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Sign in to search guided Tai Chi videos.");
  const rawQuery = String(request.data?.query || "").replace(/\s+/g, " ").trim();
  if (rawQuery.length < 2 || rawQuery.length > 80) throw new HttpsError("invalid-argument", "Enter a Tai Chi movement between 2 and 80 characters.");
  const normalizedQuery = rawQuery.toLowerCase().includes("tai chi") ? rawQuery : `Tai Chi ${rawQuery}`;
  const cacheKey = createHash("sha256").update(normalizedQuery.toLowerCase()).digest("hex");
  const cacheRef = db.doc(`youtubeSearchCache/${cacheKey}`);
  const cachedData = (await cacheRef.get()).data();
  if (cachedData?.createdAt?.toMillis?.() > Date.now() - 6 * 60 * 60 * 1000 && Array.isArray(cachedData.results)) {
    return { query: normalizedQuery, results: cachedData.results, cached: true };
  }
  const endpoint = new URL("https://www.googleapis.com/youtube/v3/search");
  endpoint.search = new URLSearchParams({
    part: "snippet", q: normalizedQuery, type: "video", maxResults: "8", safeSearch: "strict",
    videoEmbeddable: "true", videoSyndicated: "true", relevanceLanguage: "en", key: youtubeDataApiSecret.value(),
  }).toString();
  const response = await fetch(endpoint);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    logger.error("YouTube Tai Chi search failed", { status: response.status, reason: payload?.error?.message });
    throw new HttpsError("unavailable", "YouTube search is temporarily unavailable. Please try again shortly.");
  }
  const results = (Array.isArray(payload.items) ? payload.items : []).filter((item) => item?.id?.videoId).map((item) => ({
    key: `youtube-${item.id.videoId}`, videoId: item.id.videoId,
    title: String(item.snippet?.title || "Tai Chi lesson").slice(0, 180),
    channelTitle: String(item.snippet?.channelTitle || "YouTube instructor").slice(0, 100),
    thumbnail: item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url || "",
    youtubeUrl: `https://www.youtube.com/watch?v=${item.id.videoId}`,
  }));
  await cacheRef.set({ query: normalizedQuery, results, createdAt: FieldValue.serverTimestamp() });
  return { query: normalizedQuery, results, cached: false };
});

function verificationEmailHtml(link) {
  return `<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;padding:32px;color:#10241f"><p style="font-size:12px;letter-spacing:2px;color:#087f65">NATURE'S ELIXIRZ OS</p><h1 style="font-size:30px">Verify your email address</h1><p>Welcome to Nature's Elixirz. Confirm this email address to protect your wellness profile and unlock subscriber features.</p><p style="margin:30px 0"><a href="${link}" style="background:#12b886;color:#fff;padding:14px 22px;border-radius:999px;text-decoration:none;font-weight:700">Verify my email</a></p><p style="font-size:13px;color:#53645f">If you did not create this account, you can safely ignore this message. Nature's Elixirz will never ask for your password by email.</p></div>`;
}

async function queueVerificationEmail({ uid, email, source }) {
  const throttleRef = db.doc(`users/${uid}/private/emailVerification`);
  const now = Date.now();
  const allowed = await db.runTransaction(async (transaction) => {
    const prior = (await transaction.get(throttleRef)).data() || {};
    const lastQueuedAt = Number(prior.lastQueuedAt || 0);
    const preparingAt = Number(prior.preparingAt || 0);
    if (now - lastQueuedAt < 60 * 1000 || (prior.status === "preparing" && now - preparingAt < 60 * 1000)) return false;
    transaction.set(throttleRef, {
      preparingAt: now, status: "preparing", source,
      requestCount: FieldValue.increment(1), updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    return true;
  });
  if (!allowed) return { queued: false, duplicate: true };
  try {
    const link = await getAuth().generateEmailVerificationLink(email, {
      url: `${appUrl.value()}/account`, handleCodeInApp: false,
    });
    const mailRef = await db.collection("mail").add({
      to: [email],
      message: {
        subject: "Verify your Nature's Elixirz email",
        text: `Welcome to Nature's Elixirz. Verify your email address using this secure link: ${link}\n\nIf you did not create this account, ignore this message.`,
        html: verificationEmailHtml(link),
      },
      createdAt: FieldValue.serverTimestamp(), category: "account-email-verification", uid,
      accountUid: uid, source, retryAttempt: 0,
    });
    await throttleRef.set({
      status: "queued", lastQueuedAt: now, mailId: mailRef.id,
      lastError: FieldValue.delete(), updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    return { queued: true };
  } catch (error) {
    await throttleRef.set({
      status: "failed", lastError: String(error?.code || error?.message || "verification-queue-failed").slice(0, 300),
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    throw error;
  }
}

export const requestVerificationEmail = onCall({ invoker: "public", enforceAppCheck }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Sign in before requesting verification.");
  if (request.auth.token.email_verified) return { queued: false, alreadyVerified: true };
  const uid = request.auth.uid;
  const email = String(request.auth.token.email || "").trim().toLowerCase();
  if (!email) throw new HttpsError("failed-precondition", "This account does not have an email address.");
  const result = await queueVerificationEmail({ uid, email, source: "subscriber-resend" });
  if (result.duplicate) throw new HttpsError("resource-exhausted", "Please wait one minute before requesting another verification email.");
  return result;
});

export const monitorMailDelivery = onDocumentUpdated("mail/{mailId}", async (event) => {
  const before = event.data?.before.data() || {};
  const after = event.data?.after.data() || {};
  const action = mailFailureAction(before, after);
  if (action.action === "ignore") return;
  const failedRef = event.data.after.ref;
  await db.runTransaction(async (transaction) => {
    const current = (await transaction.get(failedRef)).data() || {};
    if (current.autonomy?.handledAt) return;
    const rootId = String(current.retryOf || event.params.mailId);
    if (action.action === "retry") {
      const retryRef = db.doc(`mail/${rootId}_retry_${action.retryAttempt}`);
      const startTime = Timestamp.fromMillis(Date.now() + action.delayMinutes * 60 * 1000);
      transaction.create(retryRef, retryableMailPayload(current, action.retryAttempt, rootId, startTime));
      transaction.set(failedRef, { autonomy: {
        handledAt: FieldValue.serverTimestamp(), action: "retry", retryMailId: retryRef.id,
      } }, { merge: true });
      return;
    }
    const alertRef = db.doc(`mail/${rootId}_failure_alert`);
    const recipient = Array.isArray(current.to) ? current.to.join(", ") : String(current.to || "unknown");
    transaction.create(alertRef, {
      to: ["support@natureselixirz.com"],
      message: {
        subject: "Nature's Elixirz email delivery requires attention",
        text: `Automatic delivery failed after ${action.retryAttempt} retries.\n\nCategory: ${current.category || "unknown"}\nRecipient: ${recipient}\nMail record: ${event.params.mailId}\n\nReview the Firebase mail collection and contact the subscriber through an approved alternate channel if necessary.`,
      },
      category: "mail-delivery-failure-alert", accountUid: current.accountUid || current.uid || null,
      failedMailId: event.params.mailId, createdAt: FieldValue.serverTimestamp(),
    });
    transaction.set(failedRef, { autonomy: {
      handledAt: FieldValue.serverTimestamp(), action: "alert", alertMailId: alertRef.id,
    } }, { merge: true });
  });
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

const kitchenZones = ["pantry", "fridge", "freezer"];
const cleanKitchenItems = (items = []) => [...new Map((Array.isArray(items) ? items : [])
  .map((item) => String(item || "").trim()).filter(Boolean)
  .map((item) => [item.toLowerCase(), item])).values()];
const cleanKitchen = (value = {}) => Object.fromEntries(kitchenZones.map((zone) => [zone, cleanKitchenItems(value?.[zone])]));
const mergeKitchens = (left = {}, right = {}) => Object.fromEntries(kitchenZones
  .map((zone) => [zone, cleanKitchenItems([...(left?.[zone] || []), ...(right?.[zone] || [])])]));
const kitchensChanged = (before = {}, after = {}) => JSON.stringify({ kitchen: cleanKitchen(before.kitchen), mealKitchen: cleanKitchen(before.mealKitchen) })
  !== JSON.stringify({ kitchen: cleanKitchen(after.kitchen), mealKitchen: cleanKitchen(after.mealKitchen) });
const publicKitchenLink = (snapshot, uid) => {
  const value = snapshot.data() || {};
  const otherIndex = (value.participantUids || []).findIndex((participantUid) => participantUid !== uid);
  return {
    id: snapshot.id, status: value.status || "pending",
    direction: value.recipientUid === uid ? "incoming" : "outgoing",
    otherEmail: (value.participantEmails || [])[otherIndex] || "Household member",
    requesterUid: value.requesterUid || null, recipientUid: value.recipientUid || null,
  };
};

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
    billingMode: ownerEntitlement?.billingMode || "monthly",
    currentPeriodStart: ownerEntitlement?.currentPeriodStart || null,
    currentPeriodEnd: ownerEntitlement?.currentPeriodEnd || null,
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

async function consumeMealPlanGeneration(uid, entitlement = {}) {
  const owner = await db.doc(`betaAdmins/${uid}`).get();
  if (owner.data()?.enabled === true || hasActiveBetaTestingAccess(entitlement)) return;
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

function cleanMailText(value, maximum, fieldName) {
  const text = String(value || "").replace(/\r\n/g, "\n").trim();
  if (!text || text.length > maximum) {
    throw new HttpsError("invalid-argument", `${fieldName} is required and must be ${maximum} characters or fewer.`);
  }
  return text;
}

export const submitSupportRequest = onCall({ invoker: "public", enforceAppCheck }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Sign in before contacting subscriber support.");
  const email = String(request.auth.token.email || "").trim().toLowerCase();
  if (!email) throw new HttpsError("failed-precondition", "This account does not have an email address.");
  const category = cleanMailText(request.data?.category, 50, "Category");
  const subject = cleanMailText(request.data?.subject, 140, "Subject");
  const message = cleanMailText(request.data?.message, 5000, "Message");
  const now = Date.now();
  const usageRef = db.doc(`users/${request.auth.uid}/private/supportRequestUsage`);
  await db.runTransaction(async (transaction) => {
    const prior = (await transaction.get(usageRef)).data() || {};
    if (now - Number(prior.lastSubmittedAt || 0) < 30_000) {
      throw new HttpsError("resource-exhausted", "Please wait 30 seconds before sending another support request.");
    }
    transaction.set(usageRef, { lastSubmittedAt: now, requestCount: FieldValue.increment(1), updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  });
  const caseId = `NE-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${randomUUID().slice(0, 8).toUpperCase()}`;
  const batch = db.batch();
  batch.set(db.doc(`supportRequests/${caseId}`), {
    caseId, uid: request.auth.uid, email, category, subject, message,
    status: "new", createdAt: FieldValue.serverTimestamp(), source: "subscriber-support-center",
  });
  batch.set(db.collection("mail").doc(), {
    to: ["support@natureselixirz.com"],
    message: {
      replyTo: email,
      subject: `[${caseId}] ${category}: ${subject}`,
      text: `Support case: ${caseId}\nSubscriber: ${email}\nCategory: ${category}\n\n${message}`,
    }, category: "subscriber-support-request", caseId, uid: request.auth.uid, createdAt: FieldValue.serverTimestamp(),
  });
  batch.set(db.collection("mail").doc(), {
    to: [email],
    message: {
      subject: `Nature's Elixirz support request received - ${caseId}`,
      text: `We received your ${category.toLowerCase()} report. Your reference number is ${caseId}. Support will reply to ${email}.\n\nYour message:\n${message}`,
    }, category: "subscriber-support-confirmation", caseId, uid: request.auth.uid, createdAt: FieldValue.serverTimestamp(),
  });
  await batch.commit();
  return { submitted: true, caseId };
});

export const sendBetaTesterUpdate = onCall({ invoker: "public", enforceAppCheck }, async (request) => {
  const adminUid = await requireBetaAdmin(request);
  const audience = String(request.data?.audience || "active");
  const subject = cleanMailText(request.data?.subject, 140, "Subject");
  const message = cleanMailText(request.data?.message, 50000, "Message");
  let recipients = [];
  if (audience === "self") {
    recipients = [String(request.auth.token.email || "").trim().toLowerCase()];
  } else if (audience === "one") {
    const email = cleanMailText(request.data?.email, 254, "Tester email").toLowerCase();
    const tester = await getAuth().getUserByEmail(email).catch(() => null);
    const record = tester ? (await db.doc(`betaTesters/${tester.uid}`).get()).data() : null;
    if (!tester || record?.status !== "active" || (record.expiresAt && Date.parse(record.expiresAt) <= Date.now())) {
      throw new HttpsError("not-found", "That email is not an active beta tester.");
    }
    recipients = [email];
  } else if (audience === "active") {
    const snapshot = await db.collection("betaTesters").where("status", "==", "active").limit(100).get();
    recipients = snapshot.docs.map((document) => document.data()).filter((record) => !record.expiresAt || Date.parse(record.expiresAt) > Date.now()).map((record) => String(record.email || "").trim().toLowerCase()).filter(Boolean);
  } else {
    throw new HttpsError("invalid-argument", "Choose a valid beta tester audience.");
  }
  recipients = [...new Set(recipients.filter(Boolean))];
  if (!recipients.length) throw new HttpsError("failed-precondition", "No eligible recipients were found.");
  const updateId = randomUUID();
  const batch = db.batch();
  recipients.forEach((to) => batch.set(db.collection("mail").doc(), {
    to: [to],
    message: { replyTo: "support@natureselixirz.com", subject, text: `${message}\n\nNature's Elixirz Beta Testing Team\nsupport@natureselixirz.com` },
    category: "beta-tester-update", updateId, createdAt: FieldValue.serverTimestamp(),
  }));
  batch.set(db.collection("betaAdminAudit").doc(), { action: "send-beta-update", adminUid, audience, recipientCount: recipients.length, subject, updateId, createdAt: FieldValue.serverTimestamp() });
  await batch.commit();
  return { queued: true, recipientCount: recipients.length, updateId };
});

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
  if (action === "pending") {
    const snapshot = await db.collection("betaSignupRequests").limit(100).get();
    const requests = snapshot.docs.map((document) => {
      const record = document.data();
      return {
        uid: document.id, email: record.email || "", displayName: record.displayName || "",
        emailVerified: Boolean(record.emailVerified), status: record.status || "pending",
        createdAt: record.createdAtIso || record.createdAt?.toDate?.().toISOString?.() || null,
      };
    }).filter((record) => record.status === "pending")
      .sort((left, right) => String(right.createdAt || "").localeCompare(String(left.createdAt || "")));
    return { requests };
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
    batch.set(db.doc(`betaSignupRequests/${testUser.uid}`), { email, emailVerified: testUser.emailVerified, status: "approved", reviewedAt: now, reviewedBy: adminUid, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    batch.set(db.collection("betaAdminAudit").doc(), { action: "grant", testerUid: testUser.uid, testerEmail: email, expiresAt, adminUid, createdAt: FieldValue.serverTimestamp() });
    await batch.commit();
    return { tester: safeTester(testUser, { tier: 5, status: "active", expiresAt, grantedAt: now }) };
  }
  if (action === "revoke") {
    const now = new Date().toISOString();
    const batch = db.batch();
    batch.set(db.doc(`users/${testUser.uid}/private/entitlement`), { tier: 0, status: "inactive", accessSource: "beta-revoked", betaExpiresAt: null, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    batch.set(db.doc(`betaTesters/${testUser.uid}`), { email, tier: 0, status: "revoked", revokedAt: now, revokedBy: adminUid }, { merge: true });
    batch.set(db.doc(`betaSignupRequests/${testUser.uid}`), { email, status: "revoked", reviewedAt: now, reviewedBy: adminUid, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    batch.set(db.collection("betaAdminAudit").doc(), { action: "revoke", testerUid: testUser.uid, testerEmail: email, adminUid, createdAt: FieldValue.serverTimestamp() });
    await batch.commit();
    return { tester: safeTester(testUser, { tier: 0, status: "revoked" }) };
  }
  if (action === "deny") {
    const now = new Date().toISOString();
    const batch = db.batch();
    batch.set(db.doc(`betaSignupRequests/${testUser.uid}`), { email, status: "denied", reviewedAt: now, reviewedBy: adminUid, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    batch.set(db.collection("betaAdminAudit").doc(), { action: "deny", testerUid: testUser.uid, testerEmail: email, adminUid, createdAt: FieldValue.serverTimestamp() });
    await batch.commit();
    return { tester: safeTester(testUser, { tier: 0, status: "denied" }) };
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

async function getSubscriberLifecycleRecords(uid) {
  const [
    betaAccess, betaAdmin, betaSignupRequest, foundingReservation,
    ownedHousehold, memberHouseholds, ownedHouseholdRequests, memberHouseholdRequests,
    subscriptionLedger, supportRequests, mailByUid, mailByAccountUid,
    adminAudit, testerAudit,
  ] = await Promise.all([
    db.doc(`betaTesters/${uid}`).get(),
    db.doc(`betaAdmins/${uid}`).get(),
    db.doc(`betaSignupRequests/${uid}`).get(),
    db.doc(`vipFoundingReservations/${uid}`).get(),
    db.doc(`vipHouseholds/${uid}`).get(),
    db.collection("vipHouseholds").where("memberUids", "array-contains", uid).get(),
    db.collection("vipHouseholdRequests").where("ownerUid", "==", uid).get(),
    db.collection("vipHouseholdRequests").where("memberUid", "==", uid).get(),
    db.collection("subscriptionLedger").where("uid", "==", uid).get(),
    db.collection("supportRequests").where("uid", "==", uid).get(),
    db.collection("mail").where("uid", "==", uid).get(),
    db.collection("mail").where("accountUid", "==", uid).get(),
    db.collection("betaAdminAudit").where("adminUid", "==", uid).get(),
    db.collection("betaAdminAudit").where("testerUid", "==", uid).get(),
  ]);
  return {
    betaAccess, betaAdmin, betaSignupRequest, foundingReservation, ownedHousehold,
    memberHouseholds: memberHouseholds.docs,
    householdRequests: uniqueDocuments(ownedHouseholdRequests, memberHouseholdRequests),
    subscriptionLedger: subscriptionLedger.docs,
    supportRequests: supportRequests.docs,
    mailRecords: uniqueDocuments(mailByUid, mailByAccountUid),
    betaAdminAudit: uniqueDocuments(adminAudit, testerAudit),
  };
}

export const exportSubscriberData = onCall({ invoker: "public", enforceAppCheck }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Sign in to export your data.");
  const uid = request.auth.uid;
  const userRef = db.doc(`users/${uid}`);
  const [account, recipes, privateRecords, mealVisualSets, smoothieVisualSets, smoothieAiHistory, mealPlanAiHistory, lifecycle] = await Promise.all([
    userRef.get(), userRef.collection("recipes").get(), userRef.collection("private").get(), userRef.collection("mealVisualSets").get(),
    userRef.collection("smoothieVisualSets").get(), userRef.collection("smoothieAiHistory").get(),
    userRef.collection("mealPlanAiHistory").get(), getSubscriberLifecycleRecords(uid),
  ]);
  return {
    exportVersion: 2,
    exportedAt: new Date().toISOString(),
    account: { uid, email: request.auth.token.email || "", emailVerified: Boolean(request.auth.token.email_verified) },
    wellness: account.exists ? account.data() : null,
    recipes: snapshotData(recipes),
    accountRecords: snapshotData(privateRecords),
    mealVisualSets: snapshotData(mealVisualSets),
    smoothieVisualSets: snapshotData(smoothieVisualSets),
    smoothieAiHistory: snapshotData(smoothieAiHistory),
    mealPlanAiHistory: snapshotData(mealPlanAiHistory),
    accessAndOperations: {
      betaAccess: documentData(lifecycle.betaAccess),
      betaAdministrator: documentData(lifecycle.betaAdmin),
      betaSignupRequest: documentData(lifecycle.betaSignupRequest),
      foundingVipReservation: documentData(lifecycle.foundingReservation),
      ownedVipHousehold: documentData(lifecycle.ownedHousehold),
      memberVipHouseholds: documentsData(lifecycle.memberHouseholds),
      vipHouseholdRequests: documentsData(lifecycle.householdRequests),
      subscriptionLedger: documentsData(lifecycle.subscriptionLedger),
      supportRequests: documentsData(lifecycle.supportRequests),
      mailRecords: documentsData(lifecycle.mailRecords),
      betaAdministratorAudit: documentsData(lifecycle.betaAdminAudit),
    },
  };
});

export const deleteSubscriberAccount = onCall({ secrets: [stripeSecret], invoker: "public", enforceAppCheck }, async (request) => {
  const uid = requireRecentAccountAuth(request);
  if (request.data?.confirmation !== "DELETE MY ACCOUNT") throw new HttpsError("invalid-argument", "Deletion confirmation did not match.");
  const userRef = db.doc(`users/${uid}`);
  const entitlement = (await userRef.collection("private").doc("entitlement").get()).data() || {};
  const lifecycle = await getSubscriberLifecycleRecords(uid);
  if (entitlement.stripeSubscriptionId) {
    const stripe = new Stripe(stripeSecret.value());
    try {
      const canceledSubscription = await stripe.subscriptions.cancel(entitlement.stripeSubscriptionId);
      await recordSubscriptionCounts(uid, canceledSubscription, Number(entitlement.tier || 0));
    }
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

  const ownedMemberUids = activeVipFamilyMemberUids(lifecycle.ownedHousehold);
  await Promise.all(ownedMemberUids.map(async (memberUid) => {
    const memberEntitlementRef = db.doc(`users/${memberUid}/private/entitlement`);
    await db.runTransaction(async (transaction) => {
      const memberEntitlement = (await transaction.get(memberEntitlementRef)).data() || {};
      if (memberEntitlement.accessSource !== "vip-family" || memberEntitlement.householdOwnerUid !== uid) return;
      transaction.set(memberEntitlementRef, {
        tier: 0, status: "inactive", accessSource: "vip-family-owner-deleted",
        householdOwnerUid: null, updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
    });
  }));

  await Promise.all(lifecycle.memberHouseholds.map((household) => household.ref.update({
    memberUids: FieldValue.arrayRemove(uid), updatedAt: FieldValue.serverTimestamp(),
  })));

  const linkedDocuments = [
    lifecycle.betaAccess, lifecycle.betaAdmin, lifecycle.betaSignupRequest,
    lifecycle.foundingReservation, lifecycle.ownedHousehold,
    ...lifecycle.householdRequests, ...lifecycle.subscriptionLedger,
    ...lifecycle.supportRequests, ...lifecycle.mailRecords, ...lifecycle.betaAdminAudit,
  ].filter((document) => document.exists !== false);
  const writer = db.bulkWriter();
  linkedDocuments.forEach((document) => writer.delete(document.ref));
  await writer.close();
  await db.recursiveDelete(userRef);
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

async function consumeSmoothieRecipeGeneration(uid, entitlement = {}) {
  const owner = await db.doc(`betaAdmins/${uid}`).get();
  if (owner.data()?.enabled === true || hasActiveBetaTestingAccess(entitlement)) return;
  const usageRef = db.doc(`users/${uid}/private/smoothieRecipeUsage`);
  const today = new Date().toISOString().slice(0, 10);
  await db.runTransaction(async (transaction) => {
    const usage = (await transaction.get(usageRef)).data() || {};
    const count = usage.day === today ? Number(usage.count || 0) : 0;
    if (count >= 3) throw new HttpsError("resource-exhausted", "Your three smoothie generations for today have been used. Saved recipes remain available; return tomorrow for three new formulas.");
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
  const includeKernelContext = request.data?.includeKernelContext === true;
  const profileContext = includeProfile
    ? buildProfileContext(request.data?.profile, includeSensitive)
    : null;
  const journeyContext = includeProfile
    ? buildJourneyContext(request.data?.journey)
    : null;
  let kernelContext = null;
  try {
    kernelContext = includeKernelContext ? buildKernelContext(request.data?.kernelContext) : null;
  } catch (error) {
    throw new HttpsError("invalid-argument", error.message);
  }
  const supportedLanguages = new Set(["English", "Español", "Français", "Português", "Deutsch", "中文", "العربية", "हिन्दी"]);
  const languageCandidate = String(request.data?.languageName || "English");
  const requestedLanguage = supportedLanguages.has(languageCandidate) ? languageCandidate : "English";
  const attachmentContent = conversation.attachments.map((attachment) => {
    if (attachment.kind === "image") {
      return { type: "input_image", image_url: attachment.dataUrl, detail: "auto" };
    }
    if (attachment.type === "application/pdf") {
      return { type: "input_file", filename: attachment.name, file_data: attachment.dataUrl };
    }
    return {
      type: "input_text",
      text: `Attached file \"${attachment.name}\":\n${attachment.text}`,
    };
  });
  const userContent = [
    { type: "input_text", text: conversation.message || "Please review the attached item." },
    ...attachmentContent,
  ];
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
    ...(kernelContext && Object.keys(kernelContext).length ? [{
      role: "user",
      content: `Subscriber-approved read-only Kernel context (use only when relevant; never claim to modify it): ${JSON.stringify(kernelContext)}`,
    }] : []),
    { role: "user", content: `Reply in ${requestedLanguage}. Keep ingredient names and measurements unambiguous.` },
    { role: "user", content: userContent },
  ];

  const client = new OpenAI({ apiKey: openaiSecret.value() });
  try {
    const requiredTransferType = requiredKernelTransferType(conversation);
    const createAstraResponse = (retry = false) => client.responses.create({
      model: openaiModel.value(),
      instructions: `${ASTRA_SYSTEM_INSTRUCTIONS}${requiredTransferType ? `\n\nSERVER TRANSFER REQUIREMENT: This turn explicitly requires a ${requiredTransferType} transfer proposal. The transfer.type MUST be \"${requiredTransferType}\" and must contain the exact recipe and quantities already discussed. Do not return type \"none\".` : ""}`,
      input: retry ? [...input, { role: "user", content: `Your prior result omitted the required ${requiredTransferType} transfer object. Return the complete structured transfer now; do not merely claim it is ready.` }] : input,
      reasoning: { effort: "low" },
      text: { verbosity: "medium", format: { type: "json_schema", name: "astra_reply", strict: true, schema: astraReplySchema } },
      safety_identifier: createHash("sha256").update(request.auth.uid).digest("hex"),
      max_output_tokens: 900,
    });
    let response = await createAstraResponse();
    let reply = validateAstraReply(JSON.parse(response.output_text));
    if (requiredTransferType && reply.transfer?.type !== requiredTransferType) {
      logger.warn("astra.transfer.retry", { uid: request.auth.uid, requiredTransferType });
      response = await createAstraResponse(true);
      reply = validateAstraReply(JSON.parse(response.output_text));
    }
    if (requiredTransferType && reply.transfer?.type !== requiredTransferType) {
      throw new Error(`Astra did not create the required ${requiredTransferType} transfer proposal.`);
    }
    await recordGenerationOutcome("astraGuide", "generated");
    return reply;
  } catch (error) {
    console.error("Astra Guide request failed", { status: error.status, code: error.code });
    try { await recordAiServiceIncident("astraGuide", request.auth.uid, error); }
    catch (incidentError) { logger.error("operations.incident_record.failed", { service: "astraGuide", message: incidentError?.message }); }
    await recordGenerationOutcome("astraGuide", "serviceFailed");
    throw new HttpsError("unavailable", "Astra Guide is temporarily unavailable. Please try again.");
  }
});

export const generateSmartSmoothie = onCall({ secrets: [openaiSecret], timeoutSeconds: 90, invoker: "public", enforceAppCheck }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Sign in to generate a personalized smoothie.");
  if (!request.auth.token.email_verified) throw new HttpsError("failed-precondition", "Verify your email before generating a personalized smoothie.");
  const uid = request.auth.uid;
  const entitlement = (await db.doc(`users/${uid}/private/entitlement`).get()).data();
  if (!hasKernelAccess(entitlement, "smoothies")) throw new HttpsError("permission-denied", "Smoothies Kernel access is required for AI smoothie generation.");
  const accountSnapshot = await db.doc(`users/${uid}`).get();
  const account = accountSnapshot.data() || {};
  if (!account.profile?.completedAt || !account.profile?.name) throw new HttpsError("failed-precondition", "Complete and synchronize your profile before generating.");
  const highRiskScreen = assessHighRiskNutritionProfile(account.profile);
  if (highRiskScreen.generationLimited) throw new HttpsError("failed-precondition", highRiskScreen.message);
  const [savedRecipes, generatedHistory] = await Promise.all([
    db.collection(`users/${uid}/recipes`).limit(12).get(),
    db.collection(`users/${uid}/smoothieAiHistory`).orderBy("createdAt", "desc").limit(12).get(),
  ]);
  const recentRecipes = [...generatedHistory.docs.map((item) => item.data()), ...savedRecipes.docs.map((item) => item.data())]
    .filter((item, index, all) => all.findIndex((candidate) => candidate.name === item.name) === index)
    .slice(0, 12);
  const context = buildSmoothieAiContext(account.profile, request.data || {}, recentRecipes, account.kitchen || {}, account.nutritionLabels || []);
  await consumeSmoothieRecipeGeneration(uid, entitlement);
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
      await recordGenerationOutcome("smartSmoothie", "generated");
      return { recipe: proposal, source: "openai", model: response.model || openaiModel.value() };
    } catch (error) {
      validationFeedback = `The prior proposal failed application validation: ${String(error.message || "invalid recipe").slice(0, 240)}. Create a different corrected recipe.`;
      if (attempt === 1) {
        logger.error("ai.smoothie_recipe.failed", { uid, status: error?.status, code: error?.code, message: error?.message });
        if (shouldRecordAiServiceIncident(error)) {
          try { await recordAiServiceIncident("smartSmoothie", uid, error, { attempts: 2 }); }
          catch (incidentError) { logger.error("operations.incident_record.failed", { service: "smartSmoothie", message: incidentError?.message }); }
        }
        await recordGenerationOutcome("smartSmoothie", shouldRecordAiServiceIncident(error) ? "serviceFailed" : "validationFailed");
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
  if (!hasKernelAccess(entitlement, "meals")) throw new HttpsError("permission-denied", "Meal Plans Kernel access is required for AI meal planning.");
  try { validatePlanningSelection(entitlement, request.data || {}); }
  catch (error) { throw new HttpsError("failed-precondition", error.message); }
  const account = (await db.doc(`users/${uid}`).get()).data() || {};
  if (!account.profile?.completedAt || !account.profile?.name) throw new HttpsError("failed-precondition", "Complete and synchronize your profile before generating.");
  const context = buildMealPlanContext(account.profile, { ...(request.data || {}), nutritionLabels: account.nutritionLabels || [] });
  const highRiskScreen = assessHighRiskNutritionProfile(account.profile);
  if (highRiskScreen.generationLimited) {
    throw new HttpsError("failed-precondition", highRiskScreen.message);
  }
  await consumeMealPlanGeneration(uid, entitlement);
  const client = new OpenAI({ apiKey: openaiSecret.value() });
  const recentFailureSnapshot = await db.collection(`users/${uid}/mealPlanAiFailures`).orderBy("createdAt", "desc").limit(3).get();
  const recentFailures = recentFailureSnapshot.docs.flatMap((document) => document.data().validationFailures || []).slice(0, 6);
  let feedback = recentFailures.length
    ? `Generate the requested meal plan now. Learn from these recent validator findings and do not repeat them: ${recentFailures.join(" | ")}`
    : "Generate the requested meal plan now.";
  const validationFailures = [];
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await client.responses.create({
        model: openaiModel.value(),
        instructions: buildMealPlanInstructions(context),
        input: feedback,
        reasoning: { effort: "low" },
        text: { verbosity: "medium", format: { type: "json_schema", name: "personalized_meal_plan", strict: true, schema: mealPlanSchema } },
        safety_identifier: createHash("sha256").update(uid).digest("hex"),
        max_output_tokens: context.days > 3 ? 12000 : 9000,
      });
      const plan = validateMealPlanProposal(JSON.parse(response.output_text), context);
      await db.collection(`users/${uid}/mealPlanAiHistory`).add({ goal: context.goal, days: context.days, summary: response.output_text.slice(0, 500), createdAt: FieldValue.serverTimestamp() });
      logger.info("ai.meal_plan.generated", { uid, goal: context.goal, days: context.days, attempt: attempt + 1 });
      await recordGenerationOutcome("smartMealPlan", "generated");
      return { plan, nutritionIntelligence: summarizeMealPlanIntelligence(plan, context), medicationSafety: JSON.parse(response.output_text).medicationSafety, source: "openai", model: response.model || openaiModel.value() };
    } catch (error) {
      const failureReason = String(error.message || "invalid plan").slice(0, 300);
      validationFailures.push(failureReason);
      feedback = `The prior plan failed application validation: ${failureReason}. Produce a different corrected plan. Follow every quantity format, meal order, culinary-coherence, and goal-fit requirement exactly.`;
      if (attempt === 2) {
        logger.error("ai.meal_plan.failed", { uid, goal: context.goal, status: error?.status, code: error?.code, message: error?.message, validationFailures });
        if (shouldRecordAiServiceIncident(error)) {
          try { await recordAiServiceIncident("smartMealPlan", uid, error, { attempts: 3, days: context.days, validationFailures }); }
          catch (incidentError) { logger.error("operations.incident_record.failed", { service: "smartMealPlan", message: incidentError?.message }); }
        }
        await recordGenerationOutcome("smartMealPlan", shouldRecordAiServiceIncident(error) ? "serviceFailed" : "validationFailed");
        await db.collection(`users/${uid}/mealPlanAiFailures`).add({
          goal: context.goal,
          days: context.days,
          validationFailures,
          createdAt: FieldValue.serverTimestamp(),
        });
        throw new HttpsError("unavailable", "Astra could not produce a meal plan that passed every validation check. No substitute plan was created.", { reason: "validation-failed", attempts: 3 });
      }
    }
  }
  throw new HttpsError("unavailable", "AI meal planning is temporarily unavailable.");
});

export const generateMealPlanVisuals = onCall({ secrets: [openaiSecret], timeoutSeconds: 300, memory: "1GiB", invoker: "public", enforceAppCheck }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Sign in to generate meal visuals.");
  if (!request.auth.token.email_verified) throw new HttpsError("failed-precondition", "Verify your email before generating meal visuals.");
  const entitlement = (await db.doc(`users/${request.auth.uid}/private/entitlement`).get()).data();
  if (!hasKernelAccess(entitlement, "meals")) throw new HttpsError("permission-denied", "Meal Plans Kernel access is required for personalized meal visuals.");
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
  if (!hasKernelAccess(entitlement, "smoothies")) throw new HttpsError("permission-denied", "Smoothies Kernel access is required for personalized smoothie visuals.");
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
  await db.runTransaction(async (transaction) => {
    const [existingRequest, householdSnapshot] = await Promise.all([
      transaction.get(requestRef), transaction.get(householdRef),
    ]);
    if (existingRequest.data()?.status === "blocked") throw new HttpsError("permission-denied", "This subscriber has blocked the family access request.");
    const household = householdSnapshot.data() || {};
    const memberUids = Array.isArray(household.memberUids) ? household.memberUids : [];
    if (memberUids.includes(request.auth.uid)) return;
    if (memberUids.length >= VIP_FAMILY_SEAT_LIMIT) throw new HttpsError("resource-exhausted", "This V.I.P. household already has two family members.");
    if (!household.ownerUid) transaction.set(householdRef, { ownerUid: owner.uid, ownerEmail, foundingNumber: ownerEntitlement.foundingVipNumber || null, memberUids, createdAt: FieldValue.serverTimestamp() }, { merge: true });
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

export const requestHouseholdKitchenLink = onCall({ invoker: "public", enforceAppCheck }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Sign in before connecting a household pantry.");
  const requesterEmail = String(request.auth.token.email || "").trim().toLowerCase();
  const recipientEmail = String(request.data?.email || "").trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(recipientEmail)) throw new HttpsError("invalid-argument", "Enter the family member's account email.");
  if (recipientEmail === requesterEmail) throw new HttpsError("invalid-argument", "Choose a different account.");
  let recipient;
  try { recipient = await getAuth().getUserByEmail(recipientEmail); }
  catch { throw new HttpsError("not-found", "No verified Nature's Elixirz account was found for that email."); }
  if (!recipient.emailVerified) throw new HttpsError("failed-precondition", "The family member must verify their email first.");
  const participantUids = [request.auth.uid, recipient.uid].sort();
  const participantEmails = participantUids.map((uid) => uid === request.auth.uid ? requesterEmail : recipientEmail);
  const linkRef = db.doc(`householdKitchenLinks/${participantUids.join("_")}`);
  await db.runTransaction(async (transaction) => {
    const existing = (await transaction.get(linkRef)).data() || {};
    if (existing.status === "blocked" && existing.blockedBy === recipient.uid) throw new HttpsError("permission-denied", "This pantry connection cannot be requested.");
    transaction.set(linkRef, {
      participantUids, participantEmails, requesterUid: request.auth.uid, requesterEmail,
      recipientUid: recipient.uid, recipientEmail, status: "pending",
      createdAt: existing.createdAt || FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
  });
  await db.collection("mail").add({
    to: [recipientEmail], category: "household-kitchen-request", accountUid: recipient.uid,
    message: {
      subject: "Household pantry connection request",
      text: `${requesterEmail} invited you to share Smoothie and Meal Plan pantry inventories in Nature's Elixirz. Sign in and open Account Vault to approve or decline. No health profile, medication, recipe, or activity data will be shared.`,
    }, createdAt: FieldValue.serverTimestamp(),
  });
  return { status: "pending", message: "Pantry request sent. Synchronization begins only after the family member approves it." };
});

export const getHouseholdKitchenLinks = onCall({ invoker: "public", enforceAppCheck }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Sign in to view household pantry connections.");
  const snapshot = await db.collection("householdKitchenLinks").where("participantUids", "array-contains", request.auth.uid).get();
  return { links: snapshot.docs.map((document) => publicKitchenLink(document, request.auth.uid)) };
});

export const manageHouseholdKitchenLink = onCall({ invoker: "public", enforceAppCheck }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Sign in to manage a household pantry connection.");
  const linkId = String(request.data?.linkId || "").trim();
  const action = String(request.data?.action || "");
  if (!linkId || !["approve", "block", "disconnect"].includes(action)) throw new HttpsError("invalid-argument", "Choose a valid pantry action.");
  const linkRef = db.doc(`householdKitchenLinks/${linkId}`);
  const linkSnapshot = await linkRef.get();
  const link = linkSnapshot.data();
  if (!link || !link.participantUids?.includes(request.auth.uid)) throw new HttpsError("permission-denied", "That pantry connection does not belong to this account.");
  if (["approve", "block"].includes(action) && link.recipientUid !== request.auth.uid) throw new HttpsError("permission-denied", "Only the invited family member can decide this request.");
  if (action === "approve") {
    const [activeForRequester, activeForRecipient, requesterSnapshot, recipientSnapshot] = await Promise.all([
      db.collection("householdKitchenLinks").where("participantUids", "array-contains", link.requesterUid).get(),
      db.collection("householdKitchenLinks").where("participantUids", "array-contains", link.recipientUid).get(),
      db.doc(`users/${link.requesterUid}`).get(), db.doc(`users/${link.recipientUid}`).get(),
    ]);
    const conflicting = [...activeForRequester.docs, ...activeForRecipient.docs]
      .find((document) => document.id !== linkId && document.data()?.status === "active");
    if (conflicting) throw new HttpsError("failed-precondition", "One of these accounts already has an active pantry connection. Disconnect it first.");
    const requester = requesterSnapshot.data() || {};
    const recipient = recipientSnapshot.data() || {};
    const kitchen = mergeKitchens(requester.kitchen, recipient.kitchen);
    const mealKitchen = mergeKitchens(requester.mealKitchen, recipient.mealKitchen);
    const version = randomUUID();
    const batch = db.batch();
    batch.set(linkRef, { status: "active", approvedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(), lastSyncVersion: version }, { merge: true });
    for (const uid of link.participantUids) batch.set(db.doc(`users/${uid}`), {
      kitchen, mealKitchen, householdKitchenSync: { source: "household-link", linkId, version, synchronizedAt: FieldValue.serverTimestamp() },
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    await batch.commit();
    return { status: "active" };
  }
  await linkRef.set({
    status: action === "block" ? "blocked" : "disconnected",
    ...(action === "block" ? { blockedBy: request.auth.uid } : { disconnectedBy: request.auth.uid }),
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
  return { status: action === "block" ? "blocked" : "disconnected" };
});

export const syncHouseholdKitchenLinks = onDocumentUpdated("users/{uid}", async (event) => {
  const before = event.data?.before.data() || {};
  const after = event.data?.after.data() || {};
  if (!kitchensChanged(before, after)) return;
  if (before.householdKitchenSync?.version !== after.householdKitchenSync?.version
    && after.householdKitchenSync?.source === "household-link") return;
  const links = await db.collection("householdKitchenLinks")
    .where("participantUids", "array-contains", event.params.uid).get();
  if (links.empty) return;
  for (const linkSnapshot of links.docs) {
    const link = linkSnapshot.data() || {};
    if (link.status !== "active") continue;
    const otherUid = (link.participantUids || []).find((uid) => uid !== event.params.uid);
    if (!otherUid) continue;
    const version = randomUUID();
    const batch = db.batch();
    batch.set(db.doc(`users/${otherUid}`), {
      kitchen: cleanKitchen(after.kitchen), mealKitchen: cleanKitchen(after.mealKitchen),
      householdKitchenSync: { source: "household-link", linkId: linkSnapshot.id, version, synchronizedAt: FieldValue.serverTimestamp() },
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    batch.set(linkSnapshot.ref, {
      lastSyncedBy: event.params.uid, lastSyncVersion: version, lastSyncedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    await batch.commit();
  }
});

async function reserveFoundingVip(uid) {
  const counterRef = db.doc("subscriptionMetrics/vipFounding");
  const reservationRef = db.doc(`vipFoundingReservations/${uid}`);
  return db.runTransaction(async (transaction) => {
    const [counterSnapshot, reservationSnapshot] = await Promise.all([
      transaction.get(counterRef), transaction.get(reservationRef),
    ]);
    const existing = reservationSnapshot.data();
    const now = Date.now();
    if (existing?.status === "pending" && Number(existing.expiresAt?.toMillis?.() || 0) > now) return { foundingVip: true, foundingVipNumber: Number(existing.number) };
    if (existing?.status === "redeemed") return { foundingVip: false, foundingVipNumber: null };
    const completed = Number(counterSnapshot.data()?.completed || 0);
    const reserved = Math.max(0, Number(counterSnapshot.data()?.reserved || 0) - (existing?.status === "pending" ? 1 : 0));
    if (completed + reserved >= VIP_FAMILY_OFFER_LIMIT) return { foundingVip: false, foundingVipNumber: null };
    const number = completed + reserved + 1;
    transaction.set(counterRef, { completed, reserved: reserved + 1, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    transaction.set(reservationRef, { uid, number, status: "pending", expiresAt: Timestamp.fromMillis(now + 35 * 60 * 1000), createdAt: existing?.createdAt || FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
    return { foundingVip: true, foundingVipNumber: number };
  });
}

async function releaseFoundingVipReservation(uid) {
  const counterRef = db.doc("subscriptionMetrics/vipFounding");
  const reservationRef = db.doc(`vipFoundingReservations/${uid}`);
  await db.runTransaction(async (transaction) => {
    const [counterSnapshot, reservationSnapshot] = await Promise.all([transaction.get(counterRef), transaction.get(reservationRef)]);
    if (reservationSnapshot.data()?.status !== "pending") return;
    transaction.set(counterRef, { reserved: Math.max(0, Number(counterSnapshot.data()?.reserved || 0) - 1), updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    transaction.set(reservationRef, { status: "released", updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  });
}

export const createCheckoutSession = onCall({ secrets: [stripeSecret, stripePrices], invoker: "public", enforceAppCheck }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Sign in before checkout.");
  if (!request.auth.token.email_verified) throw new HttpsError("failed-precondition", "Verify your email before checkout.");
  const { tierId, billingMode, kernelIds } = request.data || {};
  let selectedKernels;
  try { selectedKernels = validateKernelSelection(tierId, kernelIds); } catch (error) { throw new HttpsError("invalid-argument", error.message); }
  let key;
  try { key = priceKey(tierId, billingMode); } catch { throw new HttpsError("invalid-argument", "Invalid subscription selection."); }
  const prices = stripePrices.value();

  const stripe = new Stripe(stripeSecret.value());
  const entitlement = (await db.doc(`users/${request.auth.uid}/private/entitlement`).get()).data() || {};
  if (entitlement.stripeSubscriptionId && ["active", "trialing", "past_due"].includes(entitlement.status)) {
    throw new HttpsError("already-exists", "You already have a subscription. Use Manage billing to change or cancel it.");
  }
  const founding = Number(tierId) === 5 ? await reserveFoundingVip(request.auth.uid) : { foundingVip: false, foundingVipNumber: null };
  if (founding.foundingVip) key = priceKey(4, billingMode);
  const price = prices[key];
  if (!price) throw new HttpsError("failed-precondition", "Stripe price is not configured.");
  const subscriptionMetadata = {
    firebaseUid: request.auth.uid,
    tierId: String(tierId),
    foundingVip: String(founding.foundingVip),
    foundingVipNumber: founding.foundingVipNumber ? String(founding.foundingVipNumber) : "",
    kernelIds: selectedKernels.join(","),
  };
  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price, quantity: 1 }],
      ...(entitlement.stripeCustomerId ? { customer: entitlement.stripeCustomerId } : { customer_email: request.auth.token.email }),
      client_reference_id: request.auth.uid,
      subscription_data: { metadata: subscriptionMetadata },
      metadata: subscriptionMetadata,
      success_url: `${appUrl.value()}/premium?checkout=success`,
      cancel_url: `${appUrl.value()}/premium?checkout=cancelled`,
      expires_at: Math.floor(Date.now() / 1000) + 35 * 60,
      allow_promotion_codes: true,
    });
    return { url: session.url };
  } catch (error) {
    if (founding.foundingVip) await releaseFoundingVipReservation(request.auth.uid);
    throw error;
  }
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

export const stageKernelSelection = onCall({ secrets: [stripeSecret], invoker: "public", enforceAppCheck }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Sign in before changing Kernels.");
  const { tierId, kernelIds } = request.data || {};
  let kernels;
  try { kernels = validateKernelSelection(tierId, kernelIds); } catch (error) { throw new HttpsError("invalid-argument", error.message); }
  const entitlement = (await db.doc(`users/${request.auth.uid}/private/entitlement`).get()).data() || {};
  if (entitlement.accessSource !== "stripe" || !entitlement.stripeSubscriptionId) throw new HttpsError("failed-precondition", "An active Stripe membership is required.");
  if (Number(entitlement.tier) === Number(tierId)) {
    const stripe = new Stripe(stripeSecret.value());
    await stripe.subscriptions.update(entitlement.stripeSubscriptionId, { metadata: { kernelIds: kernels.join(",") } });
    await db.doc(`users/${request.auth.uid}/private/entitlement`).set({ kernels, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    return { staged: false, applied: true, entitlement: { ...entitlement, tier: Number(tierId), kernels } };
  }
  await db.doc(`users/${request.auth.uid}/private/pendingKernelSelection`).set({ tier: Number(tierId), kernels, createdAt: FieldValue.serverTimestamp() });
  return { staged: true, tier: Number(tierId), kernels };
});

async function recordSubscriptionCounts(uid, subscription, tier) {
  const metricsRef = db.doc("subscriptionMetrics/tierCounts");
  const ledgerRef = db.doc(`subscriptionLedger/${subscription.id}`);
  await db.runTransaction(async (transaction) => {
    const [metricsSnapshot, ledgerSnapshot] = await Promise.all([transaction.get(metricsRef), transaction.get(ledgerRef)]);
    const metrics = metricsSnapshot.data() || {};
    const ledger = ledgerSnapshot.data() || {};
    const activeByTier = { ...(metrics.activeByTier || {}) };
    const cumulativeSignupsByTier = { ...(metrics.cumulativeSignupsByTier || {}) };
    const wasCounted = Boolean(ledger.counted);
    const previousTier = Number(ledger.tier || 0);
    const isCounted = ["active", "trialing"].includes(subscription.status) && tier > 0;
    if (wasCounted && (!isCounted || previousTier !== tier)) activeByTier[String(previousTier)] = Math.max(0, Number(activeByTier[String(previousTier)] || 0) - 1);
    if (isCounted && (!wasCounted || previousTier !== tier)) activeByTier[String(tier)] = Number(activeByTier[String(tier)] || 0) + 1;
    const everTiers = Array.isArray(ledger.everTiers) ? ledger.everTiers.map(Number) : [];
    if (isCounted && !everTiers.includes(tier)) {
      cumulativeSignupsByTier[String(tier)] = Number(cumulativeSignupsByTier[String(tier)] || 0) + 1;
      everTiers.push(tier);
    }
    transaction.set(metricsRef, { activeByTier, cumulativeSignupsByTier, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    transaction.set(ledgerRef, { uid, tier, status: subscription.status, counted: isCounted, everTiers, customerId: String(subscription.customer), updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  });
}

async function redeemFoundingVipReservation(uid, subscriptionId) {
  const counterRef = db.doc("subscriptionMetrics/vipFounding");
  const reservationRef = db.doc(`vipFoundingReservations/${uid}`);
  await db.runTransaction(async (transaction) => {
    const [counterSnapshot, reservationSnapshot] = await Promise.all([transaction.get(counterRef), transaction.get(reservationRef)]);
    if (reservationSnapshot.data()?.status !== "pending") return;
    const counter = counterSnapshot.data() || {};
    transaction.set(counterRef, {
      completed: Number(counter.completed || 0) + 1,
      reserved: Math.max(0, Number(counter.reserved || 0) - 1),
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    transaction.set(reservationRef, { status: "redeemed", subscriptionId, redeemedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  });
}

async function writeEntitlement(uid, subscription, prices) {
  const priceId = subscription.items?.data?.[0]?.price?.id;
  const metadataTier = Number(subscription.metadata?.tierId || 0);
  const mappedTier = tierFromPrice(priceId, prices);
  const tier = subscription.metadata?.foundingVip === "true" ? 5 : (mappedTier || ([1, 2, 3, 4, 5].includes(metadataTier) ? metadataTier : 0));
  const billingMode = billingModeFromPrice(priceId, prices);
  const foundingVip = tier === 5 && subscription.metadata?.foundingVip === "true";
  const foundingVipNumber = foundingVip ? Number(subscription.metadata?.foundingVipNumber || 0) || null : null;
  const pendingRef = db.doc(`users/${uid}/private/pendingKernelSelection`);
  const pendingSnapshot = await pendingRef.get();
  const pending = pendingSnapshot.data() || {};
  const pendingKernels = sanitizeKernelIds(pending.kernels);
  const metadataKernels = sanitizeKernelIds(String(subscription.metadata?.kernelIds || "").split(",").filter(Boolean));
  const explicitKernels = Number(pending.tier) === tier && pendingKernels.length === tier ? pendingKernels : metadataKernels;
  const kernels = tier === 5 ? ["smoothies", "frequencies", "meals", "movement", "vip"] : explicitKernels;
  if (Number(pending.tier) === tier && pendingKernels.length === tier) {
    const stripe = new Stripe(stripeSecret.value());
    await stripe.subscriptions.update(subscription.id, { metadata: { kernelIds: kernels.join(",") } });
  }
  if (!tier) {
    console.error("Stripe subscription price is not mapped to a Nature's Elixirz tier", { priceId, subscriptionId: subscription.id });
  }
  const nextEntitlement = {
    tier,
    status: tier ? subscription.status : "inactive",
    stripeCustomerId: String(subscription.customer),
    stripeSubscriptionId: subscription.id,
    priceId,
    billingMode,
    currentPeriodStart: subscription.items?.data?.[0]?.current_period_start || subscription.start_date || null,
    currentPeriodEnd: subscription.items?.data?.[0]?.current_period_end || null,
    cancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end),
    cancelAt: subscription.cancel_at || null,
    canceledAt: subscription.canceled_at || null,
    accessSource: "stripe",
    householdCircleIncluded: tier === 5,
    foundingVip,
    foundingVipNumber,
    kernels,
    updatedAt: FieldValue.serverTimestamp(),
  };
  await db.doc(`users/${uid}/private/entitlement`).set(nextEntitlement, { merge: true });
  if (tier === 5 || (Number(pending.tier) === tier && pendingKernels.length === tier)) await pendingRef.delete();
  await recordSubscriptionCounts(uid, subscription, tier);
  if (foundingVip && ["active", "trialing"].includes(subscription.status)) await redeemFoundingVipReservation(uid, subscription.id);
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
  if (event.type === "checkout.session.expired") {
    const session = event.data.object;
    if (session.client_reference_id && session.metadata?.foundingVip === "true") await releaseFoundingVipReservation(session.client_reference_id);
  }
  if (["customer.subscription.created", "customer.subscription.updated", "customer.subscription.deleted", "customer.subscription.paused", "customer.subscription.resumed"].includes(event.type)) {
    const subscription = event.data.object;
    const uid = subscription.metadata?.firebaseUid;
    if (uid) await writeEntitlement(uid, subscription, prices);
  }
  response.status(200).send("ok");
});

async function acquireOperationLease(operationId, leaseMinutes = 30) {
  const operationRef = db.doc(`systemOperations/${operationId}`);
  const now = Date.now();
  return db.runTransaction(async (transaction) => {
    const current = (await transaction.get(operationRef)).data() || {};
    if (Number(current.leaseUntil || 0) > now) return null;
    const runId = randomUUID();
    transaction.set(operationRef, {
      runId, status: "running", startedAt: FieldValue.serverTimestamp(),
      leaseUntil: now + leaseMinutes * 60 * 1000,
    }, { merge: true });
    return { operationRef, runId };
  });
}

async function finishOperation(lease, result) {
  if (!lease) return;
  await lease.operationRef.set({
    ...result, status: result.status || "completed", leaseUntil: 0,
    completedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
}

async function queueOperationsAlert(id, subject, text) {
  await db.doc(`mail/${id}`).set({
    to: ["support@natureselixirz.com"], message: { subject, text },
    category: "operations-autonomy-alert", createdAt: FieldValue.serverTimestamp(),
  }, { merge: false });
}

async function recordAiServiceIncident(service, uid, error, context = {}) {
  const fingerprint = createHash("sha256")
    .update(`${service}:${String(error?.code || error?.status || "unknown")}:${new Date().toISOString().slice(0, 13)}`)
    .digest("hex").slice(0, 24);
  const incidentRef = db.doc(`systemIncidents/${service}-${fingerprint}`);
  await db.runTransaction(async (transaction) => {
    const existing = await transaction.get(incidentRef);
    transaction.set(incidentRef, {
      service, status: "open", occurrenceCount: FieldValue.increment(1),
      affectedSubscriberHashes: FieldValue.arrayUnion(createHash("sha256").update(uid).digest("hex").slice(0, 20)),
      errorCode: String(error?.code || error?.status || "unknown").slice(0, 100),
      errorMessage: String(error?.message || "Service request failed").slice(0, 300),
      context, ...(!existing.exists ? { firstObservedAt: FieldValue.serverTimestamp() } : {}),
      lastObservedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
  });
}

async function deactivateMissingStripeSubscription(document) {
  const record = document.data() || {};
  const uid = record.uid;
  if (!uid) return;
  const metricsRef = db.doc("subscriptionMetrics/tierCounts");
  const entitlementRef = db.doc(`users/${uid}/private/entitlement`);
  await db.runTransaction(async (transaction) => {
    const [metricsSnapshot, entitlementSnapshot] = await Promise.all([
      transaction.get(metricsRef), transaction.get(entitlementRef),
    ]);
    const entitlement = entitlementSnapshot.data() || {};
    if (entitlement.stripeSubscriptionId && entitlement.stripeSubscriptionId !== document.id) return;
    const metrics = metricsSnapshot.data() || {};
    const activeByTier = { ...(metrics.activeByTier || {}) };
    if (record.counted && Number(record.tier || 0) > 0) {
      activeByTier[String(record.tier)] = Math.max(0, Number(activeByTier[String(record.tier)] || 0) - 1);
    }
    transaction.set(metricsRef, { activeByTier, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    transaction.set(document.ref, { counted: false, status: "missing", updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    transaction.set(entitlementRef, {
      tier: 0, status: "inactive", accessSource: "stripe-reconciliation-missing",
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
  });
}

export const reconcileStripeEntitlements = onSchedule({
  schedule: "every 12 hours", timeZone: "America/New_York", timeoutSeconds: 540,
  secrets: [stripeSecret, stripePrices], retryCount: 1,
}, async () => {
  const lease = await acquireOperationLease("stripeEntitlementReconciliation", 45);
  if (!lease) return;
  const stripe = new Stripe(stripeSecret.value());
  const ledgerSnapshot = await db.collection("subscriptionLedger").limit(500).get();
  const records = ledgerSnapshot.docs.filter((document) => shouldReconcileLedger({ id: document.id, ...document.data() }));
  let repaired = 0;
  let missing = 0;
  const failures = [];
  for (let index = 0; index < records.length; index += 5) {
    await Promise.all(records.slice(index, index + 5).map(async (document) => {
      try {
        const subscription = await stripe.subscriptions.retrieve(document.id);
        await writeEntitlement(document.data().uid, subscription, stripePrices.value());
        repaired += 1;
      } catch (error) {
        if (error?.code === "resource_missing") {
          await deactivateMissingStripeSubscription(document);
          missing += 1;
          return;
        }
        failures.push({ subscriptionId: document.id, code: String(error?.code || "unknown") });
      }
    }));
  }
  const result = { status: failures.length ? "attention-required" : "healthy", inspected: records.length, repaired, missing, failures: failures.slice(0, 20) };
  await finishOperation(lease, result);
  if (failures.length) {
    const slot = new Date().toISOString().slice(0, 13).replace(/[-T]/g, "");
    await queueOperationsAlert(`stripe-reconciliation-${slot}`, "Stripe entitlement reconciliation requires attention",
      `${failures.length} subscription record(s) could not be reconciled. Inspected: ${records.length}. Review systemOperations/stripeEntitlementReconciliation and Cloud Function logs.`);
  }
  logger.info("billing.reconciliation.completed", result);
});

async function firestoreApiGet(path) {
  const auth = new GoogleAuth({ scopes: ["https://www.googleapis.com/auth/cloud-platform"] });
  const client = await auth.getClient();
  const { token } = await client.getAccessToken();
  const response = await fetch(`https://firestore.googleapis.com/v1/${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error(`Firestore Admin API returned ${response.status}`);
  return response.json();
}

export const validateFirestoreBackupReadiness = onSchedule({
  schedule: "every 12 hours", timeZone: "America/New_York", timeoutSeconds: 120, retryCount: 1,
}, async () => {
  const lease = await acquireOperationLease("firestoreBackupValidation", 15);
  if (!lease) return;
  const projectId = process.env.GCLOUD_PROJECT || "natures-elixirz-os";
  const databaseName = `projects/${projectId}/databases/(default)`;
  try {
    const payload = await firestoreApiGet(`projects/${projectId}/locations/nam5/backups?pageSize=100`);
    const readiness = backupReadiness(payload.backups || [], databaseName);
    const status = {
      status: readiness.healthy ? "healthy" : "attention-required",
      reason: readiness.reason, latestBackup: readiness.backup?.name || null,
      snapshotTime: readiness.backup?.snapshotTime || null,
      expireTime: readiness.backup?.expireTime || null,
      ageHours: readiness.ageHours == null ? null : Math.round(readiness.ageHours * 10) / 10,
      restoreTargetPolicy: "new-isolated-database-only",
    };
    await finishOperation(lease, status);
    if (!readiness.healthy) {
      const day = new Date().toISOString().slice(0, 10).replaceAll("-", "");
      await queueOperationsAlert(`firestore-backup-${day}-${readiness.reason}`,
        "Firestore backup readiness requires attention",
        `Backup validation reported ${readiness.reason}. Production was not modified. Review systemOperations/firestoreBackupValidation and the Firestore Disaster Recovery console.`);
    }
    logger.info("recovery.firestore_backup.validated", status);
  } catch (error) {
    await finishOperation(lease, { status: "failed", reason: String(error?.message || error).slice(0, 300) });
    throw error;
  }
});

export const monitorAutonomyHealth = onSchedule({
  schedule: "every 6 hours", timeZone: "America/New_York", timeoutSeconds: 120, retryCount: 1,
}, async () => {
  const lease = await acquireOperationLease("autonomyHealthMonitor", 15);
  if (!lease) return;
  try {
    const metricDay = new Date().toISOString().slice(0, 10);
    const [stripeSnapshot, backupSnapshot, incidentSnapshot, failedMailSnapshot, generationMetricSnapshot] = await Promise.all([
      db.doc("systemOperations/stripeEntitlementReconciliation").get(),
      db.doc("systemOperations/firestoreBackupValidation").get(),
      db.collection("systemIncidents").where("status", "==", "open").limit(100).get(),
      db.collection("mail").where("autonomy.action", "==", "alert").limit(100).get(),
      db.doc(`systemMetrics/generation-${metricDay}`).get(),
    ]);
    const generationReliability = assessGenerationReliability(generationMetricSnapshot.data() || {});
    const summary = summarizeAutonomyHealth({
      operations: {
        stripeEntitlementReconciliation: stripeSnapshot.data() || {},
        firestoreBackupValidation: backupSnapshot.data() || {},
      },
      unresolvedIncidents: incidentSnapshot.size,
      failedMail: failedMailSnapshot.size,
      generationReliability,
    });
    await finishOperation(lease, summary);
    if (summary.status === "attention-required") {
      const slot = new Date().toISOString().slice(0, 13).replace(/[-T]/g, "");
      await queueOperationsAlert(`autonomy-health-${slot}`,
        "Nature's Elixirz autonomy health requires attention",
        `The autonomous health monitor found:\n\n- ${summary.attention.join("\n- ")}\n\nReview systemOperations/autonomyHealthMonitor, systemIncidents, and failed mail records. Subscriber health data is not included in this alert.`);
    }
    logger.info("operations.autonomy_health.completed", summary);
  } catch (error) {
    await finishOperation(lease, { status: "failed", reason: String(error?.message || error).slice(0, 300) });
    throw error;
  }
});
