import React from "react";

const phaseCues = [
  "Stand tall, soften your knees, and breathe slowly.",
  "Shift your weight gently as your hands float across.",
  "Step heel first, keeping most weight on the standing leg.",
  "Rise only as high as steady balance allows.",
  "Lower your hands, settle your stance, and exhale.",
];

export default function TaiChiPhaseDemo({ phase, step, seconds, running }) {
  return <div className={`tai-demo phase-demo-${phase} ${running ? "is-running" : ""}`}>
    <span className="tai-demo-label">Looping example</span>
    <svg viewBox="0 0 180 155" role="img" aria-label={`Movement demonstration: ${step}`}>
      <ellipse className="tai-demo-ground" cx="90" cy="143" rx="55" ry="5" />
      <path className="tai-demo-motion motion-left" d="M34 69 C20 83 20 105 36 117" />
      <path className="tai-demo-motion motion-right" d="M146 69 C160 83 160 105 144 117" />
      <g className="tai-person">
        <circle className="tai-head" cx="90" cy="27" r="12" />
        <path className="tai-body" d="M90 40 L90 91" />
        <g className="tai-arm tai-arm-left"><path d="M89 51 L62 72 L43 66" /><circle cx="43" cy="66" r="4" /></g>
        <g className="tai-arm tai-arm-right"><path d="M91 51 L118 72 L137 66" /><circle cx="137" cy="66" r="4" /></g>
        <g className="tai-leg tai-leg-left"><path d="M90 90 L69 113 L61 139" /></g>
        <g className="tai-leg tai-leg-right"><path d="M90 90 L111 113 L119 139" /></g>
      </g>
      <circle className="tai-breath-ring" cx="90" cy="66" r="29" />
    </svg>
    <div className="tai-demo-copy">
      <strong>{running ? `${seconds}s` : step}</strong>
      <small>{phaseCues[phase]}</small>
    </div>
  </div>;
}
