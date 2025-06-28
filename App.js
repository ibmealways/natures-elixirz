import React, { useState } from "react";
import IngredientPicker from "./components/IngredientPicker";
import ResultDisplay from "./components/ResultDisplay";
import SmoothieGenerator from "./components/SmoothieGenerator";
import "./App.css";

function App() {
  const [selectedIngredients, setSelectedIngredients] = useState([]);
  const [smoothie, setSmoothie] = useState(null);
  const [darkMode, setDarkMode] = useState(false);

  const handleSelect = (ingredient) => {
    setSelectedIngredients((prev) =>
      prev.includes(ingredient)
        ? prev.filter((item) => item !== ingredient)
        : [...prev, ingredient]
    );
  };

  const handleGenerate = () => {
    const generated = SmoothieGenerator(selectedIngredients);
    setSmoothie(generated);
  };

  return (
    <div className={darkMode ? "dark bg-gray-900 text-white min-h-screen" : "bg-white text-gray-900 min-h-screen"}>
      {/* 🌗 Toggle Button */}
      <button
        onClick={() => setDarkMode(!darkMode)}
        className="fixed top-4 right-4 z-50 px-4 py-2 bg-yellow-400 dark:bg-gray-700 text-black dark:text-white rounded-md shadow-lg"
      >
        {darkMode ? '🌞 Light Mode' : '🌙 Dark Mode'}
      </button>

      {/* App Content */}
      <div className="app-wrapper p-4 text-center font-sans">
        <h1 className="text-green-700 text-4xl mb-6">🌿 Nature’s Elixirz</h1>
        <IngredientPicker onSelect={handleSelect} />

        <div className="mt-6">
          <h2 className="text-2xl font-bold mb-2">Selected Ingredients</h2>
          <ul className="space-y-1">
            {selectedIngredients.map((item) => (
              <li key={item} className="capitalize">{item}</li>
            ))}
          </ul>
          <button
            onClick={handleGenerate}
            className="mt-4 px-6 py-3 bg-green-500 hover:bg-green-600 text-white font-bold rounded shadow transition"
          >
            Generate Smoothie
          </button>
        </div>

        {smoothie && <ResultDisplay result={smoothie} />}
      </div>
    </div>
  );
}

export default App;

