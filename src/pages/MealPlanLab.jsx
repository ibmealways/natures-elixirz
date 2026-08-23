import React, { useEffect, useMemo, useRef, useState } from "react";
import { httpsCallable } from "firebase/functions";
import { Link, useSearchParams } from "react-router-dom";
import { Activity, Apple, Bone, Brain, CalendarDays, Database, Dna, Droplets, Eye, Flame, GlassWater, HeartPulse, Leaf, LockKeyhole, MoonStar, Plus, Refrigerator, ShieldCheck, ShoppingBasket, Snowflake, Sparkles, Sun, Sunrise, Sunset, UtensilsCrossed, Warehouse, Waves, Wind, X } from "lucide-react";
import GlowNav from "../components/GlowNav";
import KernelFeedbackContract from "../components/KernelFeedbackContract";
import NutritionFactsRegistry from "../components/NutritionFactsRegistry";
import TierPreviewBanner, { useKernelAccess } from "../components/TierPreviewBanner";
import { useSubscriber } from "../context/SubscriberContext";
import { useAuth } from "../context/AuthContext";
import { functions } from "../firebase";
import { buildGroceryList, generateMealPlan } from "../utilities/mealPlanEngine";
import { getKitchenInventory } from "../utilities/kitchenInventory";
import { getMealKitchenInventory, getMealPlanningIngredients, saveMealKitchenInventory } from "../utilities/mealKitchenInventory";
import { buildGenerationContext } from "../utilities/generationContext";
import { buildKernelBrief, publishWellnessSignal, recordWellnessFeedback } from "../utilities/wellnessExchange";
import { getSuggestedGoal, getWellnessJourney, recordMealJourney, VALID_GOALS } from "../utilities/wellnessJourney";
import { formatQuantityText, getMeasurementSystem, saveMeasurementSystem } from "../utilities/measurements";
import { getAstraKernelTransfer } from "../utilities/astraKernelTransfer";
import { getKernelSession, saveKernelSession } from "../utilities/kernelSessionStorage";
import { assessClientNutritionRisk } from "../utilities/nutritionRiskScreen";
import { isHouseholdStapleIngredient, providerSearchUrl } from "../utilities/shoppingIntelligence";
import { dailyAllowanceComparison, mergeValidatedMealPlanSection, normalizeDailyNutrition, normalizeGroceryList, normalizeRestoredMealPlan, replacementForMealPlanSection, requestMealPlanSectionWithRetry } from "../utilities/mealPlanViewModel";
import "../styles/CosmicShell.css";
import "../styles/wellnessOS.css";
import "../styles/mealPlanStudio.css";
import "../styles/nutritionFutureVault.css";

const goals = [
  ["focus", "Brain & cognition", "Focus-supportive foods", Brain],
  ["cellular", "Cellular nourishment", "Colorful whole-food variety", Dna],
  ["heart", "Heart-supportive", "Produce-forward", HeartPulse],
  ["digestion", "Digestion", "Gentle routine", Leaf],
  ["liver", "Liver-supportive nutrition", "Fiber and produce variety", Leaf],
  ["kidney", "Kidney-aware nutrition", "Profile-sensitive choices", Droplets],
  ["lungs", "Lung-supportive nutrition", "Colorful antioxidant foods", Wind],
  ["eyes", "Eye-supportive nutrition", "Carotenoid-rich foods", Eye],
  ["bones", "Bone-supportive nutrition", "Calcium and protein pattern", Bone],
  ["muscles", "Muscle nourishment", "Protein and recovery fuel", Activity],
  ["joints", "Joint-supportive nutrition", "Whole-food fat and produce", Activity],
  ["skin", "Skin-supportive nutrition", "Protein, fluids, and produce", Sparkles],
  ["immune", "Immune nourishment", "Protein and micronutrient variety", ShieldCheck],
  ["blood", "Blood-building nutrition", "Iron, folate, and vitamin C foods", Droplets],
  ["nervous", "Nervous-system support", "Steady, balanced nourishment", Waves],
  ["metabolic", "Metabolic balance", "Fiber, protein, and steady fuel", Flame],
  ["energy", "Everyday energy", "Steady fuel", Sun],
  ["general", "Everyday nutrition", "Daily foundation", Apple],
];
const mealMoments = [
  { name: "Elixir", icon: GlassWater },
  { name: "Dawn", icon: Sunrise },
  { name: "Daylight", icon: Sun },
  { name: "Twilight", icon: Sunset },
  { name: "Moonlight", icon: MoonStar },
];
const mealCollageImages = [
  "/assets/smoothie-glass-visual-v1.png",
  "/assets/astra-gallery/breakfast-berry-oats.png",
  "/assets/astra-gallery/lunch-quinoa-bowl.png",
  "/assets/astra-gallery/snack-whole-food-plate.png",
  "/assets/astra-gallery/dinner-salmon.png",
];

function validateGeneratedPlanContract(plan, requestedDays) {
  if (!Array.isArray(plan) || plan.length !== requestedDays) {
    throw new Error(`Astra returned ${Array.isArray(plan) ? plan.length : 0} of ${requestedDays} requested days.`);
  }
  plan.forEach((day, index) => {
    if (Number(day?.day) !== index + 1 || !Array.isArray(day?.meals) || day.meals.length !== 5) {
      throw new Error(`Day ${index + 1} did not satisfy the complete five-meal response contract.`);
    }
  });
  return plan;
}

