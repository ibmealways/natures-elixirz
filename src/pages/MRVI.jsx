import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity, Bone, Check, ChevronDown, CircleGauge, Footprints, HeartPulse,
  LockKeyhole, RefreshCcw, ScanLine, ShieldCheck, Sparkles, Target
} from "lucide-react";
import GlowNav from "../components/GlowNav";
import TierPreviewBanner, { useTierAccess } from "../components/TierPreviewBanner";
import GaitCapture from "../components/GaitCapture";
import { useMRVI } from "../context/MRVIContext";
import { evaluateMRVI } from "../utilities/mrviEngine";
import { getMovementContinuation, recordMovementJourney } from "../utilities/wellnessJourney";
import { useAuth } from "../context/AuthContext";
import { publishWellnessSignal } from "../utilities/wellnessExchange";
import "../styles/CosmicShell.css";
import "../styles/wellnessOS.css";
import "../styles/movementObservatory.css";

const metricDetails = {
  mobility: { label: "Mobility range", short: "Range", icon: Activity },
  balance: { label: "Balance & sway", short: "Balance", icon: CircleGauge },
  symmetry: { label: "Left–right symmetry", short: "Symmetry", icon: Footprints },
  energyFlow: { label: "Movement efficiency", short: "Efficiency", icon: HeartPulse },
  smoothness: { label: "Motion smoothness", short: "Smoothness", icon: ScanLine },
};

const sampleSignals = [
  { zone: "Stride symmetry", state: "Aligned", value: "96%", note: "Left and right step patterns appear closely matched.", tone: "good" },
  { zone: "Postural balance", state: "Observe", value: "−4%", note: "A small baseline shift is worth rechecking over several sessions.", tone: "watch" },
  { zone: "Joint rhythm", state: "Steady", value: "92", note: "Movement remains smooth through the measured sequence.", tone: "good" },
];

const actionPath = [
  { title: "Recheck the pattern", detail: "Repeat under similar conditions before interpreting a change.", icon: RefreshCcw, href: "#movement-capture" },
  { title: "Practice with support", detail: "Choose gentle balance, mobility, or Tai Chi work within comfort.", icon: Target, to: "/tai-chi?focus=balance" },
  { title: "Escalate when needed", detail: "New pain, swelling, weakness, or sudden gait change belongs with a qualified clinician.", icon: ShieldCheck, href: "#clinical-boundary" },
];

const movementGuidance = {
  mobility: { title: "Comfortable range practice", steps: ["Use slow, pain-free ankle circles and seated knee extensions.", "Try supported sit-to-stand practice only within a comfortable range.", "Avoid forcing a joint farther because of a scan number."], taiChi: "flexibility" },
  balance: { title: "Supported balance practice", steps: ["Practice gentle side-to-side weight shifts beside a stable counter or chair.", "Use a chair-supported Tai Chi pathway and keep both feet available for support.", "Review footwear and remove nearby trip hazards before practicing."], taiChi: "balance" },
  symmetry: { title: "Even-step awareness", steps: ["Walk slowly over a short, clear path and notice whether each step feels comfortable.", "Use a handrail or stable support; do not deliberately lengthen the weaker-feeling side.", "Repeat the scan under the same camera angle before interpreting the difference."], taiChi: "balance" },
  energyFlow: { title: "Pacing and movement efficiency", steps: ["Use shorter comfortable movement intervals with recovery between rounds.", "Keep breathing steady and stop before form becomes hurried or unstable.", "Build duration gradually only when the same activity remains comfortable."], taiChi: "recovery" },
  smoothness: { title: "Slow transition practice", steps: ["Practice controlled starts, stops, and turns near stable support.", "Let the breath set the pace instead of trying to move faster.", "Choose smaller movements when control begins to change."], taiChi: "mindfulness" },
};

function StatusPill({ status }) {
  return <span className={`gait-status ${String(status).toLowerCase()}`}>{status}</span>;
}

