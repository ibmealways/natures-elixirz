import React from "react";
import { Link, NavLink } from "react-router-dom";
import { Apple, Carrot, Cherry, Citrus, Droplets, Languages, LogIn, LogOut, Sparkles, Sprout, UserCircle } from "lucide-react";
import "./GlowNav.css";
import { languages, useLanguage } from "../context/LanguageContext";
import { useAuth } from "../context/AuthContext";

const links = [
  ["/smoothie", "smoothies"], ["/astra", "astra"], ["/saved", "saved"],
  ["/frequencies", "frequencies"], ["/meals", "meals"], ["/tai-chi", "taiChi"],
  ["/mrvi", "movement"], ["/vip", "vip"], ["/account", "profile"], ["/premium", "plans"],
];

const ingredientOrbits = [
  { label: "Fruit", icon: Cherry, className: "fruit-one" },
  { label: "Citrus", icon: Citrus, className: "fruit-two" },
  { label: "Vegetable", icon: Carrot, className: "vegetable" },
  { label: "Whole fruit", icon: Apple, className: "apple" },
  { label: "Spice", icon: Sparkles, className: "spice" },
  { label: "Seed and sprout", icon: Sprout, className: "seed" },
  { label: "Liquid", icon: Droplets, className: "liquid" },
];

export default function GlowNav() {
  const { language, setLanguage, t } = useLanguage();
  const { user, loading, signOut } = useAuth();
  return (
    <header className="glow-nav-container">
      <div className="glow-nav-stack">
        <div className="glow-nav-utility">
          <div className="account-utility">
            {loading ? <span><UserCircle size={16} /> Loading account…</span> : user ? <><span title={user.email}><UserCircle size={16} /> {user.email}</span><button type="button" onClick={signOut}><LogOut size={15} /> {t("signOut")}</button></> : <Link to="/account"><LogIn size={16} /> {t("signIn")}</Link>}
          </div>
          <label className="language-selector"><Languages size={15} /><span>{t("language")}</span><select aria-label={t("language")} value={language} onChange={(event) => setLanguage(event.target.value)}>{languages.map(([code, label]) => <option value={code} key={code}>{label}</option>)}</select></label>
        </div>
        <Link className="nature-brand" to="/smoothie" aria-label="Nature's Elixirz home">
          <span className="ingredient-constellation" aria-hidden="true">
            {ingredientOrbits.map(({ label, icon: Icon, className }) => <i className={`ingredient-orbit ${className}`} title={label} key={label}><Icon /></i>)}
          </span>
          <span className="nature-brand-mark" aria-hidden="true">
            <svg viewBox="0 0 92 92" role="presentation">
              <defs>
                <linearGradient id="elixirGlow" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#fde68a" />
                  <stop offset=".48" stopColor="#34d399" />
                  <stop offset="1" stopColor="#22d3ee" />
                </linearGradient>
              </defs>
              <circle className="brand-orbit" cx="46" cy="46" r="37" />
              <path className="brand-leaf" d="M50 30c8-13 22-13 27-13-1 13-7 24-24 24-2-3-3-7-3-11Z" />
              <path className="brand-leaf-vein" d="M51 39c7-8 13-13 22-18" />
              <path className="brand-vessel" d="M34 29h19M39 29v13L28 67c-2 5 1 9 7 9h27c6 0 9-4 7-9L55 42V29" />
              <path className="brand-elixir" d="M32 65c8-5 14 4 22-1 6-4 10-1 13 1l2 5c1 4-2 6-7 6H35c-5 0-8-3-6-7l3-4Z" />
              <circle className="brand-star star-one" cx="22" cy="33" r="2" />
              <circle className="brand-star star-two" cx="70" cy="50" r="1.7" />
            </svg>
          </span>
          <span className="nature-brand-copy">
            <small>{t("healing")}</small>
            <strong className="notranslate" translate="no">Nature&apos;s <em>Elixirz</em></strong>
            <span>{t("system")}</span>
          </span>
        </Link>
        <div className="glow-nav-row">
          <nav className="glow-nav" aria-label="Main navigation">
            {links.map(([to, key]) => <NavLink key={to} to={to} className={({ isActive }) => `glow-nav-btn ${isActive ? "active" : ""}`}>{t(key)}</NavLink>)}
          </nav>
        </div>
      </div>
    </header>
  );
}
