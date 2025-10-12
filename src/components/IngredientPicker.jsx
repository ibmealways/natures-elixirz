import React from 'react';
import '../App.css';

function IngredientPicker({ ingredients = {}, selected = [], onSelect }) {
  return (
    <div className="ingredient-picker mb-8">
      <h2 className="text-3xl font-semibold mb-4 text-green-700 dark:text-green-300 animate-fadeIn">🌿 Pick Your Ingredients</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {Object.entries(ingredients).map(([item, benefit]) => (
          <button
            key={item}
            className={`ingredient-button p-4 border rounded-lg text-left shadow transition-transform transform hover:scale-105 ${
              selected.includes(item)
                ? 'bg-green-300 dark:bg-green-600 text-white'
                : 'bg-white dark:bg-gray-700 text-black dark:text-white'
            }`}
            onClick={() => onSelect(item)}
          >
            <div className="font-bold">{item}</div>
            <div className="text-sm">{benefit}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

export default IngredientPicker;







