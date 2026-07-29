// src/components/SmoothieBuilder.jsx
import React, { useState } from "react";
import generateSmoothie from "../utilities/generateSmoothie";
import ingredients from "../data/ingredients.json";
import ResultDisplay from "./ResultDisplay";
import RecipeCard from "./RecipeCard";
// If you already have an IngredientPicker component, import it here
// import IngredientPicker from "./IngredientPicker";

const STANDARD_SIZES = [16, 24, 32, 42, 64];

export default function SmoothieBuilder() {
  const [selectedIngredients, setSelectedIngredients] = useState({
    fruits: [],
    veggies: [],
    seeds: [],
    spices: [],
    extras: [],
  });

  const [selectedSize, setSelectedSize] = useState(32);
  const [result, setResult] = useState(null);

  // SMART MODE STATE
  const [smartModeEnabled, setSmartModeEnabled] = useState(false);
  const [userHeight, setUserHeight] = useState(""); // inches
  const [userSex, setUserSex] = useState("male"); // "male" | "female" | "other"

  const handleGenerateSmoothie = () => {
    const smoothie = generateSmoothie(selectedIngredients, {
      size: selectedSize,
      smartMode: smartModeEnabled
        ? {
            enabled: true,
            height: userHeight ? Number(userHeight) : null,
            sex: userSex,
          }
        : { enabled: false },
    });

    setResult(smoothie);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-slate-50 px-4 py-6 sm:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        {/* HEADER */}
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Nature&apos;s Elixirz – Smoothie Alchemy Lab
          </h1>
          <p className="text-sm text-slate-300">
            Choose your ingredients, activate Smart Mode, and let the app
            generate a cosmic healing smoothie just for you.
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.5fr)]">
          {/* LEFT: CONTROLS */}
          <div className="space-y-5">
            {/* INGREDIENT PICKER AREA */}
            <section className="rounded-2xl border border-slate-800/80 bg-slate-950/70 p-4 shadow-lg shadow-black/40">
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-200">
                Ingredients
              </h2>
              <p className="mb-4 text-xs text-slate-400">
                Select fruits, veggies, seeds, and boosters for your elixir.
              </p>

              {/* If you have a dedicated IngredientPicker component, use that instead of this placeholder UI */}
              {/* <IngredientPicker
                ingredients={ingredients}
                selectedIngredients={selectedIngredients}
                setSelectedIngredients={setSelectedIngredients}
              /> */}

              {/* SIMPLE PLACEHOLDER: just show what’s available */}
              <div className="grid gap-3 text-xs sm:grid-cols-2">
                {Object.entries(ingredients).map(([category, list]) => (
                  <div key={category}>
                    <p className="mb-1 font-semibold capitalize text-slate-200">
                      {category}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {list.map((item) => {
                        const isSelected =
                          selectedIngredients[category]?.includes(item);
                        return (
                          <button
                            key={item}
                            type="button"
                            onClick={() => {
                              setSelectedIngredients((prev) => {
                                const current = prev[category] || [];
                                return {
                                  ...prev,
                                  [category]: isSelected
                                    ? current.filter((x) => x !== item)
                                    : [...current, item],
                                };
                              });
                            }}
                            className={`rounded-full border px-2 py-1 ${
                              isSelected
                                ? "border-purple-400 bg-purple-500/20 text-purple-100"
                                : "border-slate-700 bg-slate-900/70 text-slate-300 hover:border-purple-400/70 hover:text-purple-100"
                            }`}
                          >
                            {item}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* SIZE SELECTOR */}
            <section className="rounded-2xl border border-slate-800/80 bg-slate-950/70 p-4 shadow-lg shadow-black/40">
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-200">
                Size (oz)
              </h2>
              <p className="mb-3 text-xs text-slate-400">
                Pick a size or let Smart Mode auto-tune it for you.
              </p>
              <div className="flex flex-wrap gap-2">
                {STANDARD_SIZES.map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setSelectedSize(size)}
                    className={`rounded-xl px-3 py-1.5 text-sm font-medium transition ${
                      selectedSize === size
                        ? "bg-purple-500 text-white shadow shadow-purple-700/60"
                        : "bg-slate-900/80 text-slate-200 hover:bg-slate-800"
                    }`}
                  >
                    {size} oz
                  </button>
                ))}
              </div>
            </section>

            {/* SMART MODE SECTION */}
            <section className="rounded-2xl border border-purple-500/40 bg-gradient-to-br from-slate-900/80 via-slate-950/90 to-indigo-950/80 p-4 shadow-lg shadow-purple-900/40">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold tracking-wide text-purple-200 uppercase">
                    Smart Mode
                  </h3>
                  <p className="text-xs text-slate-300">
                    Auto-tune smoothie size and energy profile using your
                    height &amp; sex.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setSmartModeEnabled((prev) => !prev)}
                  className={`relative inline-flex h-7 w-12 items-center rounded-full transition ${
                    smartModeEnabled ? "bg-purple-500" : "bg-slate-600"
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-slate-900 shadow transition ${
                      smartModeEnabled ? "translate-x-5" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              {smartModeEnabled && (
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  {/* Height */}
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-slate-200">
                      Height{" "}
                      <span className="text-[10px] text-slate-400">
                        (inches)
                      </span>
                    </label>
                    <input
                      type="number"
                      min="48"
                      max="84"
                      value={userHeight}
                      onChange={(e) => setUserHeight(e.target.value)}
                      placeholder="e.g. 70"
                      className="rounded-xl border border-slate-700/70 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-500"
                    />
                  </div>

                  {/* Sex */}
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-slate-200">
                      Sex
                    </label>
                    <select
                      value={userSex}
                      onChange={(e) => setUserSex(e.target.value)}
                      className="rounded-xl border border-slate-700/70 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-500"
                    >
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other / Prefer not to say</option>
                    </select>
                  </div>
                </div>
              )}
            </section>

            {/* GENERATE BUTTON */}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleGenerateSmoothie}
                className="rounded-2xl bg-purple-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-purple-700/60 transition hover:bg-purple-400"
              >
                Generate Smoothie
              </button>
            </div>
          </div>

          {/* RIGHT: RESULT + RECIPE */}
          <div className="space-y-4">
            <section className="rounded-2xl border border-slate-800/80 bg-slate-950/80 p-4 shadow-lg shadow-black/40">
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-200">
                Result
              </h2>
              {result ? (
                <ResultDisplay smoothie={result} />
              ) : (
                <p className="text-xs text-slate-400">
                  Your cosmic elixir will appear here after you generate it.
                </p>
              )}
            </section>

            {result && (
              <section className="rounded-2xl border border-slate-800/80 bg-slate-950/80 p-4 shadow-lg shadow-black/40">
                <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-200">
                  Recipe Card
                </h2>
                <RecipeCard smoothie={result} />
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
