import React from 'react';

const SearchBar = ({ onSearch }) => (
  <div className="p-4">
    <input
      type="text"
      onChange={(e) => onSearch(e.target.value)}
      placeholder="Search ingredient or benefit..."
      className="w-full p-2 border rounded"
    />
  </div>
);

export default SearchBar;