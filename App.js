import React, { useState } from "react";
import IngredientPicker from "./components/IngredientPicker";
import ResultDisplay from "./components/ResultDisplay";
import SmoothieGenerator from "./components/SmoothieGenerator";

function App() {
  const [selectedIngredients, setSelectedIngredients] = useState([]);
  const [smoothie, setSmoothie] = useState(null);

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
    <div style={{ textAlign: "center", padding: "2rem", fontFamily: "sans-serif" }}>
      <h1 style={{ color: "#2e7d32" }}>🌿 Nature’s Elixirz</h1>
      <IngredientPicker onSelect={handleSelect} />
      
      <div style={{ marginTop: "1rem" }}>
        <h2>Selected Ingredients</h2>
        <ul>
          {selectedIngredients.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <button onClick={handleGenerate}>Generate Smoothie</button>
      </div>

      {smoothie && <ResultDisplay result={smoothie} />}
    </div>
  );
}

export default App; // Trigger redeploy 🚀
