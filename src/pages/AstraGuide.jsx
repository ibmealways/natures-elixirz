import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AudioLines, Camera, Check, ChevronLeft, ChevronRight, Compass, Crown, FileText, GlassWater, Image, LockKeyhole, Paperclip, Pause, PersonStanding, Play, Plus, Send, ShieldCheck, Sparkles, Trash2, UtensilsCrossed, X } from "lucide-react";
import GlowNav from "../components/GlowNav";
import TierPreviewBanner, { useDeveloperAccess, useTierAccess } from "../components/TierPreviewBanner";
import { useAuth } from "../context/AuthContext";
import { useSubscriber } from "../context/SubscriberContext";
import { askAstraGuide, previewAstraReply } from "../utilities/astraGuide";
import { getWellnessJourney } from "../utilities/wellnessJourney";
import { getSavedRecipes } from "../utilities/recipeStorage";
import { addAstraGallerySlide, getAstraGallerySlides, removeAstraGallerySlide } from "../utilities/astraGalleryStorage";
import { buildKernelBrief, publishWellnessSignal } from "../utilities/wellnessExchange";
import { buildAstraKernelContext } from "../utilities/astraKernelContext";
import { getAstraConversation, saveAstraConversation } from "../utilities/astraConversationStorage";
import { useLanguage } from "../context/LanguageContext";
import "../styles/CosmicShell.css";
import "../styles/wellnessOS.css";
import "../styles/astraGuide.css";

const alignmentPath = [
  { tier: 1, name: "Nourish", realm: "The Elixir Garden", description: "Build your daily foundation with whole-food smoothie rituals.", to: "/smoothie", icon: GlassWater, prompt: "Help me begin my path with a personalized whole-food smoothie." },
  { tier: 2, name: "Resonate", realm: "The Harmonic Passage", description: "Add intentional relaxation soundscapes to your routine.", to: "/frequencies", icon: AudioLines, prompt: "Help me pair a relaxation soundscape with my smoothie intention." },
  { tier: 3, name: "Sustain", realm: "The Nourishment Grove", description: "Extend your intention through coordinated everyday meals.", to: "/meals", icon: UtensilsCrossed, prompt: "Help me create a practical day of meals around my smoothie." },
  { tier: 4, name: "Embody", realm: "The Movement Sanctuary", description: "Practice balance, flexibility, and mindful movement.", to: "/tai-chi", icon: PersonStanding, prompt: "Guide me toward a gentle Tai Chi flow for balance and mindfulness." },
  { tier: 5, name: "Evolve", realm: "The Longevity Circle", description: "Continue learning through evidence-aware briefings and V.I.P. experiences.", to: "/vip", icon: Crown, prompt: "Show me how the V.I.P. Longevity Circle supports continued learning." },
];

const welcome = {
  role: "assistant",
  content: "Welcome to your Path of Alignment. I’m Astra Guide. Tell me where you are today—nourishment, relaxation, meals, movement, or continued learning—and we’ll choose one realistic next step together.",
};

const ATTACHMENT_LIMIT = 3;
const ATTACHMENT_SIZE_LIMIT = 3 * 1024 * 1024;
const ALLOWED_ATTACHMENT_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf", "text/plain", "text/markdown", "text/csv", "application/json"]);

function readAttachment(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error(`Could not read ${file.name}.`));
    reader.onload = () => resolve({
      id: `${Date.now()}-${globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2)}`,
      name: file.name.slice(0, 120), type: file.type, size: file.size,
      kind: file.type.startsWith("image/") ? "image" : "file",
      ...(file.type.startsWith("text/") || file.type === "application/json" ? { text: String(reader.result).slice(0, 20000) } : { dataUrl: String(reader.result) }),
    });
    if (file.type.startsWith("text/") || file.type === "application/json") reader.readAsText(file);
    else reader.readAsDataURL(file);
  });
}

