import React, { useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useSubscriber } from "../context/SubscriberContext";
import { getSavedRecipes, restoreSavedRecipes } from "../utilities/recipeStorage";
import { notifyCloudRestore } from "../utilities/cloudChange";
import { downloadWellnessData, uploadWellnessData } from "../utilities/cloudSync";
import { getWellnessJourney, restoreWellnessJourney } from "../utilities/wellnessJourney";
import { getMRVIProfile, restoreMRVIProfile } from "../utilities/mrviStorage";
import { getKitchenInventory, restoreKitchenInventory } from "../utilities/kitchenInventory";
import { getMealKitchenInventory, restoreMealKitchenInventory } from "../utilities/mealKitchenInventory";
import { getWellnessExchange, restoreWellnessExchange } from "../utilities/wellnessExchange";
import { EMPTY_PROFILE, listRecoverableLocalProfiles } from "../utilities/profileStorage";
import { hasMeaningfulProfile } from "../utilities/cloudSync";

const mergeItems = (left = [], right = []) => [...new Map([...left, ...right].map((item) => [String(item).trim().toLowerCase(), String(item).trim()])).values()].filter(Boolean);
const mergeInventory = (current, shared) => ({
  pantry: mergeItems(current?.pantry, shared?.pantry),
  fridge: mergeItems(current?.fridge, shared?.fridge),
  freezer: mergeItems(current?.freezer, shared?.freezer),
});
const inventoryCount = (inventory) => ["pantry", "fridge", "freezer"].reduce((total, zone) => total + (inventory?.[zone]?.length || 0), 0);

