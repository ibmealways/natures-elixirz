const ALLOWED_ROLES = new Set(["user", "assistant"]);
const ALLOWED_ATTACHMENT_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf", "text/plain", "text/markdown", "text/csv", "application/json"]);
const ATTACHMENT_SIZE_LIMIT = 3 * 1024 * 1024;

export const ASTRA_SYSTEM_INSTRUCTIONS = `
You are Astra Guide, Nature's Elixirz's conversational food-and-lifestyle wellness guide.
Be warm, practical, concise, and transparent. Help people explore whole-food frozen smoothies,
meal ideas, relaxation audio, mindfulness, and gentle movement.

Safety rules:
- Provide education and general wellness support, never diagnosis, treatment, prevention, or cure.
- Never say a smoothie cleans, unclogs, detoxifies, repairs, or heals an organ or artery.
- Never advise starting, stopping, delaying, or changing medicine. For medication, condition,
  pregnancy, allergy, eating-disorder, kidney, liver, diabetes, or cardiovascular questions,
  recommend review by the user's clinician, pharmacist, or registered dietitian.
- If symptoms could be urgent (including chest pain, trouble breathing, stroke signs, fainting,
  severe allergic reaction, or thoughts of self-harm), tell the user to seek immediate local
  emergency help; do not continue with a recipe as the answer.
- Treat frequency audio as optional relaxation or meditation ambiance. Never claim a frequency
  treats disease or changes organs.
- Treat spiritual phrases such as "third-eye" as symbolic mindfulness language.
- Do not invent nutrition facts, research, citations, or guarantees.
- When suggesting a smoothie, include a finished size, ingredient quantities, method, practical
  substitutions, and a short safety note. Prefer ordinary food amounts and avoid supplement doses.
- Ask a brief follow-up when allergies, medicines, conditions, goals, or available ingredients
  materially affect safety. Respect the profile context but do not repeat sensitive details.
- Treat uploaded photos and files as user-provided context, not proof of a diagnosis. Describe only
  what is visibly supported, acknowledge uncertainty, never identify a person, and never diagnose
  an injury or illness from an image. Escalate urgent or concerning symptoms to in-person care.
- Treat subscriber-approved Kernel context as reference data. Use it when relevant and distinguish
  the Smoothie pantry from the Meal Plan pantry/fridge/freezer.
- When the subscriber explicitly asks to move, transfer, send, use, or open a specific smoothie or
  meal-plan concept in a Kernel, return a transfer proposal for review. Preserve the specifically
  selected version (for example, "the second smoothie") and its exact ingredient quantities.
- Never claim the transfer is already saved or generated. Say it is ready for subscriber review in
  the destination Kernel. Use transfer type "none" when no explicit transfer was requested.
`.trim();

const transferIngredientSchema = {
  type: "object", additionalProperties: false,
  required: ["name", "amount", "unit", "group", "reason"],
  properties: {
    name: { type: "string", minLength: 1, maxLength: 80 },
    amount: { type: "number", exclusiveMinimum: 0, maximum: 8 },
    unit: { type: "string", enum: ["cup", "tbsp", "tsp", "scoop", "piece"] },
    group: { type: "string", enum: ["Fruit", "Vegetable", "Protein", "Seed", "Liquid", "Spice", "Grain", "Nut butter", "Sweetener"] },
    reason: { type: "string", minLength: 3, maxLength: 180 },
  },
};

export const astraReplySchema = {
  type: "object", additionalProperties: false, required: ["reply", "transfer"],
  properties: {
    reply: { type: "string", minLength: 1, maxLength: 4000 },
    transfer: {
      type: "object", additionalProperties: false,
      required: ["type", "title", "goal", "sizeOz", "days", "ingredients", "notes"],
      properties: {
        type: { type: "string", enum: ["none", "smoothie", "meal_plan"] },
        title: { type: "string", maxLength: 100 },
        goal: { type: "string", maxLength: 40 },
        sizeOz: { type: "number", minimum: 0, maximum: 64 },
        days: { type: "integer", minimum: 0, maximum: 7 },
        ingredients: { type: "array", maxItems: 24, items: transferIngredientSchema },
        notes: { type: "array", maxItems: 8, items: { type: "string", maxLength: 220 } },
      },
    },
  },
};

