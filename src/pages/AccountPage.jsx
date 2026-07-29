import React from "react";

export default function AccountPage() {
  return (
    <div className="max-w-3xl mx-auto px-4">
      <div className="rounded-3xl border border-emerald-500/60 bg-black/75 backdrop-blur-xl shadow-[0_0_30px_rgba(16,185,129,0.6)] p-6 md:p-8">
        <p className="text-[11px] tracking-[0.2em] uppercase text-emerald-300/80 mb-2">
          Profile • Settings • Sync
        </p>
        <h1 className="text-2xl md:text-3xl font-bold text-emerald-300 mb-3">
          My Account
        </h1>
        <p className="text-sm text-emerald-100/90 mb-6">
          This page will eventually handle your subscription tier, preferences,
          saved smoothies, and progress tracking.
        </p>

        <div className="grid gap-4 md:grid-cols-2 text-xs text-emerald-100/90">
          <div className="rounded-2xl border border-emerald-500/50 bg-black/70 p-4">
            <h2 className="text-sm font-semibold mb-2">Profile Basics</h2>
            <p className="text-emerald-200/90 mb-1">
              IBMEALWAYZ (placeholder – we&apos;ll wire real data later)
            </p>
            <p className="text-emerald-200/80 mb-3">
              Current Tier: Free / Dev Mode
            </p>
            <button className="px-4 py-2 rounded-full bg-emerald-500 text-black text-sm font-semibold shadow-md hover:bg-emerald-400 transition">
              Edit Profile
            </button>
          </div>

          <div className="rounded-2xl border border-emerald-500/50 bg-black/70 p-4">
            <h2 className="text-sm font-semibold mb-2">Sync & Data</h2>
            <ul className="space-y-1.5">
              <li>• Saved smoothies (coming soon)</li>
              <li>• Favorite frequencies</li>
              <li>• Tai Chi streaks & sessions</li>
              <li>• Meal plan history</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
