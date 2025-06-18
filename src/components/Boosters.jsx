import React from 'react';

const Boosters = ({ boosters, onToggle }) => (
  <div className="p-4">
    <label className="block mb-2 font-bold">Optional Boosters:</label>
    {boosters.map(b => (
      <div key={b} className="flex items-center mb-1">
        <input type="checkbox" onChange={() => onToggle(b)} className="mr-2" />
        {b}
      </div>
    ))}
  </div>
);

export default Boosters;