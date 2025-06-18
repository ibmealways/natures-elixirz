import React from "react";

const ResultCard = ({ smoothie }) => {
  if (!smoothie) return null;

  return (
    <div className="p-4 mt-6 bg-white shadow-md rounded-xl text-center max-w-md mx-auto">
      <h2 className="text-xl font-bold mb-2">🌿 Your Custom Smoothie 🌿</h2>
      <ul className="text-left">
        {smoothie.map((item, index) => (
          <li key={index}>✅ {item}</li>
        ))}
      </ul>
    </div>
  );
};

export default ResultCard;