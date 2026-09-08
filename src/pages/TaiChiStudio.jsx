import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Armchair,
  BarChart3,
  Brain,
  Check,
  CirclePause,
  CirclePlay,
  ExternalLink,
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
import KernelFeedbackContract from "../components/KernelFeedbackContract";
import "../styles/taiChiMoreVideos.css";
import TierPreviewBanner, {
  useKernelAccess,
} from "../components/TierPreviewBanner";
import { taiChiFlows } from "../data/taiChiFlows";
import {
  getMovementContinuation,
  getTaiChiProgress,
  recordTaiChiJourney,
  recordTaiChiSession,
} from "../utilities/wellnessJourney";
import { useAuth } from "../context/AuthContext";
import { searchYouTubeTaiChi } from "../utilities/youtubeTaiChi";
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
const recoveryPhaseVideos = [
  { title: "Arrive · Upright Qigong breathing", videoId: "_CaMH0T8BnI", youtubeUrl: "https://www.youtube.com/watch?v=_CaMH0T8BnI" },
  { title: "Root · Tai Chi shoulder and neck release", videoId: "aMYL3C4B0H0", youtubeUrl: "https://www.youtube.com/watch?v=aMYL3C4B0H0" },
  { title: "Open · Gentle Tai Chi hand and finger mobility", videoId: "Z4MIMHTlc_c", youtubeUrl: "https://www.youtube.com/watch?v=Z4MIMHTlc_c" },
  { title: "Flow · Controlled foot and ankle mobility", videoId: "ct92Qswrj9o", youtubeUrl: "https://www.youtube.com/watch?v=ct92Qswrj9o" },
  { title: "Return · Closing gratitude breath", videoId: "rmaeq8kaCrQ", youtubeUrl: "https://www.youtube.com/watch?v=rmaeq8kaCrQ" },
];

const mindfulnessPhaseVideos = [
  {
    title: "Arrive · Three centered moon breaths",
    videoId: "laLXv4qqD7w",
    youtubeUrl: "https://www.youtube.com/watch?v=laLXv4qqD7w",
  },
  {
    title: "Root · Gathering qi into gentle motion",
    videoId: "spkx8btc8Bc",
    youtubeUrl: "https://www.youtube.com/watch?v=spkx8btc8Bc",
  },
  {
    title: "Open · Mindful Qigong cloud movements",
    videoId: "lQ5snXjVOu4",
    youtubeUrl: "https://www.youtube.com/watch?v=lQ5snXjVOu4",
  },
  {
    title: "Flow · Embrace the Moon Tai Chi form",
    videoId: "o8dlmC-hPRM",
    youtubeUrl: "https://www.youtube.com/watch?v=o8dlmC-hPRM",
  },
  {
    title: "Return · Guided Zhan Zhuang standing meditation",
    videoId: "Jrp65CO5U6E",
    youtubeUrl: "https://www.youtube.com/watch?v=Jrp65CO5U6E",
  },
];

const flexibilityPhaseVideos = [
  {
    title: "Arrive · Shoulder circles and wrist opening",
    videoId: "gq9fyfnmYcc",
    youtubeUrl: "https://www.youtube.com/watch?v=gq9fyfnmYcc",
  },
  {
    title: "Root · Guided spinal waves with bent knees",
    videoId: "ydz_hRm9oEk",
    youtubeUrl: "https://www.youtube.com/watch?v=ydz_hRm9oEk",
  },
  {
    title: "Open · Parting the Wild Horse's Mane tutorial",
    videoId: "o9Noeg3jZxI",
    youtubeUrl: "https://www.youtube.com/watch?v=o9Noeg3jZxI",
  },
  {
    title: "Flow · Gentle wall-supported hip opening",
    videoId: "3zOThOaMMiA",
    youtubeUrl: "https://www.youtube.com/watch?v=3zOThOaMMiA",
  },
  {
    title: "Return · Evening Tai Chi closing breath",
    videoId: "B0AEpLYuR_A",
    youtubeUrl: "https://www.youtube.com/watch?v=B0AEpLYuR_A",
  },
];

