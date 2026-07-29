// src/pages/PremiumPortal.jsx

import React, { useState } from "react";
import { tiers } from "../data/premiumData";

export default function PremiumPortal() {
  const [billingMode, setBillingMode] = useState("monthly");
  const [selectedTierId, setSelectedTierId] = useState(1);

  return (
    <div className="cosmic-page-shell">
      {/* =============================
          EMBEDDED PAGE HEADER
      ============================== */}
      <section className="relative border-b border-emerald-400/20 bg-black/60 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-5 py-6 space-y-2">
          <p className="text-[0.65rem] tracking-[0.32em] uppercase text-emerald-300/80">
            EarthSync Hybrid Reactor
          </p>
          <h1 className="text-2xl md:text-3xl font-semibold text-emerald-100">
            Premium Portal
          </h1>
          <p className="text-sm text-emerald-200/80">
            Healing • Frequencies • Flow
          </p>
        </div>
      </section>

      {/* =============================
          PAGE CONTENT
      ============================== */}
      <main className="cosmic-main cosmic-nebula-inner space-y-12">

        {/* HERO */}
        <section className="max-w-7xl mx-auto px-5 grid gap-6 md:grid-cols-[1.5fr_1fr]">
          <div className="glass-card-soft p-8">
            <p className="text-xs uppercase tracking-[0.28em] text-indigo-200/80 mb-3">
              Legendary Access • IBMEALWAYZ Tier System
            </p>
            <h2 className="text-4xl font-semibold text-white mb-3">
              Choose Your Healing Depth
            </h2>
            <p className="text-slate-200/85 max-w-xl">
              Each tier unlocks a deeper layer of your
              <span className="hologram-text font-semibold">
                {" "}personalized healing stack
              </span>{" "}
              — smoothies, frequencies, meals, Tai Chi, and long-life wisdom.
            </p>
          </div>

          <div className="rounded-3xl bg-slate-950/90 border border-emerald-300/40 p-7 shadow-[0_0_40px_rgba(16,185,129,0.4)]">
            <p className="text-xs uppercase tracking-[0.26em] text-emerald-300/80 mb-2">
              Starting At
            </p>
            <div className="text-4xl font-semibold text-white">
              $15.99
              <span className="text-sm text-white/60"> /mo</span>
            </div>
            <p className="text-xs text-white/70 mt-2">
              Or $150 yearly • Cancel anytime
            </p>
            <button
              className="mt-5 w-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400 py-2.5 font-semibold text-black"
            >
              Preview Subscription Flow
            </button>
          </div>
        </section>

        {/* =============================
            BILLING TOGGLE
        ============================== */}
        <section className="flex justify-center gap-2">
          {["monthly", "yearly"].map((mode) => (
            <button
              key={mode}
              onClick={() => setBillingMode(mode)}
              className={`px-5 py-2 rounded-full text-sm border transition
                ${
                  billingMode === mode
                    ? "bg-emerald-400 text-black border-emerald-300"
                    : "border-white/20 text-white hover:bg-white/10"
                }`}
            >
              {mode === "monthly" ? "Monthly Billing" : "Yearly Billing"}
            </button>
          ))}
        </section>

        {/* =============================
            TIERS GRID
        ============================== */}
        <section className="max-w-7xl mx-auto px-5 grid gap-6 md:grid-cols-2 xl:grid-cols-5">
          {tiers.map((tier) => (
            <div
              key={tier.id}
              className={`relative rounded-3xl border p-6 backdrop-blur-xl
                ${
                  tier.popular
                    ? "border-emerald-400 bg-emerald-900/20 shadow-[0_0_45px_rgba(16,185,129,0.6)]"
                    : "border-white/10 bg-black/40"
                }`}
            >
              {tier.popular && (
                <span className="absolute -top-3 right-4 rounded-full bg-emerald-400 px-3 py-1 text-xs font-semibold text-black">
                  MOST POPULAR
                </span>
              )}

              <h3 className="text-lg font-semibold text-white">
                Tier {tier.id} — {tier.name}
              </h3>
              <p className="text-xs text-emerald-300/80 mb-4">
                {tier.tagline}
              </p>

              <div className="text-3xl font-semibold text-white mb-1">
                ${billingMode === "monthly" ? tier.monthly : tier.yearly}
              </div>
              <div className="text-xs text-white/60 mb-4">
                {billingMode === "monthly" ? "per month" : "per year"} • recurring
              </div>

              <ul className="space-y-2 text-sm text-white/85 mb-6">
                {tier.features.map((feature, idx) => (
                  <li key={idx}>✓ {feature}</li>
                ))}
              </ul>

              <button
                onClick={() => setSelectedTierId(tier.id)}
                className={`w-full rounded-full py-2 text-sm font-semibold transition
                  ${
                    tier.popular
                      ? "bg-emerald-400 text-black hover:bg-emerald-300"
                      : "bg-white/10 text-white hover:bg-white/20"
                  }`}
              >
                {tier.id === 1 ? "Get Started" : "Upgrade"}
              </button>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}


