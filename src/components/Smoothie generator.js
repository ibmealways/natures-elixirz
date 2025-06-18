import React from 'react';
import generateSmoothie from '../utils/generateSmoothie';

const SmoothieGenerator = ({ onGenerate }) => {
  const handleGenerate = () => {
    const result = generateSmoothie(['energy', 'detox']);
    onGenerate(result);
  };

  return (
    <div>
      <button onClick={handleGenerate}>Generate Smoothie</button>
    </div>
  );
};

export default SmoothieGenerator;