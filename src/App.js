
import React, { useState } from 'react';
import SmoothieGenerator from './components/SmoothieGenerator';
import SmoothieResult from './components/SmoothieResult';
import './App.css';

function App() {
  const [smoothie, setSmoothie] = useState(null);

  return (
    <div className="App">
      <h1>Nature’s Elixirz</h1>
      <p>Heal N Blend Smoothie Generator</p>
      <SmoothieGenerator onGenerate={setSmoothie} />
      {smoothie && <SmoothieResult smoothie={smoothie} />}
    </div>
  );
}

export default App;