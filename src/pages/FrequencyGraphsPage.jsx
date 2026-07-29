// src/pages/FrequencyGraphsPage.jsx
import React from "react";

export default function FrequencyGraphsPage() {
  const chakraLevels = [0.6, 0.7, 0.5, 0.8, 0.75, 0.65, 0.72];
  const chakraNames = [
    "Root",
    "Sacral",
    "Solar",
    "Heart",
    "Throat",
    "Third Eye",
    "Crown",
  ];

  return (
    <div className="cosmic-frequency-page">
      <main className="frequency-lab-container mx-auto max-w-6xl px-4 pb-24 space-y-10">
        <section className="fade-section space-y-3">
          <p className="text-[11px] tracking-[0.28em] uppercase text-emerald-200/80">
            Energy Dashboard
          </p>
          <h1 className="frequency-section-title">Chakras • Aura • Waveform</h1>
          <p className="frequency-section-subtitle">
            A visual playground to see how your Nature&apos;s Elixirz field
            could be mapped across chakras, aura rings, and waveform patterns.
            In future phases this can tie into your session data.
          </p>
        </section>

        <section className="fade-section grid gap-8 md:grid-cols-[1.4fr,minmax(0,1fr)]">
          {/* Chakra bars + waveform */}
          <div className="space-y-6">
            <div className="galactic-card">
              <h2 className="text-sm font-semibold text-emerald-50 mb-2">
                Chakra Flow • Example Mapping
              </h2>
              <p className="text-xs text-emerald-100/80 mb-3">
                Each bar represents a chakra channel as if you ran a full
                Nature&apos;s Elixirz session today. These are demo values to
                show the visual system.
              </p>

              <div className="chakra-bar-grid">
                {chakraLevels.map((level, idx) => (
                  <div key={chakraNames[idx]} className="chakra-bar-col">
                    <div className="chakra-bar-track">
                      <div
                        className="chakra-bar-fill"
                        style={{ height: `${level * 100}%` }}
                      />
                    </div>
                    <span className="chakra-bar-label">
                      {chakraNames[idx]}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="waveform-shell">
              <div className="waveform-gradient" />
              <h3 className="text-xs font-semibold text-emerald-50 mb-1">
                Waveform Field • 432–528 Hz Blend
              </h3>
              <p className="text-[11px] text-emerald-100/80 mb-2">
                A stylized visualization of your blended Hz session over time.
              </p>
              <div className="waveform-lines">
                {Array.from({ length: 60 }).map((_, i) => {
                  const heightFactor =
                    Math.sin(i / 4) * 0.4 + Math.random() * 0.4 + 0.4;
                  return (
                    <div
                      key={i}
                      className="waveform-line"
                      style={{ height: `${heightFactor * 100}%` }}
                    />
                  );
                })}
              </div>
            </div>
          </div>

          {/* Aura radar */}
          <div className="galactic-card flex flex-col items-center gap-4">
            <h2 className="text-sm font-semibold text-emerald-50">
              Aura Radar • Hybrid Field
            </h2>
            <p className="text-xs text-emerald-100/80 text-center max-w-xs">
              Think of this as a cosmic snapshot of how balanced your field
              feels after a Nature&apos;s Elixirz session. The inner core
              represents your grounded self, the rings the outward aura.
            </p>

            <div className="aura-radar">
              <div className="aura-ring aura-ring-1" />
              <div className="aura-ring aura-ring-2" />
              <div className="aura-ring aura-ring-3" />
              <div className="aura-core">You</div>
              <p className="aura-ring-label">EarthSync • Field Snapshot</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
