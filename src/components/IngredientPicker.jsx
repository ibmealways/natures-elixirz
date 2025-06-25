import React from 'react';
import ingredients from '../data/ingredients.json';
import '../App.css';

function IngredientPicker({ selectedIngredients, onSelect }) {
  return (
    <div className="ingredient-picker">
      <h2>🌿 Pick Your Ingredients</h2>
      <div className="ingredient-list">
        {Object.entries(ingredients).map(([item, benefit]) => (
          <button
            key={item}
            className={`ingredient-button ${selectedIngredients.includes(item) ? 'selected' : ''}`}
            onClick={() => onSelect(item)}
          >
            <div className="font-semibold">{item}</div>
            <div className="text-sm text-gray-500">{benefit}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

export default IngredientPicker;


