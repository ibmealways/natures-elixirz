import { collection, doc, getDoc, getDocs, onSnapshot, serverTimestamp, writeBatch } from "firebase/firestore";
import { db } from "../firebase";

function requireCloud(user) {
  if (!db || !user) throw new Error("A configured Firebase account is required.");
}

export const hasMeaningfulProfile = (profile = {}) => Boolean(
  profile.name || profile.age || profile.weight || profile.height || profile.healthGoals?.length
  || profile.conditions?.length || profile.otherHealthConditions || profile.surgicalHistory || profile.medications || profile.allergies || profile.avoidIngredients
  || profile.tobacco?.types?.length || profile.tobacco?.quantity
  || profile.alcohol?.types?.length || profile.alcohol?.quantity
);

// A clearing marker is meaningful synchronization state even though it contains no wellness values.
export const hasCloudProfileRecord = (profile = {}) => Boolean(profile?.clearedAt || hasMeaningfulProfile(profile));

export async function uploadWellnessData(user, profile, recipes, journey = {}, movement = {}, kitchen = {}, mealKitchen = {}, exchange = {}, astraConversation = {}, nutritionLabels = null, kernelSessions = null) {
  requireCloud(user);
  const batch = writeBatch(db);
  const userRef = doc(db, "users", user.uid);
  const currentAccount = await getDoc(userRef);
  const remoteProfile = currentAccount.exists() ? currentAccount.data().profile : null;
  const protectedProfile = !hasMeaningfulProfile(profile) && !profile?.clearedAt && hasMeaningfulProfile(remoteProfile)
    ? remoteProfile
    : profile;
  const wellnessProfile = Object.fromEntries(Object.entries(protectedProfile || {})
    .filter(([key]) => key !== "tier" && !key.startsWith("subscription")));
  const accountData = { profile: wellnessProfile, journey, movement, kitchen, mealKitchen, exchange, astraConversation, email: user.email, updatedAt: serverTimestamp() };
  if (Array.isArray(nutritionLabels)) accountData.nutritionLabels = nutritionLabels;
  if (kernelSessions && typeof kernelSessions === "object") accountData.kernelSessions = kernelSessions;
  batch.set(userRef, accountData, { merge: true });
  const safeRecipes = Array.isArray(recipes) ? recipes.filter((recipe) => recipe?.id) : [];
  const remoteRecipes = await getDocs(collection(userRef, "recipes"));
  const localIds = new Set(safeRecipes.map((recipe) => recipe.id));
  remoteRecipes.docs.forEach((recipe) => {
    if (!localIds.has(recipe.id)) batch.delete(recipe.ref);
  });
  safeRecipes.forEach((recipe) => batch.set(doc(collection(userRef, "recipes"), recipe.id), { ...recipe, ownerId: user.uid }));
  await batch.commit();
}

export async function downloadWellnessData(user) {
  requireCloud(user);
  const userRef = doc(db, "users", user.uid);
  const [userSnapshot, recipesSnapshot] = await Promise.all([getDoc(userRef), getDocs(collection(userRef, "recipes"))]);
  return {
    profile: userSnapshot.exists() ? userSnapshot.data().profile : null,
    journey: userSnapshot.exists() ? userSnapshot.data().journey : null,
    movement: userSnapshot.exists() ? userSnapshot.data().movement : null,
    kitchen: userSnapshot.exists() ? userSnapshot.data().kitchen : null,
    mealKitchen: userSnapshot.exists() ? userSnapshot.data().mealKitchen : null,
    exchange: userSnapshot.exists() ? userSnapshot.data().exchange : null,
    astraConversation: userSnapshot.exists() ? userSnapshot.data().astraConversation : null,
    nutritionLabels: userSnapshot.exists() ? userSnapshot.data().nutritionLabels : null,
    kernelSessions: userSnapshot.exists() ? userSnapshot.data().kernelSessions : null,
    recipes: recipesSnapshot.docs.map((recipe) => recipe.data()),
  };
}

export async function getEntitlement(user) {
  requireCloud(user);
  const snapshot = await getDoc(doc(db, "users", user.uid, "private", "entitlement"));
  if (!snapshot.exists()) return { tier: 1, status: "inactive" };
  const entitlement = snapshot.data();
  const expired = entitlement.betaExpiresAt && Date.parse(entitlement.betaExpiresAt) <= Date.now();
  return expired ? { ...entitlement, tier: 0, status: "inactive", betaExpired: true } : entitlement;
}

export function subscribeEntitlement(user, onData, onError = console.error) {
  requireCloud(user);
  let expiryTimer;
  const entitlementRef = doc(db, "users", user.uid, "private", "entitlement");
  const unsubscribe = onSnapshot(entitlementRef, (snapshot) => {
    window.clearTimeout(expiryTimer);
    const entitlement = snapshot.exists() ? snapshot.data() : { tier: 0, status: "inactive" };
    const expiration = entitlement.betaExpiresAt ? Date.parse(entitlement.betaExpiresAt) : null;
    if (expiration && expiration <= Date.now()) {
      onData({ ...entitlement, tier: 0, status: "inactive", betaExpired: true });
      return;
    }
    onData(entitlement);
    if (expiration) {
      expiryTimer = window.setTimeout(() => onData({ ...entitlement, tier: 0, status: "inactive", betaExpired: true }), Math.min(expiration - Date.now() + 50, 2147483647));
    }
  }, onError);
  return () => { window.clearTimeout(expiryTimer); unsubscribe(); };
}

export function subscribeWellnessData(user, onData, onError = console.error) {
  requireCloud(user);
  const userRef = doc(db, "users", user.uid);
  let account = null;
  let recipes = [];
  let accountReady = false;
  let recipesReady = false;

  const publish = () => {
    if (!accountReady || !recipesReady) return;
    onData({
      profile: account?.profile || null,
      journey: account?.journey || null,
      movement: account?.movement || null,
      kitchen: account?.kitchen || null,
      mealKitchen: account?.mealKitchen || null,
      exchange: account?.exchange || null,
      astraConversation: account?.astraConversation || null,
      nutritionLabels: account?.nutritionLabels || null,
      kernelSessions: account?.kernelSessions || null,
      recipes,
    });
  };

  const unsubscribeAccount = onSnapshot(userRef, (snapshot) => {
    account = snapshot.exists() ? snapshot.data() : null;
    accountReady = true;
    publish();
  }, onError);
  const unsubscribeRecipes = onSnapshot(collection(userRef, "recipes"), (snapshot) => {
    recipes = snapshot.docs.map((recipe) => recipe.data());
    recipesReady = true;
    publish();
  }, onError);

  return () => {
    unsubscribeAccount();
    unsubscribeRecipes();
  };
}
