import React from 'react';

function ResultDisplay({ smoothie }) {
  if (!smoothie) return null;

  return (
    <div className="result-display p-6 rounded-xl bg-green-100 dark:bg-green-900 text-center shadow-lg animate-fadeIn">
      <h3 className="text-2xl font-bold text-green-700 dark:text-green-300">Your Custom Smoothie:</h3>
      <p className="text-lg mt-2">{smoothie}</p>
    </div>
  );
}

export default ResultDisplay;