export default function MRVIPage() {
  const { user } = useAuth();
  const storageScope = user?.uid || "guest";
  const unlocked = useTierAccess(4);
  const { profile, latestScan, giveConsent, addScanFromMetrics, resetAll } = useMRVI();
  const [metrics, setMetrics] = useState({
    mobility: "1.00", balance: "1.00", symmetry: "1.00", energyFlow: "1.00", smoothness: "1.00",
  });
  const [error, setError] = useState("");
  const [captureMessage, setCaptureMessage] = useState("");
  const [sessionScan, setSessionScan] = useState(null);
  const [showInputs, setShowInputs] = useState(false);
  const hasConsent = Boolean(profile?.consent);
  const activeScan = latestScan || sessionScan;
  const result = activeScan?.output || null;
  const isBaselineScan = Boolean(result && ((profile?.scans?.length || 0) === 1 || (!latestScan && sessionScan)));
  const continuation = result ? getMovementContinuation(storageScope) : null;
  const guidance = useMemo(() => {
    if (!result || isBaselineScan) return [];
    const observed = Object.entries(result.components || {}).filter(([, status]) => status === "DECLINING");
    const selected = observed.length ? observed : Object.entries(result.deltas || {}).sort((a, b) => Number(a[1]) - Number(b[1])).slice(0, 1);
    return selected.map(([key]) => ({ key, ...(movementGuidance[key] || movementGuidance.smoothness) }));
  }, [result, isBaselineScan]);

  const scanSignals = useMemo(() => {
    if (!result) return sampleSignals;
    return Object.entries(result.components).slice(0, 3).map(([key, status]) => {
      const delta = Number(result.deltas[key] || 0) * 100;
      const captured = Number(activeScan?.metrics?.[key] || 0);
      if (isBaselineScan) {
        return {
          zone: metricDetails[key]?.label || key,
          state: "Baseline",
          value: captured.toFixed(3),
          note: "Captured successfully. This measurement establishes your personal reference for future scans.",
          tone: "good",
        };
      }
      return {
        zone: metricDetails[key]?.label || key,
        state: status === "DECLINING" ? "Observe" : status === "IMPROVING" ? "Improving" : "Steady",
        value: `${delta > 0 ? "+" : ""}${delta.toFixed(1)}%`,
        note: status === "DECLINING"
          ? "A change from your personal baseline; repeat scans before drawing conclusions."
          : status === "IMPROVING" ? "This pattern is trending favorably against your baseline." : "This measure remains near your established baseline.",
        tone: status === "DECLINING" ? "watch" : "good",
      };
    });
  }, [result, activeScan, isBaselineScan]);

  function runScan() {
    const parsed = Object.fromEntries(Object.entries(metrics).map(([key, value]) => [key, Number(value)]));
    if (Object.values(parsed).some((value) => !Number.isFinite(value) || value < 0.5 || value > 1.5)) {
      setError("Enter a value from 0.50 to 1.50 for every movement measure.");
      return;
    }
    setError("");
    setCaptureMessage("");
    const output = addScanFromMetrics(parsed);
    recordMovementJourney(output.focus, output, storageScope);
    publishWellnessSignal(storageScope, "movement", { focus: output.focus, scoreBand: output.confidence || "measured" });
  }

  function receiveCapturedMetrics(captured) {
    setMetrics(Object.fromEntries(Object.entries(captured).map(([key, value]) => [key, value.toFixed(3)])));
    setShowInputs(true);
    const timestamp = new Date().toISOString();
    const output = evaluateMRVI({
      timestamp,
      metrics: captured,
      baseline: profile?.baseline || captured,
      history: (profile?.scans || []).map((scan) => ({ timestamp: scan.timestamp, metrics: scan.metrics })),
    });
    setSessionScan({ timestamp, metrics: captured, output });
    if (hasConsent && unlocked) {
      const savedOutput = addScanFromMetrics(captured);
      recordMovementJourney(savedOutput.focus, savedOutput, storageScope);
      publishWellnessSignal(storageScope, "movement", { focus: savedOutput.focus, scoreBand: savedOutput.confidence || "measured" });
      setError("");
      setCaptureMessage("Camera-derived movement ratios were saved automatically.");
    } else {
      setCaptureMessage("Camera-derived feedback is ready for this session. Enable numeric-metric storage consent and select Analyze & save observation if you want to preserve it.");
    }
    document.getElementById("gait-console")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return <div className="cosmic-page-shell gait-cosmos"><GlowNav /><main className="ne-page gait-page">
    <header className="gait-hero">
      <div className="gait-title-band">
        <div><p className="ne-kicker"><Sparkles size={14} /> Movement Intelligence · G.A.I.T. Observatory</p><h1>See How Your Body <em>Moves Through Time.</em></h1></div>
        <div><p>Guided Alignment &amp; Integrated Tracking turns repeatable movement observations into a private map of balance, symmetry, mobility, and flow.</p><a href="#gait-console">Enter the scan chamber <span>↓</span></a></div>
      </div>
      <div className="gait-panorama" role="img" aria-label="Illuminated human skeleton walking through a celestial movement analysis observatory">
        <span className="scan-chip chip-stride"><Footprints size={14} /> Stride symmetry</span>
        <span className="scan-chip chip-balance"><CircleGauge size={14} /> Balance field</span>
        <span className="scan-chip chip-joints"><Bone size={14} /> Joint rhythm</span>
        <span className="scan-chip chip-live"><ScanLine size={14} /> Motion constellation online</span>
      </div>
    </header>

    <TierPreviewBanner minimum={4}>Explore the sample scan, movement signals, and supportive action pathway. Members unlock private baselines, analysis, and history.</TierPreviewBanner>

    <GaitCapture unlocked={unlocked} onMetrics={receiveCapturedMetrics} />

    <section className="gait-intro">
      <div><p className="ne-kicker">What G.A.I.T. observes</p><h2>A personal motion constellation—not a diagnosis.</h2></div>
      <p>G.A.I.T. compares repeat observations with <strong>your own baseline</strong>. It can highlight changes worth watching, but it cannot predict arthritis, osteoporosis, fractures, or other future conditions.</p>
      <span><ShieldCheck size={18} /> Privacy-first · no location collection · no cross-user comparison</span>
    </section>

    <section className="gait-console" id="gait-console">
      <div className="gait-console-head">
        <div><p className="ne-kicker">{result ? "Latest personal scan" : "Interactive sample scan"}</p><h2>Movement Resonance Profile</h2></div>
        <div className="gait-score"><span>{result?.mrviScore ?? 92}</span><small>MRVI<br />index</small></div>
      </div>

      <div className="gait-console-grid">
        <div className="body-map">
          <div className="body-silhouette"><span className="body-head" /><span className="body-spine" /><span className="body-shoulders" /><span className="body-pelvis" /><i className="joint j1" /><i className="joint j2" /><i className="joint j3" /><i className="joint j4" /><i className="joint j5" /><i className="joint j6" /></div>
          <div className="body-orbit orbit-one" /><div className="body-orbit orbit-two" />
          <span className="map-label left">L · {result ? "measured" : "sample"}</span><span className="map-label right">R · {result ? "measured" : "sample"}</span>
        </div>

        <div className="signal-panel">
          <div className="signal-summary"><span><small>Focus pathway</small><strong>{String(result?.focus || "MAINTENANCE").replaceAll("_", " ")}</strong></span><span><small>Pattern confidence</small><strong>{result?.confidence || "SAMPLE"}</strong></span></div>
          <div className="signal-list">{scanSignals.map((signal) => <article key={signal.zone} className={signal.tone}>
            <div><span>{signal.zone}</span><StatusPill status={signal.state} /></div><strong>{signal.value}</strong><p>{signal.note}</p>
          </article>)}</div>
          <p className="scan-message">{isBaselineScan
            ? "Movement registered successfully. This first scan establishes your private baseline; complete another comparable scan later to calculate meaningful changes."
            : result?.message || "Sample result: most patterns appear steady, with one small balance variation worth rechecking—not a forecast of illness."}</p>
        </div>
      </div>

      <button className="metrics-toggle" onClick={() => setShowInputs((value) => !value)} aria-expanded={showInputs}><CircleGauge size={18} /> {showInputs ? "Close metric console" : "Open metric console"} <ChevronDown size={16} /></button>
      {showInputs && <div className="metrics-lab">
        <div className="consent-row"><label><input type="checkbox" checked={hasConsent} onChange={(event) => giveConsent(event.target.checked)} /><span><Check size={13} /></span>I consent to storing numeric motion metrics on this device.</label><small>First scan establishes your private baseline.</small></div>
        <div className="metric-grid">{Object.entries(metrics).map(([key, value]) => {
          const item = metricDetails[key]; const Icon = item.icon;
          return <label key={key}><span><Icon size={16} /> {item.label}</span><input type="number" min="0.5" max="1.5" step="0.01" value={value} onChange={(event) => setMetrics((current) => ({ ...current, [key]: event.target.value }))} /><small>1.00 = baseline ratio</small></label>;
        })}</div>
        {captureMessage && <p className="scan-message" role="status">{captureMessage}</p>}
        {error && <p className="gait-error" role="alert">{error}</p>}
        <div className="metric-actions"><button onClick={runScan} disabled={!hasConsent || !unlocked}>{!unlocked && <LockKeyhole size={14} />} Analyze &amp; save observation</button><button onClick={resetAll}><RefreshCcw size={15} /> Reset private data</button></div>
      </div>}
    </section>

    {result && <section className="gait-guidance" aria-labelledby="gait-guidance-title">
      <div className="gait-guidance-heading"><div><p className="ne-kicker"><Target size={14} /> Observation-informed guidance</p><h2 id="gait-guidance-title">Possible next steps—not a correction prescription.</h2><p>{isBaselineScan ? "This first reading is a reference point. Repeat a comparable scan before treating any value as a pattern." : "These conservative suggestions respond to the recorded movement pattern. They cannot identify its cause or guarantee improvement."}</p></div><ShieldCheck size={30} /></div>
      {isBaselineScan ? <article className="gait-baseline-guidance"><RefreshCcw size={22} /><div><strong>Build a dependable comparison</strong><p>Repeat the same movement with similar camera position, footwear, lighting, surface, and pace. Continue only activities that already feel safe and comfortable.</p></div></article> : <div className="gait-guidance-grid">{guidance.map((item) => <article key={item.key}><span>{metricDetails[item.key]?.label || item.key}</span><h3>{item.title}</h3><ol>{item.steps.map((step) => <li key={step}>{step}</li>)}</ol><Link to={`/tai-chi?focus=${item.taiChi}`}>Open gentle {item.taiChi} pathway</Link></article>)}</div>}
      <div className="gait-guidance-boundary"><strong>Important:</strong> This is educational wellness guidance based on a camera-derived observation, not a diagnosis, treatment plan, or guarantee of results. Stop if movement causes pain, dizziness, chest discomfort, unusual shortness of breath, numbness, or instability. Consult a physician or licensed physical therapist for persistent or worsening changes, repeated falls, weakness, swelling, injury, or a sudden change in walking.</div>
    </section>}

    <section className="watch-pathway">
      <div className="watch-heading"><div><p className="ne-kicker">From signal to support</p><h2>Notice. Confirm. Respond wisely.</h2></div><span><Bone size={17} /> Bone and joint wellness pathway</span></div>
      <div className="watch-steps">{actionPath.map(({ title, detail, icon: Icon, href, to }, index) => {
        const content = <><i><Icon size={23} /></i><span>{String(index + 1).padStart(2, "0")}</span><h3>{title}</h3><p>{detail}</p></>;
        return to ? <Link key={title} to={to}>{content}</Link> : <a key={title} href={href}>{content}</a>;
      })}</div>
      <div className="clinical-boundary" id="clinical-boundary"><ShieldCheck size={24} /><p><strong>Know the boundary.</strong> G.A.I.T. supports wellness reflection; it does not image bones, measure bone density, diagnose disease, or prescribe correction. Persistent or worsening changes—and any pain, numbness, swelling, weakness, falls, or sudden gait change—should be evaluated by a qualified healthcare professional.</p></div>
    </section>

    {result && continuation && <section className="movement-continuation">
      <div><p className="ne-kicker">Continue your constellation</p><h2>Carry this observation into your next healthy action.</h2><p>These pathways use your MRVI focus as a navigation signal—not a diagnosis or prescription.</p></div>
      <div>
        <Link to={`/smoothie?goal=${continuation.goal}`}>Smoothie <span>{continuation.goal}</span></Link>
        <Link to={`/frequencies?goal=${continuation.goal}&hz=${continuation.frequencyHz}`}>Frequency <span>{continuation.frequencyHz} Hz</span></Link>
        <Link to={`/meals?goal=${continuation.mealGoal}`}>Meals <span>{continuation.mealGoal}</span></Link>
        <Link to={`/tai-chi?focus=${continuation.taiChiFocus}`}>Tai Chi <span>{continuation.taiChiFocus}</span></Link>
      </div>
    </section>}

    <section className="gait-history">
      <div><p className="ne-kicker">Longitudinal constellation</p><h2>Your baseline becomes more meaningful over time.</h2><p>Repeat comparable observations can reveal consistency or change without comparing your body to anyone else.</p></div>
      <div className="history-orbit"><span>{profile?.scans?.length || 0}</span><small>private scans</small></div>
      <button disabled={!unlocked}><LockKeyhole size={14} /> View movement timeline</button>
    </section>
  </main></div>;
}
