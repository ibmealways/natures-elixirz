import React from 'react';

const IngredientFilter = ({ categories, onFilter }) => (
  <div className="flex gap-2 flex-wrap p-4">
    {categories.map(cat => (
      <button key={cat} onClick={() => onFilter(cat)} className="px-4 py-1 bg-green-200 rounded hover:bg-green-300">
        {cat}
      </button>
    ))}
  </div>
);

export default IngredientFilter;