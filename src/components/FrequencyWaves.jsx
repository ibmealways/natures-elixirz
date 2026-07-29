// src/components/FrequencyWaves.jsx
import React from "react";

const FrequencyWaves = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
      {/* Outer wave (slow emerald glow) */}
      <div
        className="
          absolute w-[1600px] h-[1600px]
          top-1/2 left-1/2
          -translate-x-1/2 -translate-y-1/2
          rounded-full
          bg-green-500/10
          blur-3xl
          animate-waves-slow
        "
      />

      {/* Mid wave (medium pulse) */}
      <div
        className="
          absolute w-[1100px] h-[1100px]
          top-1/2 left-1/2
          -translate-x-1/2 -translate-y-1/2
          rounded-full
          bg-emerald-400/10
          blur-3xl
          animate-waves-mid
        "
      />

      {/* Inner quantum ripple */}
      <div
        className="
          absolute w-[700px] h-[700px]
          top-1/2 left-1/2
          -translate-x-1/2 -translate-y-1/2
          rounded-full
          bg-green-300/10
          blur-2xl
          animate-waves-fast
        "
      />

      {/* Aurora streaks (gentle vertical shifts) */}
      <div
        className="
          absolute inset-0
          bg-gradient-to-r from-green-500/5 via-transparent to-emerald-500/5
          animate-aurora-shift
        "
      />

      <div
        className="
          absolute inset-0
          bg-gradient-to-l from-green-400/5 via-transparent to-emerald-400/5
          animate-aurora-shift-slow
        "
      />
    </div>
  );
};

export default FrequencyWaves;
