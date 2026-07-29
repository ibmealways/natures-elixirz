// src/pages/TaiChiStudio.jsx
import React from "react";
import "../styles/CosmicShell.css";

export default function TaiChiStudio() {
  return (
    <div className="cosmic-page-shell">

      {/* EMBEDDED PAGE HEADER (MATCHES NEW SYSTEM) */}
      <section className="relative border-b border-emerald-400/20 bg-black/60 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-5 py-6 space-y-2">
          <p className="text-[0.65rem] tracking-[0.32em] uppercase text-emerald-300/80">
            EarthSync Hybrid Reactor
          </p>

          <h1 className="text-2xl md:text-3xl font-semibold text-emerald-100">
            Daily Tai Chi Healing Flow
          </h1>

          <p className="text-sm text-emerald-200/80">
            Morning • Sunset • Recovery
          </p>
        </div>
      </section>

      {/* MAIN CONTENT */}
      <main className="cosmic-main">
        <div className="cosmic-frequency-page">
          <div className="frequency-lab-container frequency-full-wrapper px-4 md:px-6 pb-16">

            {/* HERO */}
            <section className="fade-section mb-10">
              <div className="max-w-4xl mx-auto text-center">
                <p className="text-xs uppercase tracking-[0.35em] text-sky-200/85 mb-3 hologram-text">
                  Morning • Sunset • Recovery
                </p>

                <h2 className="frequency-section-title mb-3">
                  Daily Tai Chi Healing Flow
                </h2>

                <p className="frequency-section-subtitle mx-auto">
                  Rotate between{" "}
                  <span className="text-sky-300 font-semibold">
                    gentle mobility, joint repair, and long-life breathwork
                  </span>{" "}
                  sequences designed for you and Heather — synchronized with
                  your Nature&apos;s Elixirz healing stack.
                </p>
              </div>
            </section>

            {/* MAIN GRID */}
            <section className="fade-section">
              <div className="max-w-6xl mx-auto grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1.1fr)]">

                {/* LEFT: PROGRAMS */}
                <div className="frequency-card">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-semibold uppercase tracking-[0.26em] text-sky-100/90">
                      Flow Programs
                    </h3>
                    <span className="text-[0.7rem] text-sky-100/80">
                      Choose a lane to begin
                    </span>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-3">

                    {/* PROGRAM CARDS */}
                    {[
                      {
                        level: "Level 1 • Core",
                        title: "Beginner Joint-Safe Flow",
                        desc: "10–15 min standing flow for knees, hips, neck & shoulders.",
                        color: "sky",
                      },
                      {
                        level: "Level 2 • Restore",
                        title: "Joint Reset & Fascia Flow",
                        desc: "18–22 min decompression & breath opening sequence.",
                        color: "emerald",
                      },
                      {
                        level: "Level 3 • Energize",
                        title: "Morning Qi Charge",
                        desc: "12–18 min rhythm for circulation & balance.",
                        color: "amber",
                      },
                      {
                        level: "Level 0 • Wind-Down",
                        title: "Night Nerve Calm",
                        desc: "Slow sequence for migraines, spine & nervous system.",
                        color: "fuchsia",
                      },
                    ].map((p) => (
                      <button
                        key={p.title}
                        className={`rounded-2xl border border-${p.color}-400/70 bg-${p.color}-950/60 px-4 py-3 text-left transition hover:bg-${p.color}-900/80`}
                      >
                        <div className={`text-[0.7rem] uppercase tracking-[0.18em] text-${p.color}-200`}>
                          {p.level}
                        </div>
                        <div className={`text-sm font-semibold text-${p.color}-50`}>
                          {p.title}
                        </div>
                        <p className={`mt-1 text-[0.75rem] text-${p.color}-100/85`}>
                          {p.desc}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* RIGHT: STACK */}
                <div className="frequency-card frequency-card-active">
                  <h3 className="text-xs font-semibold uppercase tracking-[0.26em] text-sky-50/90 mb-3">
                    Today&apos;s Tai Chi Stack
                  </h3>

                  <p className="text-sm text-sky-100/90">
                    Beginner Joint-Safe Flow + Night Nerve Calm  
                    paired with joint-focused smoothie + 432 Hz session.
                  </p>

                  <button
                    className="mt-4 inline-flex items-center justify-center rounded-full border border-sky-300/80 bg-sky-500/10 px-4 py-2 text-[0.8rem] font-semibold text-sky-50 hover:bg-sky-500/20 transition"
                  >
                    Open Audio Guide & Video Demo
                  </button>
                </div>

              </div>
            </section>

          </div>
        </div>
      </main>
    </div>
  );
}

