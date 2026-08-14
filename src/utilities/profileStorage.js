const PROFILE_KEY_PREFIX = "naturesElixirz.subscriber.v2";
const LEGACY_PROFILE_KEYS = new Set(["naturesElixirz.subscriber.v1"]);
const ALLOWED_ENTITLEMENT_STATUSES = new Set(["preview", "inactive", "active", "trialing", "past_due", "canceled", "unpaid", "paused"]);
const keyFor = (scope) => `${PROFILE_KEY_PREFIX}.${String(scope || "guest").replace(/[^a-zA-Z0-9_-]/g, "_")}`;

const meaningfulProfileFieldCount = (profile = {}) => [
  profile.name, profile.age, profile.weight, profile.height, profile.sex,
  profile.medications, profile.allergies, profile.avoidIngredients,
  profile.healthGoals?.length, profile.conditions?.length, profile.otherHealthConditions, profile.surgicalHistory,
  profile.tobacco?.types?.length, profile.tobacco?.quantity,
  profile.alcohol?.types?.length, profile.alcohol?.quantity,
].filter(Boolean).length;

export const EMPTY_PROFILE = {
  name: "",
  age: "",
  weight: "",
  height: "",
  sex: "",
  activity: "moderate",
  healthGoals: [],
  conditions: [],
  otherHealthConditions: "",
  surgicalHistory: "",
  medications: "",
  allergies: "",
  intolerances: "",
  dietaryPattern: "omnivore",
  avoidIngredients: "",
  tobacco: { types: [], frequency: "none", quantity: "" },
  alcohol: { types: [], frequency: "none", quantity: "" },
  reach: { country: "", region: "", referral: "prefer-not-to-say" },
  clinicianApproved: false,
  tier: 1,
  subscriptionStatus: "preview",
  subscriptionCancelAtPeriodEnd: false,
  subscriptionCurrentPeriodEnd: null,
  subscriptionCurrentPeriodStart: null,
  subscriptionBillingMode: null,
  subscriptionAccessSource: null,
  completedAt: null,
};

export function getSubscriberProfile(scope) {
  try {
    const saved = JSON.parse(localStorage.getItem(keyFor(scope)));
    return saved ? { ...EMPTY_PROFILE, ...saved, reach: { ...EMPTY_PROFILE.reach, ...saved.reach } } : EMPTY_PROFILE;
  } catch {
    return EMPTY_PROFILE;
  }
}

// Returns only profile metadata needed for an explicit, on-device account recovery.
// The original localStorage record is never changed or removed by this scan.
export function listRecoverableLocalProfiles(excludeScope) {
  if (typeof localStorage === "undefined") return [];
  const excludedKey = keyFor(excludeScope);
  const candidates = [];
  for (let index = 0; index < localStorage.length; index += 1) {
    const storageKey = localStorage.key(index);
    const isScopedProfile = storageKey?.startsWith(`${PROFILE_KEY_PREFIX}.`);
    const isLegacyProfile = LEGACY_PROFILE_KEYS.has(storageKey);
    if ((!isScopedProfile && !isLegacyProfile) || storageKey === excludedKey) continue;
    try {
      const profile = JSON.parse(localStorage.getItem(storageKey));
      const fieldCount = meaningfulProfileFieldCount(profile);
      if (!fieldCount || profile?.clearedAt) continue;
      candidates.push({
        storageKey,
        sourceScope: isScopedProfile ? storageKey.slice(PROFILE_KEY_PREFIX.length + 1) : "guest",
        legacy: isLegacyProfile,
        displayName: String(profile.name || "Unnamed local profile").trim(),
        completedAt: profile.completedAt || null,
        fieldCount,
        profile: { ...EMPTY_PROFILE, ...profile, reach: { ...EMPTY_PROFILE.reach, ...profile?.reach } },
      });
    } catch {
      // Ignore malformed or unrelated browser records.
    }
  }
  const unique = candidates.filter((candidate, index, all) => all.findIndex((other) => (
    other.displayName.toLowerCase() === candidate.displayName.toLowerCase()
    && other.fieldCount === candidate.fieldCount
    && JSON.stringify(other.profile.healthGoals || []) === JSON.stringify(candidate.profile.healthGoals || [])
  )) === index);
  return unique.sort((left, right) => String(right.completedAt || "").localeCompare(String(left.completedAt || "")));
}

