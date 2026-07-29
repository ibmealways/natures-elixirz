// src/components/MRVIDashboardCard.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import { useMRVI } from "../context/MRVIContext";

export default function MRVIDashboardCard() {
  const { latestScan, profile } = useMRVI();
  const nav = useNavigate();

  const output = latestScan?.output;
  const score = output?.mrviScore ?? null;
  const focus = output?.focus ?? "MAINTENANCE";
  const scans = profile?.scans?.length || 0;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-wide text-white/60">MRVI</div>
          <div className="mt-1 text-lg font-semibold">Motion Resonance Vitality Index</div>
          <div className="mt-1 text-sm text-white/70">Scans: {scans}</div>
        </div>

        <button
          onClick={() => nav("/mrvi")}
          className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10"
        >
          Open
        </button>
      </div>

      <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-white/60">Latest Score</div>
            <div className="text-3xl font-semibold">{score ?? "—"}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-white/60">Focus</div>
            <div className="mt-1 inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm">
              {focus}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