const taiChiVideoLibraryByOriginalNumber = [
  {
    key: "over-50",
    level: "Gentle · 50+ friendly",
    title: "Tai Chi for Over 50",
    description:
      "A slower standing practice centered on comfortable balance, strength, and flexibility.",
    videoId: "H_rhCxVm5lQ",
    youtubeUrl: "https://www.youtube.com/watch?v=H_rhCxVm5lQ",
  },
  {
    key: "chair",
    level: "Chair-supported · Gentle",
    title: "Simple Chair Tai Chi",
    description:
      "A seated option for subscribers who prefer chair support or a smaller movement range.",
    videoId: "IdtR5dXeO-c",
    youtubeUrl: "https://www.youtube.com/watch?v=IdtR5dXeO-c",
  },
  {
    key: "moderate",
    level: "Moderate · Full form",
    title: "24-Form Yang Style Practice",
    description:
      "A continuous 24-posture sequence for practitioners comfortable with the foundational steps.",
    videoId: "R8NbQecDygQ",
    youtubeUrl: "https://www.youtube.com/watch?v=R8NbQecDygQ",
  },
  {
    key: "advanced",
    level: "Advanced · Demonstration",
    title: "42-Form Competition Practice",
    description:
      "A complex multi-style demonstration intended for experienced practitioners to observe and study.",
    videoId: "NBBC5XO0LBY",
    youtubeUrl: "https://www.youtube.com/watch?v=NBBC5XO0LBY",
  },
  {
    key: "all-ages",
    level: "All ages · First steps",
    title: "Easy Five-Minute Tai Chi Form",
    description:
      "A welcoming, time-friendly introduction for teens, adults, families, and anyone beginning the practice.",
    videoId: "Q6aZ-VQWWFM",
    youtubeUrl: "https://www.youtube.com/watch?v=Q6aZ-VQWWFM",
  },
  {
    key: "morning",
    level: "Beginner · 10-minute flow",
    title: "Morning Tai Chi with Breath",
    description:
      "A short breath-led sequence for subscribers who want a gentle movement ritual to begin the day.",
    videoId: "N8nuBhc4kKk",
    youtubeUrl: "https://www.youtube.com/watch?v=N8nuBhc4kKk",
  },
  {
    key: "balance-focus",
    level: "All levels · Balance focus",
    title: "Tai Chi Flow for Balance",
    description:
      "A focused flow that practices mindful weight shifts, steadiness, and controlled movement.",
    videoId: "5a2PKP3uKKI",
    youtubeUrl: "https://www.youtube.com/watch?v=5a2PKP3uKKI",
  },
  {
    key: "flexibility-focus",
    level: "Beginner friendly · Mobility",
    title: "Tai Chi Flow for Flexibility",
    description:
      "A flowing mobility session combining accessible Tai Chi, qigong, and flexibility-oriented movement.",
    videoId: "zu275SJ6xIc",
    youtubeUrl: "https://www.youtube.com/watch?v=zu275SJ6xIc",
  },
];

const taiChiVideoLibraryOrder = [
  "all-ages",
  "morning",
  "balance-focus",
  "flexibility-focus",
  "moderate",
  "advanced",
  "over-50",
  "chair",
];

const taiChiVideoLibrary = taiChiVideoLibraryOrder.map((key) =>
  taiChiVideoLibraryByOriginalNumber.find((video) => video.key === key),
);

