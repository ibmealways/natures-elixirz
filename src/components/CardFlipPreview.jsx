// src/components/CardFlipPreview.jsx
import React from 'react';
import '../styles/CardFlipPreview.css';

export default function CardFlipPreview({ blend }) {
  return (
    <div className="card-container">
      <div className="card">
        <div className="card-front">
          <p>✨ Click to Reveal Your Blend ✨</p>
        </div>
        <div className="card-back">
          <pre className="whitespace-pre-wrap text-left">{blend}</pre>
        </div>
      </div>
    </div>
  );
}


