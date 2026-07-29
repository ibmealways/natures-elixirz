// src/components/FrequencyPlaylist.jsx
import React from "react";

const FrequencyPlaylist = ({
  userTier,
  baseFrequency,
  activeTrack,
  onSelectTrack,
}) => {
  const tracks = [
    {
      id: "auto",
      hz: baseFrequency || 432,
      title: "Auto-Matched Frequency",
      desc: "Based on your selected healing goal / focus.",
      tier: 1,
      highlight: true,
      externalLinks: {
        youtube:
          "https://www.youtube.com/results?search_query=432hz+healing+frequency",
        spotify: "https://open.spotify.com/search/432hz",
        appleMusic: null,
      },
    },
    {
      id: "432",
      hz: 432,
      title: "Heart & Calm",
      desc: "Nervous system reset • emotional grounding.",
      tier: 1,
      externalLinks: {
        youtube:
          "https://www.youtube.com/results?search_query=432hz+heart+chakra",
        spotify: "https://open.spotify.com/search/432hz",
        appleMusic: null,
      },
    },
    {
      id: "528",
      hz: 528,
      title: "DNA & Cellular Repair",
      desc: "Transformation • vitality • miracle tone.",
      tier: 1,
      externalLinks: {
        youtube:
          "https://www.youtube.com/results?search_query=528hz+dna+repair",
        spotify: "https://open.spotify.com/search/528hz",
        appleMusic: null,
      },
    },
    {
      id: "639",
      hz: 639,
      title: "Love, Harmony & Immunity",
      desc: "Heart coherence • immune field strengthening.",
      tier: 2,
      externalLinks: {
        youtube:
          "https://www.youtube.com/results?search_query=639hz+love+harmony",
        spotify: "https://open.spotify.com/search/639hz",
        appleMusic: null,
      },
    },
    {
      id: "741",
      hz: 741,
      title: "Detox & Purification",
      desc: "Cleansing • clarity • emotional release.",
      tier: 2,
      externalLinks: {
        youtube:
          "https://www.youtube.com/results?search_query=741hz+detox+purification",
        spotify: "https://open.spotify.com/search/741hz",
        appleMusic: null,
      },
    },
    {
      id: "852",
      hz: 852,
      title: "Intuition & Awakening",
      desc: "Pineal activation • inner guidance clarity.",
      tier: 3,
      externalLinks: {
        youtube:
          "https://www.youtube.com/results?search_query=852hz+third+eye",
        spotify: "https://open.spotify.com/search/852hz",
        appleMusic: null,
      },
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
      {tracks.map((t) => {
        const locked = userTier < t.tier;
        const isActive = activeTrack && activeTrack.id === t.id;

        return (
          <div
            key={t.id}
            onClick={() => {
              if (!locked && onSelectTrack) {
                onSelectTrack({
                  id: t.id,
                  hz: t.hz,
                  frequency: t.hz,
                  title: t.title,
                  label: `${t.hz} Hz • ${t.title}`,
                  desc: t.desc,
                  description: t.desc,
                  tier: t.tier,
                  externalLinks: t.externalLinks || {},
                });
              }
            }}
            className={`
              p-6 rounded-2xl cursor-pointer border transition relative backdrop-blur-xl
              ${
                t.highlight
                  ? "bg-emerald-900/40 border-green-400/40 shadow-lg shadow-green-500/40"
                  : "bg-black/30 border-green-700/30 hover:bg-green-700/20"
              }
              ${locked ? "opacity-60" : ""}
              ${
                isActive
                  ? "ring-2 ring-emerald-300 shadow-[0_0_26px_rgba(16,185,129,0.9)]"
                  : ""
              }
            `}
          >
            {/* Lock Badge */}
            {locked && (
              <div className="absolute top-3 right-3 bg-yellow-400 text-black px-2 py-1 rounded-full text-xs font-bold shadow">
                🔒 Tier {t.tier}
              </div>
            )}

            <p className="text-sm text-emerald-300 uppercase tracking-widest">
              {t.hz} Hz
            </p>

            <h2 className="text-xl text-emerald-100 mt-1">
              {t.hz} Hz • {t.title}
            </h2>

            <p className="text-emerald-200/80 mt-2 text-sm">{t.desc}</p>

            {/* CTA */}
            {!locked && isActive && (
              <p className="mt-4 text-emerald-300 text-sm flex items-center gap-1">
                <span>✅</span>
                <span>Currently Tuned</span>
              </p>
            )}

            {!locked && !isActive && (
              <p className="mt-4 text-emerald-300 text-sm">✨ Tap to tune</p>
            )}

            {locked && (
              <p className="mt-4 text-yellow-300 text-sm">
                🔒 Requires Tier {t.tier}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default FrequencyPlaylist;

