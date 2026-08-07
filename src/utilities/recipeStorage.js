const KEY_PREFIX = "naturesElixirz.recipes.v2";
const keyFor = (scope) => `${KEY_PREFIX}.${String(scope || "guest").replace(/[^a-zA-Z0-9_-]/g, "_")}`;

export function getSavedRecipes(scope) {
  try {
    const key = keyFor(scope);
    const recipes = JSON.parse(localStorage.getItem(key));
    if (!Array.isArray(recipes)) return [];
    const migrated = recipes.map((recipe) => ({ ...recipe, id: recipe.id || crypto.randomUUID() }));
    if (migrated.some((recipe, index) => recipe.id !== recipes[index]?.id)) localStorage.setItem(key, JSON.stringify(migrated));
    return migrated;
  } catch {
    return [];
  }
}
export function saveRecipe(recipe, scope) {
  const entry = { ...recipe, id: crypto.randomUUID(), savedAt: new Date().toISOString() };
  localStorage.setItem(keyFor(scope), JSON.stringify([...getSavedRecipes(scope), entry].slice(-30)));
  notifyCloudChange(scope);
  return entry;
}
export function deleteRecipe(id, scope) {
  const recipes = getSavedRecipes(scope).filter((recipe) => recipe.id !== id);
  localStorage.setItem(keyFor(scope), JSON.stringify(recipes));
  notifyCloudChange(scope);
  return recipes;
}

export function restoreSavedRecipes(recipes, scope) {
  const safe = Array.isArray(recipes) ? recipes.slice(-30) : [];
  localStorage.setItem(keyFor(scope), JSON.stringify(safe));
  return safe;
}
import { notifyCloudChange } from "./cloudChange";
