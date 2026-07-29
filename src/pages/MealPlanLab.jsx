// src/pages/MealPlanLab.jsx
import React from "react";
import "../styles/CosmicShell.css";

import { useMRVI } from "../context/MRVIContext";
import { getMealGuidanceForFocus } from "../utilities/mrviRecommendations";

export default function MealPlanLab() {
  const { latestScan } = useMRVI();
  const focus = latestScan?.output?.focus || "MAINTENANCE";
  const guidance = getMealGuidanceForFocus(focus);

  return (
    <div className="cosmic-page-shell">

      {/* EMBEDDED PAGE HEADER */}
      <section className="relative border-b border-emerald-400/20 bg-black/60 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-5 py-6 space-y-2">
          <p className="text-[0.65rem] tracking-[0.32em] uppercase text-emerald-300/80">
            EarthSync Hybrid Reactor
          </p>

          <h1 className="text-2xl md:text-3xl font-semibold text-emerald-100">
            Healing Meal Blueprint
          </h1>

          <p className="text-sm text-emerald-200/80">
            Clean • Anti-Inflammatory • Easy
          </p>
        </div>
      </section>

      {/* PAGE CONTENT */}
      <div className="cosmic-frequency-page">
        <main className="frequency-lab-container frequency-full-wrapper px-4 md:px-6 pb-16">

          {/* MRVI MEAL FOCUS */}
          <section className="fade-section mb-10">
            <div className="max-w-4xl mx-auto frequency-card">
              <div className="text-xs uppercase tracking-[0.3em] text-emerald-300 mb-2">
                MRVI Meal Focus
              </div>

              <ul className="space-y-2 text-sm text-emerald-50/90">
                {guidance.map((g, i) => (
                  <li key={i}>• {g}</li>
                ))}
              </ul>
            </div>
          </section>

          {/* YOUR EXISTING MEAL GRID CONTINUES BELOW */}
          {/* NOTHING ELSE CHANGED */}

        </main>
      </div>
    </div>
  );
}