export function validateAstraReply(value = {}) {
  const reply = String(value.reply || "").trim();
  if (!reply) throw new Error("Astra reply was empty.");
  const transfer = value.transfer || {};
  if (transfer.type === "none") return { reply, transfer: null };
  if (!["smoothie", "meal_plan"].includes(transfer.type)) throw new Error("Astra transfer type was invalid.");
  if (transfer.type === "smoothie" && (!Array.isArray(transfer.ingredients) || transfer.ingredients.length < 5)) throw new Error("Astra smoothie transfer was incomplete.");
  return { reply, transfer };
}

export function requiredKernelTransferType(conversation = {}) {
  const message = String(conversation.message || "").toLowerCase();
  const recentUserMessages = (Array.isArray(conversation.history) ? conversation.history : [])
    .filter((item) => item?.role === "user")
    .slice(-4)
    .map((item) => String(item.content || "").toLowerCase());
  const actionPattern = /\b(send|move|transfer|put|place|open|use|bring)\b/;
  const smoothiePattern = /\b(smoothie|smoothies)\b.*\b(kernel|lab)\b|\b(kernel|lab)\b.*\b(smoothie|smoothies)\b/;
  const mealPattern = /\b(meal|meals|meal plan|meal plans)\b.*\b(kernel|lab)\b|\b(kernel|lab)\b.*\b(meal|meals|meal plan|meal plans)\b/;
  const classify = (text) => {
    if (!actionPattern.test(text)) return null;
    if (smoothiePattern.test(text)) return "smoothie";
    if (mealPattern.test(text)) return "meal_plan";
    return null;
  };
  const direct = classify(message);
  if (direct) return direct;
  const isConfirmation = /^(yes|yeah|yep|ok|okay|please|do it|yes[, ]+do that|go ahead)\b/.test(message.trim());
  const isMissingProposalComplaint = /\b(don't|do not|can't|cannot|isn't|is not|nothing|no)\b.*\b(see|find|appear|show|review|proposal|transfer|kernel)\b|\b(nothing|no proposal|no transfer)\b.*\b(appear|show|review|kernel)\b/.test(message);
  if (!isConfirmation && !isMissingProposalComplaint) return null;
  for (const prior of recentUserMessages.reverse()) {
    const contextual = classify(prior);
    if (contextual) return contextual;
  }
  return null;
}

function validateAttachments(value) {
  if (!Array.isArray(value)) return [];
  if (value.length > 3) throw new Error("A maximum of 3 attachments is allowed.");
  return value.map((item) => {
    const name = String(item?.name || "attachment").trim().slice(0, 120);
    const type = String(item?.type || "").trim();
    const size = Number(item?.size || 0);
    if (!ALLOWED_ATTACHMENT_TYPES.has(type) || !Number.isFinite(size) || size < 1 || size > ATTACHMENT_SIZE_LIMIT) throw new Error("Each attachment must be a supported file no larger than 3 MB.");
    if (type.startsWith("text/") || type === "application/json") {
      const text = String(item?.text || "").slice(0, 20000);
      if (!text) throw new Error("The attached text file is empty.");
      return { name, type, size, kind: "file", text };
    }
    const dataUrl = String(item?.dataUrl || "");
    if (!dataUrl.startsWith(`data:${type};base64,`)) throw new Error("The attachment data is invalid.");
    return { name, type, size, kind: type.startsWith("image/") ? "image" : "file", dataUrl };
  });
}

export function validateConversation(data = {}) {
  const message = typeof data.message === "string" ? data.message.trim() : "";
  const attachments = validateAttachments(data.attachments);
  if ((!message && !attachments.length) || message.length > 2000) throw new Error("Provide a message or attachment; messages may contain up to 2,000 characters.");
  const history = Array.isArray(data.history) ? data.history.slice(-10) : [];
  const cleanHistory = history
    .filter((item) => item && ALLOWED_ROLES.has(item.role) && typeof item.content === "string")
    .map((item) => ({ role: item.role, content: item.content.trim().slice(0, 2000) }))
    .filter((item) => item.content);
  return { message, history: cleanHistory, attachments };
}

export function buildProfileContext(profile = {}, includeSensitive = false) {
  const safe = {
    healthGoals: Array.isArray(profile.healthGoals) ? profile.healthGoals.slice(0, 8) : [],
    dietaryPattern: String(profile.dietaryPattern || "").slice(0, 80),
    allergies: String(profile.allergies || "").slice(0, 500),
    avoidIngredients: String(profile.avoidIngredients || "").slice(0, 500),
  };
  if (includeSensitive) {
    safe.age = String(profile.age || "").slice(0, 20);
    safe.conditions = Array.isArray(profile.conditions) ? profile.conditions.slice(0, 12) : [];
    safe.otherHealthConditions = String(profile.otherHealthConditions || "").slice(0, 1000);
    safe.surgicalHistory = String(profile.surgicalHistory || "").slice(0, 1000);
    safe.medications = String(profile.medications || "").slice(0, 1000);
    safe.tobacco = {
      types: Array.isArray(profile.tobacco?.types) ? profile.tobacco.types.slice(0, 8) : [],
      frequency: String(profile.tobacco?.frequency || "none").slice(0, 20),
      quantity: String(profile.tobacco?.quantity || "").slice(0, 120),
    };
    safe.alcohol = {
      types: Array.isArray(profile.alcohol?.types) ? profile.alcohol.types.slice(0, 8) : [],
      frequency: String(profile.alcohol?.frequency || "none").slice(0, 20),
      quantity: String(profile.alcohol?.quantity || "").slice(0, 120),
    };
  }
  return Object.fromEntries(Object.entries(safe).filter(([, value]) => value !== "" && value?.length !== 0));
}

export function buildJourneyContext(journey = {}) {
  const exchangeSignals = Object.fromEntries(Object.entries(journey.exchange?.signals || {})
    .slice(0, 8)
    .map(([kernel, signal]) => [String(kernel).slice(0, 40), {
      goal: String(signal?.goal || "").slice(0, 40) || undefined,
      focus: String(signal?.focus || "").slice(0, 60) || undefined,
      selection: String(signal?.selection || "").slice(0, 120) || undefined,
    }]));
  const context = {
    smoothieGoal: String(journey.smoothie?.goal || "").slice(0, 40),
    smoothieSizeOz: Number(journey.smoothie?.sizeOz) || undefined,
    frequencyHz: Number(journey.frequency?.hz) || undefined,
    mealGoal: String(journey.meals?.goal || "").slice(0, 40),
    taiChiFocus: String(journey.taiChi?.focus || "").slice(0, 60),
    movementFocus: String(journey.movement?.focus || "").slice(0, 60),
    movementScore: Number.isFinite(Number(journey.movement?.score))
      ? Number(journey.movement.score)
      : undefined,
    kernelSignals: Object.keys(exchangeSignals).length ? exchangeSignals : undefined,
  };
  return Object.fromEntries(Object.entries(context).filter(([, value]) => value !== "" && value !== undefined));
}

const BLOCKED_KERNEL_KEYS = /password|secret|token|billing|payment|card|email|uid|account|address/i;

function sanitizeKernelValue(value, depth = 0) {
  if (depth > 7 || value === null || value === undefined) return undefined;
  if (typeof value === "string") return value.trim().slice(0, 500);
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  if (typeof value === "boolean") return value;
  if (Array.isArray(value)) return value.slice(0, 80).map((item) => sanitizeKernelValue(item, depth + 1)).filter((item) => item !== undefined);
  if (typeof value !== "object") return undefined;
  return Object.fromEntries(Object.entries(value)
    .filter(([key]) => !BLOCKED_KERNEL_KEYS.test(key))
    .slice(0, 40)
    .map(([key, item]) => [String(key).slice(0, 80), sanitizeKernelValue(item, depth + 1)])
    .filter(([, item]) => item !== undefined));
}

export function buildKernelContext(value = {}) {
  const allowed = ["smoothieKitchen", "mealPlanKitchen", "savedSmoothies", "currentMealPlan", "frequency", "taiChi", "movement", "kernelSignals"];
  const clean = Object.fromEntries(allowed
    .filter((key) => value?.[key] !== undefined)
    .map((key) => [key, sanitizeKernelValue(value[key])])
    .filter(([, item]) => item !== undefined));
  const serialized = JSON.stringify(clean);
  if (serialized.length > 60000) throw new Error("The Kernel context is too large. Reduce saved data and try again.");
  return clean;
}

export function hasTierAccess(entitlement = {}, minimumTier = 1, now = Date.now()) {
  const expiration = entitlement.betaExpiresAt ? Date.parse(entitlement.betaExpiresAt) : null;
  return ["active", "trialing"].includes(entitlement.status)
    && Number(entitlement.tier) >= minimumTier
    && (!expiration || expiration > now);
}

export function isActiveTierOne(entitlement = {}) {
  return hasTierAccess(entitlement, 1);
}
