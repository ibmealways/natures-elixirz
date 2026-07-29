// src/components/PreviewCard.jsx
import React from "react";

export default function PreviewCard({ result }) {
  if (!result) {
    return (
      <div className="max-w-xl w-full mx-auto mt-10">
        <div className="rounded-3xl border border-green-600/70 bg-gradient-to-br from-black via-emerald-950 to-black shadow-[0_0_40px_rgba(34,197,94,0.5)] px-6 py-8 text-center">
          <p className="text-[11px] text-green-200/80 tracking-[0.18em] uppercase mb-3">
            Preview • Nature&apos;s Elixirz
          </p>
          <h3 className="text-xl font-semibold text-green-300 mb-2">
            Your Cosmic Elixir Preview
          </h3>
          <p className="text-sm text-green-100/90">
            Generate an elixir to see a live preview here. This card will
            auto-update whenever you create a new blend.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl w-full mx-auto mt-10">
      <div className="rounded-3xl border border-green-600/70 bg-gradient-to-br from-black via-emerald-950 to-black shadow-[0_0_40px_rgba(34,197,94,0.5)] px-6 py-8">
        <p className="text-[11px] text-green-200/80 tracking-[0.18em] uppercase mb-3 flex justify-between">
          <span>Preview • Nature&apos;s Elixirz</span>
          <span>Hover / Tap to vibe</span>
        </p>

        <h3 className="text-xl font-semibold text-green-300 mb-2">
          {result.bestBlendName}
        </h3>

        <p className="text-sm text-green-100 mb-1">
          <span className="font-semibold">Energy Type:</span>{" "}
          {result.energyType}
        </p>

        <p className="text-sm text-green-100 mb-1">
          <span className="font-semibold">Batch Size:</span>{" "}
          {result.batchSize} oz
        </p>

        <p className="text-sm text-green-100 mb-3">
          <span className="font-semibold">Suggested Frequency:</span>{" "}
          {result.healingFrequency}
        </p>

        {result.smartEnabled && result.smartSummary && (
          <p className="text-xs text-green-200/80 mb-4 italic">
            {result.smartSummary}
          </p>
        )}

        <div className="flex flex-wrap gap-1 mt-2">
          {result.selectedIngredients.map((item, idx) => (
            <span
              key={`${item}-${idx}`}
              className="rounded-full bg-green-900/40 border border-green-500/80 px-3 py-1 text-[11px] text-green-100"
            >
              {item}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

