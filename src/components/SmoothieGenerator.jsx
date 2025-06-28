// src/components/SmoothieGenerator.jsx
import React, { useState } from 'react';
import IngredientPicker from './IngredientPicker';
import ResultDisplay from './ResultDisplay';
import generateSmoothie from '../utilities/generateSmoothie';

export default function SmoothieGenerator() {
  const [selected, setSelected] = useState({
    fruits: [],
    vegetables: [],
    seeds: [],
    spices: [],
  });
  const [smoothie, setSmoothie] = useState(null);

  const handleSelect = (category, item) => {
    setSelected(prev => ({
      ...prev,
      [category]: prev[category].includes(item)
        ? prev[category].filter(i => i !== item)
        : [...prev[category], item],
    }));
  };

  const handleGenerate = () => {
    setSmoothie(generateSmoothie(selected));
  };

  return (
    <div className="smoothie-generator text-center mt-8">
      <h1 className="text-3xl font-bold text-green-700 mb-4">🌿 Nature’s Elixirz</h1>

      {['fruits', 'vegetables', 'seeds', 'spices'].map(category => (
        <IngredientPicker
          key={category}
          category={category}
          selected={selected[category]}
          onSelect={item => handleSelect(category, item)}
        />
      ))}

      <button
        onClick={handleGenerate}
        className="mt-4 px-6 py-2 bg-green-500 hover:bg-green-600 text-white rounded shadow transition"
      >
        Generate Smoothie
      </button>

      <ResultDisplay smoothie={smoothie} />
    </div>
  );
}