import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AudioLines, CreditCard, Crown, GlassWater, PersonStanding, RefreshCcw, Sparkles, UtensilsCrossed } from "lucide-react";
import { tiers } from "../data/premiumData";
import GlowNav from "../components/GlowNav";
import { useSubscriber } from "../context/SubscriberContext";
import { useAuth } from "../context/AuthContext";
import { openCustomerBillingPortal, recoverSubscriptionEntitlement, startSubscriptionCheckout } from "../utilities/checkout";
import "../styles/premiumPortal.css";
import "../styles/premiumGateway.css";
import "../styles/membershipConsole.css";

const realmPortals = [
  { id: 1, name: "Blend", realm: "Elixir Laboratory", icon: GlassWater, image: "/assets/cosmic-elixir-lab.png" },
  { id: 2, name: "Resonate", realm: "Astroplane Observatory", icon: AudioLines, image: "/assets/resonate-astroplanes-v2.png" },
  { id: 3, name: "Nourish", realm: "Nourishment Grove", icon: UtensilsCrossed, image: "/assets/nourishment-grove-v2.png" },
  { id: 4, name: "Whole Life", realm: "Flow Sanctuary", icon: PersonStanding, image: "/assets/celestial-flow-sanctuary.png" },
  { id: 5, name: "V.I.P.", realm: "Longevity Convergence", icon: Crown, image: "/assets/vip-longevity-convergence.png" },
];

