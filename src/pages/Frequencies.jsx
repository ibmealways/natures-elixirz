import React, { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  AudioLines,
  Headphones,
  LockKeyhole,
  Pause,
  Play,
  Radio,
  Save,
  Sparkles,
  Timer,
  Waves,
  Youtube,
} from "lucide-react";
import GlowNav from "../components/GlowNav";
import InAppYouTubePlayer from "../components/InAppYouTubePlayer";
import TierPreviewBanner, {
  useTierAccess,
} from "../components/TierPreviewBanner";
import {
  getMovementContinuation,
  recordFrequencyJourney,
} from "../utilities/wellnessJourney";
import { useAuth } from "../context/AuthContext";
import {
  buildKernelBrief,
  publishWellnessSignal,
} from "../utilities/wellnessExchange";
import { getFrequencyVideoId } from "../utilities/frequencyVideos";
import "../styles/CosmicShell.css";
import "../styles/frequencyExperience.css";

const frequencies = [
  {
    hz: 174,
    title: "Grounding",
    plane: "Ember Root Plane",
    realm: "ember",
    goals: ["painSupport", "inflammation"],
    note: "A low-tone relaxation pairing for a slow recovery ritual.",
    experience: "Low, steady, and anchored",
  },
  {
    hz: 285,
    title: "Restore",
    plane: "Amber Crystal Garden",
    realm: "amber",
    goals: ["painSupport"],
    note: "A contemplative tone traditionally used in wellness playlists.",
    experience: "Warm, spacious, and reflective",
  },
  {
    hz: 396,
    title: "Release",
    plane: "Violet Release Nebula",
    realm: "violet",
    goals: ["calm", "digestion"],
    note: "A lower listening option for breathwork and unwinding.",
    experience: "Soft, spacious, and exhaling",
  },
  {
    hz: 432,
    title: "Earth Flow",
    plane: "Verdant Earth Haven",
    realm: "verdant",
    goals: ["heart", "general"],
    note: "A popular alternate tuning used for gentle ambient listening.",
    experience: "Natural, flowing, and familiar",
  },
  {
    hz: 528,
    title: "Bright Focus",
    plane: "Solar Focus Citadel",
    realm: "solar",
    goals: ["energy", "focus"],
    note: "A brighter tone pairing for a focused smoothie-making session.",
    experience: "Bright, alert, and intentional",
  },
  {
    hz: 639,
    title: "Connection",
    plane: "Rosewater Bridge",
    realm: "rose",
    goals: ["heart", "calm"],
    note: "A midrange tone for reflective or social wellness rituals.",
    experience: "Open, warm, and connected",
  },
  {
    hz: 741,
    title: "Clarity",
    plane: "Azure Clarity Spires",
    realm: "azure",
    goals: ["focus"],
    note: "A higher tone option for a short clarity and attention ritual.",
    experience: "Crisp, light, and attentive",
  },
  {
    hz: 852,
    title: "Intuition",
    plane: "Indigo Reflection Moon",
    realm: "indigo",
    goals: ["mindfulness"],
    note: "A symbolic spiritual pairing for meditation and self-reflection.",
    experience: "Quiet, inward, and symbolic",
  },
  {
    hz: 963,
    title: "Crown Meditation",
    plane: "Luminous Summit",
    realm: "luminous",
    goals: ["mindfulness"],
    note: "A very high symbolic meditation tone; keep preview volume low.",
    experience: "Airy, minimal, and contemplative",
  },
];

