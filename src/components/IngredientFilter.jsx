import React from "react";

export default function IngredientFilter({ searchTerm, setSearchTerm }) {
  return (
    <div className="bg-black/40 border border-green-500/30 rounded-2xl p-6 shadow-lg shadow-green-500/10">
      <p className="uppercase text-green-300 text-xs tracking-wider mb-2">
        Search Ingredients / Benefits
      </p>

      <input
        type="text"
        className="w-full p-3 bg-black/60 border border-green-500/50 rounded-lg text-green-200 text-sm"
        placeholder="e.g. brain, detox, collagen, gut..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />

      <p className="text-green-200/70 text-xs mt-2">
        Filters the ingredient grid below by name or benefit so you can lock in your
        vibe faster.
      </p>
    </div>
  );
}



