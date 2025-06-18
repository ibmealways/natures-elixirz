
import React from 'react';

function ResultCard({ items }) {
  return (
    <div style={{ backgroundColor: '#fff', padding: '1rem', marginTop: '1rem', borderRadius: '8px' }}>
      <h3>Your Smoothie Blend</h3>
      <ul>
        {items.map(({ name, benefit }) => (
          <li key={name}><strong>{name}:</strong> {benefit}</li>
        ))}
      </ul>
    </div>
  );
}

export default ResultCard;