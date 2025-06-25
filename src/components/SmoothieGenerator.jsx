import React, { useState } from 'react';
import IngredientPicker from './IngredientPicker';
import ResultDisplay from './ResultDisplay';
import generateSmoothie from '../utilities/generateSmoothie';
import '../App.css';

function SmoothieGenerator() {
  const [selectedIngredients, setSelectedIngredients] = useState([]);
  const [smoothie, setSmoothie] = useState(null);

  const handleSelect = (ingredient) => {
    setSelectedIngredients((prev) =>
      prev.includes(ingredient)
        ? prev.filter((i) => i !== ingredient)
        : [...prev, ingredient]
    );
  };

  const handleGenerate = () => {
    // 🧠 BONUS: Sort ingredients before generating for consistency
    const sortedIngredients = [...selectedIngredients].sort();
    const result = generateSmoothie(sortedIngredients);
    setSmoothie(result);
  };

  return (
    <div className="smoothie-generator text-center mt-8">
      <h1 className="text-3xl font-bold text-green-700 mb-4">🌿 Nature’s Elixirz</h1>

      <IngredientPicker
        selectedIngredients={selectedIngredients}
        onSelect={handleSelect}
      />

      <div className="selection mt-6">
        <h3 className="text-xl font-semibold mb-2">Selected Ingredients</h3>
        <ul className="list-disc list-inside text-gray-700">
          {[...selectedIngredients].sort().map((ingredient, index) => (
            <li key={index}>{ingredient}</li>
          ))}
        </ul>

        <button
          onClick={handleGenerate}
          className="mt-4 px-6 py-2 bg-green-500 hover:bg-green-600 text-white rounded shadow"
        >
          Generate Smoothie
        </button>
      </div>

      <ResultDisplay smoothie={smoothie} />
    </div>
  );
}

export default SmoothieGenerator;