const capabilitySlides = [
  { id: "curated-berry", category: "Smoothie", title: "Cosmic Berry Elixir", description: "A logo-branded preview of the smoothies Nature's Elixirz can formulate.", image: "/assets/astra-gallery/berry-elixir.png" },
  { id: "curated-tropical", category: "Smoothie", title: "Tropical Radiance Elixir", description: "Mango and pineapple inspiration in a clear Nature's Elixirz mug.", image: "/assets/astra-gallery/tropical-elixir.png" },
  { id: "curated-green", category: "Smoothie", title: "Emerald Daily Foundation", description: "A whole-food green blend visualized from a balanced formula.", image: "/assets/smoothie-glass-visual-v1.png" },
  { id: "curated-oats", category: "Breakfast", title: "Berry Chia Morning Bowl", description: "A fiber-rich breakfast concept with oats, berries, walnuts, and chia.", image: "/assets/astra-gallery/breakfast-berry-oats.png" },
  { id: "curated-toast", category: "Breakfast", title: "Avocado Garden Toast", description: "A colorful breakfast plate designed around familiar whole foods.", image: "/assets/astra-gallery/breakfast-avocado-toast.png" },
  { id: "curated-grain", category: "Lunch", title: "Harvest Quinoa Bowl", description: "A plant-forward lunch with grains, greens, chickpeas, and roasted vegetables.", image: "/assets/astra-gallery/lunch-quinoa-bowl.png" },
  { id: "curated-wrap", category: "Lunch", title: "Garden Hummus Wrap", description: "A practical, produce-rich lunch with a crisp side salad.", image: "/assets/astra-gallery/lunch-vegetable-wrap.png" },
  { id: "curated-salmon", category: "Dinner", title: "Herb Salmon Supper", description: "A balanced dinner concept with salmon, quinoa, asparagus, and vegetables.", image: "/assets/astra-gallery/dinner-salmon.png" },
  { id: "curated-plan", category: "Meal plan", title: "The Nourishment Grove", description: "Coordinated breakfasts, lunches, dinners, snacks, and daily smoothies.", image: "/assets/nourishment-grove-v2.png" },
  { id: "curated-snack", category: "Snack", title: "Whole-Food Snack Constellation", description: "Snack inspiration organized around the subscriber's goals and preferences.", image: "/assets/nourishment-grove.png" },
];

