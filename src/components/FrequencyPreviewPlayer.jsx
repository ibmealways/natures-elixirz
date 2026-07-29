// src/components/FrequencyPreviewPlayer.jsx
import React, { useEffect, useState } from "react";

const BAR_COUNT = 24;
const PREVIEW_DURATION_MS = 20000; // 20 seconds

export default function FrequencyPreviewPlayer({ hz = 432 }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [bars, setBars] = useState(() =>
    Array.from({ length: BAR_COUNT }, () => 0.3)
  );

  // Animate bar heights while "playing"
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setBars((prev) =>
        prev.map(() => 0.2 + Math.random() * 1.1) // 0.2–1.3 scale range
      );
    }, 140);

    const timeout = setTimeout(() => {
      setIsPlaying(false);
    }, PREVIEW_DURATION_MS);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [isPlaying]);

  // When Hz changes, reset visualizer + stop playback
  useEffect(() => {
    setBars(Array.from({ length: BAR_COUNT }, () => 0.3));
    setIsPlaying(false);
  }, [hz]);

  const togglePlay = () => {
    setIsPlaying((prev) => !prev);
  };

  return (
    <div className="visualizer-container">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-[11px] tracking-[0.24em] uppercase text-emerald-100/80">
            Field Preview
          </p>
          <p className="text-[11px] text-emerald-100/70">
            ~15–20s sample • {hz} Hz band
          </p>
        </div>
        <button
          type="button"
          onClick={togglePlay}
          className={`preview-play-btn ${
            isPlaying ? "preview-play-btn-active" : ""
          }`}
        >
          {isPlaying ? "Stop Preview" : "Play Preview"}
        </button>
      </div>

      <div
        className={`frequency-visualizer ${
          isPlaying ? "frequency-visualizer-playing" : ""
        }`}
      >
        {bars.map((value, idx) => (
          <div
            key={idx}
            className={`frequency-bar ${
              isPlaying ? "frequency-bar-active" : ""
            }`}
            style={{ transform: `scaleY(${value})` }}
          />
        ))}
      </div>

      <p className="preview-caption mt-2">
        Use this preview to feel into the field before entering the full
        Nature&apos;s Elixirz Frequency Chamber.
      </p>
    </div>
  );
}

