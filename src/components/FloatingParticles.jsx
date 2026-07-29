import React from "react";

export default function FloatingParticles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Soft glowing energy orb on the left */}
      <div className="absolute w-[400px] h-[400px] bg-green-300/20 blur-[120px] rounded-full top-[10%] left-[20%] animate-pulse"></div>
      
      {/* Secondary orb on the right for balance */}
      <div className="absolute w-[350px] h-[350px] bg-emerald-400/20 blur-[100px] rounded-full bottom-[10%] right-[25%] animate-pulse delay-1000"></div>
    </div>
  );
}