const extendedTaiChiVideoLibrary = [
  { key: "three-moves-harmony", title: "Three Tai Chi Moves for Universal Harmony", level: "Extended library · Centering and harmony", videoId: "VwrTKFe9PHU", youtubeUrl: "https://www.youtube.com/watch?v=VwrTKFe9PHU" },
  { key: "cleansing-lungs", title: "15-Minute Tai Chi Flow for the Lungs", level: "Extended library · Breath-led beginner flow", videoId: "4glnMsr9EcY", youtubeUrl: "https://www.youtube.com/watch?v=4glnMsr9EcY" },
  { key: "restful-sleep", title: "Four-Minute Bedtime Tai Chi for Restful Sleep", level: "Extended library · Evening wind-down", videoId: "pdJ9BFsLK-M", youtubeUrl: "https://www.youtube.com/watch?v=pdJ9BFsLK-M" },
  { key: "breathe-better", title: "Tai Chi Qigong for Breathing and Lung Health", level: "Extended library · Breath and movement", videoId: "HEW0FeqSfQ8", youtubeUrl: "https://www.youtube.com/watch?v=HEW0FeqSfQ8" },
  { key: "full-body-warmup", title: "Seven-Minute Full-Body Tai Chi Warm-Up", level: "Extended library · Joint mobility", videoId: "nSJoecI7ORs", youtubeUrl: "https://www.youtube.com/watch?v=nSJoecI7ORs" },
  { key: "walking-lower-body", title: "Tai Chi Walking: Lower-Body Foundation", level: "Extended library · Walking form", videoId: "zkbaZdsRIvE", youtubeUrl: "https://www.youtube.com/watch?v=zkbaZdsRIvE" },
  { key: "walking-meditation", title: "Mindful Tai Chi Walking Tutorial", level: "Extended library · Coordination", videoId: "7Qbat52NE98", youtubeUrl: "https://www.youtube.com/watch?v=7Qbat52NE98" },
];

