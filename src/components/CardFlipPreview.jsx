import React from 'react';

export default function CardFlipPreview({ blend }) {
  return (
    <div className="relative w-full h-48 perspective">
      <div className="absolute w-full h-full rounded-xl shadow-lg bg-gradient-to-br from-green-300 to-green-500 text-white flex items-center justify-center text-xl font-bold animate-flip">
        {blend}
      </div>
    </div>
  );
}



