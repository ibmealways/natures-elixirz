// src/components/ResultDisplay.jsx
import React, { useState } from 'react';
import CardFlipPreview from './CardFlipPreview';

export default function ResultDisplay({ smoothie }) {
  const [darkMode, setDarkMode] = useState(false);

  const { fruits = [], vegetables = [], seeds = [], spices = [] } = smoothie || {};

  const blend = `
Fruits: ${fruits.join(', ')}
Veggies: ${vegetables.join(', ')}
Seeds: ${seeds.join(', ')}
Spices: ${spices.join(', ')}
  `;

  if (!smoothie) return null;

  return (
    <div className={darkMode ? 'dark' : ''}>
      <div className="container mx-auto p-4">
        <div className="flex justify-end mb-4">
          <button
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 dark:text-white rounded"
            onClick={() => setDarkMode(!darkMode)}
          >
            {darkMode ? '☀️ Light Mode' : '🌙 Dark Mode'}
          </button>
        </div>

        {/* Animated smoothie preview */}
        <CardFlipPreview blend={blend} />

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          {['fruits', 'vegetables', 'seeds', 'spices'].map((cat) => (
            <div key={cat} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg">
              <h4 className="font-semibold capitalize mb-2 dark:text-gray-200">{cat}</h4>
              <ul className="list-disc list-inside text-gray-700 dark:text-gray-300">
                {(smoothie[cat] || []).map((item, i) => <li key={i}>{item}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
