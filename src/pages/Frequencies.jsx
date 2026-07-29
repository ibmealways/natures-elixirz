// ===========================================================
// Frequencies.jsx — PREMIUM COSMIC EDITION
// Unified UI • GlowNav Only • Full EarthSync Chamber System
// ===========================================================

import React, { useState } from "react";
import GlowNav from "../components/GlowNav";
import "../styles/frequencies.css";
import "../styles/CosmicShell.css"; // premium-shell background

export default function Frequencies() {
  const [isChamberOpen, setIsChamberOpen] = useState(false);

  const openChamber = () => setIsChamberOpen(true);
  const closeChamber = () => setIsChamberOpen(false);

  return (
    <div className="cosmic-page-shell">

      {/* PREMIUM NAVIGATION */}
      <GlowNav />

      {/* MAIN PAGE WRAPPER */}
      <div className="cosmic-frequency-page">
        <div className="frequency-bg-layer" />
        <div className="frequency-bg-noise" />
        <div className="cosmic-aurora-layer" />
        <div className="cosmic-particles-layer" />

        {/* ===========================
            MAIN CONTENT
        ============================ */}
        <main className="frequency-lab-container frequency-full-wrapper">

          {/* HERO SECTION */}
          <section className="fade-section mb-12 px-4 md:px-6">
            <div className="max-w-5xl mx-auto text-center">

              <h1 className="frequency-section-title mb-4 hologram-text">
                Vibrational Frequency Lab
              </h1>

              <p className="frequency-section-subtitle">
                Synchronize your field with the  
                <span className="text-emerald-300 font-semibold"> 432 Hz Galactic Core </span>  
                and the  
                <span className="text-sky-300 font-semibold"> EarthSync Hybrid Reactor</span>.  
                Recalibrate your energy. Expand your blueprint.
              </p>

              <div className="mt-6 flex flex-col sm:flex-row justify-center items-center gap-5">
                <button
                  type="button"
                  onClick={openChamber}
                  className="chamber-launch-btn"
                >
                  Enter 432 Hz Chamber
                </button>

                <p className="max-w-xs text-sm text-slate-200/90">
                  Activate body–aura–mind coherence with one session.
                </p>
              </div>

            </div>
          </section>

          {/* ===========================
              CORE GRID: ORB + TRACK CARD
          ============================ */}
          <section className="fade-section px-4 md:px-6 mb-14">
            <div className="max-w-6xl mx-auto grid gap-8 md:grid-cols-[1fr_1.3fr] items-start">

              {/* LEFT: MINI ORB + VISUALIZER */}
              <div className="relative flex flex-col items-center gap-6">

                {/* ORBITAL RINGS */}
                <div className="chamber-page-inner">
                  <div className="chamber-page-ring" />
                  <div className="chamber-page-ring chamber-page-ring-2" />

                  {/* MINI GALACTIC ORB */}
                  <div className="chamber-orb-shell">
                    <div className="earthsync-ring" />
                    <div className="chamber-aura-ring chamber-aura-ring-outer" />
                    <div className="chamber-aura-ring chamber-aura-ring-inner" />

                    <div className="chamber-orb-core">
                      <div className="chamber-orb-label">Active Field</div>
                      <div className="chamber-orb-frequency">432 Hz</div>
                      <div className="chamber-orb-caption">Core Healing Tone</div>
                      <div className="chamber-earthsync-tag">EarthSync Reactor</div>
                    </div>
                  </div>

                  <div className="mt-4 chamber-triple-stack">
                    <span className="chamber-chip chip-body">Body · 432 Hz</span>
                    <span className="chamber-chip chip-aura">Aura · 439 Hz</span>
                    <span className="chamber-chip chip-mind">Mind · 443 Hz</span>
                  </div>
                </div>

                {/* VISUALIZER */}
                <div className="visualizer-container w-full max-w-md">
                  <div className="visualizer-header">
                    <span className="visualizer-label">Omni-Field Visualizer</span>
                    <span className="visualizer-mode">Body • Aura • Mind</span>
                  </div>

                  <div className="frequency-visualizer-shell frequency-visualizer-playing">
                    <div className="frequency-visualizer">
                      {Array.from({ length: 48 }).map((_, i) => (
                        <div
                          key={i}
                          className="frequency-bar frequency-bar-active"
                          style={{ animationDelay: `${(i % 8) * 0.07}s` }}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="visualizer-footer">
                    <span className="visualizer-band visualizer-band-low">LOW · BODY</span>
                    <span className="visualizer-band visualizer-band-mid">MID · AURA</span>
                    <span className="visualizer-band visualizer-band-high">HIGH · MIND</span>
                  </div>
                </div>
              </div>

              {/* RIGHT: TRACK CARD */}
              <div className="frequency-card p-6">
                <div className="chamber-track-label">Active Track</div>
                <h2 className="chamber-track-title">432 Hz • Auto-Matched</h2>

                <p className="chamber-track-desc mb-4">
                  Tuned for grounding, nervous system stabilizing, and  
                  <span className="text-emerald-300 font-semibold"> heart field coherence</span>.
                </p>

                <div className="flex flex-wrap gap-2 mb-5">
                  <span className="chamber-chip chip-body">Grounding</span>
                  <span className="chamber-chip chip-aura">Nervous System</span>
                  <span className="chamber-chip chip-mind">Heart Field</span>
                </div>

                <p className="text-xs uppercase tracking-[0.2em] text-slate-300">
                  Listen on
                </p>

                <div className="flex flex-wrap gap-2 mt-2">
                  <a className="platform-pill youtube-pill">YT</a>
                  <a className="platform-pill spotify-pill">Spotify</a>
                  <a className="platform-pill apple-pill">Apple</a>
                  <a className="platform-pill amazon-pill">Amazon</a>
                </div>

                {/* LEVEL SELECTOR */}
                <div className="chamber-levels mt-6">
                  <div className="chamber-levels-label">
                    Session Intensity · EarthSync Field
                  </div>

                  <div className="chamber-level-pill-row">
                    <button className="chamber-level-pill chamber-level-pill-active">
                      <span>Level 1</span> Core
                    </button>
                    <button className="chamber-level-pill">
                      <span>Level 2</span> Deep Calm
                    </button>
                    <button className="chamber-level-pill">
                      <span>Level 3</span> Cellular
                    </button>
                    <button className="chamber-level-pill chip-vortex">
                      <span>EarthSync</span> Auto
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </main>

        {/* ===========================
            FULL-SCREEN EARTHSYNC CHAMBER
        ============================ */}
        {isChamberOpen && (
          <div className="frequency-chamber-screen earthsync-bg">
            <div className="frequency-chamber-dark-overlay" />
            <div className="cosmic-particles" />

            <button className="chamber-exit-btn" onClick={closeChamber}>
              ✕
            </button>

            <div className="chamber-inner">

              {/* HEADER */}
              <header className="chamber-header mb-8">
                <p className="chamber-kicker">Level 1 • Core Field</p>
                <h2 className="chamber-title">432 Hz Galactic Chamber</h2>

                <p className="chamber-subtitle">
                  Let your field align with the  
                  <span className="chamber-subtitle-strong"> EarthSync Reactor </span>  
                  for nervous system reset and heart–mind coherence.
                </p>
              </header>

              {/* MAIN GRID */}
              <div className="chamber-main-grid">
                
                {/* ORB PANEL */}
                <div className="chamber-orb-panel">
                  <div className="chamber-orb-shell">
                    <div className="earthsync-ring" />
                    <div className="chamber-vortex-ring chamber-vortex-ring-outer" />
                    <div className="chamber-vortex-ring chamber-vortex-ring-inner" />
                    <div className="chamber-aura-ring chamber-aura-ring-outer" />
                    <div className="chamber-aura-ring chamber-aura-ring-inner" />

                    <div className="chamber-orb-core">
                      <div className="chamber-orb-label">Core Field Active</div>
                      <div className="chamber-orb-frequency">432 Hz</div>
                      <div className="chamber-orb-caption">
                        Chamber stabilized • resonance optimal
                      </div>
                      <div className="chamber-earthsync-tag">
                        EarthSync • Nature’s Elixirz
                      </div>
                    </div>
                  </div>

                  <div className="chamber-triple-stack mt-4">
                    <span className="chamber-chip chip-body">Body · 432 Hz</span>
                    <span className="chamber-chip chip-aura">Aura · 439 Hz</span>
                    <span className="chamber-chip chip-mind">Mind · 443 Hz</span>
                  </div>
                </div>

                {/* CONTROL PANEL */}
                <div className="chamber-controls-panel">

                  {/* TRACK CARD */}
                  <div className="chamber-track-card mb-8">
                    <div className="chamber-track-label">Current Session</div>
                    <div className="chamber-track-title">
                      432 Hz • Auto-Matched
                    </div>

                    <p className="chamber-track-desc">
                      Designed for grounding, calm, and heart expansion.
                    </p>

                    <div className="chamber-streaming-row mt-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-300">
                        Listen on
                      </p>

                      <div className="flex flex-wrap gap-2 mt-2">
                        <a className="platform-pill youtube-pill">YouTube</a>
                        <a className="platform-pill spotify-pill">Spotify</a>
                        <a className="platform-pill apple-pill">Apple</a>
                        <a className="platform-pill amazon-pill">Amazon</a>
                      </div>
                    </div>
                  </div>

                  {/* SESSION TIMER */}
                  <div className="chamber-card">
                    <div className="chamber-card-header">
                      <h4>Session Timer</h4>
                      <span className="chamber-card-tag">EarthSync Flow</span>
                    </div>

                    <p className="chamber-card-text">
                      For full recalibration, 22–33 minutes optimizes your biological field.
                    </p>

                    <div className="flex flex-col md:flex-row gap-6 mt-4">
                      <div className="timer-orbit-shell">
                        <div className="timer-orbit timer-orbit-outer" />
                        <div className="timer-orbit timer-orbit-middle" />
                        <div className="timer-orbit timer-orbit-inner" />

                        <div className="timer-core">
                          <div className="timer-time">22:00</div>
                          <div className="timer-caption">
                            Suggested EarthSync Window
                          </div>
                        </div>
                      </div>

                      <div className="flex-1 flex flex-col gap-4">

                        {/* SLIDER */}
                        <div className="chamber-slider-row">
                          <div className="chamber-mini-label">Duration</div>
                          <input type="range" min="7" max="44" defaultValue="22" className="chamber-slider" />
                          <div className="chamber-slider-meta">
                            <span>7m reset</span>
                            <span>22m deep</span>
                            <span>44m immersion</span>
                          </div>
                        </div>

                        {/* AI SETTINGS */}
                        <div className="chamber-ai-grid">
                          <div>
                            <div className="chamber-mini-label">Goal Focus</div>
                            <select className="chamber-select">
                              <option>Grounding + Calm</option>
                              <option>Healing + Recovery</option>
                              <option>Focus + Creativity</option>
                              <option>Sleep + Restoration</option>
                            </select>
                          </div>

                          <div>
                            <div className="chamber-mini-label">EarthSync Smart Mode</div>
                            <select className="chamber-select">
                              <option>Auto-tune to my field</option>
                              <option>Keep stable 432 Hz</option>
                              <option>Slow downward spiral</option>
                            </select>
                          </div>
                        </div>

                        <div className="chamber-ai-result">
                          Session calibrated for <span>deep grounding</span> and{" "}
                          <span>nervous system reset</span>.
                        </div>

                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <button className="chamber-close-bottom" onClick={closeChamber}>
                Close Chamber
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

