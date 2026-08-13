import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import GlowNav from "../components/GlowNav";
import { deleteRecipe, getSavedRecipes } from "../utilities/recipeStorage";
import { useAuth } from "../context/AuthContext";
import "../styles/wellnessOS.css";

export default function SavedSmoothies() {
  const { user } = useAuth();
  const storageScope = user?.uid || "guest";
  const [recipes, setRecipes] = useState(() => getSavedRecipes(storageScope).slice().reverse());
  useEffect(() => {
    const refresh = (event) => {
      if (!event.detail?.scope || event.detail.scope === storageScope) setRecipes(getSavedRecipes(storageScope).slice().reverse());
    };
    refresh({ detail: { scope: storageScope } });
    window.addEventListener("naturesElixirz:data-restored", refresh);
    return () => window.removeEventListener("naturesElixirz:data-restored", refresh);
  }, [storageScope]);
  const remove = (id) => setRecipes(deleteRecipe(id, storageScope).slice().reverse());
  return <div className="cosmic-page-shell"><GlowNav /><main className="ne-page">
    <header className="ne-hero"><p className="ne-kicker">Tier 1 · Your library</p><h1>Saved smoothies</h1><p>Return to recipes you enjoyed and view the exact formulation you saved.</p></header>
    {!recipes.length ? <div className="ne-panel text-center"><h2>No saved recipes yet</h2><Link className="ne-primary inline-block mt-5" to="/smoothie">Build a smoothie</Link></div> :
      <div className="saved-grid">{recipes.map((recipe) => <article className="ne-panel" key={recipe.id || recipe.savedAt}><p className="ne-kicker">{recipe.sizeOz} oz · {recipe.servings || 1} serving(s)</p><h2>{recipe.name}</h2>{recipe.assessment && <div className="saved-assessment"><strong>{recipe.assessment.type}</strong><p className="ne-muted">{recipe.assessment.summary}</p>{recipe.assessment.reflux && <p><b>Heartburn / reflux:</b> {recipe.assessment.reflux.level}</p>}</div>}<div className="ne-ingredient-list">{recipe.ingredients.map((item) => <div key={item.name}><span>{item.name}</span><strong>{item.amount} {item.unit}</strong></div>)}</div><button className="ne-secondary" onClick={() => remove(recipe.id)}>Delete recipe</button></article>)}</div>}
  </main></div>;
}