export default function TaiChiStudio() {
  const { user } = useAuth();
  const storageScope = user?.uid || "guest";
  const [params] = useSearchParams();
  const unlocked = useKernelAccess("movement");
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
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [videoFinderKey, setVideoFinderKey] = useState(extendedTaiChiVideoLibrary[0].key);
  const [videoSearch, setVideoSearch] = useState("");
  const [videoSearchError, setVideoSearchError] = useState("");
  const [videoSearchResults, setVideoSearchResults] = useState([]);
  const [videoSearching, setVideoSearching] = useState(false);
  const [recoveryVideoOpen, setRecoveryVideoOpen] = useState(false);
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
  const phaseVideoLibrary = focus === "mindfulness"
    ? mindfulnessPhaseVideos
    : focus === "recovery"
      ? recoveryPhaseVideos
      : focus === "flexibility"
        ? flexibilityPhaseVideos
        : [];
  const phaseVideo = phaseVideoLibrary[selectedStep] || null;

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
    setRecoveryVideoOpen(false);
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

        <TierPreviewBanner minimum={1} kernel="movement">
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
            {phaseVideo && (
              <div className={`recovery-video-box ${recoveryVideoOpen ? "is-playing" : ""}`}>
                {recoveryVideoOpen ? (
                  <>
                    <iframe
                      key={`${focus}-${selectedStep}-${phaseVideo.videoId}`}
                      src={`https://www.youtube-nocookie.com/embed/${phaseVideo.videoId}?rel=0&autoplay=0&start=0`}
                      title={`${phaseVideo.title} demonstration`}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      referrerPolicy="strict-origin-when-cross-origin"
                      allowFullScreen
                    />
                    <button type="button" className="recovery-video-close" onClick={() => setRecoveryVideoOpen(false)}>
                      Close demonstration
                    </button>
                    <a className="recovery-video-source" href={phaseVideo.youtubeUrl} target="_blank" rel="noreferrer">
                      YouTube source <ExternalLink size={12} />
                    </a>
                  </>
                ) : (
                  <button type="button" className="recovery-video-poster" onClick={() => {
                    setRunning(false);
                    setRecoveryVideoOpen(true);
                  }} aria-label={`Load ${phaseVideo.title} demonstration`} style={{
                    "--recovery-poster": `url("https://i.ytimg.com/vi/${phaseVideo.videoId}/hqdefault.jpg")`,
                  }}>
                    <span>{focus === "mindfulness" ? "Guided mindfulness demonstration" : focus === "flexibility" ? "Guided flexibility demonstration" : "Guided recovery demonstration"}</span>
                    <i><CirclePlay size={30} /></i>
                    <strong>{phaseVideo.title}</strong>
                    <small>Select a phase card to load its matching demonstration</small>
                  </button>
                )}
              </div>
            )}
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
                      if (!running) {
                        setSelectedStep(index);
                        if (phaseVideoLibrary[index]) {
                          setRecoveryVideoOpen(true);
                        } else {
                          setRecoveryVideoOpen(false);
                        }
                      }
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
                  setSelectedVideo(taiChiVideoLibrary[0]);
                }}
              >
                <Youtube size={17} /> Watch guided Tai Chi here
              </button>
            </div>
          </div>
        </section>

        <section className="taichi-video-library" aria-labelledby="taichi-video-library-title">
          <div className="taichi-video-library-heading">
            <div>
              <p className="ne-kicker"><Youtube size={14} /> Guided video sanctuary</p>
              <h2 id="taichi-video-library-title">Choose a practice for where you are today</h2>
              <p>Every selection opens its own YouTube lesson inside Nature&apos;s Elixirz. Age labels describe pacing, not medical suitability.</p>
            </div>
            <span>{taiChiVideoLibrary.length} guided pathways</span>
          </div>
          <div className="taichi-video-grid">
            {taiChiVideoLibrary.map((video, index) => (
              <article className={`taichi-video-card video-${video.key}`} key={video.key}>
                <span className="taichi-video-number">{String(index + 1).padStart(2, "0")}</span>
                <small>{video.level}</small>
                <h3>{video.title}</h3>
                <p>{video.description}</p>
                <div>
                  <button type="button" onClick={() => {
                    setRunning(false);
                    setSelectedVideo(video);
                  }}>
                    <CirclePlay size={17} /> Watch here
                  </button>
                  <a href={video.youtubeUrl} target="_blank" rel="noreferrer" aria-label={`Open ${video.title} directly on YouTube`}>
                    YouTube <ExternalLink size={14} />
                  </a>
                </div>
              </article>
            ))}
          </div>
          <details className="taichi-more-videos">
            <summary><CirclePlay size={18} /> More Tai Chi video options</summary>
            <div className="taichi-custom-video">
              <div>
                <strong>Nature&apos;s Elixirz Tai Chi finder</strong>
                <p>Choose another guided lesson or describe the movement you want. Videos open here at the beginning and wait for you to press Play.</p>
              </div>
              <form onSubmit={async (event) => {
                event.preventDefault();
                if (videoSearch.trim().length < 2) {
                  setVideoSearchError("Describe the Tai Chi movement you want to find.");
                  return;
                }
                setVideoSearchError("");
                setVideoSearching(true);
                try {
                  const results = await searchYouTubeTaiChi(videoSearch);
                  setVideoSearchResults(results);
                  if (!results.length) setVideoSearchError("YouTube did not return an embeddable Tai Chi lesson for that search. Try a different description.");
                } catch (error) {
                  setVideoSearchResults([]);
                  setVideoSearchError(error?.message || "YouTube search is temporarily unavailable.");
                } finally {
                  setVideoSearching(false);
                }
              }}>
                <div className="taichi-finder-controls">
                  <label htmlFor="tai-chi-video-choice">More guided videos</label>
                  <select
                    id="tai-chi-video-choice"
                    value={videoFinderKey}
                    onChange={(event) => {
                      setVideoFinderKey(event.target.value);
                      setVideoSearchError("");
                    }}
                  >
                    {extendedTaiChiVideoLibrary.map((video) => <option value={video.key} key={video.key}>{video.title}</option>)}
                  </select>
                  <button type="button" onClick={() => {
                    const video = extendedTaiChiVideoLibrary.find((item) => item.key === videoFinderKey);
                    setRunning(false);
                    setSelectedVideo(video);
                  }}><CirclePlay size={17} /> Watch here</button>
                  <a
                    className="taichi-finder-youtube"
                    href={extendedTaiChiVideoLibrary.find((video) => video.key === videoFinderKey)?.youtubeUrl}
                    target="_blank"
                    rel="noreferrer"
                  >YouTube <ExternalLink size={14} /></a>
                </div>
                <label htmlFor="tai-chi-video-search">Search by movement</label>
                <div className="taichi-finder-search">
                  <input
                    id="tai-chi-video-search"
                    type="search"
                    value={videoSearch}
                    onChange={(event) => {
                      setVideoSearch(event.target.value);
                      if (videoSearchError) setVideoSearchError("");
                    }}
                    placeholder="Example: flexibility, hand movement, ankle balance..."
                  />
                  <button type="submit" disabled={videoSearching}><CirclePlay size={17} /> {videoSearching ? "Searching YouTube…" : "Search YouTube"}</button>
                </div>
                {videoSearchError && <p className="taichi-custom-video-error" role="alert">{videoSearchError}</p>}
                {videoSearchResults.length > 0 && (
                  <div className="taichi-youtube-results" aria-live="polite">
                    {videoSearchResults.map((video) => (
                      <article key={video.videoId}>
                        <img src={video.thumbnail || `https://i.ytimg.com/vi/${video.videoId}/mqdefault.jpg`} alt="" />
                        <div><strong>{video.title}</strong><small>{video.channelTitle}</small></div>
                        <button type="button" onClick={() => { setRunning(false); setSelectedVideo(video); }}><CirclePlay size={15} /> Watch here</button>
                        <a href={video.youtubeUrl} target="_blank" rel="noreferrer">YouTube <ExternalLink size={13} /></a>
                      </article>
                    ))}
                  </div>
                )}
              </form>
            </div>
          </details>
          <p className="taichi-video-caution"><ShieldCheck size={16} /> Start with the gentler route when uncertain. Advanced means movement complexity—not an assessment that the practice is safe for an individual subscriber.</p>
        </section>

        <section className="taichi-progress" aria-labelledby="taichi-progress-title">
          <div className="taichi-progress-heading"><div><p className="ne-kicker"><BarChart3 size={14} /> Private practice constellation</p><h2 id="taichi-progress-title">Your flow through time</h2><p>Completed sessions synchronize with this subscriber account. Selecting a pathway or opening a video does not count as practice.</p></div>{practiceProgress.streak > 0 && <span className="taichi-streak"><Flame size={18} /><strong>{practiceProgress.streak}</strong> day streak</span>}</div>
          {sessionMessage && <p className="taichi-session-message" role="status">{sessionMessage}</p>}
          <div className="taichi-progress-metrics"><article><strong>{practiceProgress.sessions}</strong><span>sessions completed</span></article><article><strong>{practiceProgress.minutes}</strong><span>minutes practiced</span></article><article><strong>{practiceProgress.streak}</strong><span>current-day streak</span></article><article><strong>{Object.keys(practiceProgress.pathways).length}</strong><span>pathways explored</span></article></div>
          <div className="taichi-pathway-progress">{Object.entries(taiChiFlows).map(([key, pathway]) => { const count = practiceProgress.pathways[key] || 0; const Icon = pathwayIcons[key]; return <article key={key}><Icon size={18} /><div><strong>{pathway.title}</strong><span>{count} completed session{count === 1 ? "" : "s"}</span></div><i><span style={{ width: `${Math.min(100, count * 20)}%` }} /></i></article>; })}</div>
          {practiceProgress.recent.length > 0 && <details className="taichi-recent"><summary>View recent practice</summary><ul>{practiceProgress.recent.map((session, index) => <li key={`${session.completedAt}-${index}`}><span>{taiChiFlows[session.focus]?.title || session.focus}</span><strong>{session.minutes} min</strong><time dateTime={session.completedAt}>{new Date(session.completedAt).toLocaleDateString()}</time></li>)}</ul></details>}
        </section>

        <KernelFeedbackContract kernel="taiChi" scope={storageScope} selection={flow.title} disabled={!unlocked} />
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
          open={Boolean(selectedVideo)}
          onClose={() => setSelectedVideo(null)}
          title={selectedVideo?.title || "Guided Tai Chi"}
          videoId={selectedVideo?.videoId || taiChiVideoLibrary[0].videoId}
          note="Follow the instructor only within a comfortable range and use stable support when needed. Stop if you feel pain, dizziness, chest discomfort, or unusual shortness of breath. YouTube receives standard connection data only after this player is opened."
        />
      </main>
    </div>
  );
}
