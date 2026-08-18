import React from "react";
import { Link } from "react-router-dom";
import { useSubscriber } from "../context/SubscriberContext";
import "./TierPreviewBanner.css";
import { profileHasKernelAccess } from "../utilities/kernelEntitlements";

// Local Vite development is the developer sandbox. This branch is removed from
// production builds because import.meta.env.DEV is statically false there.
export function useDeveloperAccess() {
  return import.meta.env.DEV;
}

export function useTierAccess(minimum) {
  const { profile } = useSubscriber();
  return useDeveloperAccess()
    || (["active", "trialing"].includes(profile.subscriptionStatus) && Number(profile.tier) >= minimum);
}

export function useKernelAccess(kernelId) {
  const { profile } = useSubscriber();
  return useDeveloperAccess() || profileHasKernelAccess(profile, kernelId);
}

export default function TierPreviewBanner({ minimum, kernel, children }) {
  const tierUnlocked = useTierAccess(minimum);
  const kernelUnlocked = useKernelAccess(kernel);
  const unlocked = kernel ? kernelUnlocked : tierUnlocked;
  return unlocked ? null : <div className="ne-preview-banner"><div><strong>Tier {minimum} preview</strong><span>{children || "Explore this realm. Personalized generation and saving unlock with membership."}</span></div><Link to="/premium">Unlock this dimension</Link></div>;
}
