// src/utilities/generateSmoothie.js
// ===========================================================
// FIXED FOR SMOOTHIELAB + RESULTDISPLAY
// Returns: { smoothie: {...}, meta: {...} }
// ===========================================================

export default function generateSmoothie(selectedIngredients = [], options = {}) {
  const {
    size,
    smartModeEnabled,
    smartProfile = {},
    focus,
  } = options;

  // size logic
  const finalSize = smartModeEnabled
    ? autoSizeFromProfile(smartProfile.height, smartProfile.sex, size)
    : size || 16;

  const allSelected = Array.isArray(selectedIngredients)
    ? selectedIngredients
    : [];

  // produce smoothie object
  const smoothie = {
    name: generateSmoothieName(allSelected, smartModeEnabled, focus),
    size: finalSize,
    ingredients: allSelected,
    flatIngredients: allSelected,
    healingFocus: determineHealingFocus(allSelected, focus),
    frequency: pickFrequencyForFocus(
      determineHealingFocus(allSelected, focus)
    ),
    flavorProfile: determineFlavorProfile(allSelected),
  };

  // produce meta object for ResultDisplay
  const meta = {
    batchSize: finalSize,
    smartMode: smartModeEnabled,
    smartSummary: smartModeEnabled
      ? buildSmartSummary(smartProfile)
      : null,
    energyType: smoothie.flavorProfile,
  };

  return { smoothie, meta };
}

// ===========================================================
// HELPERS
// ===========================================================

function buildSmartSummary(profile) {
  const parts = [];

  if (profile.age) parts.push(`Age ${profile.age}`);
  if (profile.weight) parts.push(`${profile.weight} lbs`);
  if (profile.height) parts.push(`${profile.height} in`);
  if (profile.sex) parts.push(profile.sex.toUpperCase());
  if (profile.primaryGoal) parts.push(`Goal: ${profile.primaryGoal}`);
  if (profile.activity) parts.push(`Activity: ${profile.activity}`);

  return parts.length ? parts.join(" • ") : null;
}

// -------------------------------
function autoSizeFromProfile(height, sex, requested) {
  if (requested) return requested;

  if (!height || Number.isNaN(Number(height))) return 32;

  const h = Number(height);

  if (h < 64) return 24;
  if (h >= 64 && h < 70) return 32;

  return sex === "male" ? 42 : 36;
}

// -------------------------------
function generateSmoothieName(allSelected, smartModeEnabled, goal) {
  if (!allSelected.length) return "Cosmic Base Elixir";

  const hasMango = includesInsensitive(allSelected, "mango");
  const hasBerry =
    includesInsensitive(allSelected, "blueberry") ||
    includesInsensitive(allSelected, "strawberry") ||
    includesInsensitive(allSelected, "berries");
  const hasGreens =
    includesInsensitive(allSelected, "spinach") ||
    includesInsensitive(allSelected, "kale") ||
    includesInsensitive(allSelected, "broccoli");

  let coreName = "Quantum Harmony Blend";

  if (hasMango && hasBerry) coreName = "Galactic Mango-Berry Fusion";
  else if (hasBerry) coreName = "Cosmic Berry Burst";
  else if (hasGreens) coreName = "Galaxy Green Blast";

  if (goal === "healing_repair") coreName = "Flexi-Flow Repair Elixir";
  if (goal === "detox") coreName = "Liver & Lymph Detox Elixir";
  if (goal === "energy_focus") coreName = "Celestial Green Ignite";
  if (goal === "weight_gain") coreName = "Quantum Mass Builder";
  if (goal === "gentle_gut") coreName = "Gentle Glow Gut Healer";

  if (smartModeEnabled) return `${coreName} – Smart Mode Edition`;

  return coreName;
}

// -------------------------------
function determineHealingFocus(allSelected, goal) {
  const lower = allSelected.map((x) => x.toLowerCase());

  if (goal === "healing_repair")
    return "Joint & Tissue Repair / Anti-Inflammatory Support";
  if (goal === "detox") return "Detox, Liver & Lymphatic Support";
  if (goal === "energy_focus")
    return "Energy, Focus & Brain Function Support";
  if (goal === "weight_gain")
    return "Muscle Recovery & Healthy Weight Gain";
  if (goal === "gentle_gut")
    return "Gut Soothe, Cooling & Digestive Support";

  if (
    lower.some((x) =>
      ["turmeric", "ginger", "pineapple", "cherry"].some((k) =>
        x.includes(k)
      )
    )
  )
    return "Joint & Inflammation Support";

  if (
    lower.some((x) =>
      ["blueberry", "blackberry", "acai"].some((k) => x.includes(k))
    )
  )
    return "Brain & Nervous System Support";

  if (
    lower.some((x) =>
      ["spinach", "kale", "broccoli"].some((k) => x.includes(k))
    )
  )
    return "Detox & Cellular Regeneration";

  return "Overall Vitality & Cellular Support";
}

// -------------------------------
function pickFrequencyForFocus(healingFocus) {
  if (!healingFocus) return "528 Hz – Love & DNA Repair";

  const t = healingFocus.toLowerCase();

  if (t.includes("joint") || t.includes("inflammation"))
    return "174 Hz – Pain Relief & Physical Healing";

  if (t.includes("brain") || t.includes("nervous"))
    return "963 Hz – Pineal Activation & Higher Consciousness";

  if (t.includes("detox") || t.includes("liver"))
    return "432 Hz – Earth Resonance & Grounding";

  if (t.includes("gut") || t.includes("digest"))
    return "396 Hz – Guilt & Fear Release / Digestive Ease";

  return "528 Hz – Love & DNA Repair";
}

// -------------------------------
function determineFlavorProfile(allSelected) {
  const lower = allSelected.map((x) => x.toLowerCase());

  const sweet = lower.some((x) =>
    ["mango", "banana", "pineapple", "dates"].some((k) => x.includes(k))
  );
  const tart = lower.some((x) =>
    ["lemon", "lime", "cranberry"].some((k) => x.includes(k))
  );
  const creamy = lower.some((x) =>
    ["yogurt", "avocado", "coconut"].some((k) => x.includes(k))
  );

  if (sweet && creamy) return "Sweet & Creamy";
  if (sweet && tart) return "Bright & Tropical";
  if (creamy) return "Smooth & Silky";
  if (tart) return "Tart & Refreshing";

  return "Balanced & Gentle";
}

// -------------------------------
function includesInsensitive(list, needle) {
  const n = needle.toLowerCase();
  return list.some((item) => String(item).toLowerCase().includes(n));
}


