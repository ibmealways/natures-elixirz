import React, { useEffect, useMemo, useRef, useState } from "react";
import { Database, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { getNutritionLabels, NUTRIENT_FIELDS, saveNutritionLabels, validateLabelEntry } from "../utilities/nutritionLabelRegistry";
import "../styles/nutritionFactsRegistry.css";
import "../styles/nutritionFactsFormulaReview.css";

const emptyForm = () => ({ brand: "", productName: "", ingredientName: "", aliases: "", servingAmount: "1", servingUnit: "scoop", servingGrams: "", lotOrVersion: "", nutrients: Object.fromEntries(NUTRIENT_FIELDS.map(([key]) => [key, ""])) });

const normalize = (value) => String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const packageLabelRecommended = (name) => /protein|collagen|powder|yogurt|milk|beverage|juice|blend|butter|fortified|cereal|bar|canned|v8/i.test(String(name));

export default function NutritionFactsRegistry({ scope, pantryItems = [], activeIngredients = [], activeFormulaName = "" }) {
  const registryRef = useRef(null);
  const [labels, setLabels] = useState(() => getNutritionLabels(scope));
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState("");
  useEffect(() => { setLabels(getNutritionLabels(scope)); }, [scope]);
  useEffect(() => { if (activeFormulaName && registryRef.current) registryRef.current.open = true; }, [activeFormulaName]);
  const formulaReview = useMemo(() => activeIngredients.map((ingredient) => {
    const name = String(ingredient?.name || ingredient || "").trim();
    const match = labels.find((label) => [label.ingredientName, label.productName, `${label.brand} ${label.productName}`, ...(label.aliases || [])].some((candidate) => normalize(candidate) === normalize(name)));
    return { name, quantity: ingredient?.quantity || `${ingredient?.amount ?? ""} ${ingredient?.unit || ""}`.trim(), match, labelRecommended: packageLabelRecommended(name) };
  }).filter((item) => item.name), [activeIngredients, labels]);
  const needsLabel = formulaReview.filter((item) => item.labelRecommended && !item.match);
  const loadIngredient = (ingredient) => {
    setForm((current) => ({ ...current, ingredientName: ingredient.name, productName: ingredient.name }));
    setMessage(`Loaded ${ingredient.name}. Enter the exact brand and values printed on its package.`);
  };
  const updateNutrient = (key, value) => setForm((current) => ({ ...current, nutrients: { ...current.nutrients, [key]: value } }));
  const submit = (event) => {
    event.preventDefault();
    try {
      const next = validateLabelEntry(form);
      const saved = saveNutritionLabels([...labels.filter((item) => item.id !== next.id), next], scope);
      setLabels(saved); setForm(emptyForm()); setMessage(`${next.brand} ${next.productName} was label-validated and connected to ${next.ingredientName}.`);
    } catch (error) { setMessage(error.message); }
  };
  const remove = (id) => { const saved = saveNutritionLabels(labels.filter((item) => item.id !== id), scope); setLabels(saved); setMessage("Nutrition Facts record removed."); };
  return <details ref={registryRef} className="nutrition-facts-registry">
    <summary><Database size={21} /><span><strong>Verified Nutrition Facts intake</strong><small>{activeFormulaName ? `Reviewing ${formulaReview.length} ingredients in ${activeFormulaName}` : "Connect branded foods, powders, fortified products, and exact scoop sizes"}</small></span><em>{needsLabel.length ? `${needsLabel.length} need label data` : `${labels.length} saved label${labels.length === 1 ? "" : "s"}`}</em></summary>
    <div className="label-registry-body">
      <div className="label-boundary"><ShieldCheck size={18} /><p><strong>What “verified” means here:</strong> required fields, units, ranges, and serving math are validated against what you enter from the package. Nature&apos;s Elixirz does not claim independent laboratory verification. Update the record whenever the package formula or scoop changes.</p></div>
      {formulaReview.length > 0 && <section className="active-formula-label-review"><header><div><small>Current generated formula</small><strong>{activeFormulaName}</strong></div><span>{formulaReview.filter((item) => item.match).length} label-matched · {needsLabel.length} need package data</span></header><div>{formulaReview.map((ingredient) => <article className={ingredient.match ? "is-matched" : ingredient.labelRecommended ? "needs-label" : "reference-ready"} key={ingredient.name}><div><strong>{ingredient.name}</strong><small>{ingredient.quantity || "Quantity pending"}</small></div>{ingredient.match ? <span>Label matched</span> : ingredient.labelRecommended ? <button type="button" onClick={() => loadIngredient(ingredient)}>Enter package label</button> : <span>Generic reference</span>}</article>)}</div><p>Generic produce can use a matched reference-food estimate. Packaged and fortified products require their exact Nutrition Facts panel before Astra can calculate them precisely.</p></section>}
      {labels.length > 0 && <div className="saved-label-grid">{labels.map((label) => <article key={label.id}><div><strong>{label.brand} · {label.productName}</strong><span>Linked as {label.ingredientName}</span><small>{label.servingAmount} {label.servingUnit} = {label.servingGrams} g · checked {new Date(label.labelCheckedAt).toLocaleDateString()}</small></div><button type="button" onClick={() => remove(label.id)} aria-label={`Remove ${label.productName}`}><Trash2 size={15} /></button></article>)}</div>}
      <form onSubmit={submit}>
        <div className="label-identity-grid">
          <label><span>Brand</span><input required value={form.brand} onChange={(event) => setForm({ ...form, brand: event.target.value })} placeholder="Example: Brand name" /></label>
          <label><span>Product name</span><input required value={form.productName} onChange={(event) => setForm({ ...form, productName: event.target.value })} placeholder="Example: Hemp protein powder" /></label>
          <label><span>Linked pantry ingredient</span><input required list="nutrition-pantry-items" value={form.ingredientName} onChange={(event) => setForm({ ...form, ingredientName: event.target.value })} placeholder="Hemp protein" /><datalist id="nutrition-pantry-items">{pantryItems.map((item) => <option value={item} key={item} />)}</datalist></label>
          <label><span>Other exact names · optional</span><input value={form.aliases} onChange={(event) => setForm({ ...form, aliases: event.target.value })} placeholder="Comma-separated aliases" /></label>
          <label><span>Serving amount</span><input required min="0.01" step="0.01" type="number" value={form.servingAmount} onChange={(event) => setForm({ ...form, servingAmount: event.target.value })} /></label>
          <label><span>Serving unit</span><select value={form.servingUnit} onChange={(event) => setForm({ ...form, servingUnit: event.target.value })}><option>scoop</option><option>cup</option><option>tbsp</option><option>tsp</option><option>piece</option><option>slice</option><option>can</option><option>g</option><option>oz</option></select></label>
          <label><span>Serving weight · grams</span><input required min="0.1" max="2000" step="0.1" type="number" value={form.servingGrams} onChange={(event) => setForm({ ...form, servingGrams: event.target.value })} placeholder="30" /></label>
          <label><span>Lot / formula version · optional</span><input value={form.lotOrVersion} onChange={(event) => setForm({ ...form, lotOrVersion: event.target.value })} /></label>
        </div>
        <div className="label-nutrient-grid">{NUTRIENT_FIELDS.map(([key, label, unit, required]) => <label key={key}><span>{label} <small>{unit}{required ? " · required" : ""}</small></span><input required={required} min="0" step="0.01" type="number" value={form.nutrients[key]} onChange={(event) => updateNutrient(key, event.target.value)} /></label>)}</div>
        <button className="save-nutrition-label" type="submit"><Plus size={17} /> Validate and save Nutrition Facts</button>
        {message && <p className="label-registry-message" role="status">{message}</p>}
      </form>
    </div>
  </details>;
}
