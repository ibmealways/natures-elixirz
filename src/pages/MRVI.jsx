// src/pages/MRVI.jsx
import React, { useMemo, useState } from "react";
import { useMRVI } from "../context/MRVIContext";

const fieldStyle =
  "w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-white outline-none focus:border-emerald-400/60";

function StatusPill({ status }) {
  const map = {
    IMPROVING: "bg-emerald-500/15 text-emerald-200 border-emerald-400/30",
    STABLE: "bg-sky-500/15 text-sky-200 border-sky-400/30",
    DECLINING: "bg-rose-500/15 text-rose-200 border-rose-400/30",
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs ${map[status] || map.STABLE}`}>
      {status}
    </span>
  );
}

export default function MRVIPage() {
  const { profile, latestScan, giveConsent, addScanFromMetrics, resetAll } = useMRVI();

  const [metrics, setMetrics] = useState({
    mobility: "1.00",
    balance: "1.00",
    symmetry: "1.00",
    energyFlow: "1.00",
    smoothness: "1.00",
  });

  const hasConsent = Boolean(profile?.consent);
  const baseline = profile?.baseline;

  const latestOutput = latestScan?.output || null;

  const trendSummary = useMemo(() => {
    if (!latestOutput) return null;
    return {
      score: latestOutput.mrviScore,
      focus: latestOutput.focus,
      confidence: latestOutput.confidence,
      message: latestOutput.message,
      components: latestOutput.components,
      deltas: latestOutput.deltas,
    };
  }, [latestOutput]);

  const onRun = () => {
    const parsed = {
      mobility: Number(metrics.mobility),
      balance: Number(metrics.balance),
      symmetry: Number(metrics.symmetry),
      energyFlow: Number(metrics.energyFlow),
      smoothness: Number(metrics.smoothness),
    };
    addScanFromMetrics(parsed);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-black to-slate-950 text-white">
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Motion Resonance Vitality Index</h1>
            <p className="mt-1 text-sm text-white/70">
              Private, self-tracking movement wellness analytics. No identity recognition.
            </p>
          </div>

          <button
            onClick={resetAll}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10"
          >
            Reset MRVI Data
          </button>
        </div>

        {/* Consent */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <h2 className="text-lg font-semibold">Consent</h2>
          <p className="mt-1 text-sm text-white/70">
            MRVI requires your consent to store numeric motion metrics for personal wellness insights.
          </p>

          <div className="mt-4 flex items-center gap-3">
            <input
              id="consent"
              type="checkbox"
              checked={hasConsent}
              onChange={(e) => giveConsent(e.target.checked)}
              className="h-5 w-5 accent-emerald-400"
            />
            <label htmlFor="consent" className="text-sm">
              I consent to motion-based wellness tracking inside Nature’s Elixirz.
            </label>
          </div>

          <div className="mt-4 text-xs text-white/60">
            Baseline: {baseline ? "Set" : "Not set yet (first scan will initialize baseline)"}
          </div>
        </div>

        {/* Scan Input */}
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h2 className="text-lg font-semibold">Create a Motion Scan (Metrics Input)</h2>
            <p className="mt-1 text-sm text-white/70">
              For now, enter relative ratios vs baseline (1.00 = baseline). Camera extraction can be wired later.
            </p>

            <div className="mt-4 grid gap-3">
              {Object.keys(metrics).map((k) => (
                <div key={k}>
                  <label className="mb-1 block text-xs uppercase tracking-wide text-white/60">{k}</label>
                  <input
                    className={fieldStyle}
                    value={metrics[k]}
                    onChange={(e) => setMetrics((m) => ({ ...m, [k]: e.target.value }))}
                    placeholder="1.00"
                  />
                </div>
              ))}
            </div>

            <button
              onClick={onRun}
              disabled={!hasConsent}
              className={`mt-5 w-full rounded-2xl px-4 py-3 text-sm font-semibold ${
                hasConsent
                  ? "bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/30"
                  : "bg-white/5 border border-white/10 text-white/40 cursor-not-allowed"
              }`}
            >
              Analyze & Save Scan
            </button>
          </div>

          {/* Results */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h2 className="text-lg font-semibold">Latest MRVI Result</h2>

            {!trendSummary ? (
              <p className="mt-3 text-sm text-white/70">No scans yet. Run your first scan to generate MRVI.</p>
            ) : (
              <>
                <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs uppercase tracking-wide text-white/60">MRVI Score</div>
                      <div className="text-3xl font-semibold">{trendSummary.score}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs uppercase tracking-wide text-white/60">Focus</div>
                      <div className="mt-1 inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm">
                        {trendSummary.focus}
                      </div>
                      <div className="mt-2 text-xs text-white/60">Confidence: {trendSummary.confidence}</div>
                    </div>
                  </div>

                  <p className="mt-3 text-sm text-white/80">{trendSummary.message}</p>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {Object.entries(trendSummary.components).map(([k, status]) => (
                    <div key={k} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-semibold">{k}</div>
                        <StatusPill status={status} />
                      </div>
                      <div className="mt-2 text-xs text-white/60">
                        Δ {(trendSummary.deltas[k] * 100).toFixed(1)}%
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* History quick stats */}
        <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5">
          <h2 className="text-lg font-semibold">History</h2>
          <p className="mt-1 text-sm text-white/70">
            Scans saved: {profile?.scans?.length || 0}
          </p>
        </div>
      </div>
    </div>
  );
}
