import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Armchair,
  BarChart3,
  Brain,
  Check,
  CirclePause,
  CirclePlay,
  Expand,
  Footprints,
  Flame,
  LockKeyhole,
  RotateCcw,
  Scale,
  ShieldCheck,
  Sparkles,
  TimerReset,
  Wind,
  Youtube,
} from "lucide-react";
import GlowNav from "../components/GlowNav";
import InAppYouTubePlayer from "../components/InAppYouTubePlayer";
import TaiChiPhaseDemo from "../components/TaiChiPhaseDemo";
import TierPreviewBanner, {
  useTierAccess,
} from "../components/TierPreviewBanner";
import { taiChiFlows } from "../data/taiChiFlows";
import {
  getMovementContinuation,
  getTaiChiProgress,
  recordTaiChiJourney,
  recordTaiChiSession,
} from "../utilities/wellnessJourney";
import { useAuth } from "../context/AuthContext";
import {
  buildKernelBrief,
  publishWellnessSignal,
} from "../utilities/wellnessExchange";
import "../styles/CosmicShell.css";
import "../styles/wellnessOS.css";
import "../styles/taiChiStudio.css";
import "../styles/taiChiRefinement.css";

const pathwayIcons = {
  balance: Scale,
  flexibility: Expand,
  mindfulness: Brain,
  recovery: Armchair,
};
const phases = ["Arrive", "Root", "Open", "Flow", "Return"];

