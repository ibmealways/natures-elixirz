// src/pages/FrequencyChamberPage.jsx
import React from "react";
import { Link } from "react-router-dom";

export default function FrequencyChamberPage() {
  return (
    <div className="cosmic-frequency-page">
      <main className="frequency-lab-container mx-auto max-w-4xl px-4 pb-24 space-y-8">
        <section className="fade-section space-y-3">
          <p className="text-[11px] tracking-[0.28em] uppercase text-emerald-200/80">
            Galactic Chamber
          </p>
          <h1 className="frequency-section-title">
            Nature&apos;s Elixirz Frequency Chamber
          </h1>
          <p className="frequency-section-subtitle">
            This is your dedicated space for full-body immersion. To launch the
            live chamber, head into the main Frequencies Lab and tap{" "}
            <span className="text-emerald-300 font-semibold">
              &quot;Enter Full-Screen Frequency Chamber&quot;
            </span>
            .
          </p>
        </section>

        <section className="galactic-card fade-section space-y-4">
          <p className="text-xs text-emerald-100/85">
            The chamber combines your chosen frequency (432 Hz, 528 Hz, 639 Hz,
            etc.) with the{" "}
            <span className="text-emerald-300 font-semibold">
              EarthSync Hybrid Reactor
            </span>{" "}
            visuals to help your mind and body drop into deeper calm and inner
            alignment.
          </p>
          <ul className="list-disc pl-4 text-xs text-emerald-100/90 space-y-1.5">
            <li>Start in the Frequencies Lab and pick your desired Hz.</li>
            <li>Use the preview player to feel into the field first.</li>
            <li>
              Tap{" "}
              <span className="text-emerald-300">
                &quot;Enter Full-Screen Frequency Chamber&quot;
              </span>{" "}
              to open the immersive view.
            </li>
            <li>
              Pair the session with one of your Nature&apos;s Elixirz smoothies
              for maximum synergy.
            </li>
          </ul>

          <div className="mt-4 flex justify-center">
            <Link
              to="/frequencies"
              className="chamber-launch-btn text-sm px-10 py-3"
            >
              Go to Frequencies Lab
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}

