import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "./AuthContext";
import {
  EMPTY_PROFILE,
  clearSubscriberProfile,
  getSubscriberProfile,
  saveSubscriberProfile,
  updateSubscriberTier,
  updateSubscriberEntitlement,
  restoreSubscriberProfile,
  listRecoverableLocalProfiles,
} from "../utilities/profileStorage";
import { downloadWellnessData, hasCloudProfileRecord, hasMeaningfulProfile, subscribeWellnessData, uploadWellnessData } from "../utilities/cloudSync";
import { notifyCloudRestore } from "../utilities/cloudChange";
import { getSavedRecipes, restoreSavedRecipes } from "../utilities/recipeStorage";
import { getWellnessJourney, restoreWellnessJourney } from "../utilities/wellnessJourney";
import { getMRVIProfile, restoreMRVIProfile } from "../utilities/mrviStorage";
import { getKitchenInventory, restoreKitchenInventory } from "../utilities/kitchenInventory";
import { getMealKitchenInventory, restoreMealKitchenInventory } from "../utilities/mealKitchenInventory";
import { getWellnessExchange, restoreWellnessExchange } from "../utilities/wellnessExchange";
import { getAstraConversationBundle, restoreAstraConversation } from "../utilities/astraConversationStorage";

const SubscriberContext = createContext(null);
const announceDataReady = () => {
  window.__naturesElixirzDataReady = true;
  window.dispatchEvent(new CustomEvent("naturesElixirz:data-ready"));
};

export function SubscriberProvider({ children }) {
  const { user, loading } = useAuth();
  const storageScope = loading ? "pending" : user?.uid || "guest";
  useEffect(() => {
    if (!loading && !user) announceDataReady();
  }, [loading, user]);
  return <ScopedSubscriberProvider key={storageScope} storageScope={storageScope} user={user}>{children}</ScopedSubscriberProvider>;
}

