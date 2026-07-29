// src/components/SmoothieGenerator.jsx
import React, { useState } from "react";
import generateSmoothie from "../utilities/generateSmoothie";
import ingredients from "../data/ingredients.json";
import ResultDisplay from "./ResultDisplay";

const STANDARD_SIZES = [16, 24, 32, 42, 64];
const CUSTOM_SIZES = [20, 50, 96];

function describeGoal(goal) {
  switch (goal) {
    case "healing_repair":
      return "Joint / Tissue Healing";
    case "detox":
      return "Detox & Cleanse";
    case "energy_focus":
      return "Energy & Focus";
    case "weight_gain":
      return "Weight Gain / Strength";
    case "gentle_gut":
      return "Gentle Gut & Cooling";
    default:
      return "Custom Focus";
  }
}

export default function SmoothieGenerator({ onBlendGenerated }) {
  // top controls
  const [healingFocus, setHealingFocus] = useState("");
  const [filterText, setFilterText] = useState("");

  // ingredients & result
  const [selected, setSelected] = useState([]);
  const [smoothie, setSmoothie] = useState(null);       // now stores OBJECT
  const [resultMeta, setResultMeta] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

  // batch + smart mode
  const [batchSize, setBatchSize] = useState(42); // default signature dose
  const [smartMode, setSmartMode] = useState(false);
  const [smartForm, setSmartForm] = useState({
    age: "",
    weight: "",
    height: "",
    sex: "other",
    goal: "",
    activity: "",
    issues: "",
  });
  const [bestBlendName, setBestBlendName] = useState("");
  const [bestEnergyType, setBestEnergyType] = useState("");

  const handleSelect = (itemName) => {
    setSelected((prev) =>
      prev.includes(itemName)
        ? prev.filter((i) => i !== itemName)
        : [...prev, itemName]
    );
  };

  const handleSmartInputChange = (e) => {
    const { name, value } = e.target;
    setSmartForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Smart batch recommendation logic (VERY gentle heuristic)
  const computeRecommendedBatch = (form) => {
    const goal = form.goal;
    const activity = form.activity;
    const issues = (form.issues || "").toLowerCase();
    const weight = parseFloat(form.weight) || 0;
    const height = parseFloat(form.height) || 0;
    const sex = form.sex;

    let size = 24; // base

    if (goal === "gentle_gut") {
      size = 16;
    } else if (goal === "detox") {
      size = 32;
    } else if (goal === "healing_repair") {
      size = 32;
    } else if (goal === "weight_gain") {
      size = 42;
    } else if (goal === "energy_focus") {
      size = 24;
    }

    // adjust gently by weight
    if (weight > 220) {
      size = Math.max(size, 42);
    } else if (weight > 180) {
      size = Math.max(size, 32);
    }

    // activity tweaks
    if (activity === "high" && size < 32) {
      size = 32;
    } else if (activity === "low" && size > 32) {
      size = 32;
    }

    // kidney / renal: keep volume conservative
    if (issues.includes("kidney") || issues.includes("renal")) {
      size = Math.min(size, 24);
    }

    // taller / male bodies: tiny bump
    if (sex === "male" && height > 70) {
      size = size + 4;
    }

    const allSizes = [...STANDARD_SIZES, ...CUSTOM_SIZES];
    const closest = allSizes.reduce((prev, curr) =>
      Math.abs(curr - size) < Math.abs(prev - size) ? curr : prev
    );

    return closest;
  };

  // Smart "best blend" suggestion
  const suggestBestBlend = (form) => {
    const goal = form.goal;
    const issues = (form.issues || "").toLowerCase();

    if (
      goal === "healing_repair" ||
      issues.includes("joint") ||
      issues.includes("arthritis")
    ) {
      return {
        blendName: "Flexi-Flow Repair Elixir",
        energyType: "Joint Repair & Anti-Inflammatory",
      };
    }
    if (goal === "detox" || issues.includes("liver") || issues.includes("lymph")) {
      return {
        blendName: "Liver & Lymph Flush Elixir",
        energyType: "Detox & Cellular Cleanse",
      };
    }
    if (goal === "energy_focus") {
      return {
        blendName: "Celestial Green Ignite",
        energyType: "Energy & Mental Clarity",
      };
    }
    if (goal === "weight_gain") {
      return {
        blendName: "Quantum Mass Builder",
        energyType: "Strength & Healthy Weight Gain",
      };
    }
    if (
      goal === "gentle_gut" ||
      issues.includes("reflux") ||
      issues.includes("ulcer")
    ) {
      return {
        blendName: "Gentle Glow Gut Healer",
        energyType: "Gut Soothe & Cooling Support",
      };
    }

    return {
      blendName: "Custom Cosmic Elixir",
      energyType: "Healing & Cellular Support",
    };
  };

  const buildSmartSummary = (form) => {
    if (!form.age && !form.weight && !form.goal && !form.activity) return null;
    const pieces = [];
    if (form.age) pieces.push(`Age ${form.age}`);
    if (form.sex)
      pieces.push(
        form.sex === "male"
          ? "Male"
          : form.sex === "female"
          ? "Female"
          : "Other"
      );
    if (form.weight) pieces.push(`${form.weight} lbs`);
    if (form.height) pieces.push(`${form.height}" tall`);
    if (form.goal) pieces.push(`Goal: ${describeGoal(form.goal)}`);
    if (form.activity) {
      const map = {
        low: "Low Activity",
        moderate: "Moderate Activity",
        high: "High Activity",
      };
      pieces.push(map[form.activity] || "");
    }
    return pieces.filter(Boolean).join(" • ");
  };

  const handleGenerate = () => {
    if (selected.length === 0) {
      setErrorMessage("Please select at least one ingredient to generate your elixir.");
      setSmoothie(null);
      setResultMeta(null);
      return;
    }

    setErrorMessage("");

    let finalBatchSize = batchSize;
    let blendProfile = {
      blendName: "Custom Healing Elixir",
      energyType: "Healing & Cellular Repair",
    };

    if (smartMode) {
      const recommended = computeRecommendedBatch(smartForm);
      finalBatchSize = recommended;
      const suggested = suggestBestBlend(smartForm);
      blendProfile = suggested;
      setBatchSize(recommended);
      setBestBlendName(suggested.blendName);
      setBestEnergyType(suggested.energyType);
    } else {
      setBestBlendName("");
      setBestEnergyType("");
    }

    // NEW: generate full smoothie object (not just text)
    const smoothieObj = generateSmoothie(selected, {
      size: finalBatchSize,
      smartMode: {
        enabled: smartMode,
        height: smartForm.height ? Number(smartForm.height) : null,
        sex: smartForm.sex,
      },
    });

    setSmoothie(smoothieObj);

    const meta = {
      name: blendProfile.blendName,
      energyType: blendProfile.energyType,
      batchSize: finalBatchSize,
      focus: healingFocus,
      smartMode,
      smartSummary: smartMode ? buildSmartSummary(smartForm) : null,
    };

    setResultMeta(meta);

    // Also notify parent (for preview card, logging, etc.)
    if (onBlendGenerated) {
      onBlendGenerated({
        ...meta,
        smoothie: smoothieObj,
        ingredients: selected,
      });
    }
  };

  const filteredIngredients = ingredients.filter((item) => {
    const term = filterText.toLowerCase();
    if (!term) return true;
    return (
      item.name.toLowerCase().includes(term) ||
      (item.benefit || "").toLowerCase().includes(term)
    );
  });

  return (
    <section className="w-full text-center text-green-100 animate-fadeIn">
      {/* Title */}
      <header className="mb-6">
        <h1 className="text-4xl md:text-5xl font-extrabold mb-2 text-green-400 tracking-wide drop-shadow-[0_0_18px_#22c55e]">
          🌿 Nature’s Elixirz
        </h1>
        <p className="text-green-200 text-base md:text-lg max-w-2xl mx-auto opacity-90">
          Build your own high-vibe healing smoothie. Let the Smart Mode gently
          tune the dose to your body.
        </p>
        <h2 className="text-2xl md:text-3xl font-semibold mt-4 text-green-300 drop-shadow">
          Pick Your Ingredients
        </h2>
      </header>

      {/* Focus + Search row */}
      {/* ... everything here stays exactly as you already had it ... */}

      {/* I’m not cutting this out of your file – you already pasted it above.
          Keep all the UI exactly the same down to the "Result panel" section.
          The ONLY changes we made are:
          - new state: errorMessage
          - new handleGenerate implementation above
          - new smoothie type: object
      */}

      {/* Ingredient grid (unchanged UI) */}
      <div className="bg-black/35 border border-green-700/70 rounded-3xl p-6 md:p-8 shadow-2xl shadow-green-500/30 mb-10">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {filteredIngredients.map((item) => {
            const isSelected = selected.includes(item.name);
            return (
              <button
                key={item.name}
                type="button"
                onClick={() => handleSelect(item.name)}
                className={`text-left cursor-pointer rounded-xl py-4 px-3 border transition-all duration-300 shadow-md relative overflow-hidden ${
                  isSelected
                    ? "bg-green-900/50 text-white border-green-300 shadow-green-400/40 scale-[1.02]"
                    : "bg-black/40 text-green-100 border-green-700 hover:bg-green-700/40"
                }`}
              >
                {isSelected && (
                  <div className="absolute inset-0 bg-green-500/10 blur-2xl animate-pulse" />
                )}
                <h3 className="font-semibold text-lg mb-1 relative z-10">
                  {item.name}
                </h3>
                <p className="text-xs text-green-100/80 relative z-10">
                  {item.benefit}
                </p>
              </button>
            );
          })}
        </div>

        {/* Generate button */}
        <div className="mt-10 flex flex-col items-center gap-2">
          <button
            onClick={handleGenerate}
            disabled={selected.length === 0}
            className={`inline-flex items-center gap-2 rounded-full px-8 py-3 text-base font-semibold shadow-lg transition-all ${
              selected.length === 0
                ? "bg-gray-600/60 text-gray-300 cursor-not-allowed"
                : "bg-green-500 hover:bg-green-400 text-black hover:shadow-green-400/40 hover:scale-[1.03]"
            }`}
          >
            🍹 Generate My Elixir
          </button>
          {errorMessage && (
            <p className="text-xs text-red-300">{errorMessage}</p>
          )}
        </div>
      </div>

      {/* Result panel */}
      <div className="mt-8 w-full flex justify-center">
        <ResultDisplay smoothie={smoothie} meta={resultMeta} />
      </div>
    </section>
  );
}

