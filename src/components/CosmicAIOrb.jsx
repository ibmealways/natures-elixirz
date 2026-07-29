// src/components/CosmicAIOrb.jsx
import React, { useState } from "react";
import "./CosmicAIOrb.css";

export default function CosmicAIOrb({ onRecommend, frequency }) {
  const [expanded, setExpanded] = useState(false);

  const toggleOrb = () => setExpanded((prev) => !prev);

  return (
    <>
      {/* FLOATING ORB */}
      <div
        className={`cosmic-orb-wrapper ${expanded ? "expanded" : ""}`}
        onClick={toggleOrb}
      >
        <div className="orb-core" />
        <div className="orb-ring" />
        <div className="orb-sigil" />

        {/* Frequency halo */}
        <div
          className={`orb-halo ${
            frequency ? "halo-active" : ""
          }`}
          data-frequency={frequency}
        />
      </div>

      {/* AI PANEL */}
      {expanded && (
        <div className="orb-panel animate-orb-slide">
          <h2 className="orb-panel-title">AI Healing Assistant</h2>
          <p className="orb-panel-sub">
            Cosmic Intelligence Node Online
          </p>

          <div className="orb-panel-actions">
            <button
              className="orb-btn"
              onClick={() => onRecommend && onRecommend()}
            >
              ☄ Generate Ingredient Recommendations
            </button>

            <button
              className="orb-btn orb-btn-secondary"
              onClick={toggleOrb}
            >
              ✦ Close Node
            </button>
          </div>
        </div>
      )}
    </>
  );
}
