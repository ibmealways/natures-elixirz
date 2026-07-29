// =====================================================
// ResultDisplay.jsx — Galactic Upgrade + Flip + Sharing
// ⭐ Save Signature Elixir + Frequency
// 🚀 Send to Vibrational Frequency Lab (auto-play)
// 🔄 Animated Card Flip (front/back)
// 📣 Share to Social
// =====================================================

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function ResultDisplay({ smoothie, meta }) {
  const navigate = useNavigate();
  const [isFlipped, setIsFlipped] = useState(false);

  if (!smoothie && !meta) return null;

  const hasObject =
    smoothie && typeof smoothie === "object" && !Array.isArray(smoothie);

  const name =
    meta?.name ||
    (hasObject ? smoothie.name : null) ||
    "Custom Healing Elixir";

  const size = hasObject ? smoothie.size : meta?.batchSize;
  const healingFocus = hasObject ? smoothie.healingFocus : null;
  const frequency = hasObject ? smoothie.frequency : null;
  const flavorProfile = hasObject ? smoothie.flavorProfile : null;
  const flatIngredients = hasObject ? smoothie.flatIngredients : [];

  // -----------------------------------------
  //  ⭐ SAVE SIGNATURE ELIXIR + FREQUENCY
  // -----------------------------------------
  const handleSaveSignature = () => {
    const newName =
      prompt("Name your Signature Elixir:") || `Signature Elixir`;

    const payload = {
      id: Date.now(),
      name: newName,
      smoothie,
      meta,
      timestamp: new Date().toISOString(),
    };

    const existing = JSON.parse(
      localStorage.getItem("signatureElixirs") || "[]"
    );

    const updated = [payload, ...existing];
    localStorage.setItem("signatureElixirs", JSON.stringify(updated));

    alert("⭐ Saved to your Signature Elixirs!");
  };

  // -----------------------------------------------------
  // 🚀 SEND TO VIBRATIONAL FREQUENCY LAB (AUTO-PLAY)
  // -----------------------------------------------------
  const handleSendToFrequencyLab = () => {
    const session = {
      smoothie,
      meta,
      frequency,
      healingFocus,
      ingredients: flatIngredients,
      autoPlay: true, // 🔥 let the Frequencies page auto-start audio
    };

    localStorage.setItem(
      "pendingFrequencySession",
      JSON.stringify(session)
    );

    navigate("/frequencies");
  };

  // -----------------------------------------------------
  // 📣 SHARE TO SOCIAL / COPY SUMMARY
  // -----------------------------------------------------
  const baseShareText = `${name} (${size || "?"} oz)
Healing Focus: ${healingFocus || meta?.energyType || "Full-body support"}
Frequency: ${frequency || "432 Hz • Earth Resonance"}
Powered by Nature’s Elixirz Smoothie Lab.`;

  const handleCopySummary = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(baseShareText);
        alert("📋 Copied smoothie summary to clipboard!");
      } else {
        alert("Clipboard not available in this browser.");
      }
    } catch (err) {
      console.error(err);
      alert("Could not copy. Try manually selecting the text instead.");
    }
  };

  const openShareWindow = (url) => {
    if (typeof window === "undefined") return;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleShareX = () => {
    const text = encodeURIComponent(
      `${name} — ${frequency || "432 Hz"}\n${healingFocus || ""}\n#NaturesElixirz #SmoothieLab`
    );
    openShareWindow(`https://x.com/intent/post?text=${text}`);
  };

  const handleShareFacebook = () => {
    const quote = encodeURIComponent(baseShareText);
    const href =
      typeof window !== "undefined" ? window.location.href : "https://natureselixirz.com";
    const url = encodeURIComponent(href);
    openShareWindow(
      `https://www.facebook.com/sharer/sharer.php?u=${url}&quote=${quote}`
    );
  };

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(baseShareText);
    openShareWindow(`https://wa.me/?text=${text}`);
  };

  // -----------------------------------------------------
  // FLIP CARD STYLES
  // -----------------------------------------------------
  const flipContainerStyle = {
    perspective: "1200px",
  };

  const flipInnerStyle = {
    position: "relative",
    width: "100%",
    transformStyle: "preserve-3d",
    transition: "transform 0.7s ease",
    transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
  };

  const faceBaseStyle = {
    position: "relative",
    backfaceVisibility: "hidden",
    WebkitBackfaceVisibility: "hidden",
    borderRadius: "1.5rem",
  };

  const backFaceStyle = {
    ...faceBaseStyle,
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    transform: "rotateY(180deg)",
  };

  // -----------------------------------------------------
  // RENDER
  // -----------------------------------------------------
  return (
    <div className="max-w-3xl mx-auto mt-8">
      {/* Flip toggle */}
      <div className="flex justify-end mb-2">
        <button
          onClick={() => setIsFlipped((v) => !v)}
          className="px-3 py-1.5 rounded-full text-[11px] font-semibold border border-emerald-400 text-emerald-200 bg-black/40 hover:bg-emerald-400 hover:text-slate-950 transition-all"
        >
          {isFlipped ? "View Details" : "View Cosmic Card"}
        </button>
      </div>

      <div style={flipContainerStyle}>
        <div style={flipInnerStyle}>
          {/* FRONT FACE — COSMIC VISUAL SUMMARY */}
          <div style={faceBaseStyle} className="bg-gradient-to-br from-emerald-500/30 via-cyan-500/20 to-sky-500/30 border border-emerald-300/70 p-6 md:p-8 shadow-[0_0_45px_rgba(45,212,191,0.8)]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.22em] text-emerald-200/90 mb-1">
                  Signature Healing Elixir
                </p>
                <h3 className="text-2xl md:text-3xl font-semibold text-emerald-100">
                  {name}
                </h3>
              </div>
              {size && (
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-emerald-200/70">
                    Batch Size
                  </p>
                  <p className="text-lg font-semibold text-emerald-100">
                    {size} oz
                  </p>
                </div>
              )}
            </div>

            <div className="grid gap-4 text-xs text-emerald-50 sm:grid-cols-3">
              {healingFocus && (
                <div>
                  <p className="font-semibold text-emerald-200 text-[11px] mb-1">
                    Healing Focus
                  </p>
                  <p className="text-emerald-50/90">{healingFocus}</p>
                </div>
              )}

              {frequency && (
                <div>
                  <p className="font-semibold text-emerald-200 text-[11px] mb-1">
                    Frequency Match
                  </p>
                  <p className="text-emerald-50/90">{frequency}</p>
                  <p className="text-[10px] text-emerald-200/70 mt-0.5">
                    Auto-play enabled in Vibrational Lab
                  </p>
                </div>
              )}

              {flavorProfile && (
                <div>
                  <p className="font-semibold text-emerald-200 text-[11px] mb-1">
                    Flavor Profile
                  </p>
                  <p className="text-emerald-50/90">{flavorProfile}</p>
                </div>
              )}
            </div>

            {flatIngredients && flatIngredients.length > 0 && (
              <div className="mt-5">
                <p className="mb-2 text-[11px] font-semibold text-emerald-200">
                  Core Ingredients
                </p>
                <ul className="flex flex-wrap gap-1.5 text-[11px] text-emerald-50">
                  {flatIngredients.map((item, idx) => (
                    <li
                      key={`${item}-${idx}`}
                      className="rounded-full bg-emerald-900/40 px-3 py-1 border border-emerald-500/80"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* BACK FACE — EXISTING DETAIL CARD */}
          <div
            style={backFaceStyle}
            className="bg-black/60 border border-green-700/80 p-6 md:p-8 text-left shadow-2xl shadow-green-500/40"
          >
            <h3 className="text-xl md:text-2xl font-semibold text-green-300 mb-1">
              {name}
            </h3>

            {meta?.smartSummary && (
              <p className="text-[11px] text-green-200/80 mb-3">
                {meta.smartSummary}
              </p>
            )}

            <div className="grid gap-4 text-xs text-green-100 sm:grid-cols-2 mb-4">
              {size && (
                <div>
                  <p className="font-semibold text-green-300">Size</p>
                  <p>{size} oz</p>
                </div>
              )}

              {meta?.energyType && (
                <div>
                  <p className="font-semibold text-green-300">Energy Type</p>
                  <p>{meta.energyType}</p>
                </div>
              )}

              {healingFocus && (
                <div>
                  <p className="font-semibold text-green-300">Healing Focus</p>
                  <p>{healingFocus}</p>
                </div>
              )}

              {frequency && (
                <div>
                  <p className="font-semibold text-green-300">
                    Suggested Frequency
                  </p>
                  <p>{frequency}</p>
                </div>
              )}

              {flavorProfile && (
                <div>
                  <p className="font-semibold text-green-300">Flavor Profile</p>
                  <p>{flavorProfile}</p>
                </div>
              )}
            </div>

            {flatIngredients && flatIngredients.length > 0 && (
              <div>
                <p className="mb-2 text-[11px] font-semibold text-green-300">
                  Core Ingredients
                </p>
                <ul className="flex flex-wrap gap-1 text-[11px] text-green-100">
                  {flatIngredients.map((item, idx) => (
                    <li
                      key={`${item}-${idx}`}
                      className="rounded-full bg-green-900/40 px-3 py-1 border border-green-600/80"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* -----------------------------------------
                BOTTOM ACTION BUTTONS
            ----------------------------------------- */}
            <div className="mt-6 flex flex-col md:flex-row gap-3 justify-center">
              {/* ⭐ SAVE SIGNATURE */}
              <button
                onClick={handleSaveSignature}
                className="
                  px-6 py-2 rounded-full
                  bg-green-400 text-black font-semibold text-xs
                  shadow-[0_0_18px_rgba(52,211,153,0.9)]
                  hover:bg-green-300 hover:scale-105 transition
                "
              >
                ⭐ Save This Signature Elixir + Frequency
              </button>

              {/* 🚀 SEND TO FREQUENCY LAB */}
              <button
                onClick={handleSendToFrequencyLab}
                className="
                  px-6 py-2 rounded-full
                  bg-indigo-500 text-white font-semibold text-xs
                  shadow-[0_0_22px_rgba(129,140,248,0.9)]
                  hover:bg-indigo-400 hover:scale-105 transition
                "
              >
                🚀 Send to Vibrational Frequency Lab
              </button>
            </div>

            {/* SOCIAL SHARE ROW */}
            <div className="mt-4 border-t border-green-700/70 pt-3">
              <p className="text-[10px] uppercase tracking-[0.22em] text-green-300 mb-2 text-center">
                Share Your Elixir
              </p>
              <div className="flex flex-wrap gap-2 justify-center text-[11px]">
                <button
                  onClick={handleCopySummary}
                  className="px-3 py-1.5 rounded-full border border-green-500/80 text-green-100 bg-black/40 hover:bg-green-500 hover:text-black transition"
                >
                  📋 Copy Summary
                </button>
                <button
                  onClick={handleShareX}
                  className="px-3 py-1.5 rounded-full border border-slate-500 text-slate-100 bg-black/40 hover:bg-slate-200 hover:text-black transition"
                >
                  ✖ Share on X
                </button>
                <button
                  onClick={handleShareFacebook}
                  className="px-3 py-1.5 rounded-full border border-blue-500 text-blue-100 bg-black/40 hover:bg-blue-400 hover:text-black transition"
                >
                  f Share on Facebook
                </button>
                <button
                  onClick={handleShareWhatsApp}
                  className="px-3 py-1.5 rounded-full border border-emerald-500 text-emerald-100 bg-black/40 hover:bg-emerald-400 hover:text-black transition"
                >
                  🟢 Share on WhatsApp
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>      
    </div>
  );
}
