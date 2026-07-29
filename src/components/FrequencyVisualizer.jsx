// src/components/FrequencyVisualizer.jsx
import React, { useEffect, useState } from "react";

const BAR_COUNT = 28;

const FrequencyVisualizer = ({ hz = 432, isPlaying = false, earthsync = false }) => {
  const [bars, setBars] = useState(() =>
    Array.from({ length: BAR_COUNT }, () => 0.2)
  );

  useEffect(() => {
    if (!isPlaying) {
      // Smoothly relax bars when stopped
      setBars((prev) => prev.map(() => 0.15));
      return;
    }

    let frameId;
    const baseSpeed = Math.min(1.5, Math.max(0.4, hz / 600));
    const variance = earthsync ? 0.5 : 0.35;

    const tick = () => {
      setBars((prev) =>
        prev.map((value, index) => {
          const phase = (index / BAR_COUNT) * Math.PI * 2;
          const sin = Math.sin(Date.now() / (220 / baseSpeed) + phase);
          const randomJitter = (Math.random() - 0.5) * variance;

          const next = 0.25 + sin * 0.22 + randomJitter;
          return Math.max(0.08, Math.min(1, next));
        })
      );
      frameId = requestAnimationFrame(tick);
    };

    tick();
    return () => cancelAnimationFrame(frameId);
  }, [hz, isPlaying, earthsync]);

  return (
    <div className={`frequency-visualizer ${earthsync ? "frequency-visualizer-earthsync" : ""}`}>
      {bars.map((height, idx) => (
        <div
          key={idx}
          className="frequency-visualizer-bar"
          style={{ height: `${height * 100}%` }}
        />
      ))}
    </div>
  );
};

export default FrequencyVisualizer;
