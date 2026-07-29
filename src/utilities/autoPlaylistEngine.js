// src/utilities/autoPlaylistEngine.js
import { getHealingFrequency, getAuraTunedFrequency } from "./frequencyEngine";

/**
 * Small tone library for building sequences
 */
const TONES = {
  calm: 432,
  dna: 528,
  detox: 417,
  intuition: 852,
  love: 639,
  grounding: 396,
  repair: 285,
  deepFocus: 963,
  quantumBoost: 888,
  ascension: 1080,
  regen: 1551,
};

/**
 * AUTO PLAYLIST GENERATOR ENGINE
 * Builds a 3–7 track sequence based on:
 * - Smart Mode data (age, sex, activity, notes, goal)
 * - User tier
 */
export function buildAutoPlaylist({ smartModeData, userTier }) {
  const { goal, age, sex, activity, notes } = smartModeData || {};

  // 1️⃣ Main healing tone from goal (heart/dna/detox/intuition mapped in frequencyEngine)
  const main = getHealingFrequency(goal);

  // 2️⃣ Aura tone from Smart Mode biofield inputs
  const aura = getAuraTunedFrequency({
    age,
    sex,
    activity,
    notes,
  });

  let playlist = [];

  // 🔮 ALWAYS START WITH MAIN HEALING FREQUENCY
  playlist.push({
    id: "main",
    hz: main,
    title: "Primary Healing Frequency",
    desc: "Auto-selected tone matching your chosen healing goal.",
    tier: 1,
    externalLinks: {},
  });

  // 🌫️ Aura tone second
  playlist.push({
    id: "aura",
    hz: aura,
    title: "Aura-Tuned Resonance",
    desc: "Smart Mode personalized frequency calculated from your biofield.",
    tier: 1,
    externalLinks: {},
  });

  // 🌱 Add supportive tones based on goal
  if (goal === "heart") {
    playlist.push({
      id: "support-432",
      hz: TONES.calm,
      title: "Heart Opening",
      desc: "Supports calm + emotional balance.",
      tier: 1,
    });
    playlist.push({
      id: "love-639",
      hz: TONES.love,
      title: "Love & Harmony",
      desc: "Strengthens heart + relationship field.",
      tier: 2,
    });
  }

  if (goal === "dna") {
    playlist.push({
      id: "repair-528",
      hz: TONES.dna,
      title: "DNA Repair",
      desc: "Cellular regeneration + blueprint toning.",
      tier: 1,
    });
    playlist.push({
      id: "focus-963",
      hz: TONES.deepFocus,
      title: "Awakening Frequency",
      desc: "Pineal clarity + focused awareness.",
      tier: 2,
    });
  }

  if (goal === "detox") {
    playlist.push({
      id: "cleanse-417",
      hz: TONES.detox,
      title: "Detox Field",
      desc: "Cellular cleansing & release.",
      tier: 1,
    });
    playlist.push({
      id: "purify-741",
      hz: 741,
      title: "Purification Tone",
      desc: "Emotional detox & clarity.",
      tier: 2,
    });
  }

  if (goal === "intuition") {
    playlist.push({
      id: "awaken-852",
      hz: TONES.intuition,
      title: "Intuition Activator",
      desc: "Third-eye + inner guidance awakening.",
      tier: 2,
    });
    playlist.push({
      id: "ascend-963",
      hz: TONES.deepFocus,
      title: "Crown Chakra Tuning",
      desc: "Deep awareness & spiritual alignment.",
      tier: 2,
    });
  }

  // 🌀 Tier 3 adds quantum stack at the end
  if (userTier >= 3) {
    playlist.push({
      id: "quantum-888",
      hz: TONES.quantumBoost,
      title: "Quantum Field Expansion",
      desc: "Tier 3 quantum stack — manifestation booster.",
      tier: 3,
    });
    playlist.push({
      id: "ascension-1080",
      hz: TONES.ascension,
      title: "Ascension Tone",
      desc: "High crown activation frequency.",
      tier: 3,
    });
  }

  return playlist;
}