export default function MealPlanLab() {
  const [params] = useSearchParams();
  const handoffSource = params.get("source") || "";
  const readStoredContext = (key) => {
    for (const storage of [sessionStorage, localStorage]) {
      try {
        const value = storage.getItem(key);
        if (value) return JSON.parse(value);
      } catch {
        // Ignore malformed or unavailable browser storage.
      }
    }
    return null;
  };
  const smoothieContext = readStoredContext("naturesElixirz.latestSmoothieContext");
  const smoothieFingerprint = smoothieContext?.recipeName ? JSON.stringify({
    recipeName: smoothieContext.recipeName,
    ingredients: (smoothieContext.ingredients || []).map(({ name, amount, unit }) => ({ name, amount, unit })),
  }) : "";
  const frequencyContext = handoffSource === "frequency"
    ? readStoredContext("naturesElixirz.latestFrequencyContext")
    : null;
  const { user } = useAuth();
  const { profile, isOnboarded } = useSubscriber();
  const storageScope = user?.uid || "guest";
  const restoredSession = useMemo(() => getKernelSession(storageScope, "meals"), [storageScope]);
  const astraTransfer = handoffSource === "astra" ? getAstraKernelTransfer(storageScope, "meal_plan") : null;
  const smoothieInventory = useMemo(() => getKitchenInventory(storageScope), [storageScope]);
  const [mealInventory, setMealInventory] = useState(() => getMealKitchenInventory(storageScope));
  const [measurementSystem, setMeasurementSystem] = useState(getMeasurementSystem);
  const [openInstructions, setOpenInstructions] = useState({});
  const [openIngredientSwap, setOpenIngredientSwap] = useState("");
  const [openKitchenZones, setOpenKitchenZones] = useState({ pantry: false, fridge: false, freezer: false });
  useEffect(() => {
    const refreshInventory = (event) => {
      if (event.detail?.scope === storageScope) setMealInventory(getMealKitchenInventory(storageScope));
    };
    window.addEventListener("naturesElixirz:data-restored", refreshInventory);
    return () => window.removeEventListener("naturesElixirz:data-restored", refreshInventory);
  }, [storageScope]);
  const [inventoryDrafts, setInventoryDrafts] = useState({ pantry: "", fridge: "", freezer: "" });
  const mealKitchenItems = useMemo(() => getMealPlanningIngredients(storageScope), [storageScope, smoothieInventory, mealInventory]);
  const generationContext = useMemo(() => buildGenerationContext(profile, { pantry: mealKitchenItems, fridge: [], freezer: [] }, buildKernelBrief(storageScope, "meals")), [profile, mealKitchenItems, storageScope]);
  const nutritionRisk = useMemo(() => assessClientNutritionRisk(profile), [profile]);
  const unlocked = useKernelAccess("meals");
  const requestedGoal = params.get("goal");
  const rememberedGoal = generationContext.kernelMemory?.goals?.at(-1);
  const [goal, setGoal] = useState(VALID_GOALS.includes(astraTransfer?.goal) ? astraTransfer.goal : VALID_GOALS.includes(requestedGoal) ? requestedGoal : restoredSession?.goal || rememberedGoal || getSuggestedGoal(storageScope) || profile.healthGoals?.[0] || "general");
  const [days, setDays] = useState(astraTransfer?.days || restoredSession?.days || 1);
  const [generationMode, setGenerationMode] = useState(restoredSession?.generationMode || "kitchen");
  const [planningMonth, setPlanningMonth] = useState(restoredSession?.planningMonth || 1);
  const yearlyPlanning = profile.subscriptionBillingMode === "yearly";
  const [generated, setGenerated] = useState(() => normalizeRestoredMealPlan(restoredSession?.generated));
  const [saved, setSaved] = useState(false);
  const [feedbackStatus, setFeedbackStatus] = useState("");
  const [collageDay, setCollageDay] = useState(0);
  const [mealVisuals, setMealVisuals] = useState({});
  const [visualStatus, setVisualStatus] = useState({});
  const [alternateIndex, setAlternateIndex] = useState(0);
  const restoredGenerationStatus = restoredSession?.generationStatus === "loading" ? "idle" : (restoredSession?.generationStatus || "idle");
  const [generationStatus, setGenerationStatus] = useState(restoredGenerationStatus);
  const [generationMessage, setGenerationMessage] = useState(restoredSession?.generationStatus === "loading" ? "The prior request ended before completion. Your last accepted plan is still available; start a new generation when ready." : (restoredSession?.generationMessage || ""));
  const [medicationSafety, setMedicationSafety] = useState(restoredSession?.medicationSafety || null);
  const [nutritionIntelligence, setNutritionIntelligence] = useState(restoredSession?.nutritionIntelligence || null);
  const dailyNutrition = normalizeDailyNutrition(nutritionIntelligence);
  const [stockedMessage, setStockedMessage] = useState("");
  const visualEpochRef = useRef(0);
  const planEpochRef = useRef(0);
  const acceptedPlanRef = useRef(generated);
  const autoHandoffStartedRef = useRef("");
  useEffect(() => {
    if (generated?.length && generationStatus === "ready") acceptedPlanRef.current = generated;
  }, [generated, generationStatus]);
  useEffect(() => {
    if (!nutritionRisk.generationLimited) return;
    setGenerated(null);
    setGenerationStatus("blocked");
    setGenerationMessage(nutritionRisk.message);
  }, [nutritionRisk.generationLimited, nutritionRisk.message]);
  useEffect(() => {
    saveKernelSession(storageScope, "meals", { goal, days, generationMode, planningMonth, generated, generationStatus, generationMessage, medicationSafety, nutritionIntelligence, smoothieRecipeName: smoothieContext?.recipeName || "", smoothieFingerprint });
  }, [storageScope, goal, days, generationMode, planningMonth, generated, generationStatus, generationMessage, medicationSafety, nutritionIntelligence, smoothieFingerprint]);
  const sample = useMemo(() => generateMealPlan(profile, goal, days, { kitchenItems: generationContext.kitchenItems, smoothieContext: handoffSource === "smoothie" ? smoothieContext : null }), [profile, goal, days, generationContext.kitchenItems, handoffSource, smoothieContext?.recipeName]);
  const generationHasNoDisplayablePlan = ["loading", "failed", "blocked"].includes(generationStatus) && !generated;
  const plan = generated || (generationHasNoDisplayablePlan ? [] : sample);
  const groceries = normalizeGroceryList(generated && generationStatus !== "ready"
    ? null
    : buildGroceryList(plan, generationContext.kitchenItems));
  const replacementOptions = useMemo(() => [...new Set([
    ...(generationContext.kitchenItems || []).map((item) => typeof item === "string" ? item : item?.name),
    ...(generated || []).flatMap((day) => day?.meals || []).flatMap((meal) => meal?.ingredients || []).map((item) => item?.name),
  ].filter(Boolean))].sort((a, b) => a.localeCompare(b)), [generationContext.kitchenItems, generated]);
  const selectedGoal = goals.find(([value]) => value === goal) || goals.find(([value]) => value === "general");
  const journey = getWellnessJourney(storageScope);
  const calendar = useMemo(() => {
    const subscriptionStart = profile.subscriptionCurrentPeriodStart ? new Date(Number(profile.subscriptionCurrentPeriodStart) * 1000) : new Date();
    const today = new Date(subscriptionStart);
    today.setMonth(today.getMonth() + planningMonth - 1);
    const year = today.getFullYear();
    const month = today.getMonth();
    const first = new Date(year, month, 1);
    const cells = [];
    for (let offset = 0; offset < first.getDay(); offset += 1) cells.push(null);
    for (let date = 1; date <= new Date(year, month + 1, 0).getDate(); date += 1) {
      const dateValue = new Date(year, month, date);
      const planIndex = Math.floor((dateValue - new Date(year, month, today.getDate())) / 86400000);
      cells.push({ date, isToday: date === today.getDate(), dayPlan: planIndex >= 0 ? plan[planIndex] : null });
    }
    while (cells.length % 7) cells.push(null);
    return { label: today.toLocaleDateString(undefined, { month: "long", year: "numeric" }), cells };
  }, [plan, planningMonth, profile.subscriptionCurrentPeriodStart]);

  function addInventoryItem(zone) {
    const value = inventoryDrafts[zone].trim();
    if (!value) return;
    const next = saveMealKitchenInventory({ ...mealInventory, [zone]: [...mealInventory[zone], value] }, storageScope);
    setMealInventory(next);
    setInventoryDrafts((current) => ({ ...current, [zone]: "" }));
    setGenerated(null);
  }

  function removeInventoryItem(zone, item) {
    const next = saveMealKitchenInventory({ ...mealInventory, [zone]: mealInventory[zone].filter((value) => value !== item) }, storageScope);
    setMealInventory(next);
    setGenerated(null);
  }

  function storageZoneForIngredient(item) {
    const value = String(item || "").toLowerCase();
    if (/frozen|ice\b/.test(value)) return "freezer";
    if (/egg|milk|yogurt|kefir|cheese|butter|cream|tofu|tempeh|spinach|lettuce|arugula|kale|broccoli|asparagus|mushroom|cucumber|pepper|avocado|fresh|salmon|tuna|fish|chicken|turkey|beef|steak|pork|meat/.test(value)) return "fridge";
    return "pantry";
  }

  function stockPurchasedIngredient(item) {
    const confirmed = window.confirm(
      `${item} is already on this plan's shopping list.\n\nSelect OK after purchasing it to add it to your kitchen. Select Cancel to leave it on the shopping list.`,
    );
    if (!confirmed) {
      setStockedMessage(`${item} remains on your shopping list.`);
      window.setTimeout(() => setStockedMessage(""), 3500);
      return;
    }

    try {
      const zone = storageZoneForIngredient(item);
      const zoneItems = Array.isArray(mealInventory?.[zone]) ? mealInventory[zone] : [];
      const itemKey = String(item || "").trim().toLowerCase();
      const alreadyStocked = zoneItems.some(
        (entry) => String(entry || "").trim().toLowerCase() === itemKey,
      );

      if (alreadyStocked) {
        setStockedMessage(`${item} is already in your ${zone}.`);
      } else {
        const next = saveMealKitchenInventory(
          { ...mealInventory, [zone]: [...zoneItems, item] },
          storageScope,
        );
        setMealInventory(next);
        setStockedMessage(`${item} was added to your ${zone}.`);
      }
    } catch (error) {
      console.error("Unable to add meal-plan ingredient to kitchen", error);
      setStockedMessage(`We couldn't update ${item}. Please retry.`);
    }
    window.setTimeout(() => setStockedMessage(""), 3500);
  }

  async function requestIngredientReplacement(day, meal, ingredient, replacement) {
    setOpenIngredientSwap("");
    if (!replacement || replacement === ingredient.name) return;
    await generate(Date.now() % 100000, goal, days, {
      day: Number(day.day),
      meal: meal.meal,
      dish: meal.food,
      ingredient: ingredient.name,
      replacement,
    });
  }

  async function generateVisuals(dayPlan, dayIndex) {
    if (!functions || !dayPlan?.meals?.length) return;
    const requestEpoch = visualEpochRef.current;
    setVisualStatus((current) => ({ ...current, [dayIndex]: "loading" }));
    try {
      const callable = httpsCallable(functions, "generateMealPlanVisuals", { timeout: 300000 });
      const result = await callable({ meals: dayPlan.meals });
      if (requestEpoch !== visualEpochRef.current) return;
      setMealVisuals((current) => ({ ...current, [dayIndex]: result.data.images }));
      setVisualStatus((current) => ({ ...current, [dayIndex]: "ready" }));
    } catch (error) {
      if (requestEpoch !== visualEpochRef.current) return;
      console.error("Meal visual generation failed", error);
      const message = String(error?.message || "Meal visuals could not be generated right now.")
        .replace(/^Firebase:\s*/i, "").replace(/\s*\(functions\/[a-z-]+\)\.?$/i, "");
      setVisualStatus((current) => ({ ...current, [dayIndex]: `error:${message}` }));
    }
  }

  function resetPlanVisuals() {
    visualEpochRef.current += 1;
    setCollageDay(0);
    setMealVisuals({});
    setVisualStatus({});
  }

  async function generate(variationSeed = 0, requestedNutritionGoal = goal, requestedDays = days, requestedReplacement = null) {
    if (!unlocked || !isOnboarded) return;
    if (nutritionRisk.generationLimited) {
      setGenerated(null);
      setGenerationStatus("blocked");
      setGenerationMessage(nutritionRisk.message);
      return;
    }
    const requestEpoch = planEpochRef.current + 1;
    const preservedPlan = acceptedPlanRef.current || generated;
    const assembledPlan = [];
    planEpochRef.current = requestEpoch;
    resetPlanVisuals();
    setGenerationStatus("loading");
    setNutritionIntelligence(null);
    setGenerationMessage(`Astra is building a ${goals.find(([value]) => value === requestedNutritionGoal)?.[1] || "personalized"} plan ${generationMode === "kitchen" ? "from your synchronized profile and kitchen inventory" : "from your synchronized profile with a complete shopping list"}.`);
    try {
      if (!functions) throw new Error("AI service is unavailable.");
      const callable = httpsCallable(functions, "generateSmartMealPlan", { timeout: 540000 });
      const baseRequest = {
        goal: requestedNutritionGoal,
        goalLabel: goals.find(([value]) => value === requestedNutritionGoal)?.[1] || requestedNutritionGoal,
        crossTierContext: {
          smoothie: smoothieContext ? {
            goal: smoothieContext.goal,
            selectedGoals: smoothieContext.selectedGoals,
            recipeName: smoothieContext.recipeName,
            ingredients: smoothieContext.ingredients,
            nutrition: smoothieContext.nutrition,
          } : null,
          frequency: frequencyContext ? {
            hz: frequencyContext.hz,
            title: frequencyContext.title,
            goal: frequencyContext.goal,
          } : null,
          frequencyIncludedBySubscriber: handoffSource === "frequency",
        },
        variationSeed,
        planningMonth,
        kitchenItems: generationMode === "kitchen" ? generationContext.kitchenItems : [],
        generationMode,
        learning: generationContext.learningProfile,
        astraRequest: astraTransfer ? { title: astraTransfer.title, ingredients: astraTransfer.ingredients, notes: astraTransfer.notes } : null,
        requestedReplacement,
      };
      const intelligenceSections = [];
      let latestMedicationSafety = null;
      let sectionStart = 1;
      while (sectionStart <= requestedDays) {
        const sectionDays = Math.min(3, requestedDays - sectionStart + 1);
        setGenerationMessage(`Astra is validating days ${sectionStart}-${sectionStart + sectionDays - 1} of ${requestedDays}. ${assembledPlan.length} validated day${assembledPlan.length === 1 ? " is" : "s are"} preserved.`);
        const currentSectionStart = sectionStart;
        const result = await requestMealPlanSectionWithRetry((sectionAttempt) => callable({
          ...baseRequest,
          variationSeed: variationSeed + sectionAttempt - 1,
          days: sectionDays,
          crossTierContext: {
            ...baseRequest.crossTierContext,
            smoothie: currentSectionStart === 1 ? baseRequest.crossTierContext.smoothie : null,
          },
          continuation: {
            startDay: currentSectionStart,
            totalDays: requestedDays,
            lockedMeals: assembledPlan.flatMap((day) => day.meals.map((meal) => `${meal.meal}: ${meal.food}`)),
          },
          requestedReplacement: replacementForMealPlanSection(requestedReplacement, currentSectionStart, sectionDays),
        }), {
          maximumAttempts: 3,
          onRetry: (_error, attempt, maximumAttempts) => {
            setGenerationStatus(assembledPlan.length ? "partial" : "loading");
            setGenerationMessage(`Days ${currentSectionStart}-${currentSectionStart + sectionDays - 1} need another targeted pass (${attempt + 1} of ${maximumAttempts}). ${assembledPlan.length} validated day${assembledPlan.length === 1 ? " remains" : "s remain"} preserved.`);
          },
        });
        if (requestEpoch !== planEpochRef.current) return;
        const mergedPlan = mergeValidatedMealPlanSection(assembledPlan, result.data?.plan, sectionStart, sectionDays);
        const section = mergedPlan.slice(assembledPlan.length);
        assembledPlan.push(...section);
        setGenerated([...assembledPlan]);
        setGenerationStatus(assembledPlan.length < requestedDays ? "partial" : "loading");
        setGenerationMessage(`Validated and preserved ${assembledPlan.length} of ${requestedDays} requested days.`);
        if (result.data?.nutritionIntelligence) intelligenceSections.push(result.data.nutritionIntelligence);
        latestMedicationSafety = result.data?.medicationSafety || latestMedicationSafety;
        sectionStart += section.length;
      }
      if (requestEpoch !== planEpochRef.current) return;
      const nextPlan = validateGeneratedPlanContract(assembledPlan, requestedDays);
      const nutritionSections = intelligenceSections.map((item) => item?.dailyNutrition).filter(Boolean);
      const combinedNutritionIntelligence = intelligenceSections.length ? {
        ...intelligenceSections[0],
        averageGoalFit: Math.round(intelligenceSections.reduce((sum, item) => sum + (Number(item.averageGoalFit) || 0) * (Number(item.mealsReviewed) || 0), 0) / Math.max(1, intelligenceSections.reduce((sum, item) => sum + (Number(item.mealsReviewed) || 0), 0))),
        mealsReviewed: intelligenceSections.reduce((sum, item) => sum + (Number(item.mealsReviewed) || 0), 0),
        professionalReviewRequired: intelligenceSections.some((item) => item.professionalReviewRequired),
        warnings: [...new Set(intelligenceSections.flatMap((item) => item.warnings || []))],
        dailyNutrition: nutritionSections.length ? {
          ...nutritionSections[0],
          days: nutritionSections.flatMap((item, sectionIndex) => (item.days || []).map((day) => ({ ...day, day: sectionIndex * 3 + Number(day.day || 1) }))),
        } : null,
      } : null;
      setGenerationStatus("saving");
      setGenerationMessage("Astra validated every requested day. Saving the accepted plan to this Kernel and your cross-device session.");
      setNutritionIntelligence(combinedNutritionIntelligence);
      setMedicationSafety(latestMedicationSafety);
      setGenerationStatus("ready");
      setGenerationMessage(`Validated AI plan created specifically for ${goals.find(([value]) => value === requestedNutritionGoal)?.[1] || requestedNutritionGoal}.`);
      setGenerated(nextPlan);
      acceptedPlanRef.current = nextPlan;
      recordMealJourney(requestedNutritionGoal, requestedDays, nextPlan, storageScope);
      publishWellnessSignal(storageScope, "meals", { goal: requestedNutritionGoal, duration: requestedDays, selection: `${requestedDays}-day nourishment plan` });
      setSaved(false);
      setFeedbackStatus("");
      generateVisuals(nextPlan[0], 0);
      window.setTimeout(() => document.querySelector("#meal-constellation")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    } catch (error) {
      if (requestEpoch !== planEpochRef.current) return;
      console.error("AI meal-plan generation failed", error);
      if (String(error?.code || "").includes("failed-precondition")) {
        setGenerated(preservedPlan || null);
        setGenerationStatus("blocked");
        setGenerationMessage(error?.message || "Generation is paused until clinician-established nutrition targets are saved.");
        return;
      }
      setGenerationStatus("failed");
      const recoverablePlan = assembledPlan.length ? assembledPlan : preservedPlan;
      setGenerated(recoverablePlan || null);
      setGenerationMessage(assembledPlan.length
        ? `Astra preserved ${assembledPlan.length} validated day${assembledPlan.length === 1 ? "" : "s"} from this request. Retry to continue the unfinished ${requestedDays}-day plan; no fallback meals were inserted.`
        : preservedPlan
        ? `The requested ${requestedDays}-day plan did not pass every safety, quantity, and culinary check. Your previously accepted ${preservedPlan.length}-day plan remains visible below; it is not a partial ${requestedDays}-day result.`
        : "Astra could not produce a plan that passed every safety, quantity, and culinary check. No substitute or template plan was created. Please retry; targeted validation findings will guide the next attempt.");
      return;
    }
  }

  useEffect(() => {
    const handoffIdentity = `smoothie:${smoothieFingerprint}`;
    if (handoffSource !== "smoothie" || !smoothieFingerprint || !unlocked || !isOnboarded || autoHandoffStartedRef.current === handoffIdentity) return;
    if (restoredSession?.generated?.length && restoredSession.smoothieFingerprint === smoothieFingerprint) {
      autoHandoffStartedRef.current = handoffIdentity;
      return;
    }
    autoHandoffStartedRef.current = handoffIdentity;
    setGenerated(null);
    generate(0, goal, days);
  }, [handoffSource, smoothieFingerprint, unlocked, isOnboarded, restoredSession]);

  useEffect(() => {
    const handoffIdentity = `astra:${astraTransfer?.id || ""}`;
    if (handoffSource !== "astra" || !astraTransfer || !unlocked || !isOnboarded || autoHandoffStartedRef.current === handoffIdentity) return;
    autoHandoffStartedRef.current = handoffIdentity;
    setGenerated(null);
    generate(0, goal, days);
  }, [handoffSource, astraTransfer?.id, unlocked, isOnboarded]);

  function generateAlternate() {
    const nextIndex = alternateIndex + 1;
    setAlternateIndex(nextIndex);
    generate(nextIndex);
  }

  return <div className="cosmic-page-shell nourish-cosmos"><GlowNav /><main className="ne-page meal-plan-page">
    <header className="nourish-hero">
      <div className="nourish-title-band"><div><p className="ne-kicker"><Sparkles size={14} /> Tier 3 · The Nourishment Grove</p><h1>Eat With the <em>Rhythm of Your Day.</em></h1></div><div><p>Turn one smoothie intention into a practical whole-food rhythm from sunrise to moonlight—built around real meals, realistic choices, and your dietary pattern.</p><a href="#grove-planner">Enter the grove <span>↓</span></a></div></div>
      <div className="nourish-panorama" role="img" aria-label="A celestial garden transitioning from breakfast sunrise through lunch, snack at sunset, and dinner beneath moonlight">
        <div className="meal-realm-label breakfast"><Sunrise size={16} /><span>Breakfast<small>Dawn</small></span></div>
        <div className="meal-realm-label lunch"><Sun size={16} /><span>Lunch<small>Daylight</small></span></div>
        <div className="meal-realm-label snack"><Sunset size={16} /><span>Snack<small>Twilight</small></span></div>
        <div className="meal-realm-label dinner"><MoonStar size={16} /><span>Dinner<small>Moonlight</small></span></div>
      </div>
    </header>

    <TierPreviewBanner minimum={1} kernel="meals">Explore every nourishment rhythm and one sample day. Members generate personalized one-, three-, seven-, or thirty-day plans.</TierPreviewBanner>

    <section className="grove-planner" id="grove-planner">
      <div className="planner-heading"><div><p className="ne-kicker">Cultivation console</p><h2>Shape your nourishment rhythm</h2></div><span><i /> Grove intelligence online</span></div>
      <div className="goal-garden">{goals.map(([value, label, sublabel, Icon]) => <button key={value} className={goal === value ? "active" : ""} onClick={() => { const hadGeneratedPlan = Boolean(generated); setGoal(value); resetPlanVisuals(); if (hadGeneratedPlan) generate(0, value, days); else setGenerated(null); }}><i><Icon size={20} /></i><span><strong>{label}</strong><small>{sublabel}</small></span>{goal === value && <Sparkles className="selected-spark" size={14} />}</button>)}</div>
      <div className="plan-horizon"><div><span className="ne-label">Choose your horizon</span><p>{yearlyPlanning ? "Choose any subscription month, up to 12, and build as many 30-day plans as you wish during the active annual term." : "Your planning window begins on the first day of the current monthly subscription period and is limited to 30 days."}</p><label className="measurement-selector"><span>Measurement system</span><select value={measurementSystem} onChange={(event) => setMeasurementSystem(saveMeasurementSystem(event.target.value))}><option value="standard">English standard</option><option value="metric">Metric</option></select></label>{yearlyPlanning && <label className="measurement-selector"><span>Annual planning month</span><select value={planningMonth} onChange={(event) => { setPlanningMonth(Number(event.target.value)); setGenerated(null); resetPlanVisuals(); }}>{Array.from({ length: 12 }, (_, index) => <option value={index + 1} key={index + 1}>Subscription month {index + 1}</option>)}</select></label>}</div><div>{[1, 3, 7, 30].map((value) => <button className={days === value ? "active" : ""} key={value} onClick={() => { const hadGeneratedPlan = Boolean(generated); setDays(value); resetPlanVisuals(); if (hadGeneratedPlan) generate(0, goal, value); else setGenerated(null); }}><CalendarDays size={18} /><strong>{value}</strong><span>day{value > 1 ? "s" : ""}</span></button>)}</div></div>
      <section className="meal-kitchen-vault">
        <div className="meal-kitchen-heading"><div><p className="ne-kicker">Meal-plan kitchen</p><h2>What can Astra cook with?</h2><p>Your smoothie pantry is imported here automatically. Items added below stay in Meal Plans and never flow back into Smoothies.</p></div><span>{mealKitchenItems.length} total ingredients</span></div>
        <div className="meal-kitchen-zones">{[
          ["pantry", "Pantry", Warehouse, "bread, rice, oats, canned tuna"],
          ["fridge", "Fridge", Refrigerator, "eggs, cheese, yogurt, vegetables"],
          ["freezer", "Freezer", Snowflake, "chicken, steak, fish, pork chops"],
        ].map(([zone, label, Icon, placeholder]) => <article className={openKitchenZones[zone] ? "is-open" : "is-collapsed"} key={zone}><div className="meal-zone-heading"><Icon size={19} /><strong>{label}</strong><span className="meal-zone-count" aria-label={`${mealInventory[zone].length} items`}>{mealInventory[zone].length}</span><button type="button" aria-expanded={openKitchenZones[zone]} onClick={() => setOpenKitchenZones((current) => ({ ...current, [zone]: !current[zone] }))}>{openKitchenZones[zone] ? "Hide items" : "View items"}</button></div>{openKitchenZones[zone] && <div className="meal-zone-content"><div className="meal-zone-items">{mealInventory[zone].map((item) => <span key={item}>{item}<button onClick={() => removeInventoryItem(zone, item)} aria-label={`Remove ${item}`}><X size={12} /></button></span>)}</div><div className="meal-zone-add"><input value={inventoryDrafts[zone]} placeholder={placeholder} onChange={(event) => setInventoryDrafts((current) => ({ ...current, [zone]: event.target.value }))} onKeyDown={(event) => { if (event.key === "Enter") addInventoryItem(zone); }} /><button onClick={() => addInventoryItem(zone)}><Plus size={15} /> Add</button></div></div>}</article>)}</div>
        <p className="smoothie-import-note"><GlassWater size={15} /> Smoothie pantry imported: {[...smoothieInventory.pantry, ...smoothieInventory.fridge, ...smoothieInventory.freezer].length || 0} ingredients.</p>
      </section>
      <NutritionFactsRegistry scope={storageScope} pantryItems={mealKitchenItems} activeIngredients={generated?.flatMap((day) => day.meals?.flatMap((meal) => meal.ingredients || []) || []) || []} activeFormulaName={generated ? `${generated.length}-day accepted meal plan` : ""} />
      <fieldset className="meal-generation-modes"><legend>Choose how Astra plans</legend><button type="button" className={generationMode === "kitchen" ? "active" : ""} aria-pressed={generationMode === "kitchen"} onClick={() => { setGenerationMode("kitchen"); setGenerated(null); }}>Generate From My Kitchen<small>Prioritize foods already in your household inventory.</small></button><button type="button" className={generationMode === "automatic" ? "active" : ""} aria-pressed={generationMode === "automatic"} onClick={() => { setGenerationMode("automatic"); setGenerated(null); }}>Generate Automatically<small>Create coherent dishes first and identify what you need to purchase.</small></button></fieldset>
      <div className="ne-alert"><strong>Pre-generation review:</strong> {isOnboarded ? generationMode === "kitchen" ? `${generationContext.reviewedProfileFields.length} profile areas and ${generationContext.kitchenItems.length} total kitchen items will be reviewed.` : `${generationContext.reviewedProfileFields.length} profile areas will be reviewed; needed foods will be placed on the shopping list.` : "Complete your personal profile before Astra can generate your meal plan."}</div>
      {nutritionRisk.flags.length > 0 && <div className="ne-alert ne-alert-danger"><strong>{nutritionRisk.generationLimited ? "Clinician-target safety gate" : "Additional nutrition review"}:</strong> {nutritionRisk.message} {nutritionRisk.generationLimited ? "Generation remains blocked until the required clinician-established targets are saved." : "Saved restrictions remain mandatory; confirm individual targets with the appropriate clinician or pharmacist."}</div>}
      <div className="generation-actions"><button className="ne-primary grow-plan" disabled={!unlocked || !isOnboarded || generationStatus === "loading"} onClick={() => generate(0)}>{generationStatus === "loading" ? <><Sparkles size={18} /> Astra is cultivating your plan…</> : !unlocked ? <><LockKeyhole size={17} /> Subscribe to cultivate multi-day plans</> : !isOnboarded ? <><LockKeyhole size={17} /> Complete profile to cultivate</> : <><Sparkles size={18} /> {generationMode === "kitchen" ? "Review profile + kitchen and cultivate" : "Review profile and cultivate"}</>}</button><button className="ne-secondary alternate-formula" disabled={!unlocked || !isOnboarded || generationStatus === "loading"} onClick={generateAlternate}><Sparkles size={18} /> Alternate ingredients</button><small>Active beta testers have no daily meal-plan generation cap during testing.</small></div>
      {generationMessage && <div className={`ne-alert ${["failed", "blocked"].includes(generationStatus) ? "ne-alert-danger" : ""}`}><strong>{generationStatus === "loading" ? "Meal intelligence working" : generationStatus === "saving" ? "Saving accepted plan" : generationStatus === "ready" ? "Validated AI meal plan" : generationStatus === "blocked" ? "Safety gate active" : generationStatus === "failed" ? "Plan not generated" : "Meal Plan status"}:</strong> {generationMessage}</div>}
      {medicationSafety && <div className={`ne-alert ${medicationSafety.reviewRequired ? "ne-alert-danger" : ""}`}><strong>Medication-aware review · {medicationSafety.status}:</strong> {medicationSafety.note}{medicationSafety.foodsAvoided?.length > 0 && <> Foods omitted during screening: {medicationSafety.foodsAvoided.join(", ")}.</>} This screening cannot replace the medication label, pharmacist, or prescriber.</div>}
    </section>

    <section className={`constellation-overview ${generationStatus === "loading" && !generated ? "generation-pending" : ""}`} id="meal-constellation">
      {generationStatus === "loading" && !generated && <div className="generation-pending-copy"><p className="ne-kicker">Generation in progress</p><h2>{selectedGoal[1]} constellation</h2><p>Astra is preparing {days} requested day{days === 1 ? "" : "s"}; no plan has been accepted yet.</p></div>}
      <div><p className="ne-kicker">{generated ? "Personalized harvest" : "Interactive sample harvest"}</p><h2>{selectedGoal[1]} constellation</h2><p>{selectedGoal[2]} · {plan.length} day{plan.length > 1 ? "s" : ""} · {plan.length * 5} nourishment moments</p></div>
      <div className="constellation-metric">{generationStatus === "loading" && !generated ? <><Sparkles size={24} /><small>validation underway</small></> : <><span>{plan.length * 5}</span><small>moments mapped</small></>}</div>
    </section>

    {dailyNutrition && <section className="nutrient-future-vault" aria-labelledby="nutrient-future-title">
      <div className="nutrient-vault-core"><Database size={31} /><span>Verified data lattice</span><i /><i /></div>
      <div className="nutrient-vault-copy"><p className="ne-kicker">Nutrition Intelligence · Evidence-aware database</p><h2 id="nutrient-future-title">Daily nutrient constellation</h2><p>Calculated subtotals are separated from data coverage. Missing brand or nutrient values remain unknown—they are never silently counted as zero.</p></div>
      <div className="nutrient-target-grid">
        <article><small>Energy target</small><strong>{dailyNutrition.targets.energyKcal ? `~${dailyNutrition.targets.energyKcal} kcal` : "Clinician target needed"}</strong><span>{dailyNutrition.targets.status || "insufficient-profile-data"}</span></article>
        <article><small>Protein planning range</small><strong>{dailyNutrition.targets.proteinG ? `${dailyNutrition.targets.proteinG.minimum}–${dailyNutrition.targets.proteinG.upperPlanningRange} g` : "Not calculated"}</strong><span>Age, weight, activity + risk screen</span></article>
        <article><small>Multi-day adequacy</small><strong>{dailyNutrition.multiDayAdequacyStatus === "estimated-reference-comparison" ? "Reference comparison ready" : "Insufficient verified coverage"}</strong><span>{dailyNutrition.days.length} day{dailyNutrition.days.length === 1 ? "" : "s"} assessed</span></article>
      </div>
      <div className="nutrient-day-grid">{dailyNutrition.days.map((day) => <article key={day.day}><header><strong>Day {day.day}</strong><span>{day.adequacyStatus === "estimated-reference-comparison" ? "Coverage qualified" : "Partial data"}</span></header><div className="nutrient-total-grid">{[
        ["Calories", day.totals.energyKcal, "kcal", day.nutrientCoveragePercent.energyKcal], ["Protein", day.totals.proteinG, "g", day.nutrientCoveragePercent.proteinG], ["Carbs", day.totals.carbohydrateG, "g", day.nutrientCoveragePercent.carbohydrateG], ["Fat", day.totals.fatG, "g", day.nutrientCoveragePercent.fatG], ["Sodium", day.totals.sodiumMg, "mg", day.nutrientCoveragePercent.sodiumMg], ["Potassium", day.totals.potassiumMg, "mg", day.nutrientCoveragePercent.potassiumMg], ["Phosphorus", day.totals.phosphorusMg, "mg", day.nutrientCoveragePercent.phosphorusMg], ["Calcium", day.totals.calciumMg, "mg", day.nutrientCoveragePercent.calciumMg], ["Iron", day.totals.ironMg, "mg", day.nutrientCoveragePercent.ironMg], ["Vitamin K", day.totals.vitaminKMcg, "mcg", day.nutrientCoveragePercent.vitaminKMcg], ["Added sugar", day.totals.addedSugarG, "g", day.nutrientCoveragePercent.addedSugarG], ["Saturated fat", day.totals.saturatedFatG, "g", day.nutrientCoveragePercent.saturatedFatG],
      ].map(([label, value, unit, coverage]) => <span key={label}><small>{label}</small><b>{coverage > 0 ? `${value} ${unit}` : "Unknown"}</b><em>{coverage}% covered</em></span>)}</div><section className="daily-allowance-summary" aria-label={`Day ${day.day} daily allowance comparison`}><h3>Daily recommended allowance</h3><p>Estimated from verified ingredients only. “Remaining” is not reliable until coverage is substantially complete.</p><div>{dailyAllowanceComparison(day, dailyNutrition.targets).map((item) => <article className={item.kind === "upper" ? "is-limit" : ""} key={item.key}><small>{item.label}</small><strong>{item.total == null ? "Unknown" : `${item.total} ${item.unit}`} <em>of {item.target} {item.unit}</em></strong><span>{item.status}</span><i>{item.coverage}% coverage</i></article>)}</div></section></article>)}</div>
      <footer><ShieldCheck size={17} /><span>{dailyNutrition.catalogBoundary} {dailyNutrition.brandedFoodBoundary}</span></footer>
    </section>}

    <div className="meal-days">{plan.map((day) => <section className="day-orbit" key={day.day}>
      <div className="day-marker"><span>{String(day.day).padStart(2, "0")}</span><small>Day</small></div>
      <div className="day-content"><p className="ne-kicker">{generated ? "Personalized plan" : "Sample preview"} · Day {day.day}</p><div className="meal-timeline">{day.meals.map((item, index) => {
        const MomentIcon = mealMoments[index].icon;
        const instructionKey = `${day.day}-${item.meal}`;
        return <article className={`moment-${index + 1}`} key={item.meal}><div className="meal-moment"><MomentIcon size={17} /><span>{mealMoments[index].name}</span></div><small>{item.meal}</small><h2>{item.food}</h2><div className="meal-detail"><strong>Ingredients + quantity</strong><ul>{item.ingredients?.map((ingredient, ingredientIndex) => { const isStaple = ingredient.availability === "household-staple" || isHouseholdStapleIngredient(ingredient.name); const isOnHand = ingredient.availability === "on-hand" || groceries.available.some((available) => available.toLowerCase() === ingredient.name.toLowerCase()); const swapKey = `${day.day}-${index}-${ingredientIndex}`; return <li className="meal-ingredient-row" key={`${ingredient.quantity}-${ingredient.name}`}><span><b>{formatQuantityText(ingredient.quantity, measurementSystem)}</b> {ingredient.name}{ingredient.availability && (isStaple ? <em className="ingredient-availability household-staple">Household staple</em> : isOnHand ? <em className="ingredient-availability on-hand">On hand</em> : <button type="button" className="ingredient-availability needed ingredient-needed-action" onClick={() => stockPurchasedIngredient(ingredient.name)} title={`Add ${ingredient.name} to your kitchen`}>Needed · Add</button>)}</span><button type="button" className="ingredient-swap-trigger" aria-expanded={openIngredientSwap === swapKey} onClick={() => setOpenIngredientSwap((current) => current === swapKey ? "" : swapKey)}>Swap</button>{openIngredientSwap === swapKey && <label className="ingredient-swap-picker"><span>Replace {ingredient.name} with</span><select defaultValue="" onChange={(event) => requestIngredientReplacement(day, item, ingredient, event.target.value)}><option value="" disabled>Choose an alternate</option>{replacementOptions.filter((option) => option.toLowerCase() !== ingredient.name.toLowerCase()).map((option) => <option key={option} value={option}>{option}</option>)}</select></label>}</li>; })}</ul>{item.rationale && <p className="pantry-driven-note"><strong>Why it fits:</strong> {item.rationale}</p>}{item.pantryDriven && <p className="pantry-driven-note">Built with matching foods from your saved inventory; select any Needed badge after purchasing the item to add it to your kitchen.</p>}{item.seasoningRecommendation && <div className="seasoning-recommendation"><strong>Profile-aware seasoning</strong><span>{item.seasoningRecommendation.rationale}</span><small>{item.seasoningRecommendation.safetyNote}</small></div>}{item.requiresCooking && (unlocked ? <><button className="cooking-instructions-link" type="button" aria-expanded={Boolean(openInstructions[instructionKey])} onClick={() => setOpenInstructions((current) => ({ ...current, [instructionKey]: !current[instructionKey] }))}>{openInstructions[instructionKey] ? "Hide cooking instructions" : "View cooking instructions"}</button>{openInstructions[instructionKey] && <div className="cooking-instructions"><strong>Cooking instructions</strong><ol>{item.instructions?.map((instruction) => <li key={instruction}>{instruction}</li>)}</ol></div>}</> : <Link className="cooking-instructions-link" to="/premium">Subscribe for cooking instructions</Link>)}</div><i className="timeline-star" /></article>;
      })}</div></div>
    </section>)}</div>

    <section className="harvest-grid">
      <article className="harvest-vault"><div className="harvest-heading"><ShoppingBasket size={25} /><div><p className="ne-kicker">Pantry-aware harvest list</p><h2>Need to purchase</h2></div></div><p>Astra consolidates compatible quantities and compares them with your synchronized kitchen. Retailer links open searches only; they do not create a cart or place an order.</p>{stockedMessage && <p className="harvest-stocked-message" role="status">{stockedMessage}</p>}{groceries.missingDetails.length ? <><ul className="interactive-harvest-list">{groceries.missingDetails.map((item, index) => { const destination = storageZoneForIngredient(item.name); return <li key={`${item.name}-${item.quantity}`}><span>{String(index + 1).padStart(2, "0")}</span><strong>{item.quantity} {item.name}</strong><button type="button" onClick={() => stockPurchasedIngredient(item.name)} aria-label={`Add ${item.name} to ${destination}`}><Plus size={14} /> Add to {destination}</button></li>; })}</ul><div className="retailer-search-links"><span>Search this list:</span>{[["Instacart", "instacart"], ["Walmart", "walmart"], ["Amazon", "amazon"]].map(([label, provider]) => <a key={provider} href={providerSearchUrl(provider, groceries.missingDetails)} target="_blank" rel="noreferrer">{label}</a>)}</div></> : <p className="harvest-complete">Your kitchen already covers every recognized ingredient in this plan.</p>}{groceries.stapleDetails?.length > 0 && <details className="available-harvest"><summary>{groceries.stapleDetails.length} household staples excluded from shopping</summary><ul>{groceries.stapleDetails.map((item) => <li key={`${item.name}-${item.quantity}`}>{item.quantity} {item.name}</li>)}</ul></details>}{groceries.availableDetails.length > 0 && <details className="available-harvest"><summary>{groceries.availableDetails.length} consolidated ingredients already in kitchen</summary><ul>{groceries.availableDetails.map((item) => <li key={`${item.name}-${item.quantity}`}>{item.quantity} {item.name}</li>)}</ul></details>}</article>
      <article className="planned-menu"><div className="harvest-heading"><UtensilsCrossed size={25} /><div><p className="ne-kicker">Constellation index</p><h2>Meals in this plan</h2></div></div><div>{groceries.plannedMeals.map((item) => <span key={item}>{item}</span>)}</div></article>
      <section className="nourishment-calendar" aria-labelledby="nourishment-calendar-title">
        <div className="calendar-heading"><div><p className="ne-kicker"><CalendarDays size={14} /> Connected nourishment calendar</p><h2 id="nourishment-calendar-title">{calendar.label}</h2></div><p>Generated plans appear on their scheduled day. Today also shows your latest saved frequency pairing.</p></div>
        <div className="calendar-weekdays">{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => <span key={day}>{day}</span>)}</div>
        <div className="calendar-grid">{calendar.cells.map((cell, index) => cell ? <article key={cell.date} className={`${cell.isToday ? "today" : ""} ${cell.dayPlan ? "scheduled" : ""}`}>
          <time>{cell.date}</time>
          {cell.dayPlan && <div className="calendar-events"><span className="smoothie-event"><GlassWater size={11} /> {cell.dayPlan.meals[0]?.food}</span><span className="meal-event"><UtensilsCrossed size={11} /> {cell.dayPlan.meals.slice(1).length} meals</span></div>}
          {cell.isToday && journey.frequency?.hz && <span className="frequency-event"><Waves size={11} /> {journey.frequency.hz} Hz</span>}
        </article> : <i key={`blank-${index}`} />)}</div>
      </section>
      <aside className="safety-garden"><ShieldCheck size={28} /><div><p className="ne-kicker">Safety checkpoint</p><h2>Personal needs come first</h2><p>Kidney disease, diabetes, food allergies, swallowing concerns, pregnancy, and prescribed diets require individualized professional guidance. Plans do not replace a registered dietitian.</p><button className="ne-secondary" disabled={!unlocked || !generated} onClick={() => { recordMealJourney(goal, days, generated, storageScope); setSaved(true); }}>{!unlocked && <LockKeyhole size={14} />} {saved ? "Plan connected to journey" : "Save plan and harvest list"}</button>{generated && <div className="learning-feedback"><span>Help Astra learn from this plan:</span><button type="button" className="ne-secondary" onClick={() => { recordWellnessFeedback(storageScope, "meals", { sentiment: "positive", selection: `${days}-day ${goal} plan`, ingredients: generated.flatMap((day) => day.meals.flatMap((meal) => meal.ingredients.map((item) => item.name))) }); setFeedbackStatus("Preference learned. Future plans may favor this pattern when it remains safe and nutritionally appropriate."); }}>Works for me</button><button type="button" className="ne-secondary" onClick={() => { recordWellnessFeedback(storageScope, "meals", { sentiment: "negative", selection: `${days}-day ${goal} plan`, ingredients: generated.flatMap((day) => day.meals.flatMap((meal) => meal.ingredients.map((item) => item.name))) }); setFeedbackStatus("Preference learned. Astra will avoid repeating this plan pattern; profile safety rules remain unchanged."); }}>Not for me</button></div>}{feedbackStatus && <p className="learning-feedback-status" role="status">{feedbackStatus}</p>}</div></aside>
    </section>
    {generated && <KernelFeedbackContract kernel="meals" scope={storageScope} selection={`${days}-day ${goal} plan`} ingredients={generated.flatMap((day) => day.meals.flatMap((meal) => meal.ingredients.map((item) => item.name)))} disabled={!unlocked} />}

    <section className="daily-meal-collage" aria-labelledby="daily-collage-title">
      <div className="meal-collage-heading">
        <div><p className="ne-kicker"><Sparkles size={14} /> Today&apos;s meal constellation</p><h2 id="daily-collage-title">See your nourishment rhythm</h2><p>Five visual previews shaped around the smoothie and meals prepared for this day. Actual appearance varies with ingredients, brands, and preparation.</p></div>
        <div className="collage-actions">{plan.length > 1 && <div className="collage-day-picker" aria-label="Choose collage day">{plan.map((day, index) => <button key={day.day} className={collageDay === index ? "active" : ""} onClick={() => { setCollageDay(index); if (generated && !mealVisuals[index] && !visualStatus[index]) generateVisuals(day, index); }}>Day {day.day}</button>)}</div>}{generated && visualStatus[collageDay] !== "loading" && <button className="generate-collage-visuals" onClick={() => generateVisuals(plan[collageDay], collageDay)}><Sparkles size={14} /> {mealVisuals[collageDay] ? "Refresh matched images" : "Generate matched images"}</button>}</div>
      </div>
      {generated && visualStatus[collageDay] === "loading" && <p className="collage-status"><Sparkles size={14} /> Astra is photographing these exact five recipes. This can take a minute.</p>}
      {generated && String(visualStatus[collageDay] || "").startsWith("error") && <p className="collage-status error">{String(visualStatus[collageDay]).split(":").slice(1).join(":") || "The matched images could not be generated."} Reference images remain below.</p>}
      <div className="meal-collage-grid">{plan[Math.min(collageDay, plan.length - 1)]?.meals.map((meal, index) => {
        const MomentIcon = mealMoments[index]?.icon || UtensilsCrossed;
        return <article className={`meal-collage-card collage-${index + 1}`} key={`${meal.meal}-${meal.food}`}>
          <img className={visualStatus[collageDay] === "loading" ? "visual-loading" : ""} src={mealVisuals[collageDay]?.[index] || mealCollageImages[index]} alt={mealVisuals[collageDay]?.[index] ? `AI-generated visual of ${meal.food}` : `Reference ${meal.meal.toLowerCase()} visual; generate matched images for ${meal.food}`} />
          {!mealVisuals[collageDay]?.[index] && <span className="reference-visual-badge">{visualStatus[collageDay] === "loading" ? "Generating matched visual" : generated ? "Reference visual" : "Sample visual"}</span>}
          <div className="meal-collage-shade" />
          <div className="meal-collage-copy"><span><MomentIcon size={14} /> {meal.meal}</span><h3>{meal.food}</h3><p>{meal.ingredients?.slice(0, 3).map((item) => item.name).join(" · ")}</p></div>
        </article>;
      })}</div>
    </section>
  </main></div>;
}
