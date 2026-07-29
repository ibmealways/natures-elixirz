// src/components/IngredientPicker.jsx
import React, { useState, useMemo } from "react";
import ingredients from "../data/ingredients.json";
import "../styles/IngredientPicker.css";

const categories = ["Fruits", "Vegetables", "Seeds", "Spices"];

/* ---------------------------------------
   UNIVERSAL RESONANCE SCORE ENGINE (URS)
------------------------------------------ */
function calculateResonanceScore(item, healingFocus, selectedIngredients) {
  let score = 0;

  const focus = (healingFocus || "").toLowerCase();

  // 1. Healing focus match (benefit includes focus keyword)
  if (focus && item.benefits?.some((b) => b.toLowerCase().includes(focus))) {
    score += 40;
  }

  // 2. Synergy with already-selected ingredients
  selectedIngredients.forEach((name) => {
    const sel = ingredients.find((i) => i.name === name);
    if (!sel) return;

    const overlap = sel.benefits.filter((b) => item.benefits.includes(b));
    score += overlap.length * 10;
  });

  // 3. Category weight (veggies / seeds / spices get a tiny bias)
  const categoryWeights = {
    Fruits: 5,
    Vegetables: 10,
    Seeds: 15,
    Spices: 20,
  };
  score += categoryWeights[item.category] || 0;

  return Math.min(score, 100);
}

/* ---------------------------------------
   SYNERGY SCORE (for aura + ripples)
------------------------------------------ */
function calculateSynergy(item, selectedIngredients) {
  let score = 0;

  selectedIngredients.forEach((name) => {
    const sel = ingredients.find((i) => i.name === name);
    if (!sel) return;

    const overlap = sel.benefits.filter((b) => item.benefits.includes(b));
    score += overlap.length * 15;
  });

  return score;
}

function getSynergyClass(score) {
  if (score >= 45) return "synergy-strong";
  if (score >= 15) return "synergy-medium";
  if (score > 0) return "synergy-light";
  return "synergy-none";
}

export default function IngredientPicker({
  selectedIngredients,
  toggleIngredient,
  searchTerm,
  healingFocus,
}) {
  const [activeCategory, setActiveCategory] = useState("Fruits");

  /* ---------------------------------------
     FILTER + SCORE INGREDIENTS
  ------------------------------------------ */
  const filteredIngredients = useMemo(() => {
    const term = (searchTerm || "").trim().toLowerCase();

    return ingredients
      .filter((item) => {
        const matchesCategory = item.category === activeCategory;

        const matchesSearch =
          term.length === 0 ||
          item.name.toLowerCase().includes(term) ||
          item.benefits.some((b) => b.toLowerCase().includes(term));

        return matchesCategory && matchesSearch;
      })
      .map((item) => {
        const resonance = calculateResonanceScore(
          item,
          healingFocus || "",
          selectedIngredients
        );
        const synergy = calculateSynergy(item, selectedIngredients);
        return { ...item, resonance, synergy };
      })
      .sort((a, b) => b.resonance - a.resonance); // highest resonance first
  }, [activeCategory, searchTerm, selectedIngredients, healingFocus]);

  /* ---------------------------------------
     UI
  ------------------------------------------ */
  return (
    <div className="ingredient-picker-container">
      {/* CATEGORY TABS */}
      <div className="category-tabs">
        {categories.map((cat) => (
          <button
            key={cat}
            className={`category-pill ${
              activeCategory === cat ? "active" : ""
            }`}
            onClick={() => setActiveCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* CONSCIOUS GRID */}
      <div className="ingredient-grid cosmic-grid">
        {filteredIngredients.map((item) => {
          const isSelected = selectedIngredients.includes(item.name);
          const synergyClass = getSynergyClass(item.synergy);

          return (
            <button
              key={item.name}
              onClick={() => toggleIngredient(item.name)}
              className={`ingredient-card ${synergyClass} ${
                isSelected ? "selected ripple" : ""
              }`}
              style={{
                boxShadow: `0 0 ${item.resonance / 10}px rgba(0,255,180,0.45)`,
              }}
            >
              {/* Aura mist */}
              <span className="ingredient-aura" />

              <span className="ingredient-name">{item.name}</span>

              {/* Optional: show first benefit as a tiny subtitle */}
              {item.benefits?.[0] && (
                <span className="ingredient-benefit">
                  {item.benefits[0]}
                </span>
              )}

              {/* URS badge */}
              <span className="resonance-badge">
                URS {item.resonance.toString().padStart(2, "0")}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}





