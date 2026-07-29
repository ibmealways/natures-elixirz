import React from "react";
import { Link } from "react-router-dom";
import "./GlowNav.css";

export default function GlowNav() {
  return (
    <div className="glow-nav-container">
      <div className="glow-nav">
        <Link to="/smoothie" className="glow-nav-btn">
          🥤 Smoothie Lab
        </Link>
        <Link to="/frequencies" className="glow-nav-btn">
          🎧 Frequencies
        </Link>
        <Link to="/tai-chi" className="glow-nav-btn">
          🧘 Tai Chi Studio
        </Link>
        <Link to="/meals" className="glow-nav-btn">
          🥗 Meal Plans
        </Link>
        <Link to="/premium" className="glow-nav-btn premium-glow">
          ⭐ Premium
        </Link>
      </div>
    </div>
  );
}
