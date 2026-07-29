// ===========================================================
// FrequencyLab.jsx — Galactic Hybrid + Session Sync
// Reads:
//   localStorage.pendingFrequencySession
// Allows:
//   Importing a smoothie/frequency from Vibrational Frequency Lab
// ===========================================================

import React, { useState, useMemo, useEffect } from "react";

import IngredientPicker from "../components/IngredientPicker";
import IngredientFilter from "../components/IngredientFilter";
import ResultDisplay from "../components/ResultDisplay";
import FrequencyPlayer from "../components/FrequencyPlayer";
import FrequencyChamber from "../components/FrequencyChamber";

import { getFullFrequencyProfile } from "../utilities/frequencyEngine";
import "../styles/frequencyLab.css";

const FrequencyLab = () => {
  console.log(
    "%cDEBUG: Smoothie Frequency Lab • Galactic Hybrid + Session Sync",
    "color: cyan; font-weight: bold;"
  );

  // ------------------------------------
  // CORE STATE
  // ------------------------------------
  const [healingFocus, setHealingFocus] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIngredients, setSelectedIngredients] = useState([]);
  const [batchSize, setBatchSize] = useState(42);

  // ------------------------------------
  // SMART MODE (light version)
  // ------------------------------------
  const [smartMode, setSmartMode] = useState(false);
  const [age, setAge] = useState("");
  const [sex, setSex] = useState("");
  const [activity, setActivity] = useState("");
  const [notes, setNotes] = useState("");

  // Assume Tier 3 for maximum abilities
  const [userTier] = useState(3);

  // ------------------------------------
  // RESULT STATE
  // ------------------------------------
  const [smoothieData, setSmoothieData] = useState(null);
  const [metaData, setMetaData] = useState(null);

  const [isChamberOpen, setIsChamberOpen] = useState(false);

  // ===========================================================
  // ⭐ AUTO-LOAD PENDING FREQUENCY SESSION (from Frequencies.jsx)
  // ===========================================================
  useEffect(() => {
    const pending = localStorage.getItem("pendingFrequencySession");
    if (!pending) return;

    try {
      const session = JSON.parse(pending);

      // Pull all transferred values
      setHealingFocus(session.healingFocus || "");
      setSelectedIngredients(session.ingredients || []);
      setBatchSize(session.smoothie?.size || 42);

      // Set smoothie + meta directly for immediate rendering
      if (session.smoothie) setSmoothieData(session.smoothie);
      if (session.meta) setMetaData(session.meta);

      // Clear after use
      localStorage.removeItem("pendingFrequencySession");

      console.log("%cLOADED session from Vibrational Frequency Lab", "color: lime");

      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }, 200);

    } catch (err) {
      console.error("Failed to parse pendingFrequencySession", err);
    }
  }, []);

  // ------------------------------------
  // TRIPLE-STACK FREQUENCY PROFILE
  // ------------------------------------
  const tripleProfile = useMemo(() => {
    if (!healingFocus && !smartMode) return null;

    return getFullFrequencyProfile({
      healingFocus: healingFocus || null,
      smartModeData: smartMode
        ? {
            age,
            sex,
            activity,
            notes,
            goal: healingFocus || null,
          }
        : null,
      userTier,
    });
  }, [healingFocus, smartMode, age, sex, activity, notes, userTier]);

  // ------------------------------------
  // HELPERS — blend info presets
  // ------------------------------------
  const blendMap = {
    joints: {
      name: "Flexi-Flow Repair Elixir",
      energy: "Joint Repair • Anti-Inflammatory Field",
      flavorProfile: "Earthy citrus grounding",
    },
    brain: {
      name: "Cosmic Clarity Fuel",
      energy: "Neural Activation • Focus Enhancement",
      flavorProfile: "Bright berry mint",
    },
    energy: {
      name: "Solar Core Igniter",
      energy: "ATP Boost • Cellular Drive",
      flavorProfile: "Tropical uplift",
    },
    detox: {
      name: "Liver & Lymph Flush",
      energy: "Detox • Cellular Cleanse",
      flavorProfile: "Fresh green lemon zest",
    },
    gut: {
      name: "Gentle Gut Glow",
      energy: "Reflux-Safe • Gut Restoration",
      flavorProfile: "Creamy gentle neutral",
    },
    calm: {
      name: "Nervous System Soothe",
      energy: "Parasympathetic Activation",
      flavorProfile: "Soft vanilla comfort",
    },
    immune: {
      name: "Immune Shield Nebula",
      energy: "Heart Field + Immunity",
      flavorProfile: "Berry citrus",
    },
    default: {
      name: "Custom Galactic Elixir",
      energy: "General Healing • Cellular Support",
      flavorProfile: "Balanced cosmic blend",
    },
  };

  const getBlendInfo = (focus) => {
    return blendMap[focus] || blendMap.default;
  };

  const buildSmartSummary = () => {
    if (!smartMode) return null;

    const parts = [];
    if (age) parts.push(`Age ${age}`);
    if (sex) parts.push(sex === "male" ? "Male" : "Female");
    if (activity)
      parts.push(
        activity === "low"
          ? "Low Activity"
          : activity === "medium"
          ? "Moderate Activity"
          : "High Activity"
      );
    if (notes) parts.push("Notes Included");

    return parts.join(" • ");
  };

  // ------------------------------------
  // GENERATE SMOOTHIE DATA
  // ------------------------------------
  const handleGenerate = () => {
    if (selectedIngredients.length === 0) {
      alert("Pick at least one ingredient for your galactic elixir.");
      return;
    }

    const blendInfo = getBlendInfo(healingFocus || null);

    const hz =
      (tripleProfile && tripleProfile.combined) ||
      (tripleProfile && tripleProfile.main) ||
      432;

    const smoothie = {
      name: blendInfo.name,
      size: batchSize,
      healingFocus: healingFocus || "general",
      frequency: hz,
      flavorProfile: blendInfo.flavorProfile,
      flatIngredients: selectedIngredients,
    };

    const meta = {
      batchSize,
      energyType: blendInfo.energy,
      smartSummary: buildSmartSummary(),
    };

    setSmoothieData(smoothie);
    setMetaData(meta);
  };

  // ------------------------------------
  // SELECT / DELETE INGREDIENT
  // ------------------------------------
  const toggleIngredient = (name) => {
    setSelectedIngredients((prev) =>
      prev.includes(name) ? prev.filter((i) => i !== name) : [...prev, name]
    );
  };

  // ------------------------------------
  // ACTIVE FREQUENCY TRACK
  // ------------------------------------
  const activeFrequency =
    (tripleProfile && tripleProfile.combined) ||
    (tripleProfile && tripleProfile.main) ||
    432;

  const activeTrack = smoothieData
    ? {
        id: "smoothie-galactic",
        label: smoothieData.name,
        description:
          metaData?.energyType ||
          "Custom galactic elixir tuned to your chosen focus.",
        frequency: activeFrequency,
        profile: tripleProfile,
        externalLinks: {
          youtube:
            "https://www.youtube.com/results?search_query=432hz+healing+frequency",
          spotify: "https://open.spotify.com/search/432hz",
          appleMusic: null,
        },
      }
    : null;

  // ------------------------------------
  // RENDER
  // ------------------------------------
  return (
    <div className="frequency-lab-shell cosmic-nebula-page">
      <div className="cosmic-nebula-inner space-y-10 animate-fadeIn">

        {/* ====================== */}
        {/* HEADER */}
        {/* ====================== */}
        <header className="flex flex-col gap-3">
          <p className="text-xs uppercase tracking-[0.3em] text-emerald-300/80">
            Smoothies • Frequencies • Flow
          </p>
          <h1 className="text-3xl md:text-4xl font-semibold text-emerald-300 hologram-text">
            Smoothie Frequency Lab
          </h1>
          <p className="text-sm md:text-base text-emerald-100/80 max-w-2xl">
            Design a{" "}
            <span className="text-emerald-300 font-semibold">
              Galactic Healing Elixir
            </span>{" "}
            and auto-generate a frequency tuned to your ingredients, focus, and
            vibe — then send it into the{" "}
            <span className="text-emerald-300 font-semibold">
              Galactic Frequency Chamber
            </span>
            .
          </p>
        </header>

        {/* ------------------------------------------------ */}
        {/* Primary Focus + Search */}
        {/* ------------------------------------------------ */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="galactic-card">
            <p className="text-[11px] uppercase tracking-[0.2em] text-emerald-300/90 mb-2">
              Primary Healing Focus
            </p>
            <select
              value={healingFocus}
              onChange={(e) => setHealingFocus(e.target.value)}
              className="w-full p-3 bg-black/70 border border-emerald-400/60 rounded-lg text-emerald-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/80"
            >
              <option value="">Select a focus</option>
              <option value="joints">Joint Repair</option>
              <option value="brain">Brain & Focus</option>
              <option value="energy">Energy & Drive</option>
              <option value="detox">Detox & Cleanse</option>
              <option value="gut">Gut & Reflux Ease</option>
              <option value="calm">Calm & Grounding</option>
              <option value="immune">Immunity & Heart Field</option>
            </select>
          </div>

          <IngredientFilter
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
          />
        </section>

        {/* INGREDIENT PICKER */}
        <section className="galactic-card">
          <h2 className="text-lg md:text-xl text-emerald-200 font-semibold mb-4">
            Pick Your Galactic Ingredients
          </h2>
          <IngredientPicker
            selectedIngredients={selectedIngredients}
            toggleIngredient={toggleIngredient}
            searchTerm={searchTerm}
            healingFocus={healingFocus}
          />
        </section>

        {/* SIZE + SMART MODE */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* SIZE */}
          <div className="galactic-card">
            <h2 className="text-lg md:text-xl text-emerald-200 font-semibold mb-3">
              Elixir Size (oz)
            </h2>
            <div className="flex flex-wrap gap-3">
              {[16, 24, 32, 42, 64].map((size) => (
                <button
                  key={size}
                  onClick={() => setBatchSize(size)}
                  className={`size-pill ${
                    batchSize === size ? "size-pill-active" : ""
                  }`}
                >
                  {size} oz
                </button>
              ))}
            </div>
          </div>

          {/* SMART MODE */}
          <div className="galactic-card">
            <div className="flex items-center justify-between mb-4 gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.25em] text-emerald-300/90 mb-1">
                  Smart Mode (Light)
                </p>
                <p className="text-xs text-emerald-100/70">
                  Adjusts the frequency based on your aura template.
                </p>
              </div>

              <button
                onClick={() => setSmartMode((prev) => !prev)}
                className={`px-5 py-2 rounded-full text-[11px] font-semibold border transition ${
                  smartMode
                    ? "bg-emerald-400 text-black border-emerald-100 shadow-[0_0_18px_rgba(16,185,129,0.9)]"
                    : "bg-black/70 text-emerald-100 border-emerald-700 hover:bg-emerald-700/40"
                }`}
              >
                {smartMode ? "Smart Mode ON" : "Enable Smart Mode"}
              </button>
            </div>

            {smartMode && (
              <div className="grid grid-cols-2 gap-3 text-xs">
                <input
                  placeholder="Age"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  className="input-field"
                />
                <select
                  value={sex}
                  onChange={(e) => setSex(e.target.value)}
                  className="input-field"
                >
                  <option value="">Sex</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
                <select
                  value={activity}
                  onChange={(e) => setActivity(e.target.value)}
                  className="input-field col-span-2 sm:col-span-1"
                >
                  <option value="">Activity Level</option>
                  <option value="low">Low</option>
                  <option value="medium">Moderate</option>
                  <option value="high">High</option>
                </select>
                <textarea
                  placeholder="Notes / symptoms"
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="input-field col-span-2 resize-none"
                />
              </div>
            )}
          </div>
        </section>

        {/* GENERATE BUTTON */}
        <section className="flex justify-center">
          <button
            onClick={handleGenerate}
            className="px-10 py-3 rounded-full bg-emerald-500 text-black font-semibold shadow-[0_0_28px_rgba(16,185,129,0.9)] hover:bg-emerald-400 hover:scale-105 transition-transform"
          >
            🧬 Generate Galactic Smoothie + Frequency
          </button>
        </section>

        {/* TRIPLE-STACK + RESULT + PLAYER */}
        {smoothieData && (
          <section className="space-y-10">

            {/* Triple Stack */}
            {tripleProfile && (
              <div className="galactic-card triple-stack-grid">
                <div>
                  <p className="triple-label">Mind Stack</p>
                  <p className="triple-value">{tripleProfile.main} Hz</p>
                  <p className="triple-caption">
                    Core healing tone mapped to your focus.
                  </p>
                </div>

                <div>
                  <p className="triple-label">Aura Stack</p>
                  <p className="triple-value">
                    {tripleProfile.aura || "—"} Hz
                  </p>
                  <p className="triple-caption">Smart Mode aura calibration.</p>
                </div>

                <div>
                  <p className="triple-label">Combined Field</p>
                  <p className="triple-value">{tripleProfile.combined} Hz</p>
                  <p className="triple-caption">Your final listening frequency.</p>
                </div>
              </div>
            )}

            {/* Smoothie Result */}
            <ResultDisplay smoothie={smoothieData} meta={metaData} />

            {/* Player */}
            <div className="galactic-card">
              <h2 className="text-lg md:text-xl text-emerald-200 font-semibold mb-3">
                Play Your Galactic Elixir Frequency
              </h2>
              <FrequencyPlayer
                track={activeTrack}
                fallbackFrequency={activeFrequency}
                tripleProfile={tripleProfile}
              />

              {activeTrack?.externalLinks && (
                <div className="mt-4 flex flex-wrap gap-3 text-xs justify-center">
                  {activeTrack.externalLinks.youtube && (
                    <a
                      href={activeTrack.externalLinks.youtube}
                      target="_blank"
                      rel="noreferrer"
                      className="platform-pill youtube-pill"
                    >
                      Open on YouTube
                    </a>
                  )}
                  {activeTrack.externalLinks.spotify && (
                    <a
                      href={activeTrack.externalLinks.spotify}
                      target="_blank"
                      rel="noreferrer"
                      className="platform-pill spotify-pill"
                    >
                      Open on Spotify
                    </a>
                  )}
                  {activeTrack.externalLinks.appleMusic && (
                    <a
                      href={activeTrack.externalLinks.appleMusic}
                      target="_blank"
                      rel="noreferrer"
                      className="platform-pill apple-pill"
                    >
                      Open on Apple Music
                    </a>
                  )}
                </div>
              )}
            </div>

            {/* CHAMBER BUTTON */}
            <div className="flex justify-center">
              <button
                onClick={() => setIsChamberOpen(true)}
                className="px-10 py-3 rounded-full bg-indigo-500 text-white font-semibold shadow-[0_0_28px_rgba(129,140,248,0.9)] hover:bg-indigo-400 hover:scale-105 transition-transform"
              >
                Enter Galactic Frequency Chamber 🚀
              </button>
            </div>
          </section>
        )}

        {/* FULLSCREEN CHAMBER */}
        {isChamberOpen && activeTrack && (
          <FrequencyChamber
            track={activeTrack}
            userTier={userTier}
            tripleProfile={tripleProfile}
            onClose={() => setIsChamberOpen(false)}
          />
        )}
      </div>
    </div>
  );
};

export default FrequencyLab;




