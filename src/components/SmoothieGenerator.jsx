import React, { useState } from 'react';
import IngredientPicker from './IngredientPicker';
import ResultDisplay from './ResultDisplay';
import generateSmoothie from '../utilities/generateSmoothie';
import ingredients from '../data/ingredients.json';

export default function SmoothieGenerator({ onBlendGenerated }) {
  const [selected, setSelected] = useState([]);
  const [smoothie, setSmoothie] = useState(null);

  const handleSelect = (item) => {
    setSelected((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  };

  const handleGenerate = () => {
    const blend = generateSmoothie(selected);
    setSmoothie(blend);
    onBlendGenerated(blend);
  };

  return (
    <div className="smoothie-generator bg-gradient-to-b from-green-100 to-green-50 dark:from-gray-800 dark:to-gray-900 p-10 rounded-xl shadow-2xl max-w-3xl mx-auto my-12 border border-green-300 dark:border-green-600 animate-fadeIn">
      <h1 className="text-5xl font-extrabold mb-8 text-green-700 dark:text-green-300 tracking-tight animate-pulse">
        🌿 Nature’s Elixirz
      </h1>

      <IngredientPicker
        ingredients={ingredients}
        selected={selected}
        onSelect={handleSelect}
      />

      <button
        onClick={handleGenerate}
        className="mt-8 px-8 py-4 bg-gradient-to-r from-green-400 to-green-600 hover:from-green-500 hover:to-green-700 text-white font-bold rounded-full shadow-lg transition-transform transform hover:scale-105 animate-bounce"
      >
        🍹 Generate My Elixir
      </button>

      {smoothie && (
        <div className="mt-10">
          <ResultDisplay smoothie={smoothie} />
        </div>
      )}
    </div>
  );
}


