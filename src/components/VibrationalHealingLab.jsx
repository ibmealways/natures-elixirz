import React from "react";

export default function VibrationalHealingLab({ autoMatchHz = 432 }) {
  return (
    <div className="w-full flex flex-col items-center justify-center mt-10">

      <h2 className="text-3xl md:text-4xl font-bold text-green-300 mb-6">
        Vibrational Healing Lab
      </h2>

      <p className="text-gray-300 text-center max-w-3xl mb-10">
        Auto-match your frequency to your smoothie goal, or explore the playlist.
        Higher tiers unlock deeper quantum tracks.
      </p>

      {/* Auto match card */}
      <div className="w-full md:w-3/4 lg:w-1/2 rounded-xl p-6 bg-gradient-to-br
        from-green-900/40 to-green-700/20 border border-green-400/20 shadow-xl mb-10">

        <h3 className="text-green-200 text-sm tracking-widest mb-2">
          AUTO • MATCH
        </h3>

        <p className="text-white font-semibold text-lg">
          Auto-Matched to Your Focus
        </p>

        <p className="text-gray-300 mt-1 text-sm">
          Uses your current smoothie goal (or Smart Mode goal) to pick the best healing tone.
        </p>

        <p className="text-green-300 font-bold mt-3 text-lg">
          Current match: {autoMatchHz} Hz
        </p>
      </div>
    </div>
  );
}