export default function Frequencies() {
  const { user } = useAuth();
  const storageScope = user?.uid || "guest";
  const unlocked = useTierAccess(2);
  const [params] = useSearchParams();
  const movement = getMovementContinuation(storageScope) || {};
  const goal =
    params.get("goal") ||
    movement.goal ||
    sessionStorage.getItem("naturesElixirz.latestSmoothieGoal") ||
    "general";
  const recommended =
    frequencies.find((frequency) => frequency.goals.includes(goal)) ||
    frequencies.find((frequency) => frequency.hz === movement.frequencyHz) ||
    frequencies[3];
  const requestedHz = Number(params.get("hz"));
  const rememberedHz = Number(
    buildKernelBrief(storageScope, "frequency")
      .kernelMemory?.selections?.at(-1)
      ?.match(/\d+/)?.[0],
  );
  const [selected, setSelected] = useState(
    frequencies.find((frequency) => frequency.hz === requestedHz) ||
      frequencies.find((frequency) => frequency.hz === rememberedHz) ||
      recommended,
  );
  const [playing, setPlaying] = useState(false);
  const [memberMessage, setMemberMessage] = useState("");
  const [videoOpen, setVideoOpen] = useState(false);
  const audioRef = useRef(null);
  const timerRef = useRef(null);
  const durationRef = useRef(18);

  const stop = () => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    if (audioRef.current) audioRef.current.close();
    timerRef.current = null;
    audioRef.current = null;
    setPlaying(false);
  };
  const play = async (durationSeconds = 300) => {
    stop();
    durationRef.current = durationSeconds;
    const Context = window.AudioContext || window.webkitAudioContext;
    if (!Context) return;
    const context = new Context();
    const gain = context.createGain();
    const primary = context.createOscillator();
    const undertone = context.createOscillator();
    primary.type = "sine";
    undertone.type = "sine";
    primary.frequency.value = selected.hz;
    undertone.frequency.value = selected.hz / 2;
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.025, context.currentTime + 1);
    gain.gain.exponentialRampToValueAtTime(
      0.0001,
      context.currentTime + Math.max(2, durationSeconds - 1),
    );
    primary.connect(gain);
    undertone.connect(gain);
    gain.connect(context.destination);
    primary.start();
    undertone.start();
    primary.stop(context.currentTime + durationSeconds);
    undertone.stop(context.currentTime + durationSeconds);
    audioRef.current = context;
    recordFrequencyJourney(selected.hz, goal, storageScope);
    publishWellnessSignal(storageScope, "frequency", {
      goal,
      selection: `${selected.hz} Hz`,
    });
    setPlaying(true);
    timerRef.current = window.setTimeout(stop, durationSeconds * 1000);
  };
  useEffect(() => () => stop(), []);
  useEffect(() => {
    if (playing) play(durationRef.current);
  }, [selected]);

  return (
    <div
      className={`cosmic-page-shell resonate-cosmos realm-${selected.realm}`}
    >
      <GlowNav />
      <main className="frequency-preview-page">
        <header className="resonate-hero">
          <div className="resonate-hero-copy">
            <div>
              <p className="ne-kicker">
                <Sparkles size={14} /> Tier 2 · Resonate Observatory
              </p>
              <h1>
                Choose Your <em>Astroplane.</em>
              </h1>
            </div>
            <div className="resonate-intro">
              <p>
                Travel through nine distinct listening realms. Each tone can
                accompany smoothie preparation, breathwork, meditation, or
                reflection—never medical treatment.
              </p>
              <a href="#astroplane-atlas">
                Enter the observatory <span>↓</span>
              </a>
            </div>
          </div>
          <div
            className="resonate-hero-art"
            role="img"
            aria-label="Celestial observatory surrounded by nine colorful floating astroplanes"
          >
            <span>
              <Radio size={15} /> Nine planes online
            </span>
          </div>
        </header>

        <TierPreviewBanner minimum={2}>
          Travel through every astroplane and hear short tone previews. Members
          unlock full sessions, playlists, timers, and history.
        </TierPreviewBanner>

        <section className={`frequency-pairing plane-stage ${selected.realm}`}>
          <div className="plane-visual">
            <div className="frequency-orb">
              <i />
              <i />
              <span>
                {selected.hz}
                <small>Hz</small>
              </span>
            </div>
            <div className="waveform" aria-hidden="true">
              {Array.from({ length: 28 }, (_, index) => (
                <b
                  key={index}
                  style={{
                    "--wave": `${22 + ((index * 17) % 66)}%`,
                    "--delay": `${index * -0.07}s`,
                  }}
                />
              ))}
            </div>
          </div>
          <div className="plane-copy">
            <p className="ne-kicker">Now orbiting · {selected.plane}</p>
            <h2>{selected.title}</h2>
            <span className="plane-feeling">{selected.experience}</span>
            <p>{selected.note}</p>
            <div className="smoothie-pairing">
              <GlassPairing />
              <span>
                <small>Your smoothie alignment</small>
                <strong>
                  {recommended.hz === selected.hz
                    ? `Recommended for ${goal}`
                    : `${recommended.hz} Hz · ${recommended.title} is recommended for ${goal}`}
                </strong>
              </span>
            </div>
            <div className="frequency-actions">
              <button onClick={playing ? stop : () => play(18)}>
                {playing ? <Pause size={17} /> : <Play size={17} />}
                {playing ? "Stop transmission" : "Play 18-second preview"}
              </button>
              <button
                type="button"
                onClick={() => {
                  stop();
                  setVideoOpen(true);
                }}
              >
                <Youtube size={17} /> Watch frequency video here
              </button>
            </div>
          </div>
        </section>

        <section className="frequency-selector" id="astroplane-atlas">
          <div className="atlas-heading">
            <div>
              <p className="ne-kicker">Interdimensional atlas</p>
              <h2>Select a listening realm</h2>
            </div>
            <span>Use comfortable volume</span>
          </div>
          <div className="astroplane-grid">
            {frequencies.map((frequency, index) => (
              <button
                key={frequency.hz}
                className={`${frequency.realm} ${selected.hz === frequency.hz ? "active" : ""}`}
                onClick={() => setSelected(frequency)}
              >
                <span className="plane-number">
                  Plane {String(index + 1).padStart(2, "0")}
                </span>
                <i className="mini-planet">
                  <Waves size={20} />
                </i>
                <strong>
                  {frequency.hz}
                  <small>Hz</small>
                </strong>
                <h3>{frequency.plane}</h3>
                <p>{frequency.title}</p>
                {frequency.goals.includes(goal) && (
                  <em>Aligned with your smoothie</em>
                )}
              </button>
            ))}
          </div>
        </section>

        <section className="frequency-member-panel">
          <div>
            <p className="ne-kicker">Resonate member console</p>
            <h2>
              {unlocked
                ? "Full session controls unlocked"
                : "Your full observatory awaits"}
            </h2>
            <p>
              {memberMessage ||
                (unlocked
                  ? "Build a listening ritual and keep your journey organized."
                  : "Preview the controls below. Tier 2 membership unlocks complete sessions and personal listening tools.")}
            </p>
          </div>
          <div className="member-controls">
            <button
              disabled={!unlocked}
              onClick={() => {
                recordFrequencyJourney(selected.hz, goal, storageScope);
                publishWellnessSignal(storageScope, "frequency", {
                  goal,
                  selection: `${selected.hz} Hz`,
                });
                play();
                setMemberMessage(
                  `${selected.hz} Hz five-minute session started and connected to your ${goal} journey.`,
                );
              }}
            >
              <Timer size={18} /> Start 5-minute session
              {!unlocked && <LockKeyhole size={13} />}
            </button>
            <button
              disabled={!unlocked}
              onClick={() => {
                recordFrequencyJourney(selected.hz, goal, storageScope);
                publishWellnessSignal(storageScope, "frequency", {
                  goal,
                  selection: `${selected.hz} Hz`,
                });
                setMemberMessage(
                  `${selected.hz} Hz · ${selected.title} saved as your current resonance pairing.`,
                );
              }}
            >
              <Save size={18} /> Save pairing
              {!unlocked && <LockKeyhole size={13} />}
            </button>
            <button
              disabled={!unlocked}
              onClick={() => {
                recordFrequencyJourney(selected.hz, goal, storageScope);
                publishWellnessSignal(storageScope, "frequency", {
                  goal,
                  selection: `${selected.hz} Hz`,
                });
                setMemberMessage(
                  "This listening choice is now available to the rest of your wellness journey.",
                );
              }}
            >
              <Headphones size={18} /> Connect to journey
              {!unlocked && <LockKeyhole size={13} />}
            </button>
          </div>
        </section>
        <p className="resonate-safety">
          Frequency labels describe listening experiences and cultural wellness
          traditions. They do not diagnose, treat, prevent, or cure health
          conditions.
        </p>
        <InAppYouTubePlayer
          key={selected.hz}
          open={videoOpen}
          onClose={() => setVideoOpen(false)}
          title={`${selected.hz} Hz ambient video library`}
          videoId={getFrequencyVideoId(selected.hz)}
          note="YouTube content is presented for optional ambient listening. Frequency labels are not medical claims or treatment recommendations."
        />
      </main>
    </div>
  );
}

function GlassPairing() {
  return (
    <span className="pairing-glyph" aria-hidden="true">
      <AudioLines size={21} />
    </span>
  );
}
