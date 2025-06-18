
import React, { useState } from 'react';
import ResultCard from './ResultCard';
import ingredientsList from '../data/ingredients.json';

function SmoothieGenerator() {
  const [selected, setSelected] = useState([]);
  const [result, setResult] = useState(null);

  const addIngredient = (item) => {
    if (!selected.includes(item)) setSelected([...selected, item]);
  };

  const generateSmoothie = () => {
    const blend = selected.map(item => ({
      name: item,
      benefit: ingredientsList[item] || "General Wellness"
    }));
    setResult(blend);
  };

  return (
    <div>
      <h2>Selected Ingredients</h2>
      <p>{selected.join(', ')}</p>
      <button onClick={generateSmoothie}>Generate Smoothie</button>
      {result && <ResultCard items={result} />}
    </div>
  );
}

export default SmoothieGenerator;