import React from 'react';
import ingredients from '../data/ingredients.json';
import '../App.css';

function IngredientPicker({ selectedIngredients, onSelect }) {
  return (
    <div className="ingredient-picker">
      <h2>🌿 Pick Your Ingredients</h2>
      <div className="ingredient-list">
        {Object.keys(ingredients).map(item => (
          <button
            key={item}
            className={selectedIngredients.includes(item) ? 'selected' : ''}
            onClick={() => onSelect(item)}
          >
            {item}
          </button>
        ))}
      </div>
    </div>
  );
}

export default IngredientPicker;

