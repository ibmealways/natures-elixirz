import React, { useState } from 'react';

function ResultDisplay() {
  const [fruits, setFruits] = useState(['']);
  const [vegetables, setVegetables] = useState(['']);
  const [seeds, setSeeds] = useState(['']);
  const [spices, setSpices] = useState(['']);

  const handleChange = (setter, index, value) => {
    setter(prev => {
      const updated = [...prev];
      updated[index] = value;
      return updated;
    });
  };

  const handleAddField = (setter) => {
    setter(prev => [...prev, '']);
  };

  return (
    <div className="max-w-5xl mx-auto p-4 grid sm:grid-cols-2 gap-6">
      {/* Section Block */}
      <div className="bg-white shadow-xl rounded-xl p-6 text-center">
        <h3 className="text-lg font-semibold mb-4">Fruits</h3>
        <div className="flex flex-wrap justify-center gap-2">
          {fruits.map((fruit, i) => (
            <input
              key={i}
              className="border p-2 rounded-md w-[150px]"
              placeholder={`Enter fruits #${i + 1}`}
              value={fruit}
              onChange={(e) => handleChange(setFruits, i, e.target.value)}
            />
          ))}
        </div>
        <button
          onClick={() => handleAddField(setFruits)}
          className="mt-2 bg-green-400 text-white px-3 py-1 rounded-md hover:bg-green-500"
        >+ Add more fruits</button>
      </div>

      {/* Repeat for Vegetables */}
      <div className="bg-white shadow-xl rounded-xl p-6 text-center">
        <h3 className="text-lg font-semibold mb-4">Vegetables</h3>
        <div className="flex flex-wrap justify-center gap-2">
          {vegetables.map((veg, i) => (
            <input
              key={i}
              className="border p-2 rounded-md w-[150px]"
              placeholder={`Enter vegetables #${i + 1}`}
              value={veg}
              onChange={(e) => handleChange(setVegetables, i, e.target.value)}
            />
          ))}
        </div>
        <button
          onClick={() => handleAddField(setVegetables)}
          className="mt-2 bg-green-400 text-white px-3 py-1 rounded-md hover:bg-green-500"
        >+ Add more vegetables</button>
      </div>

      {/* Repeat for Seeds */}
      <div className="bg-white shadow-xl rounded-xl p-6 text-center">
        <h3 className="text-lg font-semibold mb-4">Seeds</h3>
        <div className="flex flex-wrap justify-center gap-2">
          {seeds.map((seed, i) => (
            <input
              key={i}
              className="border p-2 rounded-md w-[150px]"
              placeholder={`Enter seeds #${i + 1}`}
              value={seed}
              onChange={(e) => handleChange(setSeeds, i, e.target.value)}
            />
          ))}
        </div>
        <button
          onClick={() => handleAddField(setSeeds)}
          className="mt-2 bg-green-400 text-white px-3 py-1 rounded-md hover:bg-green-500"
        >+ Add more seeds</button>
      </div>

      {/* Repeat for Spices */}
      <div className="bg-white shadow-xl rounded-xl p-6 text-center">
        <h3 className="text-lg font-semibold mb-4">Spices</h3>
        <div className="flex flex-wrap justify-center gap-2">
          {spices.map((spice, i) => (
            <input
              key={i}
              className="border p-2 rounded-md w-[150px]"
              placeholder={`Enter spices #${i + 1}`}
              value={spice}
              onChange={(e) => handleChange(setSpices, i, e.target.value)}
            />
          ))}
        </div>
        <button
          onClick={() => handleAddField(setSpices)}
          className="mt-2 bg-green-400 text-white px-3 py-1 rounded-md hover:bg-green-500"
        >+ Add more spices</button>
      </div>
    </div>
  );
}

export default ResultDisplay;
