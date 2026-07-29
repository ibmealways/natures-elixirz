import React from "react";

export default function RecipeCard({ data }) {
  if (!data) return null;

  const { name, ingredients, benefits, energyType, date } = data;

  return (
    <div className="w-full max-w-2xl mx-auto mt-14 p-8 rounded-2xl bg-black/40 border border-green-500 shadow-[0_0_25px_#22c55e] animate-slideUp relative overflow-hidden">

      {/* Floating Dust Particles */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="w-60 h-60 bg-green-400/10 blur-3xl rounded-full absolute -top-10 -left-10 animate-pulse"></div>
        <div className="w-60 h-60 bg-green-300/10 blur-3xl rounded-full absolute bottom-0 right-0 animate-pulse delay-700"></div>
      </div>

      {/* Title */}
      <h2 className="text-3xl font-extrabold text-green-400 drop-shadow mb-4">
        🍃 {name}
      </h2>

      {/* Energy Type */}
      <p className="text-green-300 text-lg mb-6 italic">
        ⚡ Energy Type: {energyType}
      </p>

      {/* Ingredients List */}
      <div className="text-left mb-6">
        <h3 className="text-xl font-bold text-green-400 mb-2">🌱 Ingredients:</h3>
        <ul className="list-disc ml-6 text-green-200 space-y-1">
          {ingredients.map((i, index) => (
            <li key={index}>{i}</li>
          ))}
        </ul>
      </div>

      {/* Benefit Section */}
      <div className="text-left mb-6">
        <h3 className="text-xl font-bold text-green-400 mb-2">💚 Healing Benefits:</h3>
        <ul className="list-disc ml-6 text-green-200 space-y-1">
          {benefits.map((b, index) => (
            <li key={index}>{b}</li>
          ))}
        </ul>
      </div>

      {/* Date + Branding */}
      <p className="text-green-400 text-sm mt-6 opacity-90">
        Crafted on: {date}
      </p>
      <p className="text-green-300 font-semibold mt-1">
        Nature’s Elixirz — Healing From The Inside Out
      </p>

      {/* Buttons */}
      <div className="flex justify-center gap-4 mt-8">
        <button className="px-5 py-2 rounded-lg bg-green-500 text-black font-bold hover:bg-green-400 transition">
          📄 Download PDF
        </button>
        <button className="px-5 py-2 rounded-lg bg-gray-800 text-white font-bold hover:bg-gray-700 transition">
          🖨 Print
        </button>
      </div>
    </div>
  );
}
