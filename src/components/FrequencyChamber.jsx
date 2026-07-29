// src/components/FrequencyChamber.jsx
import React from "react";

function tierName(tier) {
  if (tier === 1) return "Level 1 • Core Field";
  if (tier === 2) return "Level 2 • Deep Field";
  if (tier === 3) return "Level 3 • Quantum Stack";
  return "Core Field";
}

export default function FrequencyChamber({
  track,
  userTier = 1,
  tripleProfile,
  onClose,
}) {
  const hz = track?.hz ?? 432;
  const label = track?.label ?? `${hz} Hz • Auto-Matched Frequency`;
  const desc =
    track?.description ??
    "Immersive Nature's Elixirz resonance session tuned to your field.";
  const focusTags = track?.focusTags ?? [];

  const mainHz = tripleProfile?.main ?? hz;
  const auraHz = tripleProfile?.aura ?? hz + 7;
  const boostHz = tripleProfile?.quantum?.boost ?? hz + 11;

  const tierLabel = tierName(userTier);

  return (
    <div className="frequency-chamber-screen earthsync-bg">
      {/* EXIT BUTTON */}
      <button
        type="button"
        className="chamber-exit-btn"
        onClick={onClose}
        aria-label="Close chamber"
      >
        ✕
      </button>

      {/* OVERLAYS */}
      <div className="frequency-chamber-dark-overlay" />
      <div className="cosmic-particles" />
      <div className="chamber-page-ring" />
      <div className="chamber-page-ring chamber-page-ring-2" />

      {/* MAIN CONTENT */}
      <div className="chamber-inner animate-fadeIn chamber-page-inner">
        {/* HEADER */}
        <header className="chamber-header">
          <p className="chamber-kicker">{tierLabel}</p>
          <h2 className="chamber-title">
            {hz} Hz Galactic Chamber • Nature&apos;s Elixirz
          </h2>
          <p className="chamber-subtitle">
            Lock into{" "}
            <span className="chamber-subtitle-strong">{label}</span> while your
            field synchronizes with the{" "}
            <span className="chamber-subtitle-strong">
              EarthSync Hybrid Reactor
            </span>{" "}
            and long-life blueprint.
          </p>
        </header>

        {/* GRID: ORB / TIMER + CONTROLS */}
        <div className="chamber-main-grid mt-8">
          {/* LEFT: ORB + TIMER + TRIPLE STACK */}
          <section className="chamber-orb-panel">
            {/* Timer orbit shell */}
            <div className="timer-orbit-shell">
              <div className="timer-orbit timer-orbit-outer" />
              <div className="timer-orbit timer-orbit-middle" />
              <div className="timer-orbit timer-orbit-inner" />
              <div className="timer-core">
                <div className="timer-time">{hz} Hz</div>
                <div className="timer-caption">
                  Active resonance • chamber online
                </div>
              </div>
            </div>

            {/* Hybrid Orb */}
            <div className="chamber-orb-shell">
              <div className="earthsync-ring" />
              <div className="chamber-vortex-ring chamber-vortex-ring-outer" />
              <div className="chamber-vortex-ring chamber-vortex-ring-inner" />
              <div className="chamber-aura-ring chamber-aura-ring-outer" />
              <div className="chamber-aura-ring chamber-aura-ring-inner" />

              <div className="chamber-orb-core">
                <p className="chamber-orb-label">Body • Aura • Mind</p>
                <p className="chamber-orb-frequency">{hz} Hz</p>
                <p className="chamber-orb-caption">
                  Nature&apos;s Elixirz • Hybrid Cosmic Reactor
                </p>
                <span className="chamber-earthsync-tag">
                  EarthSync • 723 Signature
                </span>
              </div>
            </div>

            {/* Triple-stack chips */}
            <div className="chamber-triple-stack">
              <span className="chamber-chip chip-body">
                BODY • {mainHz} Hz
              </span>
              <span className="chamber-chip chip-aura">
                AURA • {auraHz} Hz
              </span>
              <span className="chamber-chip chip-mind">
                MIND BOOST • {boostHz} Hz
              </span>
            </div>
          </section>

          {/* RIGHT: TRACK CARD + LEVELS + SMART / GUIDANCE */}
          <section className="chamber-controls-panel">
            {/* TRACK CARD */}
            <div className="chamber-track-card">
              <p className="chamber-track-label">Active Track</p>
              <h3 className="chamber-track-title">{label}</h3>
              <p className="chamber-track-desc">{desc}</p>

              {focusTags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {focusTags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-400/60 text-[10px] text-emerald-100/90"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Streaming row (optional) */}
              <div className="chamber-streaming-row flex flex-wrap gap-1 mt-3">
                {track?.platforms?.youtube && (
                  <a
                    href={track.platforms.youtube}
                    target="_blank"
                    rel="noreferrer"
                    className="platform-pill youtube-pill text-[9px]"
                  >
                    YT
                  </a>
                )}
                {track?.platforms?.spotify && (
                  <a
                    href={track.platforms.spotify}
                    target="_blank"
                    rel="noreferrer"
                    className="platform-pill spotify-pill text-[9px]"
                  >
                    Spotify
                  </a>
                )}
                {track?.platforms?.apple && (
                  <a
                    href={track.platforms.apple}
                    target="_blank"
                    rel="noreferrer"
                    className="platform-pill apple-pill text-[9px]"
                  >
                    Apple
                  </a>
                )}
                {track?.platforms?.amazon && (
                  <a
                    href={track.platforms.amazon}
                    target="_blank"
                    rel="noreferrer"
                    className="platform-pill amazon-pill text-[9px]"
                  >
                    Amazon
                  </a>
                )}
              </div>
            </div>

            {/* LEVELS */}
            <div className="chamber-levels">
              <p className="chamber-levels-label">
                Session Intensity • Nature&apos;s Elixirz Field
              </p>
              <div className="chamber-level-pill-row">
                <span
                  className={`chamber-level-pill ${
                    userTier === 1 ? "chamber-level-pill-active" : ""
                  }`}
                >
                  <span>Level 1</span>
                  <span>Core Calm</span>
                </span>
                <span
                  className={`chamber-level-pill ${
                    userTier === 2 ? "chamber-level-pill-active" : ""
                  }`}
                >
                  <span>Level 2</span>
                  <span>Deep Reset</span>
                </span>
                <span
                  className={`chamber-level-pill ${
                    userTier === 3 ? "chamber-level-pill-active" : ""
                  }`}
                >
                  <span>Level 3</span>
                  <span>Quantum Stack</span>
                </span>
              </div>
            </div>

            {/* SMART ALIGNMENT CARD */}
            <div className="chamber-card">
              <div className="chamber-card-header">
                <h4>Smart Alignment (Aura + Vibe)</h4>
                <span className="chamber-card-tag">Smart Mode</span>
              </div>
              <p className="chamber-card-text">
                This chamber session syncs with your{" "}
                <strong>Smart Mode</strong> inputs from the main Frequency Lab
                (age, sex, activity, main healing goal). In Phase 3, this will
                auto-adjust session lengths and intensity presets for you.
              </p>
              <div className="chamber-ai-grid">
                <div>
                  <p className="chamber-mini-label">Body Focus</p>
                  <p className="chamber-ai-result">
                    Grounding + nervous system support for{" "}
                    <span>{track?.focusTags?.[0] ?? "core reset"}</span>.
                  </p>
                </div>
                <div>
                  <p className="chamber-mini-label">Aura Focus</p>
                  <p className="chamber-ai-result">
                    Aura tuned to{" "}
                    <span>{track?.focusTags?.[1] ?? "emotional clarity"}</span>{" "}
                    for smoother day-to-day flow.
                  </p>
                </div>
              </div>
            </div>

            {/* SESSION GUIDANCE */}
            <div className="chamber-card">
              <div className="chamber-card-header">
                <h4>Session Guidance • Nature&apos;s Elixirz</h4>
                <span className="chamber-card-tag">Ritual</span>
              </div>
              <p className="chamber-card-text">
                For best results, pair this chamber with your{" "}
                <strong>current Nature&apos;s Elixirz smoothie</strong>. Sip
                slowly, breathe through your nose, and allow your body to drop
                into the field for at least 10–20 minutes.
              </p>
              <ul className="text-[0.78rem] text-slate-100/90 list-disc pl-4 space-y-1">
                <li>Eyes closed or soft gaze on the orb center.</li>
                <li>3 slow inhales / exhales before starting the track.</li>
                <li>Notice where your body relaxes first: chest, neck, head.</li>
              </ul>
            </div>

            {/* CLOSE BUTTON (BOTTOM) */}
            <button
              type="button"
              className="chamber-close-bottom"
              onClick={onClose}
            >
              Close Chamber
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}