export function saveSubscriberProfile(profile, scope) {
  const current = getSubscriberProfile(scope);
  const next = {
    ...EMPTY_PROFILE,
    ...profile,
    reach: { ...EMPTY_PROFILE.reach, ...profile?.reach },
    // Paid access is never accepted from forms, cloud profile payloads, or imports.
    tier: current.tier,
    subscriptionStatus: current.subscriptionStatus,
    subscriptionCancelAtPeriodEnd: current.subscriptionCancelAtPeriodEnd,
    subscriptionCurrentPeriodEnd: current.subscriptionCurrentPeriodEnd,
    subscriptionCurrentPeriodStart: current.subscriptionCurrentPeriodStart,
    subscriptionBillingMode: current.subscriptionBillingMode,
    subscriptionAccessSource: current.subscriptionAccessSource,
    completedAt: new Date().toISOString(),
  };
  delete next.clearedAt;
  localStorage.setItem(keyFor(scope), JSON.stringify(next));
  notifyCloudChange(scope);
  return next;
}

export function restoreSubscriberProfile(profile, scope) {
  const current = getSubscriberProfile(scope);
  const hasLegacyProfileData = Boolean(profile && (
    profile.name || profile.age || profile.weight || profile.height || profile.healthGoals?.length
    || profile.conditions?.length || profile.otherHealthConditions || profile.surgicalHistory || profile.medications || profile.allergies || profile.avoidIngredients
    || profile.tobacco?.types?.length || profile.tobacco?.quantity
    || profile.alcohol?.types?.length || profile.alcohol?.quantity
  ));
  const restored = {
    ...EMPTY_PROFILE,
    ...profile,
    reach: { ...EMPTY_PROFILE.reach, ...profile?.reach },
    tier: current.tier,
    subscriptionStatus: current.subscriptionStatus,
    subscriptionCancelAtPeriodEnd: current.subscriptionCancelAtPeriodEnd,
    subscriptionCurrentPeriodEnd: current.subscriptionCurrentPeriodEnd,
    subscriptionCurrentPeriodStart: current.subscriptionCurrentPeriodStart,
    subscriptionBillingMode: current.subscriptionBillingMode,
    subscriptionAccessSource: current.subscriptionAccessSource,
    completedAt: profile?.completedAt || (hasLegacyProfileData ? new Date().toISOString() : null),
  };
  if (hasLegacyProfileData) delete restored.clearedAt;
  localStorage.setItem(keyFor(scope), JSON.stringify(restored));
  return restored;
}

export function updateSubscriberTier(profile, tier, scope) {
  const next = { ...EMPTY_PROFILE, ...profile, tier: Math.min(5, Math.max(1, Number(tier) || 1)), subscriptionStatus: "preview" };
  localStorage.setItem(keyFor(scope), JSON.stringify(next));
  return next;
}

export function updateSubscriberEntitlement(profile, entitlement, scope) {
  const status = ALLOWED_ENTITLEMENT_STATUSES.has(entitlement?.status) ? entitlement.status : "inactive";
  const tier = Math.min(5, Math.max(0, Number(entitlement?.tier) || 0));
  const next = {
    ...EMPTY_PROFILE, ...profile, tier, subscriptionStatus: status,
    subscriptionCancelAtPeriodEnd: Boolean(entitlement?.cancelAtPeriodEnd),
    subscriptionCurrentPeriodEnd: entitlement?.currentPeriodEnd || null,
    subscriptionCurrentPeriodStart: entitlement?.currentPeriodStart || null,
    subscriptionBillingMode: entitlement?.billingMode || null,
    subscriptionAccessSource: entitlement?.accessSource || null,
  };
  localStorage.setItem(keyFor(scope), JSON.stringify(next));
  return next;
}

export function clearSubscriberProfile(scope) {
  localStorage.setItem(keyFor(scope), JSON.stringify({ ...EMPTY_PROFILE, clearedAt: new Date().toISOString() }));
  notifyCloudChange(scope);
}
import { notifyCloudChange } from "./cloudChange";
