import React from 'react';

function ResultDisplay({ smoothie }) {
  return (
    <div className="flex justify-center mt-8">
      <div className="bg-white shadow-2xl rounded-2xl p-6 w-full max-w-4xl grid grid-cols-1 sm:grid-cols-2 gap-6 text-gray-800">
        <div>
          <h3 className="text-xl font-bold mb-3 text-green-700">🍓 Fruits</h3>
          <ul className="list-disc list-inside space-y-1">
            {smoothie.fruits.map((item, idx) => (
              <li key={`fruit-${idx}`}>{item}</li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="text-xl font-bold mb-3 text-green-700">🥦 Vegetables</h3>
          <ul className="list-disc list-inside space-y-1">
            {smoothie.vegetables.map((item, idx) => (
              <li key={`veg-${idx}`}>{item}</li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="text-xl font-bold mb-3 text-green-700">🌰 Seeds</h3>
          <ul className="list-disc list-inside space-y-1">
            {smoothie.seeds.map((item, idx) => (
              <li key={`seed-${idx}`}>{item}</li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="text-xl font-bold mb-3 text-green-700">🧂 Spices</h3>
          <ul className="list-disc list-inside space-y-1">
            {smoothie.spices.map((item, idx) => (
              <li key={`spice-${idx}`}>{item}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export default ResultDisplay;
