import React from "react";

export default function CardFlipPreview({ preview }) {
  const hasPreview = !!preview;

  const title = hasPreview
    ? preview.name
    : "Your Cosmic Elixir Preview";

  const subtitle = hasPreview
    ? `${preview.batchSize} oz • ${preview.energyType}`
    : "Generate an elixir to see a live preview here.";

  const footer = hasPreview
    ? `Blended on ${preview.date}`
    : "This card will auto-update whenever you create a new blend.";

  return (
    <div className="w-full flex justify-center">
      <div className="group [perspective:1200px] w-full max-w-md">
        {/* 3D flip wrapper */}
        <div className="relative h-64 w-full transition-transform duration-700 [transform-style:preserve-3d] group-hover:[transform:rotateY(180deg)]">
          {/* FRONT SIDE */}
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-emerald-500/30 via-emerald-700/60 to-slate-900 border border-emerald-400/70 shadow-[0_0_40px_rgba(16,185,129,0.7)] px-6 py-5 flex flex-col justify-between [backface-visibility:hidden]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs tracking-[0.25em] uppercase text-emerald-200/80">
                Preview • Nature&apos;s Elixirz
              </span>
              <span className="text-xs px-3 py-1 rounded-full bg-black/40 text-emerald-200 border border-emerald-400/60">
                Hover / Tap to flip
              </span>
            </div>

            <div className="flex-1 flex flex-col justify-center text-left">
              <h3 className="text-2xl font-extrabold text-emerald-100 drop-shadow-[0_0_18px_rgba(34,197,94,0.9)] mb-2">
                {title}
              </h3>
              <p className="text-sm text-emerald-100/90 mb-3">
                {subtitle}
              </p>

              {hasPreview && (
                <div className="inline-flex items-center gap-2 text-xs text-emerald-100/90 bg-black/40 rounded-full px-3 py-1 border border-emerald-400/60">
                  <span className="text-lg">✨</span>
                  <span>
                    Smart Mode tuned this dose based on your current inputs.
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between text-xs text-emerald-200/80 mt-2">
              <span>{footer}</span>
              <span className="font-semibold text-emerald-300">
                Preview My Elixir
              </span>
            </div>
          </div>

          {/* BACK SIDE */}
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-slate-900 via-emerald-900 to-black border border-emerald-500/70 shadow-[0_0_40px_rgba(16,185,129,0.9)] px-6 py-5 flex flex-col justify-between [backface-visibility:hidden] [transform:rotateY(180deg)]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs tracking-[0.25em] uppercase text-emerald-200/80">
                Vibe Snapshot
              </span>
              <span className="text-xs px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-100 border border-emerald-300/70">
                Energetic Profile
              </span>
            </div>

            <div className="flex-1 flex flex-col justify-center text-left space-y-2">
              <p className="text-sm text-emerald-100/90">
                {hasPreview
                  ? "This blend is optimized for your current goal, activity level, and healing focus. Use it as today’s core elixir and log how you feel after."
                  : "Once you create a blend, this side will show a quick energetic snapshot to guide how and when to drink it."}
              </p>

              {hasPreview && (
                <>
                  <p className="text-sm text-emerald-100/85">
                    <span className="font-semibold text-emerald-300">
                      Suggested timing:
                    </span>{" "}
                    Sip slowly over 20–30 minutes. Best taken on a relatively
                    empty stomach with gratitude and intention.
                  </p>
                  <p className="text-sm text-emerald-100/85">
                    <span className="font-semibold text-emerald-300">
                      Pro Tip:
                    </span>{" "}
                    Take a quick note in your journal or app about pain levels,
                    energy, and mood after you finish this batch.
                  </p>
                </>
              )}
            </div>

            <div className="flex items-center justify-between text-xs text-emerald-200/80 mt-2">
              <span>Flip back to see name, dose & vibe.</span>
              <span className="font-semibold text-emerald-300">
                Tap / Hover to return
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


