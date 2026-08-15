import React, { useEffect, useMemo, useRef, useState } from "react";
import { httpsCallable } from "firebase/functions";
import { Link, useSearchParams } from "react-router-dom";
import { Activity, Apple, Bone, Brain, Dna, Droplets, Dumbbell, Eye, Flame, HeartPulse, Leaf, LockKeyhole, MessageCircle, ShieldPlus, Sparkles, Sun, Waves, Zap } from "lucide-react";
import GlowNav from "../components/GlowNav";
import KernelFeedbackContract from "../components/KernelFeedbackContract";
import NutritionFactsRegistry from "../components/NutritionFactsRegistry";
import TierPreviewBanner, { useTierAccess } from "../components/TierPreviewBanner";
import { useSubscriber } from "../context/SubscriberContext";
import { useAuth } from "../context/AuthContext";
import { functions } from "../firebase";
import { generatePersonalizedSmoothie, pantryCatalog } from "../utilities/personalizedSmoothieEngine";
import { formatIngredientMeasurement, formatYield, getMeasurementSystem, saveMeasurementSystem } from "../utilities/measurements";
import { allKitchenIngredients, getKitchenInventory, saveKitchenInventory } from "../utilities/kitchenInventory";
import { saveRecipe as saveRecipeToLibrary } from "../utilities/recipeStorage";
import { recordSmoothieJourney } from "../utilities/wellnessJourney";
import { buildGenerationContext } from "../utilities/generationContext";
import { buildKernelBrief, publishWellnessSignal, recordWellnessFeedback } from "../utilities/wellnessExchange";
import { getSmoothiePreference, saveSmoothiePreference } from "../utilities/smoothiePreferences";
import { buildSmoothieVisualPreview } from "../utilities/smoothieVisualPreview";
import { mergeAiSmoothieProposal } from "../utilities/aiSmoothie";
import { getAstraKernelTransfer } from "../utilities/astraKernelTransfer";
import "../styles/CosmicShell.css";
import "../styles/wellnessOS.css";
import "../styles/smoothieBuilder.css";

const goals = [
  ["focus", "Focus & clarity", Brain],
  ["energy", "Steady energy", Zap],
  ["mindfulness", "Third-eye mindfulness", Eye],
  ["painSupport", "Comfort & recovery support", Activity],
  ["calm", "Calm support", Waves],
  ["heart", "Heart-supportive", HeartPulse],
  ["circulation", "Circulation & vessel support", Droplets],
  ["joints", "Joint-supportive nutrition", Activity],
  ["blood", "Blood-building nutrition", Droplets],
  ["bones", "Bone-supportive nutrition", Bone],
  ["cellular", "Cellular nourishment", Dna],
  ["digestion", "Digestive wellness", Leaf],
  ["inflammation", "Anti-inflammatory food pattern", Flame],
  ["general", "Everyday nutrition", Apple],
  ["hydration", "Hydration support", Droplets],
  ["protein", "Protein & strength", Dumbbell],
  ["weightLoss", "Weight-management nutrition", Leaf],
  ["healthyWeight", "Healthy weight gain", Dumbbell],
  ["immune", "Immune nourishment", ShieldPlus],
  ["skin", "Skin-supportive nutrition", Sun],
];

const goalVisualHue = {
  general: 0, focus: 22, energy: 48, mindfulness: 285, painSupport: 320,
  calm: 205, heart: 300, circulation: 185, joints: 325, blood: 350, bones: 55, cellular: 145,
  digestion: 35, inflammation: 345, hydration: 185, protein: 65, weightLoss: 115,
  healthyWeight: 72, immune: 105, skin: 15,
};

export default function SmoothieLab() {
  const { user } = useAuth();
  const storageScope = user?.uid || "guest";
  return <ScopedSmoothieLab key={storageScope} storageScope={storageScope} />;
}

