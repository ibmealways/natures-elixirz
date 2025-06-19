import React from 'react';
import '../App.css';

function ResultDisplay({ smoothie }) {
  return (
    <div className="result-display">
      <h2>🥤 Smoothie Result</h2>
      {smoothie ? (
        <div className="smoothie-card">
          <h3>{smoothie.name}</h3>
          <p>{smoothie.description}</p>
        </div>
      ) : (
        <p>Select ingredients and click "Generate Smoothie" to see the result.</p>
      )}
    </div>
  );
}

export default ResultDisplay;