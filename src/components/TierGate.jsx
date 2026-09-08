import React from "react";
import { Link } from "react-router-dom";
import { useSubscriber } from "../context/SubscriberContext";
import { useTierAccess } from "./TierPreviewBanner";

export default function TierGate({ minimum, name, children }) {
  const { profile } = useSubscriber();
  const unlocked = useTierAccess(minimum);
  if (unlocked) return children;
  return (
    <div className="cosmic-page-shell">
      <main className="ne-page">
        <div className="ne-panel text-center">
          <p className="ne-kicker">Tier {minimum} experience</p>
          <h1>{name}</h1>
          <p className="ne-muted">Your current Tier {profile.tier || 1} plan does not include this experience.</p>
          <Link className="ne-primary inline-block mt-5" to="/premium">Explore subscription tiers</Link>
        </div>
      </main>
    </div>
  );
}
