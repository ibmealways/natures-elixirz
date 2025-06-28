// src/components/CardFlipPreview.jsx
import React, { useState } from 'react';
import '../styles/CardFlipPreview.css';

export default function CardFlipPreview({ blend }) {
  const [flipped, setFlipped] = useState(false);

  return (
    <div
      className="flip-container mx-auto my-6 w-80 h-48 perspective-1000"
      onClick={() => setFlipped(!flipped)}
    >
      <div className={`flipper ${flipped ? 'flipped' : ''}`}>
        {/* Front Side */}
        <div className="front bg-gradient-to-br from-green-50 to-green-100 border border-green-300 rounded-lg p-4 shadow-xl flex items-center justify-center">
          <p className="text-center text-green-800 font-semibold">
            🍹 Preview My Smoothie
          </p>
        </div>
        {/* Back Side */}
        <div className="back bg-gradient-to-br from-green-100 to-green-200 border border-green-300 rounded-lg p-4 shadow-xl overflow-y-auto">
          <pre className="whitespace-pre-wrap text-gray-800 text-sm">{blend}</pre>
        </div>
      </div>
    </div>
  );
}

.card {
  width: 300px;
  height: 200px;
  transition: transform 0.8s;
  transform-style: preserve-3d;
  cursor: pointer;
  animation: alchemyPulse 3s infinite;
}

.card-inner.flipped {
  transform: rotateY(180deg);
}

.card-front,
.card-back {
  position: absolute;
  width: 100%;
  height: 100%;
  backface-visibility: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  border-radius: 1rem;
  background-color: #f0fdf4;
  box-shadow: 0 4px 15px rgba(0,0,0,0.1);
}

.card-back {
  transform: rotateY(180deg);
}