function ScopedSmoothieLab({ storageScope }) {
  const generationEpochRef = useRef(0);
  const [params] = useSearchParams();
  const { profile, isOnboarded } = useSubscriber();
  const unlocked = useTierAccess(1);
  const workingProfile = isOnboarded ? profile : { healthGoals: [], conditions: [], allergies: "", avoidIngredients: "", dietaryPattern: "omnivore" };
  const requestedGoal = params.get("goal");
  const astraTransfer = params.get("source") === "astra" ? getAstraKernelTransfer(storageScope, "smoothie") : null;
  const exchangeBrief = useMemo(() => buildKernelBrief(storageScope, "smoothie"), [storageScope]);
  const synchronizedGoal = exchangeBrief.signals.movement?.goal || exchangeBrief.signals.meals?.goal;
  const rememberedGoal = exchangeBrief.kernelMemory?.goals?.at(-1);
  const initialGoal = goals.some(([value]) => value === astraTransfer?.goal) ? astraTransfer.goal : goals.some(([value]) => value === requestedGoal) ? requestedGoal : rememberedGoal || profile.healthGoals?.[0] || synchronizedGoal || "general";
  const [selectedGoals, setSelectedGoals] = useState([goals.some(([value]) => value === initialGoal) ? initialGoal : "general"]);
  const goal = selectedGoals[0];
  const [size, setSize] = useState(astraTransfer?.sizeOz || 16);
  const [inventory, setInventory] = useState(() => getKitchenInventory(storageScope));
  const [measurementSystem, setMeasurementSystem] = useState(getMeasurementSystem);
  useEffect(() => {
    const refreshInventory = (event) => {
      if (event.detail?.scope === storageScope) setInventory(getKitchenInventory(storageScope));
    };
    window.addEventListener("naturesElixirz:data-restored", refreshInventory);
    return () => window.removeEventListener("naturesElixirz:data-restored", refreshInventory);
  }, [storageScope]);
  const [kitchenZone, setKitchenZone] = useState("pantry");
  const [pantryCategory, setPantryCategory] = useState("Fruit");
  const [pantrySearch, setPantrySearch] = useState("");
  const [useOnlyPantry, setUseOnlyPantry] = useState(false);
  const [pantryOpen, setPantryOpen] = useState(false);
  const [customName, setCustomName] = useState("");
  const baseRecipe = useMemo(() => generatePersonalizedSmoothie(workingProfile, selectedGoals, size), [workingProfile, selectedGoals, size]);
  const [selectedNames, setSelectedNames] = useState([]);
  const [ingredientReplacements, setIngredientReplacements] = useState({});
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  const [generatedRecipe, setGeneratedRecipe] = useState(null);
  const [visualStatus, setVisualStatus] = useState("idle");
  const [generationStatus, setGenerationStatus] = useState("idle");
  const [generationMessage, setGenerationMessage] = useState("");
  const [saved, setSaved] = useState(false);
  const [feedbackStatus, setFeedbackStatus] = useState("");
  const [alternateIndex, setAlternateIndex] = useState(0);
  const pantryText = inventory[kitchenZone].join(", ");
  const allInventoryItems = useMemo(() => allKitchenIngredients(inventory), [inventory]);
  const generationContext = useMemo(() => buildGenerationContext(profile, inventory, exchangeBrief), [profile, inventory, exchangeBrief]);

  useEffect(() => {
    const preference = getSmoothiePreference(storageScope, selectedGoals);
    setSelectedNames(baseRecipe.ingredients.map((ingredient) => ingredient.sourceName || ingredient.name).filter((name) => !preference.excludedNames.includes(name)));
    setIngredientReplacements(preference.ingredientReplacements);
    setPreferencesLoaded(true);
    if (astraTransfer) {
      setGeneratedRecipe(mergeAiSmoothieProposal({
        name: astraTransfer.title,
        description: `Transferred from Astra Chat for review with ${astraTransfer.ingredients.length} specifically selected ingredients.`,
        type: "Astra Chat transfer",
        ingredients: astraTransfer.ingredients,
        benefits: [{ label: "Subscriber-selected transfer", level: "Supportive", detail: "Review quantities and profile compatibility before saving." }],
        preparation: ["Add liquid first.", "Blend until smooth.", "Review texture and adjust with water if needed."],
        practicalTips: astraTransfer.notes.length ? astraTransfer.notes : ["This transfer has not been silently saved; review it in the Smoothie Kernel first."],
        medicationSafety: { reviewRequired: Boolean(profile.medications), status: profile.medications ? "Pharmacist review advised" : "No medication information provided", note: "Confirm individual compatibility when medicines or health conditions apply.", foodsAvoided: [] },
      }, baseRecipe));
      setGenerationStatus("transferred");
      setGenerationMessage("Astra transferred this exact smoothie concept for your review. Nothing is saved until you choose Save generated recipe.");
    } else setGeneratedRecipe(null);
    setVisualStatus("idle");
    setSaved(false);
    setFeedbackStatus("");
  }, [storageScope, selectedGoals, size, profile.allergies, profile.avoidIngredients, profile.dietaryPattern, astraTransfer?.id]);

  useEffect(() => {
    saveKitchenInventory(inventory, storageScope);
  }, [inventory, storageScope]);

  const previewRecipe = useMemo(() => preferencesLoaded
    ? generatePersonalizedSmoothie(workingProfile, selectedGoals, size, {
        selectedNames,
        ingredientReplacements,
        pantryText: useOnlyPantry ? allInventoryItems.join(", ") : "",
        useOnlyPantry,
        customName,
        variationIndex: alternateIndex,
      })
    : baseRecipe, [preferencesLoaded, workingProfile, selectedGoals, size, selectedNames, ingredientReplacements, useOnlyPantry, allInventoryItems, customName, alternateIndex, baseRecipe]);
  const recipe = generatedRecipe || previewRecipe;
  const showingAlternatePreview = !generatedRecipe && alternateIndex > 0;
  const displayedPreviewIngredients = generatedRecipe?.ingredients || (showingAlternatePreview ? previewRecipe.ingredients : null);
  useEffect(() => {
    const smoothieContext = {
      goal,
      selectedGoals,
      recipeName: recipe?.name || "",
      ingredients: (recipe?.ingredients || []).map((item) => ({
        name: item.name,
        amount: item.amount,
        unit: item.unit,
        group: item.group,
      })).filter((item) => item.name),
      nutrition: recipe?.nutrition || null,
      updatedAt: new Date().toISOString(),
    };

    [sessionStorage, localStorage].forEach((storage) => {
      try {
        storage.setItem("naturesElixirz.latestSmoothieContext", JSON.stringify(smoothieContext));
        storage.setItem("naturesElixirz.latestSmoothieGoal", goal);
      } catch {
        // Storage can be unavailable in privacy-restricted browser sessions.
      }
    });
  }, [goal, recipe, selectedGoals]);
  const ingredientVisualPreview = useMemo(() => buildSmoothieVisualPreview(recipe), [recipe]);
  const blendVisualStyle = {
    "--blend-visual-height": `${Math.max(300, 660 - recipe.ingredients.length * 42)}px`,
    "--blend-visual-hue": `${goalVisualHue[goal] || 0}deg`,
  };
  const pantryItems = useMemo(() => inventory[kitchenZone].map((item) => item.toLowerCase()), [inventory, kitchenZone]);
  const pantryCategories = [
    ["Fruit", "Fruits"], ["Vegetable", "Vegetables"], ["Seed", "Seeds & superfoods"],
    ["Spice", "Spices & herbs"], ["Protein", "Proteins"], ["Liquid", "Liquids"],
    ["Grain", "Grains & fiber"], ["Nut butter", "Nut butters"], ["Sweetener", "Sweeteners"],
  ];
  const visiblePantryIngredients = pantryCatalog.filter((ingredient) => ingredient.group === pantryCategory
    && ingredient.name.toLowerCase().includes(pantrySearch.trim().toLowerCase()));
  const pantryHas = (name) => pantryItems.includes(name.toLowerCase());
  const updateZoneFromText = (value) => {
    const items = value.split(/[,;\n]/).map((item) => item.trim()).filter(Boolean);
    setInventory((current) => ({ ...current, [kitchenZone]: items }));
  };
  const togglePantryItem = (name) => {
    const current = inventory[kitchenZone];
    const exists = current.some((item) => item.toLowerCase() === name.toLowerCase());
    setInventory((stored) => ({
      ...stored,
      [kitchenZone]: exists ? current.filter((item) => item.toLowerCase() !== name.toLowerCase()) : [...current, name],
    }));
  };
  const toggleIngredient = (name) => setSelectedNames((current) => {
    const next = current.includes(name) ? current.filter((item) => item !== name) : [...current, name];
    saveSmoothiePreference(storageScope, selectedGoals, {
      excludedNames: baseRecipe.ingredients.map((item) => item.sourceName || item.name).filter((item) => !next.includes(item)),
      ingredientReplacements,
    });
    return next;
  });
  const replaceIngredient = (name, replacement) => setIngredientReplacements((current) => {
    const next = { ...current, [name]: replacement };
    saveSmoothiePreference(storageScope, selectedGoals, {
      excludedNames: baseRecipe.ingredients.map((item) => item.sourceName || item.name).filter((item) => !selectedNames.includes(item)),
      ingredientReplacements: next,
    });
    return next;
  });
  const toggleGoal = (value) => setSelectedGoals((current) => current.includes(value)
    ? (current.length === 1 ? current : current.filter((item) => item !== value))
    : [...current, value]);
  const generate = async (variationIndex = alternateIndex) => {
    if (!unlocked || !generationContext.profileReady) return;
    const requestEpoch = generationEpochRef.current + 1;
    generationEpochRef.current = requestEpoch;
    const fallbackRecipe = generatePersonalizedSmoothie(workingProfile, selectedGoals, size, { selectedNames, ingredientReplacements, pantryText: useOnlyPantry ? allInventoryItems.join(", ") : "", useOnlyPantry, customName, variationIndex });
    setGenerationStatus("loading");
    setGenerationMessage("");
    let nextRecipe;
    try {
      if (!functions) throw new Error("AI service is not configured.");
      const callable = httpsCallable(functions, "generateSmartSmoothie", { timeout: 120000 });
      const result = await callable({
        goals: selectedGoals,
        sizeOz: size,
        pantryOnly: useOnlyPantry,
        keptIngredients: previewRecipe.ingredients.map((ingredient) => ingredient.name),
        replacements: ingredientReplacements,
        alternateIndex: variationIndex || 0,
        learning: generationContext.learningProfile,
      });
      if (requestEpoch !== generationEpochRef.current) return;
      nextRecipe = mergeAiSmoothieProposal(result.data.recipe, fallbackRecipe);
      if (customName.trim()) nextRecipe.name = customName.trim().slice(0, 80);
      setGenerationStatus("ready");
      setGenerationMessage("Astra AI created and validated this formula from this subscriber's synchronized profile and recent recipe history.");
    } catch (error) {
      if (requestEpoch !== generationEpochRef.current) return;
      console.error("AI smoothie generation failed", error);
      if (error?.code === "functions/resource-exhausted") {
        setGenerationStatus("limit");
        setGenerationMessage("Your three smoothie generations for today have been used. Enjoy or revisit your saved formulas and return tomorrow for three new smoothies.");
        return;
      }
      if (String(error?.code || "").includes("failed-precondition")) {
        setGeneratedRecipe(null);
        setGenerationStatus("blocked");
        setGenerationMessage(error?.message || "Generation is paused until clinician-established nutrition or texture targets are saved.");
        return;
      }
      nextRecipe = { ...fallbackRecipe, generationSource: "fallback" };
      setGenerationStatus("fallback");
      setGenerationMessage("The AI generator was unavailable or its proposal failed validation. This is a clearly labeled rules-based fallback, not a new AI-generated formula.");
    }
    setGeneratedRecipe(nextRecipe);
    setVisualStatus("loading");
    recordSmoothieJourney(goal, nextRecipe, storageScope);
    publishWellnessSignal(storageScope, "smoothie", { goal, goals: selectedGoals, selection: `${nextRecipe.name} · ${nextRecipe.sizeOz} oz` });
    setSaved(false);
    if (functions) {
      const callable = httpsCallable(functions, "generateSmoothieVisual", { timeout: 180000 });
      callable({
        name: nextRecipe.name,
        sizeOz: nextRecipe.sizeOz,
        ingredients: nextRecipe.ingredients.map((ingredient) => ({
          name: ingredient.name,
          quantity: formatIngredientMeasurement(ingredient.amount, ingredient.unit, "standard"),
        })),
      }).then((result) => {
        if (requestEpoch !== generationEpochRef.current) return;
        setGeneratedRecipe((current) => current ? { ...current, visualUrl: result.data.imageUrl } : current);
        setVisualStatus("ready");
      }).catch((error) => {
        if (requestEpoch !== generationEpochRef.current) return;
        console.error("Smoothie visual generation failed", error);
        setVisualStatus("error");
      });
    } else {
      setVisualStatus("error");
    }
  };
  const generateAlternate = () => {
    const nextIndex = alternateIndex + 1;
    setAlternateIndex(nextIndex);
    generationEpochRef.current += 1;
    setGeneratedRecipe(null);
    setGenerationStatus("idle");
    setGenerationMessage("");
    setVisualStatus("idle");
    setSaved(false);
  };
  const saveRecipe = () => {
    if (!unlocked || !generatedRecipe) return;
    saveRecipeToLibrary(generatedRecipe, storageScope);
    recordSmoothieJourney(goal, generatedRecipe, storageScope);
    setSaved(true);
  };
  const recordRecipeFeedback = (sentiment) => {
    if (!generatedRecipe) return;
    recordWellnessFeedback(storageScope, "smoothie", {
      sentiment, selection: generatedRecipe.name,
      ingredients: generatedRecipe.ingredients.map((ingredient) => ingredient.name),
    });
    setFeedbackStatus(sentiment === "positive"
      ? "Preference learned. Future formulas may favor this pattern when it remains safe and balanced."
      : "Preference learned. Astra will avoid repeating this formula pattern; safety exclusions remain controlled in your profile.");
  };

  return <div className="cosmic-page-shell smoothie-cosmos"><GlowNav /><main className="ne-page smoothie-lab-page">
    <header className="elixir-hero">
      <div className="elixir-hero-copy">
        <p className="ne-kicker"><Sparkles size={14} /> Tier 1 · AI Elixir Laboratory</p>
        <h1>True Energy<br /><em>Starts Within.</em></h1>
        <p>Enter a living laboratory where real ingredients meet intelligent personalization. Choose an intention, share what is in your kitchen, and shape a frozen whole-food elixir.</p>
        <div className="hero-trust-row"><span>Whole-food formulas</span><span>Exact batch sizing</span><span>Safety-aware guidance</span></div>
        <a className="hero-jump" href="#elixir-builder">Enter the laboratory <span>↓</span></a>
      </div>
      <div className="elixir-hero-art" role="img" aria-label="Cosmic green smoothie surrounded by blueberries, spinach, banana, and ginger"><div className="orbit orbit-one" /><div className="orbit orbit-two" /><span className="hero-art-label">Botanical intelligence</span></div>
    </header>

    <TierPreviewBanner minimum={1}>Explore every goal and sample formula. Subscribe to personalize from your pantry, generate, and save recipes.</TierPreviewBanner>
    {!isOnboarded && <div className="ne-alert">Create a profile to add allergies, medications, dietary preferences, and personal goals. <Link to="/account">Build profile</Link></div>}

    <section className="ne-controls elixir-builder" id="elixir-builder">
      <div className="builder-heading"><div><p className="ne-kicker">Formulation sequence 01</p><h2>Choose today&apos;s intentions</h2><p className="ne-muted">Select one or combine several. The first selection leads the formula.</p></div><span className="builder-status"><i /> {selectedGoals.length} selected</span></div>
      <div className="goal-orbit-grid">{goals.map(([value, label, Icon]) => <button type="button" aria-pressed={selectedGoals.includes(value)} key={value} onClick={() => toggleGoal(value)} className={selectedGoals.includes(value) ? "active" : ""}><span className="goal-icon"><Icon size={21} /></span><span>{label}</span>{selectedGoals.includes(value) && <small>Selected</small>}</button>)}</div>
      <div className="size-row"><div><span className="ne-label">Finished portal size</span><p>Quantities scale automatically to your selected yield.</p><label className="measurement-selector"><span>Measurement system</span><select value={measurementSystem} onChange={(event) => setMeasurementSystem(saveMeasurementSystem(event.target.value))}><option value="standard">English standard</option><option value="metric">Metric</option></select></label></div><div className="ne-pills size-pills">{[16, 24, 32, 42, 64].map((oz) => <button key={oz} onClick={() => setSize(oz)} className={size === oz ? "active" : ""}><strong>{measurementSystem === "metric" ? Math.round(oz * 29.5735) : oz}</strong><small>{measurementSystem === "metric" ? "mL" : "oz"}</small></button>)}</div></div>
      <div className="ne-form-grid compact-form-grid">
        <label className="pantry-field"><span className="ne-label">Name this formula (optional)</span><input value={customName} maxLength="80" onChange={(event) => setCustomName(event.target.value)} placeholder={`${profile.name || "My"}'s Focus Recovery Smoothie`} /><small>Use your own title, such as “Titan Focus Recovery Smoothie.”</small></label>
        <label className="pantry-switch"><span><strong>Pantry-only mode</strong><small>Build exclusively from ingredients Astra recognizes in your list.</small></span><input type="checkbox" checked={useOnlyPantry} onChange={(event) => setUseOnlyPantry(event.target.checked)} /><i aria-hidden="true" /></label>
      </div>
      <div className={`ingredient-galaxy ${pantryOpen ? "open" : "collapsed"}`}>
        <button type="button" className="ingredient-galaxy-heading pantry-disclosure" aria-expanded={pantryOpen} onClick={() => setPantryOpen((current) => !current)}><div><span className="ne-label">Ingredient Galaxy</span><h3>{pantryOpen ? "Your kitchen portal is open" : "Pantry, fridge & freezer"}</h3><p>{pantryOpen ? "Add, remove, search, or move between storage locations." : "Your ingredients are tucked away. Open only when you want to make changes."}</p></div><span><b>{allInventoryItems.length}</b> items <i>{pantryOpen ? "−" : "+"}</i></span></button>
        {pantryOpen && <div className="pantry-workspace">
        <div className="kitchen-zone-tabs" role="tablist" aria-label="Kitchen storage locations">
          {[["pantry", "Pantry"], ["fridge", "Fridge"], ["freezer", "Freezer"]].map(([value, label]) => <button type="button" role="tab" aria-selected={kitchenZone === value} className={kitchenZone === value ? "active" : ""} key={value} onClick={() => setKitchenZone(value)}>{label}<small>{inventory[value].length}</small></button>)}
        </div>
        <label className="pantry-field pantry-quick-edit"><span className="ne-label">Quick-edit your {kitchenZone}</span><textarea rows="3" value={pantryText} onChange={(event) => updateZoneFromText(event.target.value)} placeholder="Blueberries, spinach, banana, oat milk, ginger…" /><small>Saved automatically and synchronized to this account.</small></label>
        <div className="pantry-category-tabs" role="tablist" aria-label="Pantry ingredient categories">
          {pantryCategories.map(([value, label]) => <button type="button" role="tab" aria-selected={pantryCategory === value} className={pantryCategory === value ? "active" : ""} key={value} onClick={() => { setPantryCategory(value); setPantrySearch(""); }}>{label}</button>)}
        </div>
        <label className="pantry-library-search"><span className="sr-only">Search selected ingredient category</span><input value={pantrySearch} onChange={(event) => setPantrySearch(event.target.value)} placeholder={`Search ${pantryCategories.find(([value]) => value === pantryCategory)?.[1].toLowerCase()}…`} /></label>
        <div className="pantry-library-grid">
          {visiblePantryIngredients.map((ingredient) => <button type="button" className={pantryHas(ingredient.name) ? "selected" : ""} aria-pressed={pantryHas(ingredient.name)} key={ingredient.name} onClick={() => togglePantryItem(ingredient.name)}><span>{ingredient.name}</span><small>{pantryHas(ingredient.name) ? "Added ✓" : "Add +"}</small></button>)}
          {visiblePantryIngredients.length === 0 && <p className="ne-muted">No matching ingredients in this category. Add it manually in the pantry box above.</p>}
        </div>
        </div>}
      </div>
      <NutritionFactsRegistry scope={storageScope} pantryItems={allInventoryItems} activeIngredients={generatedRecipe?.ingredients || []} activeFormulaName={generatedRecipe?.name || ""} />
      {useOnlyPantry
        ? <div className="ne-alert"><strong>Pantry-only is active.</strong> Astra will use only recognized ingredients from the pantry box above; preset recipe ingredients are excluded.</div>
        : <div className="astra-ingredient-preview">
          <div className="astra-preview-heading"><div><span className="ne-label">{generatedRecipe ? "Astra's generated ingredients" : showingAlternatePreview ? "Astra's alternate ingredient preview" : "Astra's ingredient preview"}</span><h3>{generatedRecipe ? `Used in ${generatedRecipe.name}` : showingAlternatePreview ? `Planned for ${previewRecipe.name}` : <>Suggested for {selectedGoals.map((selected) => goals.find(([value]) => value === selected)?.[1]).join(" + ")}</>}</h3><p>{generatedRecipe ? "These are the exact ingredients in the validated formula below. Change an intention or choose alternate ingredients to prepare a new preview." : showingAlternatePreview ? "These are the exact ingredients in the alternate planned formula below. Choose alternate ingredients again or generate this version." : "Nature's Elixirz combines your selected intentions into one balanced formula. Keep, remove, or replace any ingredient before generation."}</p></div><span>{displayedPreviewIngredients ? displayedPreviewIngredients.length : selectedNames.length} {generatedRecipe ? "used" : showingAlternatePreview ? "planned" : "kept"}</span></div>
          {displayedPreviewIngredients
            ? <div className="ingredient-choice-grid">{displayedPreviewIngredients.map((ingredient, index) => <article className="selected" key={`${ingredient.name}-${index}`}><div className="generated-ingredient-summary"><span><small>{ingredient.group}</small><strong>{ingredient.name}</strong></span><em>{generatedRecipe ? "Used" : "Planned"}</em></div><small>{formatIngredientMeasurement(ingredient.amount, ingredient.unit, measurementSystem)}</small></article>)}</div>
            : <div className="ingredient-choice-grid">{baseRecipe.ingredients.map((ingredient) => {
            const selectionName = ingredient.sourceName || ingredient.name;
            const selected = selectedNames.includes(selectionName);
            const replacement = ingredientReplacements[selectionName] || ingredient.name;
            const alternatives = pantryCatalog.filter((item) => item.group === ingredient.group && item.name !== ingredient.name);
            return <article className={selected ? "selected" : "removed"} key={selectionName}>
              <label><input type="checkbox" checked={selected} onChange={() => toggleIngredient(selectionName)} /><span><small>{ingredient.group}</small><strong>{replacement}</strong></span><em>{selected ? "Keep" : "Removed"}</em></label>
              <label className="ingredient-replacement"><span>Replace with</span><select value={replacement} disabled={!selected} onChange={(event) => replaceIngredient(selectionName, event.target.value)}><option value={ingredient.name}>Keep {ingredient.name}</option>{alternatives.map((item) => <option value={item.name} key={item.name}>{item.name}</option>)}</select></label>
            </article>;
          })}</div>}
        </div>}
      <div className="ne-alert"><strong>Pre-generation review:</strong> {generationContext.profileReady ? useOnlyPantry ? `${generationContext.reviewedProfileFields.length} profile areas and ${generationContext.kitchenItems.length} kitchen ingredients will be reviewed.` : `${generationContext.reviewedProfileFields.length} profile areas will be reviewed. Pantry-only mode is off.` : "Complete your personal profile before Astra can generate a subscriber-specific formula."}</div>
      <div className="generation-actions"><button className="ne-primary generate-elixir" disabled={!unlocked || !generationContext.profileReady || generationStatus === "loading" || generationStatus === "limit"} onClick={() => generate()}>{generationStatus === "loading" ? <><Sparkles size={19} /> Astra is analyzing and formulating…</> : !unlocked ? <><LockKeyhole size={18} /> Subscribe to generate this elixir</> : !generationContext.profileReady ? <><LockKeyhole size={18} /> Complete profile to generate</> : useOnlyPantry ? <><Sparkles size={19} /> Review profile + pantry and generate</> : <><Sparkles size={19} /> Review profile + generate</>}</button><button className="ne-secondary alternate-formula" disabled={!unlocked || !generationContext.profileReady || generationStatus === "loading"} onClick={generateAlternate}><Sparkles size={18} /> Alternate ingredients</button><small>Alternate ingredients changes the preview only. Active beta testers have no daily smoothie-generation cap during testing.</small></div>
    </section>

    {generationMessage && <div className={`ne-alert ${["fallback", "blocked"].includes(generationStatus) ? "ne-alert-danger" : ""}`}><strong>{generationStatus === "fallback" ? "Rules-based fallback" : generationStatus === "blocked" ? "Safety gate active" : "Validated AI formulation"}:</strong> {generationMessage}</div>}
    {generatedRecipe?.medicationSafety && <div className={`ne-alert ${generatedRecipe.medicationSafety.reviewRequired ? "ne-alert-danger" : ""}`}><strong>Medication-aware review · {generatedRecipe.medicationSafety.status}:</strong> {generatedRecipe.medicationSafety.note}{generatedRecipe.medicationSafety.foodsAvoided?.length > 0 && <> Foods omitted during screening: {generatedRecipe.medicationSafety.foodsAvoided.join(", ")}.</>} Confirm individual compatibility with the medication label, pharmacist, or prescriber.</div>}
    {generatedRecipe && profile.medications && !generatedRecipe.medicationSafety && <div className="ne-alert ne-alert-danger"><strong>Medication review unavailable:</strong> Do not rely on this fallback formula for medication compatibility. Confirm it with a pharmacist.</div>}

    {recipe.safety.clinicianReviewRequired && <div className="ne-alert ne-alert-danger"><strong>Clinician review recommended.</strong> Your profile includes a condition or medicine that can require individualized nutrition limits.</div>}
    {recipe.safety.notices.map((notice) => <div className="ne-alert" key={notice}>{notice}</div>)}
    {recipe.batchNotice && <div className="ne-alert">{recipe.batchNotice}</div>}
    {generatedRecipe?.unmatchedPantry?.length > 0 && <div className="ne-alert">Not yet recognized: {generatedRecipe.unmatchedPantry.join(", ")}. Try common ingredient names or turn off pantry-only mode.</div>}
    {generatedRecipe?.pantryOnly && generatedRecipe.unusedPantry?.length > 0 && <div className="ne-alert"><strong>Kept available for another blend:</strong> {generatedRecipe.unusedPantry.join(", ")}. Astra selected a balanced subset instead of combining every pantry item.</div>}
    {recipe.fiberNotice && <div className="ne-alert"><strong>Fiber pacing:</strong> {recipe.fiberNotice}</div>}
    {recipe.incompleteFormula && generatedRecipe && <div className="ne-alert ne-alert-danger">Complete this pantry blend by adding {recipe.formulaNeeds.join(" and ")}.</div>}

    <section className="ne-recipe-grid">
      <div className="recipe-primary-column">
      <article className="ne-panel elixir-formula">
        <div className="formula-header"><div><p className="ne-kicker">{generatedRecipe?.pantryOnly ? "Pantry-only personalized formulation" : generatedRecipe ? "Personalized formulation" : useOnlyPantry ? "Planned profile + pantry smoothie preview" : "Planned profile-based smoothie preview"} · {formatYield(recipe.sizeOz, measurementSystem)}</p><h2>{recipe.name}</h2><p className="ne-muted">{recipe.description}</p>{!generatedRecipe && <p className="preview-explainer">This is the smoothie Astra plans to generate from your current intentions, profile, ingredient choices, and replacements.</p>}</div><div className="formula-vessel" aria-hidden="true"><span>{measurementSystem === "metric" ? Math.round(recipe.sizeOz * 29.5735) : recipe.sizeOz}</span><small>{measurementSystem === "metric" ? "mL" : "OZ"}</small></div></div>
        <div className="nutrition-grid"><div><strong>{recipe.nutrition.calories}</strong><span>calories</span></div><div><strong>{recipe.nutrition.protein}g</strong><span>protein</span></div><div><strong>{recipe.nutrition.fiber}g</strong><span>fiber</span></div><div><strong>{recipe.nutrition.totalSugar}g</strong><span>total sugar</span></div></div>
        <p className="ne-muted nutrition-note">Estimated for the full batch using standard ingredient averages. Check packaged-product labels; brands, scoop sizes, produce density, and substitutions change actual values.</p>
        <div className="ne-ingredient-list">{recipe.ingredients.map((ingredient, index) => <div key={`${ingredient.name}-${index}`}><span><small>{ingredient.group}</small>{ingredient.name}</span><strong>{formatIngredientMeasurement(ingredient.amount, ingredient.unit, measurementSystem)}</strong></div>)}</div>
        {recipe.substitutions.length > 0 && <p className="ne-muted">Substitutions: {recipe.substitutions.join("; ")}.</p>}
        <button onClick={saveRecipe} disabled={!unlocked || !generatedRecipe} className="ne-primary save-formula">{!unlocked || !generatedRecipe ? <><LockKeyhole size={17} /> Generate an elixir to save</> : saved ? "Saved to your library" : "Save generated recipe"}</button>{saved && <Link className="ne-secondary inline-block ml-2" to="/saved">Open library</Link>}{generatedRecipe && <div className="learning-feedback"><span>Help Astra learn from your experience:</span><button type="button" className="ne-secondary" onClick={() => recordRecipeFeedback("positive")}>Works for me</button><button type="button" className="ne-secondary" onClick={() => recordRecipeFeedback("negative")}>Not for me</button></div>}{feedbackStatus && <p className="learning-feedback-status" role="status">{feedbackStatus}</p>}
        {generatedRecipe && <KernelFeedbackContract kernel="smoothie" scope={storageScope} selection={recipe.name} ingredients={recipe.ingredients.map((ingredient) => ingredient.name)} disabled={!unlocked} />}
        <section className="blend-visualizer" style={blendVisualStyle} aria-label={`Visual preview of ${recipe.name}`}>
          <img className={`${visualStatus === "loading" ? "visual-loading" : ""} ingredient-matched`.trim()} src={recipe.visualUrl || ingredientVisualPreview} alt={recipe.visualUrl ? `AI-generated visual of ${recipe.name} based on its ingredients` : `Ingredient-derived preview of ${recipe.name}`} />
          <div className="blend-visualizer-shade" />
          <div className="blend-visualizer-copy"><span><Sparkles size={14} /> {visualStatus === "loading" ? "Ingredient preview · creating AI photograph" : recipe.visualUrl ? "AI ingredient-matched visual" : visualStatus === "error" ? "Ingredient-derived preview · AI photograph unavailable" : "Live ingredient-derived preview"}</span><strong>{recipe.name}</strong><small>{recipe.visualUrl ? "Generated from this formula’s ingredient list; actual color and texture still vary by brand, temperature, and blending." : "Color and texture are estimated directly from this formula and update when its ingredients change."}</small></div>
          <div className="blend-visualizer-orbit" aria-label="Ingredients represented in this visualization">{recipe.ingredients.slice(0, 6).map((ingredient) => <span key={ingredient.name}>{ingredient.name}</span>)}</div>
        </section>
      </article>
      <div className="under-image-cards">
        {(recipe.realityCheck || recipe.practicalTips.length > 0) && <div className="ne-panel alchemy-compact"><p className="ne-kicker">Practical guidance</p><h2>Make it work for you</h2>{recipe.realityCheck && <p className="ne-muted">{recipe.realityCheck}</p>}<ul className="ne-steps">{recipe.practicalTips.map((tip) => <li key={tip}>{tip}</li>)}</ul></div>}
        <div className="ne-panel pairing-card"><Waves size={26} /><h2>Pair the experience</h2><p className="ne-muted">Carry this smoothie into a listening ritual or preview a coordinated meal plan.</p><div className="pairing-card-actions"><Link className="ne-secondary inline-block mt-5" to={`/frequencies?goal=${encodeURIComponent(goal)}&source=smoothie`}>Enter Tier 2 preview</Link><Link className="ne-secondary inline-block mt-3" to={`/meals?goal=${encodeURIComponent(goal)}&source=smoothie`}>Preview Tier 3 meal pairing</Link></div></div>
        <div className="ne-panel alchemy-compact"><p className="ne-kicker">Blend sequence</p><h2>Alchemy method</h2><ol className="ne-steps">{recipe.preparation.map((step) => <li key={step}>{step}</li>)}</ol></div>
      </div>
      </div>
      <aside className="recipe-sidecar">
        <div className="ne-panel benefits-card"><p className="ne-kicker">Your smoothie assessment</p><h2>{recipe.assessment.type}</h2><p className="ne-muted">{recipe.assessment.summary}</p><div className="benefit-list">{recipe.assessment.highlights.map((item) => <div key={item.label}><strong>{item.label} · {item.level}</strong><p>{item.detail}</p></div>)}</div>{recipe.assessment.reflux && <div className="synergy-summary reflux-summary"><strong>Heartburn / reflux: {recipe.assessment.reflux.level}</strong><p>{recipe.assessment.reflux.summary}</p>{recipe.assessment.reflux.triggers.length > 0 && <p><b>Possible triggers:</b> {recipe.assessment.reflux.triggers.join(" ")}</p>}{recipe.assessment.reflux.adjustments.length > 0 && <p><b>Gentler options:</b> {recipe.assessment.reflux.adjustments.join(" ")}</p>}<small>Shown because reflux/GERD is saved in this profile. Trigger foods vary by person; this is educational screening, not a guarantee.</small></div>}</div>
        <details className="ne-panel benefits-card realm-disclosure" open><summary><span><small className="ne-kicker">Ingredient intelligence</small><strong>Why these ingredients were selected</strong></span><i>Explore</i></summary><div className="realm-disclosure-body"><div className="benefit-list">{recipe.benefits.map((item, index) => <div key={`${item.name}-${index}`}><strong>{item.name}</strong><p>{item.benefit}</p></div>)}</div>{recipe.whatHappens.length > 0 && <div className="synergy-summary"><strong>What may happen after you drink it</strong>{recipe.whatHappens.map((note) => <p key={note}>{note}</p>)}<strong>Quantum / molecular perspective</strong><p>{recipe.quantumContext}</p><small>For educational purposes only. This material does not predict an individual response and is not medical advice, diagnosis, or treatment.</small></div>}{recipe.nutritionIntelligence?.evidence?.studyReadiness && <div className="synergy-summary"><strong>Future-study evidence map</strong><p>{recipe.nutritionIntelligence.evidence.studyReadiness.status === "candidate-mechanisms-identified" ? "Published ingredient research identifies molecular or biomarker measurements that could inform a future controlled study of a standardized formula." : "Current matches establish food composition only; no formula-level molecular claim is made."}</p>{recipe.nutritionIntelligence.evidence.reproducibility && <p><b>Formula reproducibility:</b> {recipe.nutritionIntelligence.evidence.reproducibility.verifiedIdentityCount} of {recipe.nutritionIntelligence.evidence.reproducibility.totalIngredientCount} ingredients have verified generic USDA identities; {recipe.nutritionIntelligence.evidence.reproducibility.normalizedMassCount} have preparation-specific gram weights. Unresolved products remain label-dependent.</p>}{recipe.nutritionIntelligence.evidence.verifiedNutrientEstimate?.calculatedIngredientCount > 0 && <p><b>Verified USDA subtotal ({recipe.nutritionIntelligence.evidence.verifiedNutrientEstimate.coveragePercent}% coverage):</b> {recipe.nutritionIntelligence.evidence.verifiedNutrientEstimate.totals.energyKcal} kcal, {recipe.nutritionIntelligence.evidence.verifiedNutrientEstimate.totals.proteinG} g protein, {recipe.nutritionIntelligence.evidence.verifiedNutrientEstimate.totals.fiberG} g fiber, and {recipe.nutritionIntelligence.evidence.verifiedNutrientEstimate.totals.sugarG} g sugar. This is a subtotal when coverage is below 100%, not a whole-recipe total.</p>}{recipe.nutritionIntelligence.evidence.studyReadiness.candidateStudies.slice(0, 3).map((study) => <p key={`${study.ingredient}-${study.pmid}`}><b>{study.ingredient} · {study.level.replaceAll("_", " ")}:</b> {study.finding} <a href={`https://pubmed.ncbi.nlm.nih.gov/${study.pmid}/`} target="_blank" rel="noreferrer">PMID {study.pmid}</a></p>)}<small>{recipe.nutritionIntelligence.evidence.studyReadiness.boundary} Evidence catalog {recipe.nutritionIntelligence.evidence.catalogVersion}, released {recipe.nutritionIntelligence.evidence.catalogReleased}.</small></div>}</div></details>
        {recipe.optionalPowerUps.length > 0 && <div className="ne-panel benefits-card"><p className="ne-kicker">Optional power-ups</p><h2>If you have them</h2><div className="benefit-list">{recipe.optionalPowerUps.map((item) => <div key={item.name}><strong>{item.name}</strong><p>{item.reason}</p></div>)}</div></div>}
      </aside>
    </section>

    <footer className="elixir-footer"><span className="notranslate" translate="no">Nature&apos;s Elixirz</span><p>Whole-food wellness guidance · Not medical care</p><div><Link to="/account">Privacy & profile</Link><Link to="/premium">Memberships</Link><Link to="/astra">Ask Astra</Link></div></footer>
  </main><Link className="floating-astra" to="/astra" aria-label="Open Astra Guide"><span><MessageCircle size={23} /></span><div><strong>Ask Astra</strong><small>Your wellness guide</small></div></Link></div>;
}