export default function TaiChiStudio() {
  const { user } = useAuth();
  const storageScope = user?.uid || "guest";
  const [params] = useSearchParams();
  const unlocked = useTierAccess(4);
  const rememberedFocus = buildKernelBrief(
    storageScope,
    "taiChi",
  ).kernelMemory?.focuses?.at(-1);
  const requestedFocus =
    params.get("focus") ||
    rememberedFocus ||
    getMovementContinuation(storageScope)?.taiChiFocus;
  const [focus, setFocus] = useState(
    taiChiFlows[requestedFocus] ? requestedFocus : "balance",
  );
  const [seconds, setSeconds] = useState(60);
  const [totalSeconds, setTotalSeconds] = useState(60);
  const [running, setRunning] = useState(false);
  const [selectedStep, setSelectedStep] = useState(0);
  const [videoOpen, setVideoOpen] = useState(false);
  const [progressRevision, setProgressRevision] = useState(0);
  const [sessionMessage, setSessionMessage] = useState("");
  const flow = taiChiFlows[focus];
  const practiceProgress = useMemo(() => getTaiChiProgress(storageScope), [storageScope, progressRevision]);
  const activeStep = running
    ? Math.min(4, Math.floor(((totalSeconds - seconds) / totalSeconds) * 5))
    : selectedStep;
  const progress = ((totalSeconds - seconds) / totalSeconds) * 100;
  const progressStyle = useMemo(
    () => ({ "--flow-progress": `${progress * 3.6}deg` }),
    [progress],
  );

  useEffect(() => {
    if (!running) return undefined;
    const timer = window.setInterval(
      () =>
        setSeconds((value) => {
      if (value <= 1) {
        recordTaiChiSession(focus, Math.max(1, Math.round(totalSeconds / 60)), storageScope);
        setProgressRevision((revision) => revision + 1);
        setSessionMessage(`${flow.title} completed and added to your progress.`);
        setRunning(false);
        setSelectedStep(4);
        setTotalSeconds(60);
        return 60;
          }
          return value - 1;
        }),
      1000,
    );
    return () => window.clearInterval(timer);
  }, [running, totalSeconds]);

  function chooseFocus(key) {
    setFocus(key);
    recordTaiChiJourney(key, storageScope);
    publishWellnessSignal(storageScope, "taiChi", {
      focus: key,
      selection: `${taiChiFlows[key].duration}-minute flow`,
    });
    setRunning(false);
    setSeconds(60);
    setTotalSeconds(60);
    setSelectedStep(0);
  }
  function resetPreview() {
    setRunning(false);
    setSeconds(60);
    setTotalSeconds(60);
    setSelectedStep(0);
  }

  return (
    <div className="cosmic-page-shell taichi-cosmos">
      <GlowNav />
      <main className="ne-page taichi-page">
        <header className="flow-hero">
          <div className="flow-title-band">
            <div>
              <p className="ne-kicker">
                <Sparkles size={14} /> Tier 4 · Celestial Flow Sanctuary
              </p>
              <h1>
                Move Like <em>Water Through Stars.</em>
              </h1>
            </div>
            <div>
              <p>
                Explore gentle, breath-led pathways for balance, flexibility,
                mindfulness, and restorative movement—always within your
                comfortable range.
              </p>
              <a href="#flow-pathways">
                Enter the sanctuary <span>↓</span>
              </a>
            </div>
          </div>
          <div
            className="flow-panorama"
            role="img"
            aria-label="Five sequential Tai Chi postures beneath moon phases in a celestial mountain sanctuary"
          >
            {phases.map((phase, index) => (
              <span className={`phase-label phase-${index + 1}`} key={phase}>
                <i>{String(index + 1).padStart(2, "0")}</i>
                {phase}
              </span>
            ))}
          </div>
        </header>

        <TierPreviewBanner minimum={4}>
          Explore every pathway and try the complete one-minute movement
          constellation. Members unlock full guided sessions, progression, and
          streak tracking.
        </TierPreviewBanner>

        <section className="flow-pathways" id="flow-pathways">
          <div className="pathway-heading">
            <div>
              <p className="ne-kicker">Choose your current</p>
              <h2>Four pathways into alignment</h2>
            </div>
            <span>
              <Wind size={16} /> Breath leads movement
            </span>
          </div>
          <div className="taichi-selector">
            {Object.entries(taiChiFlows).map(([key, item]) => {
              const Icon = pathwayIcons[key];
              return (
                <button
                  className={focus === key ? "active" : ""}
                  onClick={() => chooseFocus(key)}
                  key={key}
                >
                  <i>
                    <Icon size={21} />
                  </i>
                  <small>{item.level}</small>
                  <strong>{item.title}</strong>
                  <span>{item.duration} minutes</span>
                  {focus === key && (
                    <Check className="pathway-check" size={13} />
                  )}
                </button>
              );
            })}
          </div>
        </section>

        <section className="taichi-stage">
          <div className="flow-console">
            <div className="breath-compass" style={progressStyle}>
              <TaiChiPhaseDemo
                phase={activeStep}
                step={flow.steps[activeStep]}
                seconds={seconds}
                running={running}
              />
            </div>
            <div className="breath-cue">
              <Wind size={18} />
              <span>
                <small>Breath cue</small>
                <strong>
                  {activeStep % 2 === 0 ? "Inhale softly" : "Exhale slowly"}
                </strong>
              </span>
            </div>
            <div className="preview-progress">
              <span style={{ width: `${progress}%` }} />
            </div>
          </div>
          <div className="flow-sequence">
            <p className="ne-kicker">
              {focus} pathway · {flow.level}
            </p>
            <h2>{flow.title}</h2>
            <p>{flow.intention}</p>
            <ol>
              {flow.steps.map((step, index) => (
                <li className={activeStep === index ? "active" : ""} key={step}>
                  <button
                    onClick={() => {
                      if (!running) setSelectedStep(index);
                    }}
                  >
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <div>
                      <small>{phases[index]}</small>
                      <strong>{step}</strong>
                    </div>
                    {activeStep === index && <i />}
                  </button>
                </li>
              ))}
            </ol>
            <div className="taichi-actions">
              <button
                className="preview-flow"
                onClick={() => {
                  recordTaiChiJourney(focus, storageScope);
                  publishWellnessSignal(storageScope, "taiChi", {
                    focus,
                    selection: `${flow.duration}-minute flow`,
                  });
                  setRunning((value) => !value);
                }}
              >
                {running ? <CirclePause size={18} /> : <CirclePlay size={18} />}
                {running
                  ? totalSeconds > 60
                    ? "Pause full guide"
                    : "Pause preview"
                  : seconds < totalSeconds
                    ? totalSeconds > 60
                      ? "Resume full guide"
                      : "Resume preview"
                    : "Begin one-minute constellation"}
              </button>
              <button className="reset-flow" onClick={resetPreview}>
                <RotateCcw size={17} /> Reset
              </button>
              <button
                disabled={!unlocked}
                onClick={() => {
                  recordTaiChiSession(focus, flow.duration, storageScope);
                  setProgressRevision((revision) => revision + 1);
                  setSessionMessage(`${flow.title} saved as a ${flow.duration}-minute completed session.`);
                  publishWellnessSignal(storageScope, "taiChi", {
                    focus,
                    selection: `${flow.duration}-minute flow`,
                  });
                  const fullDuration = flow.duration * 60;
                  setTotalSeconds(fullDuration);
                  setSeconds(fullDuration);
                  setSelectedStep(0);
                  setRunning(true);
                }}
              >
                <TimerReset size={17} /> Full {flow.duration}-minute guide
                {!unlocked && <LockKeyhole size={12} />}
              </button>
              <button
                disabled={!unlocked}
                onClick={() => {
                  recordTaiChiJourney(focus, storageScope);
                  publishWellnessSignal(storageScope, "taiChi", {
                    focus,
                    selection: `${flow.duration}-minute flow`,
                  });
                }}
              >
                <Footprints size={17} /> Save completed session
                {!unlocked && <LockKeyhole size={12} />}
              </button>
              <button
                type="button"
                onClick={() => {
                  setRunning(false);
                  setVideoOpen(true);
                }}
              >
                <Youtube size={17} /> Watch guided Tai Chi here
              </button>
            </div>
          </div>
        </section>

        <section className="taichi-progress" aria-labelledby="taichi-progress-title">
          <div className="taichi-progress-heading"><div><p className="ne-kicker"><BarChart3 size={14} /> Private practice constellation</p><h2 id="taichi-progress-title">Your flow through time</h2><p>Completed sessions synchronize with this subscriber account. Selecting a pathway or opening a video does not count as practice.</p></div>{practiceProgress.streak > 0 && <span className="taichi-streak"><Flame size={18} /><strong>{practiceProgress.streak}</strong> day streak</span>}</div>
          {sessionMessage && <p className="taichi-session-message" role="status">{sessionMessage}</p>}
          <div className="taichi-progress-metrics"><article><strong>{practiceProgress.sessions}</strong><span>sessions completed</span></article><article><strong>{practiceProgress.minutes}</strong><span>minutes practiced</span></article><article><strong>{practiceProgress.streak}</strong><span>current-day streak</span></article><article><strong>{Object.keys(practiceProgress.pathways).length}</strong><span>pathways explored</span></article></div>
          <div className="taichi-pathway-progress">{Object.entries(taiChiFlows).map(([key, pathway]) => { const count = practiceProgress.pathways[key] || 0; const Icon = pathwayIcons[key]; return <article key={key}><Icon size={18} /><div><strong>{pathway.title}</strong><span>{count} completed session{count === 1 ? "" : "s"}</span></div><i><span style={{ width: `${Math.min(100, count * 20)}%` }} /></i></article>; })}</div>
          {practiceProgress.recent.length > 0 && <details className="taichi-recent"><summary>View recent practice</summary><ul>{practiceProgress.recent.map((session, index) => <li key={`${session.completedAt}-${index}`}><span>{taiChiFlows[session.focus]?.title || session.focus}</span><strong>{session.minutes} min</strong><time dateTime={session.completedAt}>{new Date(session.completedAt).toLocaleDateString()}</time></li>)}</ul></details>}
        </section>

        <section className="movement-foundations">
          <article>
            <span>01</span>
            <div>
              <h3>Root before moving</h3>
              <p>
                Use a comfortable stance, keep knees soft, and stay near stable
                support when useful.
              </p>
            </div>
          </article>
          <article>
            <span>02</span>
            <div>
              <h3>Let breath set the pace</h3>
              <p>
                Move slowly enough to breathe comfortably. Never hold your
                breath or force a range.
              </p>
            </div>
          </article>
          <article>
            <span>03</span>
            <div>
              <h3>Choose steadiness</h3>
              <p>
                Smaller movements and chair-supported variations are valid ways
                to practice.
              </p>
            </div>
          </article>
        </section>

        <div className="taichi-safety">
          <ShieldCheck size={25} />
          <p>
            <strong>Move safely.</strong> Stop if you feel pain, dizziness,
            chest discomfort, or unusual shortness of breath. This experience
            cannot determine whether movement is appropriate for an injury,
            balance concern, or medical condition.
          </p>
        </div>
        <InAppYouTubePlayer
          open={videoOpen}
          onClose={() => setVideoOpen(false)}
          title="Tai Chi for Beginners with Dr Paul Lam"
          videoId="hIOHGrYCEJ4"
          note="Use a comfortable range and stable support when needed. Stop if you feel pain, dizziness, chest discomfort, or unusual shortness of breath."
        />
      </main>
    </div>
  );
}