export default function CloudSyncPanel() {
  const { user, configured, signOut } = useAuth();
  const { profile, saveProfile, resetProfile } = useSubscriber();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [recoveryRevision, setRecoveryRevision] = useState(0);
  const [candidateToReview, setCandidateToReview] = useState(null);
  const [removalToReview, setRemovalToReview] = useState(null);
  const [kitchenToReview, setKitchenToReview] = useState(null);
  const localCandidates = useMemo(() => listRecoverableLocalProfiles(user?.uid), [user?.uid, recoveryRevision]);
  const recoveryCandidates = hasMeaningfulProfile(profile) ? [] : localCandidates;
  const matchingSource = hasMeaningfulProfile(profile)
    ? localCandidates.find((candidate) => candidate.sourceScope !== "guest" && !candidate.legacy
      && candidate.displayName.toLowerCase() === String(profile.name || "").trim().toLowerCase())
    : null;
  const householdKitchenCandidates = hasMeaningfulProfile(profile) ? localCandidates.map((candidate) => {
    const smoothieKitchen = getKitchenInventory(candidate.sourceScope);
    const mealKitchen = getMealKitchenInventory(candidate.sourceScope);
    return { ...candidate, smoothieKitchen, mealKitchen, kitchenItemCount: inventoryCount(smoothieKitchen), mealItemCount: inventoryCount(mealKitchen) };
  }).filter((candidate) => candidate.displayName.toLowerCase() !== String(profile.name || "").trim().toLowerCase()
    && candidate.kitchenItemCount + candidate.mealItemCount > 0) : [];

  const recoverLocalProfile = async (candidate) => {
    setBusy(true); setMessage("");
    try {
      const sourceScope = candidate.sourceScope;
      const recipes = getSavedRecipes(sourceScope);
      const journey = getWellnessJourney(sourceScope);
      const movement = getMRVIProfile(sourceScope);
      const kitchen = getKitchenInventory(sourceScope);
      const mealKitchen = getMealKitchenInventory(sourceScope);
      const exchange = getWellnessExchange(sourceScope);
      const recoveredProfile = saveProfile(candidate.profile);
      restoreSavedRecipes(recipes, user.uid);
      restoreWellnessJourney(journey, user.uid);
      restoreMRVIProfile(movement, user.uid);
      restoreKitchenInventory(kitchen, user.uid);
      restoreMealKitchenInventory(mealKitchen, user.uid);
      restoreWellnessExchange(exchange, user.uid);
      await uploadWellnessData(user, recoveredProfile, recipes, journey, movement, kitchen, mealKitchen, exchange);
      notifyCloudRestore(user.uid);
      setRecoveryRevision((value) => value + 1);
      setMessage(`${candidate.displayName}'s workstation profile and Kernel data were recovered to ${user.email} and synchronized. The original local copy remains as a backup.`);
      setCandidateToReview(null);
    } catch {
      setMessage("Recovery was unsuccessful. The original workstation copy was not changed; please try again.");
    } finally {
      setBusy(false);
    }
  };

  const undoCopiedProfile = async (candidate) => {
    setBusy(true); setMessage("");
    try {
      const clearedProfile = { ...EMPTY_PROFILE, clearedAt: new Date().toISOString() };
      resetProfile();
      restoreSavedRecipes([], user.uid);
      const journey = restoreWellnessJourney({}, user.uid);
      const movement = restoreMRVIProfile({ consent: false, createdAt: null, baseline: null, scans: [] }, user.uid);
      const kitchen = restoreKitchenInventory({}, user.uid);
      const mealKitchen = restoreMealKitchenInventory({}, user.uid);
      const exchange = restoreWellnessExchange({}, user.uid);
      await uploadWellnessData(user, clearedProfile, [], journey, movement, kitchen, mealKitchen, exchange);
      notifyCloudRestore(user.uid);
      setRemovalToReview(null);
      setRecoveryRevision((value) => value + 1);
      setMessage(`${candidate.displayName}'s copied data were removed from ${user.email}. The original profile remains safely stored under its source account.`);
    } catch {
      setMessage("The copied-data removal was unsuccessful. Please do not synchronize this account; try again.");
    } finally {
      setBusy(false);
    }
  };

  const importHouseholdKitchen = async (candidate) => {
    setBusy(true); setMessage("");
    try {
      const kitchen = restoreKitchenInventory(mergeInventory(getKitchenInventory(user.uid), candidate.smoothieKitchen), user.uid);
      const mealKitchen = restoreMealKitchenInventory(mergeInventory(getMealKitchenInventory(user.uid), candidate.mealKitchen), user.uid);
      await uploadWellnessData(user, profile, getSavedRecipes(user.uid), getWellnessJourney(user.uid), getMRVIProfile(user.uid), kitchen, mealKitchen, getWellnessExchange(user.uid));
      notifyCloudRestore(user.uid);
      setKitchenToReview(null);
      setMessage(`Shared household kitchen imported from ${candidate.displayName}: ${inventoryCount(kitchen)} Smoothie Kitchen items and ${inventoryCount(mealKitchen)} Meal Plan Kitchen items are now synchronized to ${user.email}. No personal profile data were copied.`);
    } catch {
      setMessage("The household pantry import was unsuccessful. No personal profile information was copied; please try again.");
    } finally {
      setBusy(false);
    }
  };

  const run = async (mode) => {
    setBusy(true); setMessage("");
    try {
      if (mode === "upload") {
        await uploadWellnessData(user, profile, getSavedRecipes(user.uid), getWellnessJourney(user.uid), getMRVIProfile(user.uid), getKitchenInventory(user.uid), getMealKitchenInventory(user.uid), getWellnessExchange(user.uid));
        setMessage("Profile, recipes, journey selections, and numeric movement history were synchronized to your private account path.");
      } else {
        const cloud = await downloadWellnessData(user);
        if (cloud.profile) saveProfile(cloud.profile);
        if (cloud.journey) restoreWellnessJourney(cloud.journey, user.uid);
        if (cloud.movement) restoreMRVIProfile(cloud.movement, user.uid);
        if (cloud.kitchen) restoreKitchenInventory(cloud.kitchen, user.uid);
        if (cloud.mealKitchen) restoreMealKitchenInventory(cloud.mealKitchen, user.uid);
        if (cloud.exchange) restoreWellnessExchange(cloud.exchange, user.uid);
        restoreSavedRecipes(cloud.recipes, user.uid);
        notifyCloudRestore(user.uid);
        setMessage("Cloud profile, pantries, recipes, journey, and movement data restored to this device.");
      }
    } catch {
      setMessage("Synchronization was unsuccessful. Confirm Firebase setup and try again.");
    } finally {
      setBusy(false);
    }
  };

  if (!configured || !user) return null;
  return <div className="space-y-3"><p className="ne-muted">Signed in as {user.email}. Syncing may include health conditions, medication text, wellness selections, saved recipes, and numeric movement metrics. Raw camera video is never included. Choose an action only if you consent to cloud storage.</p>{matchingSource && <section className="ne-alert ne-alert-danger"><strong>Possible profile copied from another account</strong><p>This signed-in account currently contains {matchingSource.displayName}&apos;s information, and the original workstation copy still exists. Only remove it if this is the wrong person for {user.email}.</p>{removalToReview ? <div><p><strong>Confirm removal:</strong> remove the copied profile, Kernel history, pantry, and saved recipes from {user.email}? The original {matchingSource.displayName} copy will not be deleted.</p><div className="flex flex-wrap gap-2"><button disabled={busy} type="button" className="ne-primary" onClick={() => undoCopiedProfile(removalToReview)}>Yes, remove copied data</button><button disabled={busy} type="button" className="ne-secondary" onClick={() => setRemovalToReview(null)}>Back</button></div></div> : <button disabled={busy} type="button" className="ne-secondary" onClick={() => setRemovalToReview(matchingSource)}>Review removal of {matchingSource.displayName}&apos;s copied data</button>}</section>}{recoveryCandidates.length > 0 && <section className="ne-alert" aria-labelledby="local-profile-recovery"><strong id="local-profile-recovery">Profiles found on this workstation</strong><p className="ne-muted">Review the matching person before anything is copied. The original copy remains as a backup.</p><div className="flex flex-wrap gap-2">{recoveryCandidates.map((candidate) => <button disabled={busy} type="button" className="ne-secondary" key={candidate.storageKey} onClick={() => setCandidateToReview(candidate)}>Review {candidate.displayName} ({candidate.fieldCount} saved areas)</button>)}</div>{candidateToReview && <div className="ne-alert"><p><strong>Confirm recovery:</strong> copy {candidateToReview.displayName}&apos;s {candidateToReview.fieldCount} saved profile areas and associated Kernel data into {user.email}?</p><div className="flex flex-wrap gap-2"><button disabled={busy} type="button" className="ne-primary" onClick={() => recoverLocalProfile(candidateToReview)}>Yes, recover this profile</button><button disabled={busy} type="button" className="ne-secondary" onClick={() => setCandidateToReview(null)}>Back</button></div></div>}</section>}{householdKitchenCandidates.length > 0 && <section className="ne-alert"><strong>Shared household kitchen</strong><p className="ne-muted">Import Pantry, Fridge, and Freezer items from another household member. Existing items are kept. Personal profiles, health information, recipes, and activity history are never included.</p>{householdKitchenCandidates.map((candidate) => <div key={`kitchen-${candidate.storageKey}`}>{kitchenToReview?.storageKey === candidate.storageKey ? <div className="ne-alert"><p><strong>Confirm household import:</strong> merge {candidate.kitchenItemCount} Smoothie Kitchen items and {candidate.mealItemCount} Meal Plan Kitchen items from {candidate.displayName} into {profile.name || user.email}&apos;s account?</p><div className="flex flex-wrap gap-2"><button disabled={busy} type="button" className="ne-primary" onClick={() => importHouseholdKitchen(candidate)}>Yes, import household pantry</button><button disabled={busy} type="button" className="ne-secondary" onClick={() => setKitchenToReview(null)}>Back</button></div></div> : <button disabled={busy} type="button" className="ne-secondary" onClick={() => setKitchenToReview(candidate)}>Review kitchen import from {candidate.displayName}</button>}</div>)}</section>}<div className="flex flex-wrap gap-2"><button disabled={busy} type="button" className="ne-primary" onClick={() => run("upload")}>Sync this device to cloud</button><button disabled={busy} type="button" className="ne-secondary" onClick={() => run("download")}>Restore from cloud</button><button type="button" className="ne-secondary" onClick={signOut}>Sign out</button></div>{message && <p aria-live="polite">{message}</p>}</div>;
}
