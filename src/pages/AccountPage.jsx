import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity, Check, Cigarette, Cloud, Eye, EyeOff, Fingerprint, Footprints, HeartPulse,
  Globe2, Leaf, LockKeyhole, MapPin, ScanFace, ShieldCheck, Sparkles, UserRound, Wine
} from "lucide-react";
import GlowNav from "../components/GlowNav";
import { useSubscriber } from "../context/SubscriberContext";
import AuthForm from "../components/AuthForm";
import CloudSyncPanel from "../components/CloudSyncPanel";
import AccountControls from "../components/AccountControls";
import VipFamilyAccess from "../components/VipFamilyAccess";
import "../styles/CosmicShell.css";
import "../styles/wellnessOS.css";
import "../styles/profileVault.css";
import "../styles/profileReach.css";

const goals = [
  ["heart", "Heart-supportive eating", HeartPulse],
  ["digestion", "Digestive wellness", Leaf],
  ["energy", "Steady energy", Activity],
  ["inflammation", "Produce-rich recovery", Sparkles],
  ["general", "Everyday nutrition", ShieldCheck],
];
const conditions = ["Heart disease", "High blood pressure", "Diabetes", "Kidney disease", "Pregnancy", "Food intolerance"];
const tobaccoTypes = ["Cigarettes", "Cigars", "Chewing tobacco", "Pipe tobacco", "Nicotine vape"];
const alcoholTypes = ["Beer", "Wine", "Vodka", "Rum", "Whiskey", "Other spirits"];
const consumptionFrequencies = [["none", "None currently"], ["daily", "Daily"], ["weekly", "Weekly"], ["monthly", "Monthly"], ["occasionally", "Occasionally"]];
const referralSources = [["prefer-not-to-say", "Prefer not to say"], ["friend-family", "Friend or family"], ["social-media", "Social media"], ["search", "Web search"], ["community-event", "Community event"], ["health-wellness-professional", "Health or wellness professional"], ["maha-event", "MAHA-related event or community"], ["other", "Other"]];
const signatures = [
  { label: "Fingerprint", icon: Fingerprint, className: "fingerprint" },
  { label: "Iris pattern", icon: Eye, className: "iris" },
  { label: "Face geometry", icon: ScanFace, className: "face" },
  { label: "Movement imprint", icon: Footprints, className: "footprints" },
];

function profileContent(value = {}) {
  const { completedAt: _completedAt, ...content } = value;
  return JSON.stringify(content);
}

