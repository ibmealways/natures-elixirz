// src/components/RecipeCard.jsx
import React from "react";

export default function RecipeCard({ smoothie }) {
  if (!smoothie) return null;

  const { name, size, flatIngredients } = smoothie;

  return (
    <div className="max-w-3xl w-full bg-black/50 border border-green-700/70 rounded-3xl p-5 text-left shadow-xl shadow-green-500/30 mt-4">
      <h4 className="text-lg font-semibold text-green-300 mb-2">
        {name} – {size} oz Recipe
      </h4>

      <p className="text-xs text-green-200/80 mb-2">
        For best results, blend with enough ice to reach a frosty, slushy
        texture. Adjust liquid (water, coconut water, etc.) to reach ~42–48 oz
        if you want your signature IBMEALWAYZ brain-freeze jar.
      </p>

      {flatIngredients && flatIngredients.length > 0 && (
        <ul className="list-disc ml-4 text-xs text-green-100 space-y-1">
          {flatIngredients.map((item, idx) => (
            <li key={`${item}-${idx}`}>{item}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
