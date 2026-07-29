// src/components/FrequencyPreviewPlayer.jsx
import React, { useEffect, useRef, useState } from "react";
import FrequencyVisualizer from "./FrequencyVisualizer";

const PREVIEW_DURATION_MS = 18000; // ~18s

const FrequencyPreviewPlayer = ({ hz = 432 }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioCtxRef = useRef(null);
  const oscRef = useRef(null);
  const gainRef = useRef(null);
  const timeoutRef = useRef(null);

  const cleanupAudio = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    if (oscRef.current) {
      try {
        oscRef.current.stop();
      } catch (e) {
        // ignore
      }
      oscRef.current.disconnect();
      oscRef.current = null;
    }

    if (gainRef.current) {
      gainRef.current.disconnect();
      gainRef.current = null;
    }

    if (audioCtxRef.current) {
      audioCtxRef.current.close();
      audioCtxRef.current = null;
    }

    setIsPlaying(false);
  };

  const startPreview = async () => {
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      const audioCtx = new AudioContextClass();

      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(hz, audioCtx.currentTime);

      // Simple gentle envelope
      gain.gain.setValueAtTime(0, audioCtx.currentTime);
      gain.gain.linearRampToValueAtTime(0.15, audioCtx.currentTime + 0.4);
      gain.gain.linearRampToValueAtTime(0.12, audioCtx.currentTime + PREVIEW_DURATION_MS / 1000 - 0.6);
      gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + PREVIEW_DURATION_MS / 1000);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start();

      audioCtxRef.current = audioCtx;
      oscRef.current = osc;
      gainRef.current = gain;
      setIsPlaying(true);

      timeoutRef.current = setTimeout(() => {
        cleanupAudio();
      }, PREVIEW_DURATION_MS);
    } catch (e) {
      console.error("Audio preview error:", e);
      cleanupAudio();
    }
  };

  const handleToggle = () => {
    if (isPlaying) {
      cleanupAudio();
    } else {
      startPreview();
    }
  };

  useEffect(() => {
    return () => cleanupAudio();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="w-full flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={handleToggle}
          className={`preview-play-btn ${
            isPlaying ? "preview-play-btn-active" : ""
          }`}
        >
          {isPlaying ? "Stop Preview" : "Play 18s Preview"}
        </button>
        <p className="preview-caption">
          {hz} Hz • Smooth sine tone preview
        </p>
      </div>

      <div className="visualizer-container">
        <FrequencyVisualizer hz={hz} isPlaying={isPlaying} />
      </div>
    </div>
  );
};

export default FrequencyPreviewPlayer;


