import React, { useState } from "react";
import IngredientPicker from "./components/IngredientPicker";
import SmoothieGenerator from "./components/SmoothieGenerator";
import ResultCard from "./components/ResultCard";

function App() {
  const [selectedIngredients, setSelectedIngredients] = useState([]);
  const [smoothieResult, setSmoothieResult] = useState(null);

  const generateSmoothie = () => {
    setSmoothieResult(selectedIngredients);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <h1 className="text-3xl font-bold text-center mb-4">Nature’s Elixirz</h1>
      <IngredientPicker
        selectedIngredients={selectedIngredients}
        setSelectedIngredients={setSelectedIngredients}
      />
      <SmoothieGenerator
        selectedIngredients={selectedIngredients}
        generateSmoothie={generateSmoothie}
      />
      <ResultCard smoothie={smoothieResult} />
    </div>
  );
}

export default App;