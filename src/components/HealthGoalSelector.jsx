import React from 'react';

const HealthGoalSelector = ({ goals, onSelect }) => (
  <div className="p-4">
    <label className="block mb-2 font-bold">Select Health Goal:</label>
    <select onChange={(e) => onSelect(e.target.value)} className="w-full p-2 border rounded">
      <option value="">-- Choose One --</option>
      {goals.map(goal => (
        <option key={goal} value={goal}>{goal}</option>
      ))}
    </select>
  </div>
);

export default HealthGoalSelector;