function ScopedSubscriberProvider({ children, storageScope, user }) {
  const [profile, setProfile] = useState(() => storageScope === "pending" ? { ...EMPTY_PROFILE } : getSubscriberProfile(storageScope));
  const hydrated = useRef(false);

  useEffect(() => {
    if (!user || storageScope === "pending") return undefined;
    let active = true;
    let timer;
    let unsubscribe = () => {};
    let applyingRemote = false;

    const localBundle = (scope) => ({
      profile: getSubscriberProfile(scope),
      recipes: getSavedRecipes(scope),
      journey: getWellnessJourney(scope),
      movement: getMRVIProfile(scope),
      kitchen: getKitchenInventory(scope),
      mealKitchen: getMealKitchenInventory(scope),
      exchange: getWellnessExchange(scope),
      astraConversation: getAstraConversationBundle(scope),
    });
    const hasLocalData = (bundle) => Boolean(
      hasCloudProfileRecord(bundle.profile)
      || bundle.recipes.length
      || Object.keys(bundle.journey).length
      || bundle.movement?.createdAt
      || bundle.movement?.baseline
      || bundle.movement?.scans?.length
      || [...bundle.kitchen.pantry, ...bundle.kitchen.fridge, ...bundle.kitchen.freezer].length
      || [...bundle.mealKitchen.pantry, ...bundle.mealKitchen.fridge, ...bundle.mealKitchen.freezer].length
      || bundle.exchange?.events?.length
      || bundle.astraConversation?.messages?.length
    );
    const snapshot = () => {
      const local = localBundle(storageScope);
      return uploadWellnessData(user, local.profile, local.recipes, local.journey, local.movement, local.kitchen, local.mealKitchen, local.exchange, local.astraConversation);
    };

    const applyCloud = (cloud) => {
      if (!active) return;
      applyingRemote = true;
      if (hasCloudProfileRecord(cloud.profile)) setProfile(restoreSubscriberProfile(cloud.profile, storageScope));
      if (cloud.journey) restoreWellnessJourney(cloud.journey, storageScope);
      if (cloud.movement) restoreMRVIProfile(cloud.movement, storageScope);
      if (cloud.kitchen) restoreKitchenInventory(cloud.kitchen, storageScope);
      if (cloud.mealKitchen) restoreMealKitchenInventory(cloud.mealKitchen, storageScope);
      if (cloud.exchange) restoreWellnessExchange(cloud.exchange, storageScope);
      if (cloud.astraConversation) restoreAstraConversation(cloud.astraConversation, storageScope);
      restoreSavedRecipes(cloud.recipes, storageScope);
      notifyCloudRestore(storageScope);
      queueMicrotask(() => { applyingRemote = false; });
    };

    const hydrate = async () => {
      try {
        const cloud = await downloadWellnessData(user);
        if (!active) return;
        const hasCloud = hasLocalData({
          profile: cloud.profile || {},
          recipes: cloud.recipes || [],
          journey: cloud.journey || {},
          movement: cloud.movement || {},
          kitchen: cloud.kitchen || { pantry: [], fridge: [], freezer: [] },
          mealKitchen: cloud.mealKitchen || { pantry: [], fridge: [], freezer: [] },
          exchange: cloud.exchange || { signals: {}, events: [], memories: {} },
          astraConversation: cloud.astraConversation || { messages: [] },
        });
        if (hasCloud) {
          applyCloud(cloud);
          // A previously cleared account can later be explicitly recovered. Once
          // meaningful profile data exists, remove the obsolete clearing marker
          // from the canonical cloud copy so new devices see one unambiguous state.
          if (hasMeaningfulProfile(cloud.profile) && cloud.profile?.clearedAt) await snapshot();
          if (!hasMeaningfulProfile(cloud.profile)) {
            const accountProfile = getSubscriberProfile(storageScope);
            const guestProfile = getSubscriberProfile("guest");
            const recoveryProfile = hasMeaningfulProfile(accountProfile) ? accountProfile : hasMeaningfulProfile(guestProfile) ? guestProfile : null;
            if (recoveryProfile) {
              setProfile(restoreSubscriberProfile(recoveryProfile, storageScope));
              await snapshot();
            }
          }
        } else {
          const accountLocal = localBundle(storageScope);
          const guestLocal = localBundle("guest");
          const possibleCrossAccountCopy = hasMeaningfulProfile(accountLocal.profile)
            && listRecoverableLocalProfiles(storageScope).some((candidate) => (
              candidate.sourceScope !== "guest" && !candidate.legacy
              && candidate.displayName.toLowerCase() === String(accountLocal.profile.name || "").trim().toLowerCase()
            ));
          if (!hasLocalData(accountLocal) && hasLocalData(guestLocal)) {
            setProfile(restoreSubscriberProfile(guestLocal.profile, storageScope));
            restoreWellnessJourney(guestLocal.journey, storageScope);
            restoreMRVIProfile(guestLocal.movement, storageScope);
            restoreKitchenInventory(guestLocal.kitchen, storageScope);
            restoreMealKitchenInventory(guestLocal.mealKitchen, storageScope);
            restoreWellnessExchange(guestLocal.exchange, storageScope);
            restoreAstraConversation(guestLocal.astraConversation, storageScope);
            restoreSavedRecipes(guestLocal.recipes, storageScope);
            notifyCloudRestore(storageScope);
          }
          // Never upload a profile that also exists under another local account scope.
          // CloudSyncPanel requires the subscriber to review and explicitly confirm it.
          if (!possibleCrossAccountCopy) await snapshot();
        }
        hydrated.current = true;
        unsubscribe = subscribeWellnessData(user, applyCloud, (error) => console.error("Live subscriber synchronization failed.", error));
      } catch (error) {
        console.error("Automatic subscriber synchronization failed.", error);
      } finally {
        if (active) announceDataReady();
      }
    };

    const onChange = (event) => {
      if (!hydrated.current || applyingRemote || event.detail?.scope !== storageScope) return;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => snapshot().catch((error) => console.error("Background subscriber synchronization failed.", error)), 700);
    };
    window.addEventListener("naturesElixirz:data-changed", onChange);
    hydrate();
    return () => { active = false; unsubscribe(); window.clearTimeout(timer); window.removeEventListener("naturesElixirz:data-changed", onChange); };
  }, [storageScope, user]);
  const saveProfile = useCallback((next) => {
    const saved = saveSubscriberProfile(next, storageScope);
    setProfile(saved);
    return saved;
  }, [storageScope]);
  const setTier = useCallback((tier) => {
    setProfile((current) => updateSubscriberTier(current, tier, storageScope));
  }, [storageScope]);
  const setEntitlement = useCallback((entitlement) => {
    setProfile((current) => updateSubscriberEntitlement(current, entitlement, storageScope));
  }, [storageScope]);
  const resetProfile = useCallback(() => {
    clearSubscriberProfile(storageScope);
    setProfile({ ...EMPTY_PROFILE });
  }, [storageScope]);

  const value = useMemo(() => ({
    profile,
    isOnboarded: Boolean(profile.completedAt),
    saveProfile,
    setTier,
    setEntitlement,
    resetProfile,
  }), [profile, saveProfile, setTier, setEntitlement, resetProfile]);

  return <SubscriberContext.Provider value={value}>{children}</SubscriberContext.Provider>;
}

export function useSubscriber() {
  const context = useContext(SubscriberContext);
  if (!context) throw new Error("useSubscriber must be used inside SubscriberProvider");
  return context;
}
