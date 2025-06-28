import React, { useState } from "react";
import SmoothieGenerator from "./components/SmoothieGenerator";
import CardFlipPreview from "./components/CardFlipPreview";
import "./App.css"; // Tailwind + custom styles

function App() {
  const [darkMode, setDarkMode] = useState(false);
  const [blend, setBlend] = useState(""); // for preview card

  return (
    <div className={`${darkMode ? "dark bg-gray-900 text-white" : "bg-white text-gray-900"} min-h-screen relative`}>
      
      {/* 🌗 Dark Mode Toggle */}
      <button
        onClick={() => setDarkMode(!darkMode)}
        className="fixed top-4 right-4 z-50 px-4 py-2 bg-yellow-400 dark:bg-gray-700 text-black dark:text-white rounded-md shadow-lg transition duration-300"
      >
        {darkMode ? '🌞 Light Mode' : '🌙 Dark Mode'}
      </button>

      {/* App Wrapper with Alchemy Animation */}
      <div className="container mx-auto p-6 flex flex-col items-center justify-center alchemy-glow">
        <h1 className="text-4xl font-bold mb-6 text-green-700 dark:text-green-300 animate-pulse">🌿 Nature’s Elixirz</h1>
        
        {/* Smoothie Generator */}
        <SmoothieGenerator onBlendGenerated={setBlend} />

        {/* Animated Flip Preview */}
        {blend && (
          <div className="mt-8 w-full max-w-md">
            <CardFlipPreview blend={blend} />
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
