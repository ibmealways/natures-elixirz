// src/utilities/frequencyEngine.js

/**
 * Core healing frequency map (Hz)
 * Mix of classic solfeggio tones + Nature's Elixirz focus tags.
 */
const BASE_FREQUENCIES = {
  // Legacy body-mapped focuses
  joints: 174, // Pain relief + tissue repair
  brain: 963,  // Pineal clarity + deep focus
  energy: 528, // DNA activation / vitality
  detox: 417,  // Cleansing + letting go
  gut: 285,    // Cellular healing / digestion
  calm: 396,   // Anxiety / grounding
  immune: 639, // Immunity / heart field harmony

  // UI focus tags from the Frequencies page
  heart: 432,     // Heart + calm
  dna: 528,       // DNA support / regeneration
  intuition: 852, // Third-eye / intuition
};

/**
 * Secondary aura-style frequencies.
 * These personalize based on Smart Mode inputs.
 */
const AURA_FREQUENCIES = {
  male: 432,
  female: 444,
  other: 440,
  lowActivity: 396,
  moderateActivity: 417,
  highActivity: 528,
  youthful: 528,
  mature: 432,
  stressed: 369,
  calm: 528,
};

/**
 * Tier 3 quantum frequencies.
 * These unlock at higher subscription tiers.
 */
const TIER3_QUANTUM = {
  quantumBoost: 888, // Field expansion / manifestation
  ascension: 1080,   // Crown activation
  dnaRegen: 1551,    // Deep biofield uplift
};

/**
 * Returns the core healing frequency based on the chosen focus.
 */
export function getHealingFrequency(focus) {
  if (!focus) return 432; // Default universal tuning
  return BASE_FREQUENCIES[focus] || 432;
}

/**
 * Calculates an aura-tuned personalized frequency
 * using Smart Mode data: age, sex, activity, notes, emotional tone.
 */
export function getAuraTunedFrequency({ age, sex, activity, notes }) {
  let freqList = [];

  // Sex-based base tone
  if (sex && AURA_FREQUENCIES[sex]) {
    freqList.push(AURA_FREQUENCIES[sex]);
  }

  // Activity level
  if (activity === "low") freqList.push(AURA_FREQUENCIES.lowActivity);
  if (activity === "medium" || activity === "moderate") {
    freqList.push(AURA_FREQUENCIES.moderateActivity);
  }
  if (activity === "high") freqList.push(AURA_FREQUENCIES.highActivity);

  // Age weighting
  if (age) {
    if (Number(age) <= 40) freqList.push(AURA_FREQUENCIES.youthful);
    else freqList.push(AURA_FREQUENCIES.mature);
  }

  // Emotional tone from notes
  if (notes) {
    const lower = notes.toLowerCase();
    if (lower.includes("anxiety")) freqList.push(AURA_FREQUENCIES.calm);
    if (lower.includes("stress")) freqList.push(AURA_FREQUENCIES.stressed);
  }

  // If no aura factors available → fall back
  if (freqList.length === 0) return 432;

  // Weighted average of all relevant aura tones
  const avg = freqList.reduce((a, b) => a + b, 0) / freqList.length;
  return Math.round(avg);
}

/**
 * Generates the full three-layer healing profile:
 * - main: base healing frequency (focus / goal)
 * - aura: personalized field based on Smart Mode
 * - quantum: Tier-3 “mind” layer (if unlocked)
 */
export function getFullFrequencyProfile({
  healingFocus,
  smartModeData,
  userTier,
}) {
  const { age, sex, activity, notes, goal } = smartModeData || {};

  // 1️⃣ Base healing frequency (body)
  const main = getHealingFrequency(healingFocus || goal);

  // 2️⃣ Aura-tuned frequency (field)
  const aura = smartModeData
    ? getAuraTunedFrequency({ age, sex, activity, notes })
    : null;

  // 3️⃣ Tier 3 quantum “mind” frequencies
  const quantum =
    userTier >= 3
      ? {
          boost: TIER3_QUANTUM.quantumBoost,
          ascension: TIER3_QUANTUM.ascension,
          regeneration: TIER3_QUANTUM.dnaRegen,
        }
      : null;

  return {
    main,    // body
    aura,    // aura / field
    quantum, // mind / higher field
    combined: aura ? Math.round((main + aura) / 2) : main,
  };
}


