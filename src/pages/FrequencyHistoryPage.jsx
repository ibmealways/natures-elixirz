// src/pages/FrequencyHistoryPage.jsx
import React from "react";

export default function FrequencyHistoryPage() {
  return (
    <div className="cosmic-frequency-page">
      <main className="frequency-lab-container mx-auto max-w-5xl px-4 pb-24 space-y-8">
        <section className="fade-section space-y-3">
          <p className="text-[11px] tracking-[0.28em] uppercase text-emerald-200/80">
            Frequency Timeline
          </p>
          <h1 className="frequency-section-title">Session History</h1>
          <p className="frequency-section-subtitle">
            A simple log of your recent Nature&apos;s Elixirz sessions. In a
            later phase, this will be wired to your real account data and
            streak tracking.
          </p>
        </section>

        <section className="galactic-card fade-section">
          <div className="timeline-glow" />
          <div className="space-y-6 relative z-10">
            {/* Example items — replace with live data later */}
            <div className="timeline-item">
              <div className="timeline-left">
                <div className="timeline-dot" />
                <div className="timeline-line" />
              </div>
              <div className="timeline-card">
                <p className="text-xs text-emerald-100/80">
                  Today • 7:23 AM
                </p>
                <p className="text-sm font-semibold text-emerald-50">
                  432 Hz • Heart & Calm
                </p>
                <p className="text-xs text-slate-200/90 mt-1">
                  18-minute session paired with{" "}
                  <span className="text-emerald-300">
                    Galaxy Green Blast: Glow-Up Edition
                  </span>
                  .
                </p>
              </div>
            </div>

            <div className="timeline-item">
              <div className="timeline-left">
                <div className="timeline-dot" />
                <div className="timeline-line" />
              </div>
              <div className="timeline-card">
                <p className="text-xs text-emerald-100/80">Yesterday • 9:11 PM</p>
                <p className="text-sm font-semibold text-emerald-50">
                  528 Hz • DNA & Cellular Repair
                </p>
                <p className="text-xs text-slate-200/90 mt-1">
                  Late-night restorative session for joint + muscle recovery.
                </p>
              </div>
            </div>

            <div className="timeline-item">
              <div className="timeline-left">
                <div className="timeline-dot timeline-dot-pending" />
              </div>
              <div className="timeline-card">
                <p className="text-xs text-emerald-100/80">Queued</p>
                <p className="text-sm font-semibold text-emerald-50">
                  639 Hz • Love, Harmony & Immunity
                </p>
                <p className="text-xs text-slate-200/90 mt-1">
                  Will appear here after your next session with this field.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

