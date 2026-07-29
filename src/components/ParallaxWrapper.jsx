// src/components/ParallaxWrapper.jsx
import React, { useRef, useEffect } from "react";

const ParallaxWrapper = ({ children, maxTilt = 15 }) => {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;

    const handleMove = (e) => {
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;

      const tiltX = (y / rect.height) * maxTilt;
      const tiltY = -(x / rect.width) * maxTilt;

      el.style.transform = `rotateX(${tiltX}deg) rotateY(${tiltY}deg) scale(1.03)`;
    };

    const resetTilt = () => {
      el.style.transform = `rotateX(0deg) rotateY(0deg) scale(1)`;
    };

    el.addEventListener("mousemove", handleMove);
    el.addEventListener("mouseleave", resetTilt);

    return () => {
      el.removeEventListener("mousemove", handleMove);
      el.removeEventListener("mouseleave", resetTilt);
    };
  }, [maxTilt]);

  return (
    <div ref={ref} className="parallax-container">
      {children}
    </div>
  );
};

export default ParallaxWrapper;
