import React, { useState } from 'react';

function ResultDisplay() {
  const [fruits, setFruits] = useState(['']);
  const [vegetables, setVegetables] = useState(['']);
  const [seeds, setSeeds] = useState(['']);
  const [spices, setSpices] = useState(['']);

  const handleChange = (setFunc, index, value) => {
    setFunc(prev => {
      const updated = [...prev];
      updated[index] = value;
      return updated;
    });
  };

  const addField = (setFunc) => {
    setFunc(prev => [...prev, '']);
  };

  const renderInputGroup = (label, values, setFunc, btnText) => (
    <div className="mb-4 w-full">
      <h3 className="text-center text-lg font-semibold mb-2">{label}</h3>
      <div className="flex flex-wrap justify-center gap-2">
        {values.map((val, idx) => (
          <input
            key={idx}
            value={val}
            onChange={e => handleChange(setFunc, idx, e.target.value)}
            className="border p-2 rounded-md w-[150px]"
            placeholder={`Enter ${label.toLowerCase()} #${idx + 1}`}
          />
        ))}
        <button
          onClick={() => addField(setFunc)}
          className="bg-green-400 text-white px-3 py-1 rounded-md hover:bg-green-500"
        >
          + Add more {btnText}
        </button>
      </div>
    </div>
  );

  return (
    <div className="bg-white shadow-xl rounded-xl p-6 w-full max-w-5xl mx-auto mt-10 text-center">
      <h2 className="text-2xl font-bold text-green-800 mb-4">🥤 Your Smoothie Output</h2>
      <p className="text-gray-600 mb-6">Select ingredients and generate your smoothie blend.</p>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 md:grid-cols-4">
        {renderInputGroup('Fruits', fruits, setFruits, 'fruits')}
        {renderInputGroup('Vegetables', vegetables, setVegetables, 'vegetables')}
        {renderInputGroup('Seeds', seeds, setSeeds, 'seeds')}
        {renderInputGroup('Spices', spices, setSpices, 'spices')}
      </div>
    </div>
  );
}

export default ResultDisplay;