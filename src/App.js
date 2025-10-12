import React, { useState } from "react";
import SmoothieGenerator from "./components/SmoothieGenerator";
import CardFlipPreview from "./components/CardFlipPreview";
import "./App.css";

function App() {
  const [darkMode, setDarkMode] = useState(false);
  const [blend, setBlend] = useState("");

  return (
    <div className={`${darkMode ? "dark bg-gray-900 text-white" : "bg-gray-50 text-gray-900"} min-h-screen transition-colors duration-500`}>
      
      {/* 🌗 Dark Mode Toggle */}
      <button
        onClick={() => setDarkMode(!darkMode)}
        className="fixed top-4 right-4 z-50 px-4 py-2 bg-yellow-400 dark:bg-gray-700 text-black dark:text-white rounded-md shadow-lg transition-transform transform hover:scale-105 duration-300"
      >
        {darkMode ? '🌞 Light Mode' : '🌙 Dark Mode'}
      </button>

      {/* App Wrapper */}
      <div className="container mx-auto p-6 flex flex-col items-center justify-center">
        <SmoothieGenerator onBlendGenerated={setBlend} />

        {blend && (
          <div className="mt-10 w-full max-w-md">
            <CardFlipPreview blend={blend} />
          </div>
        )}
      </div>
    </div>
  );
}

export default App;