export default function PremiumPortal() {
  const { profile, setTier, setEntitlement } = useSubscriber();
  const { user, configured } = useAuth();
  const [params] = useSearchParams();
  const [billingMode, setBillingMode] = useState("monthly");
  const [checkoutMessage, setCheckoutMessage] = useState("");
  const activeMembership = ["active", "trialing"].includes(profile.subscriptionStatus);
  const hasStripeBilling = profile.subscriptionAccessSource === "stripe";

  const recoverMembership = async (automatic = false) => {
    if (!user) return;
    if (!automatic) setCheckoutMessage("Checking Stripe and restoring your membership record…");
    try {
      const result = await recoverSubscriptionEntitlement();
      if (result?.entitlement) setEntitlement(result.entitlement);
      setCheckoutMessage(result?.recovered ? "Membership access is synchronized with Stripe." : result?.source === "beta-testing" ? "Your protected beta access is active." : "No active Stripe subscription was found for this account.");
    } catch (error) {
      setCheckoutMessage(error?.message || "Membership recovery could not finish. Please try again.");
    }
  };

  useEffect(() => {
    const returnedFromBilling = params.get("checkout") === "success" || params.get("portal") === "return";
    if (user && returnedFromBilling) recoverMembership(true);
  }, [user]);

  const manageBilling = async () => {
    setCheckoutMessage("");
    try { await openCustomerBillingPortal(); }
    catch (error) { setCheckoutMessage(error?.message || "Billing management could not open. Please try again."); }
  };

  const chooseTier = async (tier) => {
    setCheckoutMessage("");
    if (!configured) {
      setTier(tier.id);
      setCheckoutMessage(`Tier ${tier.id} selected for checkout preview. Personalized tools remain locked until a verified subscription is active.`);
      return;
    }
    if (!user) {
      setCheckoutMessage("Sign in from the Profile page before starting a subscription.");
      return;
    }
    if (activeMembership && hasStripeBilling) {
      await manageBilling();
      return;
    }
    try {
      await startSubscriptionCheckout(tier.id, billingMode);
    } catch (error) {
      const code = String(error?.code || "");
      if (code.includes("failed-precondition")) {
        setCheckoutMessage(error?.message || "Verify your email before starting checkout.");
      } else if (code.includes("unauthenticated")) {
        setCheckoutMessage("Your sign-in session expired. Sign in again from the Profile page.");
      } else if (code.includes("invalid-argument")) {
        setCheckoutMessage("That subscription selection is unavailable. Please choose the tier again.");
      } else {
        setCheckoutMessage(error?.message || "Checkout could not start. Please try again.");
      }
    }
  };

  return (
    <div className="cosmic-page-shell">
      <GlowNav />
      <section className="portal-hero">
        <div className="portal-hero__stars" />
        <div className="portal-hero__nebula portal-hero__nebula--one" />
        <div className="portal-hero__nebula portal-hero__nebula--two" />
        <div className="portal-hero__content">
          <p className="portal-eyebrow"><span className="notranslate" translate="no">Nature&apos;s Elixirz OS</span> · Multiverse Access</p>
          <h1>Choose Your Cosmic Wellness Dimension</h1>
          <p>Five realms. One evolving journey from foundational nourishment to the V.I.P. Longevity Circle.</p>
          <div className="realm-gateway" aria-label="Explore all five membership dimensions">
            <div className="gateway-path path-one" aria-hidden="true" />
            <div className="gateway-path path-two" aria-hidden="true" />
            {realmPortals.map(({ id, name, realm, icon: Icon, image }) => <a className={`gateway-realm gateway-realm--${id}`} href={`#tier-${id}`} key={id} style={{ "--gateway-image": `url("${image}")` }}>
              <span className="gateway-window"><i><Icon size={18} /></i><b>{String(id).padStart(2, "0")}</b></span>
              <strong>{name}</strong><small>{realm}</small>
            </a>)}
            <div className="gateway-core"><i /><i /><Sparkles size={24} /><strong>NE</strong><small>Your journey</small></div>
          </div>
          <a className="gateway-scroll" href="#membership-realms">Compare every dimension <span>↓</span></a>
        </div>
      </section>

      <main className="portal-main">
        <section className="portal-intro">
          <div><p className="portal-eyebrow">Your wellness constellation</p><h2>Each tier expands your universe</h2><p>Smoothies form the core. Frequency listening, meal planning, Tai Chi, movement reflection, and carefully reviewed longevity intelligence orbit around it as your membership grows.</p></div>
          <div className="portal-starting"><span>Launch from</span><strong>$15.99</strong><small>monthly · cancel anytime</small></div>
        </section>

        <section className="portal-billing" aria-label="Billing frequency">
          {["monthly", "yearly"].map((mode) => <button key={mode} onClick={() => setBillingMode(mode)} className={billingMode === mode ? "active" : ""} aria-pressed={billingMode === mode}>{mode === "monthly" ? "Monthly" : "Yearly"}</button>)}
        </section>
        {user && <section className="membership-console">
          <div><p className="portal-eyebrow">Membership control</p><h2>{activeMembership ? `Tier ${profile.tier} access is ${profile.subscriptionStatus}` : "Restore or manage your membership"}</h2><p>{profile.subscriptionCancelAtPeriodEnd ? "Cancellation is scheduled; access continues through the current paid period." : "Stripe securely handles payment methods, invoices, plan changes, and cancellation."}</p>{profile.subscriptionCurrentPeriodEnd && <small>Current billing period ends: {new Date(Number(profile.subscriptionCurrentPeriodEnd) * 1000).toLocaleDateString()}</small>}</div>
          <div>{hasStripeBilling && <button type="button" onClick={manageBilling}><CreditCard size={18} /> Manage billing &amp; cancellation</button>}<button type="button" onClick={() => recoverMembership(false)}><RefreshCcw size={17} /> Restore membership access</button></div>
        </section>}
        {checkoutMessage && <p className="portal-message" role="status">{checkoutMessage}</p>}

        <section className="tier-universe" id="membership-realms">
          {tiers.map((tier) => {
            const realm = realmPortals.find((portal) => portal.id === tier.id);
            return (
            <article id={`tier-${tier.id}`} key={tier.id} className={`tier-realm tier-realm--${tier.id} ${activeMembership && Number(profile.tier) === tier.id ? "is-current" : ""}`}>
              <div className="tier-realm__space" aria-hidden="true"><i /><i /><i /><b /></div>
              <div className="tier-realm__art" aria-hidden="true" style={{ backgroundImage: `url("${realm?.image}")` }} />
              <div className="tier-realm__number">0{tier.id}</div>
              {tier.popular && <span className="tier-realm__badge">MOST POPULAR</span>}
              {tier.vip && <span className="tier-realm__badge tier-realm__badge--vip">V.I.P. MULTIVERSE</span>}
              <div className="tier-realm__content">
                <p className="tier-realm__eyebrow">Tier {tier.id} · Dimension</p>
                <h3>{tier.name}</h3>
                <p className="tier-realm__tagline">{tier.tagline}</p>
                {tier.vip && <p className="tier-realm__founding">First 5,000 keep this founding rate while continuously active. Regular V.I.P. afterward: ${billingMode === "monthly" ? tier.monthly : tier.yearly}{billingMode === "monthly" ? "/month" : "/year"}. Household Circle is included for every V.I.P.</p>}
                <div className="tier-realm__price">${tier.vip ? (billingMode === "monthly" ? tier.foundingMonthly : tier.foundingYearly) : (billingMode === "monthly" ? tier.monthly : tier.yearly)}<span>{tier.vip ? " founding rate" : ""}{billingMode === "monthly" ? " / month" : " / year"}</span></div>
                <ul className="tier-realm__features">{tier.features.map((feature) => <li key={feature}><span>✦</span>{feature}</li>)}</ul>
                <button onClick={() => chooseTier(tier)} className="tier-realm__button">{activeMembership && Number(profile.tier) === tier.id ? (hasStripeBilling ? "Manage Current Dimension" : "Current Dimension") : activeMembership && hasStripeBilling ? "Change in Billing Portal" : `Enter Dimension ${tier.id}`}</button>
              </div>
            </article>
          )})}
        </section>
      </main>
    </div>
  );
}
