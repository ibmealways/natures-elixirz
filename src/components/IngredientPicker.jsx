import React from 'react';

const ingredients = ["Mango", "Spinach", "Blueberries", "Turmeric", "Ginger"];

function IngredientPicker({ onSelect }) {
  return (
    <div>
      <h2>Pick Your Ingredients</h2>
      {ingredients.map(item => (
        <button key={item} onClick={() => onSelect(item)}>{item}</button>
      ))}
    </div>
  );
}

export default IngredientPicker;