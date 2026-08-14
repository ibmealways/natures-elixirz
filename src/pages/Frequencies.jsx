import React, { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
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
import KernelFeedbackContract from "../components/KernelFeedbackContract";
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

const extendedFrequencies = [
  {
    hz: 40,
    title: "Low Focus Pulse",
    plane: "Deep Focus Chamber",
    realm: "azure",
    goals: ["focus"],
    note: "A very low audible tone for optional focused listening. Research on 40 Hz sensory stimulation is still developing and this preview is not treatment.",
    experience: "Low, steady, and minimal",
  },
  {
    hz: 128,
    title: "Quiet Foundation",
    plane: "Stillwater Foundation",
    realm: "verdant",
    goals: ["calm"],
    note: "A low musical reference tone for quiet breathing, reflection, or gentle ambient listening.",
    experience: "Deep, calm, and unhurried",
  },
  {
    hz: 136,
    title: "Earth-Year Tone",
    plane: "Earth Orbit Sanctuary",
    realm: "ember",
    goals: ["mindfulness"],
    note: "An approximately 136.1 Hz tone sometimes used in meditative music and sound traditions.",
    experience: "Earthy, resonant, and contemplative",
  },
  {
    hz: 256,
    title: "Middle C Resonance",
    plane: "Harmonic Compass",
    realm: "amber",
    goals: ["general"],
    note: "A scientific-pitch reference for middle C, useful as a simple musical listening anchor.",
    experience: "Balanced, musical, and centered",
  },
  {
    hz: 417,
    title: "Transition",
    plane: "Copper Passage",
    realm: "rose",
    goals: ["calm"],
    note: "A popular symbolic playlist frequency for transition rituals and reflective listening.",
    experience: "Warm, changing, and reflective",
  },
  {
    hz: 440,
    title: "Concert Pitch",
    plane: "Orchestral Beacon",
    realm: "solar",
    goals: ["focus", "general"],
    note: "The common A4 tuning reference used by many modern instruments and ensembles.",
    experience: "Clear, familiar, and musical",
  },
  {
    hz: 723,
    title: "July 23 Signature Tone",
    plane: "Founder’s Birthday Star",
    realm: "luminous",
    goals: ["mindfulness", "general"],
    note: "Nature’s Elixirz founder signature tone, inspired by the July 23 birthday date. It is a personal and symbolic listening choice rather than a medical frequency.",
    experience: "Personal, celebratory, and luminous",
  },
  {
    hz: 888,
    title: "Octave Reflection",
    plane: "Infinite Mirror",
    realm: "indigo",
    goals: ["mindfulness"],
    note: "A high symbolic tone for short meditation or reflection; begin at a very low volume.",
    experience: "Bright, spacious, and symbolic",
  },
  ...[1111, 2222, 3333, 4444, 5555].map((hz, index) => ({
    hz,
    title: `${String(index + 1).repeat(4)} Symbolic Tone`,
    plane: `Number Path ${String(index + 1).padStart(2, "0")}`,
    realm: ["luminous", "azure", "violet", "rose", "solar"][index],
    goals: ["mindfulness"],
    note: `${hz} Hz is offered as a symbolic listening choice. Repeating-number traditions are cultural or spiritual interpretations, not established medical effects.`,
    experience: "High, brief, and symbolic",
  })),
];

const allFrequencies = [...frequencies, ...extendedFrequencies];

function readStoredJson(key) {
  for (const storage of [sessionStorage, localStorage]) {
    try {
      const raw = storage.getItem(key);
      if (raw) return JSON.parse(raw);
    } catch {
      // Storage can be unavailable in privacy-restricted browser sessions.
    }
  }
  return null;
}

function readStoredValue(key) {
  for (const storage of [sessionStorage, localStorage]) {
    try {
      const value = storage.getItem(key);
      if (value) return value;
    } catch {
      // Storage can be unavailable in privacy-restricted browser sessions.
    }
  }
  return "";
}

export default function Frequencies() {
  const { user } = useAuth();
  const storageScope = user?.uid || "guest";
  const unlocked = useTierAccess(2);
  const [params] = useSearchParams();
  const source = params.get("source") || "frequency";
  const smoothieContext = readStoredJson("naturesElixirz.latestSmoothieContext") || {};
  const movement = getMovementContinuation(storageScope) || {};
  const goal =
    params.get("goal") ||
    smoothieContext.goal ||
    movement.goal ||
    readStoredValue("naturesElixirz.latestSmoothieGoal") ||
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
    allFrequencies.find((frequency) => frequency.hz === requestedHz) ||
      allFrequencies.find((frequency) => frequency.hz === rememberedHz) ||
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

  const selectedVideoId = getFrequencyVideoId(selected.hz);

  useEffect(() => {
    const context = {
      hz: selected.hz,
      title: selected.title,
      goal,
      source,
      smoothieRecipeName: smoothieContext.recipeName || "",
      updatedAt: new Date().toISOString(),
    };
    for (const storage of [sessionStorage, localStorage]) {
      try { storage.setItem("naturesElixirz.latestFrequencyContext", JSON.stringify(context)); } catch {}
    }
  }, [goal, selected.hz, selected.title, smoothieContext.recipeName, source]);

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
                Travel through nine featured realms and an extended tone
                library. Each option can
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
              <Radio size={15} /> {allFrequencies.length} tones online
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
                <small>Your smoothie + listening alignment</small>
                <strong>{selected.hz} Hz · {selected.title} pairs with the selected video</strong>
              </span>
            </div>
            <div className="frequency-actions">
              <button onClick={playing ? stop : () => play(18)}>
                {playing ? <Pause size={17} /> : <Play size={17} />}
                {playing ? "Stop transmission" : "Play 18-second preview"}
              </button>
              <button
                type="button"
                disabled={!selectedVideoId}
                title={
                  selectedVideoId
                    ? "Open the matching ambient video"
                    : "No verified matching video is assigned to this tone"
                }
                onClick={() => {
                  stop();
                  setVideoOpen(true);
                }}
              >
                <Youtube size={17} />
                {selectedVideoId
                  ? "Watch frequency video here"
                  : "Use exact tone preview"}
              </button>
              <Link
                className="frequency-tier-link"
                to={`/meals?goal=${encodeURIComponent(goal)}&source=frequency`}
              >
                Preview Tier 3 meal pairing
              </Link>
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
          <details className="extended-frequency-library">
            <summary>
              <span>
                <Waves size={18} /> Explore extended Hz library
              </span>
              <small>{extendedFrequencies.length} additional tones</small>
            </summary>
            <div className="extended-frequency-controls">
              <label htmlFor="extended-frequency-select">
                Choose an additional listening tone
              </label>
              <select
                id="extended-frequency-select"
                value={
                  extendedFrequencies.some(({ hz }) => hz === selected.hz)
                    ? selected.hz
                    : ""
                }
                onChange={(event) => {
                  const next = extendedFrequencies.find(
                    ({ hz }) => hz === Number(event.target.value),
                  );
                  if (next) setSelected(next);
                }}
              >
                <option value="">Select a frequency...</option>
                {extendedFrequencies.map((frequency) => (
                  <option key={frequency.hz} value={frequency.hz}>
                    {frequency.hz} Hz — {frequency.title}
                  </option>
                ))}
              </select>
              <p>
                Repeating-number tones such as 1111 Hz and 2222 Hz are
                included as symbolic listening preferences. Frequency labels
                do not establish a medical or healing effect. Keep high tones
                brief and at a comfortable low volume.
              </p>
            </div>
          </details>
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
        <KernelFeedbackContract kernel="frequency" scope={storageScope} selection={`${selected.hz} Hz · ${selected.title}`} disabled={!unlocked} />
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
          videoId={selectedVideoId}
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
