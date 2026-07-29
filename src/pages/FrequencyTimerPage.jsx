// src/pages/FrequencyTimerPage.jsx
import React from "react";

export default function FrequencyTimerPage() {
  // For now, this is a static display timer (session 20:00).
  // In a later phase we can hook this to actual timers + controls.
  const sessionLength = "20:00";

  return (
    <div className="cosmic-frequency-page">
      <main className="frequency-lab-container mx-auto max-w-4xl px-4 pb-24 space-y-8">
        <section className="fade-section space-y-3">
          <p className="text-[11px] tracking-[0.28em] uppercase text-emerald-200/80">
            Session Timer
          </p>
          <h1 className="frequency-section-title">EarthSync Session Clock</h1>
          <p className="frequency-section-subtitle">
            Use this as a visual anchor for your Nature&apos;s Elixirz
            frequency sessions. In a later upgrade, this will run real session
            timers and integrate with the chamber.
          </p>
        </section>

        <section className="galactic-card fade-section flex flex-col items-center gap-6">
          <div className="timer-orbit-shell">
            <div className="timer-orbit timer-orbit-outer" />
            <div className="timer-orbit timer-orbit-middle" />
            <div className="timer-orbit timer-orbit-inner" />
            <div className="timer-core">
              <div className="timer-time">{sessionLength}</div>
              <div className="timer-caption">
                Suggested Nature&apos;s Elixirz session
              </div>
            </div>
          </div>

          <p className="text-xs text-emerald-100/90 max-w-md text-center">
            As you sip your smoothie and listen to your chosen frequency, let
            this orbit timer be your anchor. Close your eyes when you&apos;re
            ready and open them when you intuitively feel complete or when the
            timer ends.
          </p>
        </section>
      </main>
    </div>
  );
}

