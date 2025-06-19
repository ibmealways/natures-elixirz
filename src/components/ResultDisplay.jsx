import React from 'react';

function ResultDisplay({ ingredients }) {
  if (ingredients.length === 0) {
    return <p className="text-gray-500 text-center mt-4">No ingredients selected yet.</p>;
  }

  return (
    <div className="mt-6 p-4 border-t border-green-300">
      <h3 className="text-lg font-medium text-green-800 mb-2">Selected Ingredients:</h3>
      <ul className="list-disc list-inside text-green-700">
        {ingredients.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

export default ResultDisplay;