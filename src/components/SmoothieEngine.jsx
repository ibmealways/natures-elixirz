// src/components/SmoothieEngine.jsx
// COSMIC ASCENSION ENGINE (Option B + C)
// Emerald + Gold + Full Spectrum Hologram Logic

import ingredients from "../data/ingredients.json";
import generateSmoothie from "../utilities/generateSmoothie";

/**
 * SmoothieEngine
 * Called from SmoothieLab like:
 * SmoothieEngine({
 *   selectedIngredients,
 *   healingFocus,
 *   batchSize,
 *   smartModeData
 * })
 */
export default function SmoothieEngine({
  selectedIngredients = [],
  healingFocus = "",
  batchSize = 42,
  smartModeData = null,
}) {
  const smartEnabled = !!smartModeData;

  // ----------------------------------------------------
  // 1. Map selected ingredient NAMES → full ingredient objects
  // ----------------------------------------------------
  const selectedObjects = ingredients.filter((ing) =>
    selectedIngredients.includes(ing.name)
  );

  // Flatten benefits safely
  const allBenefits = selectedObjects.flatMap((ing) => ing.benefits || []);

  const focusKey = (healingFocus || "").toLowerCase();
  const goalKey = (smartModeData?.goal || "").toLowerCase();

  // ----------------------------------------------------
  // 2. Resolve INTENT KEY (healing focus + smart goal)
  // ----------------------------------------------------
  function resolveIntentKey() {
    // Priority: explicit smartMode goal, then healingFocus bucket
    if (goalKey.includes("joint") || focusKey.includes("joint")) return "joints";
    if (goalKey.includes("gut") || focusKey.includes("gut")) return "gut";
    if (goalKey.includes("detox") || focusKey.includes("detox")) return "detox";
    if (goalKey.includes("brain") || focusKey.includes("brain")) return "brain";
    if (goalKey.includes("energy") || focusKey.includes("energy")) return "energy";
    if (goalKey.includes("calm") || focusKey.includes("calm")) return "calm";
    if (goalKey.includes("weight") || focusKey.includes("mass")) return "weight_gain";
    return "general";
  }

  const intentKey = resolveIntentKey();

  // ----------------------------------------------------
  // 3. FREQUENCY + BLEND MAP (Emerald + Gold + Spectrum)
  // ----------------------------------------------------
  const frequencyMap = {
    joints: "174 Hz – Pain Relief & Flexi-Flow Repair",
    gut: "528 Hz – Cellular & Gut Regeneration (Cool, Soothing)",
    detox: "396 Hz – Release, Liver & Lymph Cleanse",
    brain: "963 Hz – Crown / Third Eye Activation",
    energy: "639 Hz – Heart, Drive & Magnetic Momentum",
    calm: "432 Hz – Universal Nervous System Reset",
    weight_gain: "285 Hz – Tissue Repair, Strength & Mass",
    general: "432 Hz – Universal Healing & Alignment",
  };

  const blendMap = {
    joints: {
      name: "Flexi-Flow Repair Elixir",
      energyType: "Joint Repair • Anti-Inflammatory",
    },
    gut: {
      name: "Gentle Glow Gut Healer",
      energyType: "Cooling • Digestive Harmony",
    },
    detox: {
      name: "Liver & Lymph Flush Elixir",
      energyType: "Detox • Deep Cellular Cleanse",
    },
    brain: {
      name: "Celestial Focus Ignite",
      energyType: "Brain • Focus • Neurological Clarity",
    },
    energy: {
      name: "Quantum Momentum Charge",
      energyType: "Energy • Drive • Magnetic Output",
    },
    calm: {
      name: "Auric Calm Restoration",
      energyType: "Calm • Nervous System Reset",
    },
    weight_gain: {
      name: "Quantum Mass Builder",
      energyType: "Strength • Healthy Mass • Repair",
    },
    general: {
      name: "Custom Cosmic Elixir",
      energyType: "General Healing • Cellular Support",
    },
  };

  const baseBlend = blendMap[intentKey] || blendMap.general;
  const baseFrequency = frequencyMap[intentKey] || frequencyMap.general;

  // ----------------------------------------------------
  // 4. SMART SUMMARY (Age • Sex • Weight • Height • Activity)
  // ----------------------------------------------------
  function buildSmartSummary(form) {
    if (!form) return null;
    const p = [];

    if (form.age) p.push(`Age ${form.age}`);
    if (form.sex)
      p.push(form.sex.charAt(0).toUpperCase() + form.sex.slice(1));
    if (form.weight) p.push(`${form.weight} lbs`);
    if (form.height) p.push(`${form.height}"`);
    if (form.activity) {
      const act =
        form.activity === "low"
          ? "Low Activity"
          : form.activity === "moderate"
          ? "Moderately Active"
          : form.activity === "high"
          ? "High Activity"
          : form.activity;
      p.push(act);
    }

    return p.join(" • ");
  }

  const smartSummary = buildSmartSummary(smartModeData);

  // ----------------------------------------------------
  // 5. FLAVOR / THERMOGENIC / VIBE CALCULATIONS
  // ----------------------------------------------------

  // Rough flavor hints from benefits / name
  function inferFlavorProfile() {
    const textBlob = (
      selectedObjects
        .map((ing) => `${ing.name} ${(ing.benefits || []).join(" ")}`)
        .join(" ")
        .toLowerCase() || ""
    );

    const hasCitrus =
      textBlob.includes("lemon") ||
      textBlob.includes("lime") ||
      textBlob.includes("orange") ||
      textBlob.includes("pineapple");
    const hasBerry =
      textBlob.includes("berry") || textBlob.includes("blueberry") || textBlob.includes("strawberry");
    const hasGreens =
      textBlob.includes("kale") ||
      textBlob.includes("spinach") ||
      textBlob.includes("greens") ||
      textBlob.includes("broccoli");
    const hasCreamy =
      textBlob.includes("banana") ||
      textBlob.includes("avocado") ||
      textBlob.includes("yogurt");
    const hasSpice =
      textBlob.includes("ginger") ||
      textBlob.includes("turmeric") ||
      textBlob.includes("cinnamon");
    const hasCooling =
      textBlob.includes("cucumber") || textBlob.includes("mint") || textBlob.includes("aloe");

    const segments = [];

    if (hasCitrus || hasBerry)
      segments.push("bright & vibrant");
    if (hasGreens)
      segments.push("grounded by earthy greens");
    if (hasCreamy)
      segments.push("with a smooth, creamy finish");
    if (hasSpice)
      segments.push("and a gentle warming spice note");
    if (hasCooling)
      segments.push("balanced by a cool, refreshing undertone");

    if (segments.length === 0) {
      return "Balanced and approachable, with a gentle harmony between sweetness, earthiness and subtle botanicals.";
    }

    return (
      "A " +
      segments[0] +
      (segments[1] ? ", " + segments[1] : "") +
      (segments[2] ? ", " + segments[2] : "") +
      "."
    );
  }

  function inferThermogenicIndex() {
    // Simple intent-based classification if we don't know full herb list
    if (intentKey === "gut" || intentKey === "calm") return "Cooling / Soothing";
    if (intentKey === "detox") return "Neutral–Cooling";
    if (intentKey === "energy" || intentKey === "weight_gain") return "Warming / Activating";
    return "Neutral";
  }

  function computeVibeScore() {
    let score = 60; // base

    // Ingredient depth
    const count = selectedIngredients.length;
    if (count >= 2) score += 5;
    if (count >= 4) score += 8;
    if (count >= 6) score += 7;

    // Healing focus defined
    if (healingFocus) score += 5;

    // Smart mode boost
    if (smartEnabled) score += 8;

    // Benefits mentioning anti-inflammatory, joints, brain, gut, etc.
    const blob = allBenefits.join(" ").toLowerCase();
    if (blob.includes("anti-inflammatory")) score += 5;
    if (blob.includes("joint")) score += 4;
    if (blob.includes("brain")) score += 4;
    if (blob.includes("focus")) score += 3;
    if (blob.includes("gut") || blob.includes("digest")) score += 4;

    // Intent-based adjustment
    if (intentKey === "joints" || intentKey === "gut") score += 4;
    if (intentKey === "brain" || intentKey === "energy") score += 6;

    // Light penalty if only 1 ingredient
    if (count === 1) score -= 8;

    // Clamp
    if (score < 40) score = 40;
    if (score > 100) score = 100;
    return Math.round(score);
  }

  function resolveAuraType(vibeScore) {
    if (vibeScore >= 92)
      return {
        auraType: "Emerald-Gold Ascension Field",
        auraColor: "emerald-gold hologram",
      };
    if (vibeScore >= 80)
      return {
        auraType: "Emerald Spectrum Flow",
        auraColor: "emerald with indigo & magenta highlights",
      };
    if (vibeScore >= 65)
      return {
        auraType: "Harmonic Healing Field",
        auraColor: "soft emerald with subtle gold",
      };
    return {
      auraType: "Foundational Reset Field",
      auraColor: "deep teal with grounded earth tones",
    };
  }

  const flavorProfile = inferFlavorProfile();
  const thermogenicIndex = inferThermogenicIndex();
  const vibeScore = computeVibeScore();
  const { auraType, auraColor } = resolveAuraType(vibeScore);

  // ----------------------------------------------------
  // 6. TIMING RECOMMENDATION (Smart Mode + Intent)
  // ----------------------------------------------------
  function resolveTiming() {
    if (intentKey === "energy" || intentKey === "brain") {
      return "Morning or early afternoon, ideally within 60 minutes of waking or training.";
    }
    if (intentKey === "joints" || intentKey === "weight_gain") {
      return "Post-activity or mid-day, paired with light movement or stretching.";
    }
    if (intentKey === "gut" || intentKey === "calm") {
      return "Evening or 2–3 hours before bed on a calm stomach.";
    }
    if (intentKey === "detox") {
      return "Morning, before solid food, with extra water intake throughout the day.";
    }
    return "Anytime your body calls for a reset, ideally away from heavy meals.";
  }

  const timing = resolveTiming();

  // ----------------------------------------------------
  // 7. Use generateSmoothie utility (if you want text)
  // ----------------------------------------------------
  const smoothieText = generateSmoothie
    ? generateSmoothie(selectedIngredients)
    : null;

  // Flat names for UI chips
  const flatIngredients = selectedIngredients.slice();

  // Nice display focus text
  const healingFocusLabel =
    healingFocus ||
    (intentKey === "joints"
      ? "Joint Repair & Flexibility"
      : intentKey === "gut"
      ? "Gut Healing & Reflux Ease"
      : intentKey === "detox"
      ? "Detox & Cellular Cleanse"
      : intentKey === "brain"
      ? "Brain, Focus & Cognitive Glow"
      : intentKey === "energy"
      ? "Energy, Drive & Momentum"
      : intentKey === "calm"
      ? "Calm Nervous System Reset"
      : intentKey === "weight_gain"
      ? "Strength, Repair & Healthy Mass"
      : "Full-Body Healing & Alignment");

  // ----------------------------------------------------
  // 8. FINAL OBJECT (Smoothie + Meta)
  // ----------------------------------------------------
  const smoothie = {
    name: baseBlend.name,
    size: batchSize,
    healingFocus: healingFocusLabel,
    frequency: baseFrequency,
    flavorProfile,
    flatIngredients,
    vibeScore,
    auraType,
    auraColor,
    thermogenicIndex,
    smoothieText,
  };

  const meta = {
    // For CardFlipPreview:
    name: baseBlend.name,
    batchSize,
    energyType: baseBlend.energyType,
    date: new Date().toLocaleString(),

    // For ResultDisplay:
    smartSummary,
    energyType: baseBlend.energyType,
    timing,
    intentKey,
    goal: smartModeData?.goal || null,
    smartEnabled,
    notes: smartModeData?.notes || "",
  };

  return { smoothie, meta };
}
