import React from 'react';

const ingredients = [
  "Mango",
  "Spinach",
  "Blueberries",
  "Turmeric",
  "Ginger",
  "Banana",
  "Carrot",
  "Kale",
  "Chia Seeds",
  "Flax Seeds"
];

function IngredientPicker({ onSelect }) {
  return (
    <div className="p-4 bg-white rounded-2xl shadow-lg w-full max-w-md mx-auto">
      <h2 className="text-2xl font-bold text-center text-green-700 mb-4">
        🌿 Pick Your Ingredients
      </h2>
      <div className="grid grid-cols-2 gap-3">
        {ingredients.map((item) => (
          <button
            key={item}
            onClick={() => onSelect(item)}
            className="px-4 py-2 rounded-xl bg-green-100 hover:bg-green-300 text-green-900 font-medium transition duration-200"
          >
            {item}
          </button>
        ))}
      </div>
    </div>
  );
}

export default IngredientPicker;