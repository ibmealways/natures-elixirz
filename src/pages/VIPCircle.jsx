import React from "react";
import { Link } from "react-router-dom";
import { AudioLines, BookOpenCheck, Bot, BrainCircuit, Crown, Gift, GlassWater, HeartHandshake, LockKeyhole, PersonStanding, ShieldCheck, Sparkles, Telescope, UtensilsCrossed } from "lucide-react";
import GlowNav from "../components/GlowNav";
import TierPreviewBanner, { useTierAccess } from "../components/TierPreviewBanner";
import { briefingTracks, editorialStandards, giftProgram } from "../data/vipContent";
import "../styles/CosmicShell.css";
import "../styles/wellnessOS.css";
import "../styles/vipCircle.css";

const convergenceRealms = [
  { tier: 1, name: "Nourish Within", detail: "Whole-food smoothie rituals", to: "/smoothie", icon: GlassWater, color: "emerald" },
  { tier: 2, name: "Resonate", detail: "Relaxation soundscapes", to: "/frequencies", icon: AudioLines, color: "violet" },
  { tier: 3, name: "Sustain", detail: "Practical meal rhythms", to: "/meals", icon: UtensilsCrossed, color: "sunrise" },
  { tier: 4, name: "Embody", detail: "Mindful Tai Chi movement", to: "/tai-chi", icon: PersonStanding, color: "moon" },
];

const trackIcons = [Bot, Telescope, HeartHandshake];

export default function VIPCircle() {
  const unlocked = useTierAccess(5);
  return <div className="cosmic-page-shell vip-cosmos"><GlowNav /><main className="ne-page vip-page">
    <header className="vip-hero">
      <div className="vip-title-band"><div><p className="ne-kicker"><Crown size={15} /> Tier 5 · V.I.P. Longevity Circle</p><h1>Where Every Path <em>Converges.</em></h1></div><div><p>Bring nourishment, relaxation, meals, movement, and trustworthy learning into one connected practice for healthier living.</p><a href="#convergence-map">Enter the circle <span>↓</span></a></div></div>
      <div className="vip-panorama" role="img" aria-label="Four celestial wellness realms converging into a central golden knowledge circle">
        <span className="vip-realm-label elixir"><GlassWater size={15} /> Elixir Laboratory</span>
        <span className="vip-realm-label resonate"><AudioLines size={15} /> Resonate Observatory</span>
        <span className="vip-realm-label nourish"><UtensilsCrossed size={15} /> Nourishment Grove</span>
        <span className="vip-realm-label embody"><PersonStanding size={15} /> Flow Sanctuary</span>
        <span className="vip-realm-label center"><Crown size={15} /> V.I.P. Convergence</span>
      </div>
    </header>

    <TierPreviewBanner minimum={5}>Explore the complete convergence, briefing tracks, editorial charter, and gift program. Published issues and fulfillment unlock in Tier 5.</TierPreviewBanner>

    <section className="convergence-map" id="convergence-map">
      <div className="convergence-heading"><div><p className="ne-kicker">Your whole-life constellation</p><h2>Four daily practices. One informed journey.</h2></div><span><Sparkles size={15} /> Everything in Tiers 1–4 included</span></div>
      <div className="convergence-flow">{convergenceRealms.map(({ tier, name, detail, to, icon: Icon, color }) => <Link className={`convergence-realm ${color}`} to={to} key={tier}><i><Icon size={23} /></i><span><small>Tier {tier}</small><strong>{name}</strong><em>{detail}</em></span><b>Explore →</b></Link>)}<div className="convergence-core"><Crown size={28} /><span><small>Tier 5</small><strong>Learn & Evolve</strong><em>Evidence-aware intelligence, member experiences, and continued growth</em></span></div></div>
      <p className="convergence-note">Healthy aging is influenced by many factors. Nature&apos;s Elixirz supports education and daily routines—it does not promise lifespan extension or replace healthcare.</p>
    </section>

    <section className="briefing-observatory">
      <div className="briefing-heading"><div><p className="ne-kicker">Biweekly intelligence briefing</p><h2>Signal through the noise.</h2><p>Two useful issues each month—not an endless news feed. Understand developments and formulate better questions for qualified professionals.</p></div><div className="issue-orbit"><span>02</span><small>issues monthly</small></div></div>
      <div className="briefing-grid">{briefingTracks.map((track, index) => {
        const Icon = trackIcons[index];
        return <article key={track.title}><div className="briefing-icon"><Icon size={24} /></div><small>{track.cadence}</small><h3>{track.title}</h3><p>{track.description}</p><button disabled={!unlocked}>{!unlocked && <LockKeyhole size={13} />} Read latest briefing</button></article>;
      })}</div>
    </section>

    <section className="vip-lower-grid">
      <article className="trust-charter"><div className="section-symbol"><ShieldCheck size={26} /></div><p className="ne-kicker">Editorial charter</p><h2>Trust is part of the product.</h2><ol>{editorialStandards.map((standard, index) => <li key={standard}><span>{String(index + 1).padStart(2, "0")}</span><p>{standard}</p></li>)}</ol></article>
      <article className="gift-vault"><div className="section-symbol"><Gift size={26} /></div><p className="ne-kicker">Member gift constellation</p><h2>Objects that support the ritual.</h2><div>{giftProgram.map((item, index) => <article key={item.period}><span><small>{item.period}</small><strong>{item.gift}</strong><p>{item.note}</p></span><i>{String(index + 1).padStart(2, "0")}</i></article>)}</div><button disabled={!unlocked}>{!unlocked && <LockKeyhole size={13} />} Open member fulfillment</button></article>
    </section>

    <section className="vip-intelligence">
      <BrainCircuit size={29} /><div><p className="ne-kicker">AstraMind intelligence layer</p><h2>Ask better questions. See the whole pattern.</h2><p>Astra can help connect your saved smoothie intentions, listening rituals, meal rhythms, and movement practices—while keeping medical decisions with qualified professionals.</p></div><Link to="/astra"><BookOpenCheck size={18} /> Ask Astra to map my journey</Link>
    </section>
  </main></div>;
}