export default function AstraGuide() {
  const unlocked = useTierAccess(1);
  const developerAccess = useDeveloperAccess();
  const { user, configured } = useAuth();
  const { profile } = useSubscriber();
  const { language, languageName } = useLanguage();
  const storageScope = user?.uid || "guest";
  const [messages, setMessages] = useState(() => {
    const recent = getAstraConversation(storageScope);
    return recent.length ? recent : [welcome];
  });
  const [draft, setDraft] = useState("");
  const [includeProfile, setIncludeProfile] = useState(false);
  const [includeKernelContext, setIncludeKernelContext] = useState(true);
  const [includeSensitive, setIncludeSensitive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [attachmentError, setAttachmentError] = useState("");
  const [attachmentMenuOpen, setAttachmentMenuOpen] = useState(false);
  const cameraInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [galleryPlaying, setGalleryPlaying] = useState(true);
  const [personalSlides, setPersonalSlides] = useState(() => getAstraGallerySlides(storageScope));
  const canUseLiveAI = unlocked && user && configured;
  const status = useMemo(() => canUseLiveAI ? "Personal guidance active" : "Guided preview", [canUseLiveAI]);
  const activeMembership = ["active", "trialing"].includes(profile.subscriptionStatus);
  const currentTier = developerAccess ? 5 : activeMembership ? Number(profile.tier || 1) : 0;
  const savedRecipes = useMemo(() => getSavedRecipes(storageScope), [storageScope]);
  const recipeCandidates = useMemo(() => savedRecipes.filter((recipe) => !personalSlides.some((slide) => slide.sourceId === recipe.id)), [savedRecipes, personalSlides]);
  const gallerySlides = useMemo(() => [...capabilitySlides, ...personalSlides], [personalSlides]);
  const currentSlide = gallerySlides[galleryIndex % gallerySlides.length];

  useEffect(() => {
    setPersonalSlides(getAstraGallerySlides(storageScope));
    setGalleryIndex(0);
  }, [storageScope]);

  useEffect(() => {
    const refreshConversation = (event) => {
      if (event.detail?.scope !== storageScope) return;
      const recent = getAstraConversation(storageScope);
      setMessages(recent.length ? recent : [welcome]);
    };
    window.addEventListener("naturesElixirz:data-restored", refreshConversation);
    return () => window.removeEventListener("naturesElixirz:data-restored", refreshConversation);
  }, [storageScope]);

  useEffect(() => {
    saveAstraConversation(messages, storageScope);
  }, [messages, storageScope]);

  useEffect(() => {
    if (!galleryPlaying || gallerySlides.length < 2) return undefined;
    const timer = window.setInterval(() => setGalleryIndex((index) => (index + 1) % gallerySlides.length), 5500);
    return () => window.clearInterval(timer);
  }, [galleryPlaying, gallerySlides.length]);

  function addRecipeVisual(recipe) {
    const ingredients = (recipe.ingredients || []).slice(0, 5).map((item) => item.name).filter(Boolean);
    const next = addAstraGallerySlide({ sourceId: recipe.id, category: "My smoothie", title: recipe.name || "My personalized elixir", description: ingredients.length ? `Visual concept inspired by ${ingredients.join(", ")}.` : "Visual concept based on your saved personalized formula.", image: "/assets/smoothie-glass-visual-v1.png", personal: true }, storageScope);
    setPersonalSlides(next);
    setGalleryIndex(capabilitySlides.length + next.length - 1);
    setGalleryPlaying(false);
  }

  async function addAttachments(fileList) {
    setAttachmentError("");
    const files = Array.from(fileList || []).slice(0, ATTACHMENT_LIMIT - attachments.length);
    if (!files.length) return;
    const invalid = files.find((file) => !ALLOWED_ATTACHMENT_TYPES.has(file.type) || file.size > ATTACHMENT_SIZE_LIMIT);
    if (invalid) {
      setAttachmentError(`${invalid.name} must be a supported photo or file no larger than 3 MB.`);
      return;
    }
    try {
      const preparedAttachments = await Promise.all(files.map(readAttachment));
      setAttachments((current) => [...current, ...preparedAttachments].slice(0, ATTACHMENT_LIMIT));
      setAttachmentMenuOpen(false);
    } catch (readError) {
      setAttachmentError(readError.message);
    }
  }

  async function send(text = draft) {
    const message = text.trim();
    if ((!message && !attachments.length) || busy) return;
    setError("");
    setDraft("");
    const sentAttachments = attachments;
    const displayMessage = message || "Please review the attached item.";
    const nextMessages = [...messages, { role: "user", content: displayMessage, attachments: sentAttachments, createdAt: new Date().toISOString() }];
    setMessages(nextMessages);
    if (!canUseLiveAI) {
      setMessages([...nextMessages, { role: "assistant", content: previewAstraReply(displayMessage), createdAt: new Date().toISOString() }]);
      setAttachments([]);
      return;
    }
    setBusy(true);
    try {
      const reply = await askAstraGuide({
        message: displayMessage,
        attachments: sentAttachments.map(({ name, type, size, kind, dataUrl, text: attachmentText }) => ({ name, type, size, kind, dataUrl, text: attachmentText })),
        history: messages.slice(-10),
        includeProfile,
        includeSensitive,
        includeKernelContext,
        kernelContext: includeKernelContext ? buildAstraKernelContext(storageScope) : undefined,
        profile: includeProfile ? profile : undefined,
        journey: includeProfile ? { ...getWellnessJourney(storageScope), exchange: buildKernelBrief(storageScope, "astra") } : undefined,
        language,
        languageName,
      });
      publishWellnessSignal(storageScope, "astra", { selection: "Personal guidance conversation" });
      setMessages([...nextMessages, { role: "assistant", content: reply, createdAt: new Date().toISOString() }]);
      setAttachments([]);
    } catch (requestError) {
      setError(requestError.message || "Astra Guide could not respond. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return <div className="cosmic-page-shell astra-cosmos"><GlowNav /><main className="ne-page astra-page">
    <header className="astra-journey-hero">
      <div>
        <p className="ne-kicker"><Compass size={15} /> AstraMind Technologies · Your intelligent wellness compass</p>
        <h1>The Path of <em>Alignment</em></h1>
        <p>Astra helps you navigate one sustainable choice at a time—from nourishment and relaxation to meals, movement, and lifelong learning.</p>
      </div>
      <div className="journey-principle"><Sparkles size={24} /><span><small>The guiding principle</small><strong>Progress over perfection.</strong></span></div>
    </header>

    <TierPreviewBanner minimum={1}>Walk through every realm in preview. Membership unlocks personalized guidance and creation tools at your tier.</TierPreviewBanner>

    <section className="alignment-map" aria-labelledby="alignment-title">
      <div className="map-heading"><div><p className="ne-kicker">Your wellness constellation</p><h2 id="alignment-title">Five stepping stones toward a more aligned life</h2></div><span>{developerAccess ? "Developer access · all tiers" : currentTier ? `Tier ${currentTier} active` : "Preview journey"}</span></div>
      <div className="alignment-route">
        <div className="route-progress" style={{ "--journey-progress": `${Math.max(0, (currentTier - 1) / 4) * 100}%` }} />
        {alignmentPath.map(({ tier, name, realm, description, to, icon: Icon, prompt }) => {
          const tierUnlocked = currentTier >= tier;
          const isCurrent = currentTier === tier;
          return <article key={tier} className={`alignment-node tier-${tier} ${tierUnlocked ? "unlocked" : "locked"} ${isCurrent ? "current" : ""}`}>
            <button className="node-beacon" onClick={() => send(prompt)} aria-label={`Ask Astra about Tier ${tier}: ${name}`}><Icon size={24} />{tierUnlocked ? <Check className="node-state" size={13} /> : <LockKeyhole className="node-state" size={12} />}</button>
            <div className="node-card"><div><span>Stepping stone {tier}</span>{isCurrent && <small>Current realm</small>}</div><h3>{name}</h3><strong>{realm}</strong><p>{description}</p><div className="node-actions"><button onClick={() => send(prompt)}>Ask Astra</button><Link to={to}>{tierUnlocked ? "Enter realm" : "Preview realm"} →</Link></div></div>
          </article>;
        })}
      </div>
      <p className="map-disclaimer">This path supports healthy routines and education. It does not promise longer life or replace healthcare.</p>
    </section>

    <section className="astra-layout">
      <article className="ne-panel astra-chat">
        <div className="astra-chat-heading"><div><span className="astra-orb" aria-hidden="true" /><div><strong>Astra Guide</strong><small>{status}</small></div></div><span className="astra-status">● Compass online</span></div>
        <div className="astra-messages" aria-live="polite">
          {messages.map((message, index) => <div key={`${message.role}-${index}`} className={`astra-message ${message.role}`}><span>{message.role === "assistant" ? "ASTRA" : "YOU"}</span><p>{message.content}</p>{message.attachments?.length > 0 && <div className="astra-message-attachments">{message.attachments.map((attachment) => attachment.kind === "image" ? <img key={attachment.id} src={attachment.dataUrl} alt={`Attached ${attachment.name}`} /> : <span key={attachment.id}><FileText size={15} /> {attachment.name}</span>)}</div>}</div>)}
          {busy && <div className="astra-message assistant"><span>ASTRA</span><p>Mapping your clearest next step…</p></div>}
        </div>
        {error && <div className="ne-alert ne-alert-danger">{error}</div>}
        <div className="astra-composer">
          <div className="astra-attachment-control">
            <button type="button" className="astra-attachment-trigger" aria-label="Add a photo or file" aria-expanded={attachmentMenuOpen} onClick={() => setAttachmentMenuOpen((open) => !open)} disabled={busy || attachments.length >= ATTACHMENT_LIMIT}><Paperclip size={20} /></button>
            {attachmentMenuOpen && <div className="astra-attachment-menu">
              <button type="button" onClick={() => cameraInputRef.current?.click()}><Camera size={18} /><span>Take a photo<small>Use your phone camera</small></span></button>
              <button type="button" onClick={() => fileInputRef.current?.click()}><Image size={18} /><span>Upload photo or file<small>Images, PDF, text, CSV, or JSON</small></span></button>
            </div>}
            <input ref={cameraInputRef} className="astra-hidden-input" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={(event) => { addAttachments(event.target.files); event.target.value = ""; }} />
            <input ref={fileInputRef} className="astra-hidden-input" type="file" multiple accept="image/jpeg,image/png,image/webp,application/pdf,text/plain,text/markdown,text/csv,application/json,.md,.csv,.json" onChange={(event) => { addAttachments(event.target.files); event.target.value = ""; }} />
          </div>
          {attachments.length > 0 && <div className="astra-attachment-previews">{attachments.map((attachment) => <div key={attachment.id} className="astra-attachment-preview">{attachment.kind === "image" ? <img src={attachment.dataUrl} alt="" /> : <FileText size={18} />}<span title={attachment.name}>{attachment.name}</span><button type="button" aria-label={`Remove ${attachment.name}`} onClick={() => setAttachments((current) => current.filter((item) => item.id !== attachment.id))}><Trash2 size={14} /></button></div>)}</div>}
          <textarea aria-label="Message Astra" value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); send(); } }} rows="3" maxLength="2000" placeholder="Tell Astra where you are and where you want to go…" />
          <button className="ne-primary" disabled={(!draft.trim() && !attachments.length) || busy} onClick={() => send()}><Send size={17} /> {busy ? "Mapping…" : canUseLiveAI ? "Ask Astra" : "Preview guidance"}</button>
        </div>
        {attachmentError && <p className="astra-attachment-error" role="alert">{attachmentError}</p>}
        <p className="astra-attachment-note">Up to 3 attachments, 3 MB each. Photos and files are sent only with this Astra request and are not added to your profile.</p>
        <p className="astra-fineprint">Astra provides general food and lifestyle education—not medical advice, diagnosis, treatment, emergency care, or a longevity guarantee.</p>
        <section className="astra-gallery" aria-label="Nature's Elixirz capability gallery">
          <img key={currentSlide.id} src={currentSlide.image} alt={`${currentSlide.title} visual concept`} />
          <div className="astra-gallery-shade" />
          <div className="astra-gallery-copy"><span>{currentSlide.personal ? "Your private gallery" : `${currentSlide.category} inspiration`}</span><h2>{currentSlide.title}</h2><p>{currentSlide.description}</p></div>
          <div className="astra-gallery-controls">
            <button onClick={() => setGalleryIndex((galleryIndex - 1 + gallerySlides.length) % gallerySlides.length)} aria-label="Previous gallery image"><ChevronLeft size={18} /></button>
            <button onClick={() => setGalleryPlaying((value) => !value)} aria-label={galleryPlaying ? "Pause gallery" : "Play gallery"}>{galleryPlaying ? <Pause size={17} /> : <Play size={17} />}</button>
            <span>{galleryIndex + 1} / {gallerySlides.length}</span>
            <button onClick={() => setGalleryIndex((galleryIndex + 1) % gallerySlides.length)} aria-label="Next gallery image"><ChevronRight size={18} /></button>
          </div>
          {currentSlide.personal && <button className="astra-gallery-remove" onClick={() => { setPersonalSlides(removeAstraGallerySlide(currentSlide.id, storageScope)); setGalleryIndex(0); }}><X size={15} /> Remove</button>}
        </section>
        <div className="astra-gallery-library">
          <div><strong>Build your private inspiration gallery</strong><small>Saved smoothie formulas stay inside this subscriber account.</small></div>
          {recipeCandidates.length ? <div className="astra-gallery-additions">{recipeCandidates.slice(-3).map((recipe) => <button key={recipe.id} onClick={() => addRecipeVisual(recipe)}><Plus size={14} /> Add {recipe.name || "saved smoothie"}</button>)}</div> : <Link to="/smoothie">Generate and save a smoothie to add it here →</Link>}
        </div>
      </article>

      <aside className="astra-sidebar">
        <div className="ne-panel alignment-checkin"><p className="ne-kicker">Daily alignment</p><h2>Where are you today?</h2>{alignmentPath.slice(0, 4).map(({ name, prompt, icon: Icon }) => <button key={name} onClick={() => send(prompt)}><Icon size={17} /><span>{name}</span></button>)}</div>
        <div className="ne-panel"><h2>Personalization controls</h2><label className="ne-consent"><input type="checkbox" checked={includeKernelContext} onChange={(event) => setIncludeKernelContext(event.target.checked)} /> Use my Kernel data: Smoothie and Meal Plan kitchens, saved recipes, current plans, frequencies, Tai Chi, and movement progress</label><p className="ne-muted">Astra receives a read-only summary and cannot change or delete Kernel data.</p><label className="ne-consent"><input type="checkbox" checked={includeProfile} onChange={(event) => { setIncludeProfile(event.target.checked); if (!event.target.checked) setIncludeSensitive(false); }} /> Use my goals, dietary pattern, allergies, and avoid list</label><label className="ne-consent"><input type="checkbox" disabled={!includeProfile} checked={includeSensitive} onChange={(event) => setIncludeSensitive(event.target.checked)} /> Also share age, conditions, medications, tobacco, and alcohol context for this request</label><p className="ne-muted">Sensitive details are only included when you choose them.</p></div>
        {!user && <div className="ne-panel"><h2>Continue your journey</h2><p className="ne-muted">Create an account, verify your email, and activate a membership for live AI conversations.</p><Link className="ne-secondary inline-block mt-4" to="/account">Open profile</Link></div>}
        <div className="ne-panel astra-safety"><ShieldCheck size={25} /><div><h2>Guidance with boundaries</h2><p>Astra keeps medication and condition decisions with clinicians, pharmacists, and registered dietitians.</p></div></div>
        <div className="ne-panel astra-emergency"><h2>Urgent symptoms?</h2><p>Do not wait for an AI reply. Contact local emergency services for chest pain, trouble breathing, stroke signs, fainting, or a severe allergic reaction.</p></div>
      </aside>
    </section>
  </main></div>;
}
