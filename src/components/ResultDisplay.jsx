import React, { useState } from 'react';

function ResultDisplay({ smoothie }) {
  const [customIngredients, setCustomIngredients] = useState({
    fruits: [''],
    vegetables: [''],
    seeds: [''],
    spices: [''],
  });

  const handleChange = (type, index, value) => {
    const updated = [...customIngredients[type]];
    updated[index] = value;
    setCustomIngredients({ ...customIngredients, [type]: updated });
  };

  const handleAdd = (type) => {
    setCustomIngredients({
      ...customIngredients,
      [type]: [...customIngredients[type], ''],
    });
  };

  return (
    <div className="mt-10 max-w-4xl mx-auto px-6">
      <div className="bg-white shadow-xl rounded-2xl p-6 border border-gray-200">
        <h2 className="text-2xl font-bold mb-4 text-green-700 flex items-center gap-2">
          🧃 Your Smoothie Output
        </h2>
        <p className="text-gray-700 mb-6">
          {smoothie ? smoothie : 'Select ingredients and generate your smoothie blend.'}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {['fruits', 'vegetables', 'seeds', 'spices'].map((type) => (
            <div key={type}>
              <h3 className="font-semibold capitalize mb-2">{type}</h3>
              {customIngredients[type].map((item, index) => (
                <input
                  key={index}
                  type="text"
                  value={item}
                  onChange={(e) => handleChange(type, index, e.target.value)}
                  placeholder={`Enter ${type.slice(0, -1)} #${index + 1}`}
                  className="w-full mb-2 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400"
                />
              ))}
              <button
                onClick={() => handleAdd(type)}
                className="text-sm text-blue-600 hover:underline"
              >
                + Add more {type}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ResultDisplay;