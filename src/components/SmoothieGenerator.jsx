import React, { useState } from 'react';
import IngredientPicker from './IngredientPicker';
import ResultDisplay from './ResultDisplay';
import generateSmoothie from '../utilities/generateSmoothie';
import '../App.css';

function SmoothieGenerator() {
  const [selectedIngredients, setSelectedIngredients] = useState([]);
  const [smoothie, setSmoothie] = useState(null);

  const handleSelect = ingredient => {
    setSelectedIngredients(prev =>
      prev.includes(ingredient)
        ? prev.filter(i => i !== ingredient)
        : [...prev, ingredient]
    );
  };

  const handleGenerate = () => {
    const result = generateSmoothie(selectedIngredients);
    setSmoothie(result);
  };

  return (
    <div className="smoothie-generator">
      <h1>🌱 Nature’s Elixirz</h1>
      <IngredientPicker selectedIngredients={selectedIngredients} onSelect={handleSelect} />
      <div className="selection">
        <h3>Selected Ingredients</h3>
        <ul>{selectedIngredients.map(i => <li key={i}>{i}</li>)}</ul>
        <button onClick={handleGenerate}>Generate Smoothie</button>
      </div>
      <ResultDisplay smoothie={smoothie} />
    </div>
  );
}

export default SmoothieGenerator;