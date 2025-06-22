import React from 'react';
import ingredients from '../data/ingredients.json';
import '../App.css';

function IngredientPicker({ selectedIngredients, onSelect }) {
  const ingredientEntries = Object.entries(ingredients); // [["Mango", "Immunity & Skin Glow"], ...]

  return (
    <div className="ingredient-picker">
      <h2>🌿 Pick Your Ingredients</h2>
      <div className="ingredient-list">
        {ingredientEntries.map(([name, benefit]) => (
          <button
            key={name}
            className={selectedIngredients.includes(name) ? 'selected' : ''}
            onClick={() => onSelect(name)}
          >
            {name} – {benefit}
          </button>
        ))}
      </div>
    </div>
  );
}

export default IngredientPicker;