export default function AccountPage() {
  const { profile, saveProfile, resetProfile } = useSubscriber();
  const navigate = useNavigate();
  const [form, setForm] = useState(profile);
  const [accepted, setAccepted] = useState(false);
  const [showLifestyle, setShowLifestyle] = useState(false);
  const profileChanged = Boolean(profile.completedAt) && profileContent(form) !== profileContent(profile);
  const boundaryOpen = !profile.completedAt || profileChanged;

  useEffect(() => {
    setForm(profile);
    if (profile.completedAt) setAccepted(true);
  }, [profile]);

  useEffect(() => {
    if (profileChanged) setAccepted(false);
  }, [profileChanged]);

  useEffect(() => {
    if (!showLifestyle) return undefined;
    const timer = window.setTimeout(() => setShowLifestyle(false), 60000);
    const hideWhenBackgrounded = () => { if (document.hidden) setShowLifestyle(false); };
    document.addEventListener("visibilitychange", hideWhenBackgrounded);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", hideWhenBackgrounded);
    };
  }, [showLifestyle]);

  const toggle = (key, value) => setForm((current) => ({
    ...current,
    [key]: current[key].includes(value)
      ? current[key].filter((item) => item !== value)
      : [...current[key], value],
  }));
  const toggleConsumptionType = (key, value) => setForm((current) => {
    const section = current[key] || { types: [], frequency: "none", quantity: "" };
    const types = section.types.includes(value) ? section.types.filter((item) => item !== value) : [...section.types, value];
    return { ...current, [key]: { ...section, types, frequency: types.length && section.frequency === "none" ? "occasionally" : section.frequency } };
  });
  const updateConsumption = (key, field, value) => setForm((current) => ({
    ...current,
    [key]: {
      ...(current[key] || { types: [], frequency: "none", quantity: "" }), [field]: value,
      ...(field === "frequency" && value === "none" ? { types: [], quantity: "" } : {}),
    },
  }));
  const updateReach = (field, value) => setForm((current) => ({
    ...current, reach: { country: "", region: "", referral: "prefer-not-to-say", ...current.reach, [field]: value },
  }));

  function submit(event) {
    event.preventDefault();
    saveProfile(form);
    navigate("/premium");
  }

  return <div className="cosmic-page-shell profile-cosmos"><GlowNav /><main className="ne-page profile-page">
    <header className="profile-hero">
      <div className="profile-title-band">
        <div><p className="ne-kicker"><LockKeyhole size={14} /> Private Bio-Signature Vault</p><h1>There Is Only One <em>You.</em></h1></div>
        <div><p>Your preferences, goals, safety information, and saved rituals form one protected wellness identity across Nature&apos;s Elixirz.</p><a href="#profile-foundation">Build your foundation <span>↓</span></a></div>
      </div>
      <div className="profile-panorama" role="img" aria-label="Celestial identity vault with fingerprint, iris, facial geometry, and footprint constellations">
        {signatures.map(({ label, icon: Icon, className }) => <span className={`signature-chip ${className}`} key={label}><Icon size={15} /> {label}</span>)}
        <span className="signature-core"><ShieldCheck size={15} /> Identity core protected</span>
      </div>
    </header>

    <section className="biometric-boundary">
      <ShieldCheck size={22} />
      <div><strong>Visual concept—not biometric collection.</strong><p>Fingerprint, iris, facial, and footprint imagery symbolizes your individuality. This version does not scan, store, or authenticate with biometric data.</p></div>
      <span>Local-first profile</span>
    </section>

    <section className="identity-constellation">
      <div><p className="ne-kicker">One member · one constellation</p><h2>Your wellness signals connect here.</h2><p>The vault helps personalize food guidance and safety notices without diagnosing, treating, or replacing professional care.</p></div>
      <div className="constellation-ring">
        <div className="member-core"><UserRound size={27} /><small>{form.name || "Your"}</small><strong>Identity Core</strong></div>
        {signatures.map(({ label, icon: Icon, className }) => <span className={`orbit-signature ${className}`} key={label}><Icon size={18} /><small>{label}</small></span>)}
      </div>
    </section>

    <form id="profile-foundation" onSubmit={submit} className="profile-form">
      <section className="vault-section">
        <div className="vault-heading"><span>01</span><div><p className="ne-kicker">Foundation coordinates</p><h2>About you</h2><p>Basic information helps scale recipes and tailor general wellness suggestions.</p></div></div>
        <div className="vault-grid">
          <label><span>Name</span><input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
          <label><span>Age</span><input required min="13" max="110" type="number" value={form.age} onChange={(event) => setForm({ ...form, age: event.target.value })} /></label>
          <label><span>Weight <small>lb</small></span><input min="50" max="700" type="number" value={form.weight} onChange={(event) => setForm({ ...form, weight: event.target.value })} /></label>
          <label><span>Height <small>in</small></span><input min="40" max="90" type="number" value={form.height} onChange={(event) => setForm({ ...form, height: event.target.value })} /></label>
          <label><span>Dietary pattern</span><select value={form.dietaryPattern} onChange={(event) => setForm({ ...form, dietaryPattern: event.target.value })}><option value="omnivore">Omnivore</option><option value="vegetarian">Vegetarian</option><option value="vegan">Vegan</option><option value="pescatarian">Pescatarian</option></select></label>
          <label><span>Activity rhythm</span><select value={form.activity} onChange={(event) => setForm({ ...form, activity: event.target.value })}><option value="low">Low</option><option value="moderate">Moderate</option><option value="high">High</option></select></label>
        </div>
      </section>

      <section className="vault-section">
        <div className="vault-heading"><span>02</span><div><p className="ne-kicker">Intent constellation</p><h2>What are you moving toward?</h2><p>Select every intention that matters to your current season.</p></div></div>
        <div className="goal-grid">{goals.map(([value, label, Icon]) => {
          const checked = form.healthGoals.includes(value);
          return <label className={checked ? "selected" : ""} key={value}><input type="checkbox" checked={checked} onChange={() => toggle("healthGoals", value)} /><i><Icon size={21} /></i><strong>{label}</strong><span><Check size={13} /></span></label>;
        })}</div>
      </section>

      <section className="vault-section safety-vault">
        <div className="vault-heading"><span>03</span><div><p className="ne-kicker">Safety constellation</p><h2>Guardrails before guidance.</h2><p>These details support warnings and ingredient exclusions—not medical treatment calculations.</p></div></div>
        <div className="condition-grid">{conditions.map((condition) => {
          const checked = form.conditions.includes(condition);
          return <label className={checked ? "selected" : ""} key={condition}><input type="checkbox" checked={checked} onChange={() => toggle("conditions", condition)} /><span><Check size={12} /></span>{condition}</label>;
        })}</div>
        <div className="vault-textareas">
          <label><span>Current medications</span><textarea rows="4" value={form.medications} onChange={(event) => setForm({ ...form, medications: event.target.value })} placeholder="Prescription and over-the-counter medicines" /></label>
          <label><span>Allergies or intolerances</span><textarea rows="4" value={form.allergies} onChange={(event) => setForm({ ...form, allergies: event.target.value })} placeholder="Foods or ingredients that cause a reaction" /></label>
          <label><span>Ingredients you avoid</span><textarea rows="4" value={form.avoidIngredients} onChange={(event) => setForm({ ...form, avoidIngredients: event.target.value })} placeholder="Personal, cultural, or dietary exclusions" /></label>
        </div>
      </section>

      <section className="vault-section lifestyle-vault">
        <div className="vault-heading"><span>04</span><div><p className="ne-kicker">Optional lifestyle context</p><h2>Habits that may shape guidance.</h2><p>Share only what you are comfortable sharing. These details support general wellness context and are never used to diagnose or judge.</p></div></div>
        {!showLifestyle
          ? <div className="lifestyle-shield"><span><LockKeyhole size={25} /></span><div><strong>Sensitive details hidden</strong><p>Selections and quantities are concealed from view. Reveal only when you have privacy.</p></div><button type="button" onClick={() => setShowLifestyle(true)}><Eye size={17} /> Reveal for 60 seconds</button></div>
          : <><div className="lifestyle-reveal-bar"><span><Eye size={16} /> Sensitive details visible</span><button type="button" onClick={() => setShowLifestyle(false)}><EyeOff size={16} /> Hide now</button></div><div className="consumption-grid">
            <ConsumptionCard icon={Cigarette} title="Tobacco or nicotine" field="tobacco" options={tobaccoTypes} value={form.tobacco} onToggle={toggleConsumptionType} onChange={updateConsumption} quantityPlaceholder="Example: 5 cigarettes or 2 cigars" />
            <ConsumptionCard icon={Wine} title="Alcohol" field="alcohol" options={alcoholTypes} value={form.alcohol} onToggle={toggleConsumptionType} onChange={updateConsumption} quantityPlaceholder="Example: 2 drinks per week" />
          </div></>}
        <p className="lifestyle-privacy"><LockKeyhole size={14} /> Optional sensitive information. Hidden values synchronize with your protected profile and are shared with Astra only when you enable sensitive-profile context.</p>
      </section>

      <section className="vault-section reach-vault">
        <div className="vault-heading"><span>05</span><div><p className="ne-kicker">Optional community reach</p><h2>Where is Nature&apos;s Elixirz reaching people?</h2><p>Voluntary broad information helps us understand the communities we serve. Leave either location field blank or choose “Prefer not to say” at any time.</p></div></div>
        <div className="reach-privacy"><MapPin size={20} /><div><strong>Self-reported only</strong><p>We never access device location, derive location from an IP address, or track movement. Administrators see aggregate counts only, and very small groups are hidden.</p></div></div>
        <div className="vault-grid">
          <label><span>Country <small>optional</small></span><input maxLength="80" value={form.reach?.country || ""} onChange={(event) => updateReach("country", event.target.value)} placeholder="Example: United States" /></label>
          <label><span>State, province, or broad region <small>optional</small></span><input maxLength="80" value={form.reach?.region || ""} onChange={(event) => updateReach("region", event.target.value)} placeholder="Example: Pennsylvania" /></label>
          <label><span>How did you hear about us?</span><select value={form.reach?.referral || "prefer-not-to-say"} onChange={(event) => updateReach("referral", event.target.value)}>{referralSources.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        </div>
        <p className="lifestyle-privacy"><Globe2 size={14} /> Used to measure community reach—not to personalize health guidance, advertise to you, or identify your whereabouts.</p>
      </section>
      {boundaryOpen && <label className="profile-consent"><input required type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} /><span><Check size={14} /></span><p><strong>I understand the boundary.</strong> Nature&apos;s Elixirz provides educational wellness guidance, not medical care. I will verify food–medication concerns with a clinician or pharmacist.</p></label>}
      <div className="profile-actions"><button className="save-identity" type="submit"><ShieldCheck size={18} /> Seal profile &amp; open plans</button>{profile.completedAt && <button type="button" onClick={resetProfile}>Clear local profile</button>}</div>
    </form>

    <section className="cloud-vault">
      <div className="cloud-vault-heading"><i><Cloud size={24} /></i><div><p className="ne-kicker">Optional cloud identity</p><h2>Carry your constellation between devices.</h2><p>Account authentication uses email and password. No biometric information is collected.</p></div></div>
      <div className="cloud-vault-console"><AuthForm /><CloudSyncPanel /><AccountControls /><VipFamilyAccess /></div>
    </section>
  </main></div>;
}

function ConsumptionCard({ icon: Icon, title, field, options, value = {}, onToggle, onChange, quantityPlaceholder }) {
  const current = { types: [], frequency: "none", quantity: "", ...value };
  const active = current.frequency !== "none";
  return <article className={`consumption-card ${active ? "active" : ""}`}>
    <div className="consumption-title"><i><Icon size={20} /></i><div><strong>{title}</strong><small>Optional</small></div></div>
    <div className="consumption-types">{options.map((option) => <label className={current.types.includes(option) ? "selected" : ""} key={option}><input type="checkbox" checked={current.types.includes(option)} onChange={() => onToggle(field, option)} /><span><Check size={11} /></span>{option}</label>)}</div>
    <div className="consumption-fields">
      <label><span>Frequency</span><select value={current.frequency} onChange={(event) => onChange(field, "frequency", event.target.value)}>{consumptionFrequencies.map(([key, label]) => <option value={key} key={key}>{label}</option>)}</select></label>
      <label><span>Approximate quantity</span><input disabled={!active} value={current.quantity} onChange={(event) => onChange(field, "quantity", event.target.value)} placeholder={quantityPlaceholder} /></label>
    </div>
  </article>;
}
