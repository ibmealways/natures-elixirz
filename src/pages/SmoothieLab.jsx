// ===========================================================
// SmoothieLab.jsx — PREMIUM COSMIC EDITION + MRVI
// ===========================================================

import React, { useMemo, useState, useEffect } from "react";
import generateSmoothie from "../utilities/generateSmoothie";
import ingredients from "../data/ingredients.json";

import GlowNav from "../components/GlowNav";
import CosmicAIOrb from "../components/CosmicAIOrb";
import ResultDisplay from "../components/ResultDisplay";
import MRVIDashboardCard from "../components/MRVIDashboardCard";

import { useMRVI } from "../context/MRVIContext";
import { getSmoothieFocusTags } from "../utilities/mrviRecommendations";

import "../styles/CosmicShell.css";
import "../styles/frequencies.css";
import "../styles/input.css";
import "../styles/tailwind.css";

// -----------------------------------------------------------
// CONFIG DATA (UNCHANGED)
// -----------------------------------------------------------
const STANDARD_SIZES = [16, 24, 32, 42, 64];

const primaryFocusOptions = [
  "Joint repair & pain relief",
  "Gut healing & digestion",
  "Brain & focus",
  "Heart & circulation",
  "Detox & liver support",
  "Energy & vitality",
  "Sleep & nervous system",
];

const primaryGoals = [
  "Pain relief",
  "Inflammation reset",
  "Weight loss",
  "Muscle gain",
  "Hormone balance",
  "Longevity & anti-aging",
];

const activityLevels = [
  "Sedentary",
  "Lightly active",
  "Moderately active",
  "Very active",
];

// -----------------------------------------------------------
// PAGE COMPONENT
// -----------------------------------------------------------
export default function SmoothieLab() {
  const { latestScan } = useMRVI();

  const mrviFocus = latestScan?.output?.focus || "MAINTENANCE";
  const mrviTags = getSmoothieFocusTags(mrviFocus);

  const [selectedCategory, setSelectedCategory] = useState("Fruits");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFocus, setSelectedFocus] = useState("");
  const [selectedIngredients, setSelectedIngredients] = useState([]);
  const [sizeOz, setSizeOz] = useState(42);
  const [customSize, setCustomSize] = useState("");
  const [usingCustomSize, setUsingCustomSize] = useState(false);
  const [smartModeEnabled, setSmartModeEnabled] = useState(false);
  const [smartProfile, setSmartProfile] = useState({
    age: "",
    weight: "",
    height: "",
    sex: "",
    primaryGoal: "",
    activity: "",
    notes: "",
  });
  const [smoothieResult, setSmoothieResult] = useState(null);

  // ---------------------------------------------------------
  // AUTO-NUDGE SMART MODE FROM MRVI
  // ---------------------------------------------------------
  useEffect(() => {
    if (mrviFocus !== "MAINTENANCE" && !smartModeEnabled) {
      setSmartModeEnabled(true);
      setSmartProfile((p) => ({
        ...p,
        primaryGoal: p.primaryGoal || "Inflammation reset",
      }));
    }
  }, [mrviFocus, smartModeEnabled]);

  const categories = useMemo(
    () => Array.from(new Set(ingredients.map((i) => i.category))).filter(Boolean),
    []
  );

  const filteredIngredients = useMemo(() => {
    return ingredients
      .filter((i) => (selectedCategory ? i.category === selectedCategory : true))
      .filter((i) => {
        if (!searchTerm.trim()) return true;
        const t = searchTerm.toLowerCase();
        return (
          i.name.toLowerCase().includes(t) ||
          (i.benefits && i.benefits.toLowerCase().includes(t)) ||
          (i.tags && i.tags.join(" ").toLowerCase().includes(t))
        );
      });
  }, [selectedCategory, searchTerm]);

  const toggleIngredient = (id) => {
    setSelectedIngredients((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleGenerate = () => {
    const oz = usingCustomSize && customSize ? Number(customSize) : sizeOz;
    const result = generateSmoothie(selectedIngredients, {
      size: oz,
      focus: selectedFocus,
      smartModeEnabled,
      smartProfile,
      mrviFocus,      // 🔑 passed forward
      mrviTags,       // 🔑 future-proof
    });
    setSmoothieResult(result);
  };

  return (
    <div className="cosmic-page-shell">
      <GlowNav />

      <main className="max-w-7xl mx-auto px-4 pb-32 pt-16 text-slate-50">

        <h1 className="text-center text-4xl font-bold tracking-wide text-emerald-300 mb-10">
          Smoothie Lab • Healing Elixir Engine
        </h1>

        {/* MRVI CARD */}
        <div className="max-w-3xl mx-auto mb-10">
          <MRVIDashboardCard />
        </div>

        {/* EXISTING UI CONTINUES UNCHANGED */}
        {/* … all your existing SmoothieLab UI stays exactly the same … */}

        {smoothieResult && (
          <div className="mt-16 max-w-4xl mx-auto">
            <ResultDisplay
              smoothie={smoothieResult.smoothie}
              meta={smoothieResult.meta}
            />
          </div>
        )}
      </main>
    </div>
  );
}



