const ALLOWED_ROLES = new Set(["user", "assistant"]);

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
`.trim();

export function validateConversation(data = {}) {
  const message = typeof data.message === "string" ? data.message.trim() : "";
  if (!message || message.length > 2000) {
    throw new Error("Message must contain 1 to 2,000 characters.");
  }
  const history = Array.isArray(data.history) ? data.history.slice(-10) : [];
  const cleanHistory = history
    .filter((item) => item && ALLOWED_ROLES.has(item.role) && typeof item.content === "string")
    .map((item) => ({ role: item.role, content: item.content.trim().slice(0, 2000) }))
    .filter((item) => item.content);
  return { message, history: cleanHistory };
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

export function hasTierAccess(entitlement = {}, minimumTier = 1, now = Date.now()) {
  const expiration = entitlement.betaExpiresAt ? Date.parse(entitlement.betaExpiresAt) : null;
  return ["active", "trialing"].includes(entitlement.status)
    && Number(entitlement.tier) >= minimumTier
    && (!expiration || expiration > now);
}

export function isActiveTierOne(entitlement = {}) {
  return hasTierAccess(entitlement, 1);
}
