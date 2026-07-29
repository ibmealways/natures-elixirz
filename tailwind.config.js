/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Poppins", "Inter", "sans-serif"],
        alchemist: ["Cinzel Decorative", "serif"],
      },
      colors: {
        alchemist: {
          gold: "#FCD34D",
          emerald: "#10B981",
          cosmic: "#8B85C6",
          aurora: "#00E0FF",
          nebula: "#4F46E5",
        },
        galaxy: {
          50: "#f5f3ff",
          100: "#ede9fe",
          500: "#7c3aed",
          700: "#5b21b6",
          900: "#2e1065",
        },
        aura: {
          greenBlast: {
            light: "#72FF8C",
            DEFAULT: "#22C55E",
            dark: "#14532D",
          },
          tropicalFuel: {
            light: "#FFD580",
            DEFAULT: "#F59E0B",
            dark: "#78350F",
          },
          flexiFlow: {
            light: "#9AE6B4",
            DEFAULT: "#16A34A",
            dark: "#14532D",
          },
          cosmicClarity: {
            light: "#C4B5FD",
            DEFAULT: "#8B85C6",
            dark: "#4C1D95",
          },
          gentleGlow: {
            light: "#FFECA9",
            DEFAULT: "#F87171",
            dark: "#7F1D1D",
          },
          fruityFire: {
            light: "#FF9E9E",
            DEFAULT: "#EF4444",
            dark: "#7F1D1D",
          },
        },
      },
      backgroundImage: {
        "galactic-gradient":
          "linear-gradient(135deg, #00E0FF 0%, #8B85C6 50%, #FCD34D 100%)",
        "nebula-glow":
          "radial-gradient(circle at 20% 20%, rgba(139,92,246,0.4), transparent 70%)",
      },
      boxShadow: {
        glow: "0 0 20px rgba(139,92,246,0.7), 0 0 40px rgba(16,185,129,0.4)",
        "aura-greenBlast": "0 0 25px #22C55E",
        "aura-tropicalFuel": "0 0 25px #F59E0B",
        "aura-flexiFlow": "0 0 25px #16A34A",
        "aura-cosmicClarity": "0 0 25px #8B85C6",
        "aura-gentleGlow": "0 0 25px #F87171",
        "aura-fruityFire": "0 0 25px #EF4444",
      },
      animation: {
        "float-slow": "float 10s ease-in-out infinite",
        "float-fast": "float 6s ease-in-out infinite",
        glowpulse: "glowpulse 4s ease-in-out infinite",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-20px)" },
        },
        glowpulse: {
          "0%, 100%": { opacity: "0.8", filter: "brightness(1)" },
          "50%": { opacity: "1", filter: "brightness(1.4)" },
        },
      },
    },
  },
  plugins: [],
};
