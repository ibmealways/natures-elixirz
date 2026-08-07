import { allKitchenIngredients, getKitchenInventory } from "./kitchenInventory";
import { notifyCloudChange } from "./cloudChange";

const KEY_PREFIX = "naturesElixirz.mealKitchen.v1";
const empty = { pantry: [], fridge: [], freezer: [] };
const clean = (items = []) => [...new Map(items.map((item) => String(item).trim()).filter(Boolean).map((item) => [item.toLowerCase(), item])).values()];
const keyFor = (scope = "guest") => `${KEY_PREFIX}.${String(scope).replace(/[^a-zA-Z0-9_-]/g, "_")}`;

export function getMealKitchenInventory(scope) {
  try {
    const saved = JSON.parse(localStorage.getItem(keyFor(scope)) || "{}");
    return { pantry: clean(saved.pantry), fridge: clean(saved.fridge), freezer: clean(saved.freezer) };
  } catch { return { ...empty }; }
}

export function saveMealKitchenInventory(inventory, scope) {
  const safe = { pantry: clean(inventory.pantry), fridge: clean(inventory.fridge), freezer: clean(inventory.freezer) };
  localStorage.setItem(keyFor(scope), JSON.stringify(safe));
  notifyCloudChange(scope);
  return safe;
}

export function restoreMealKitchenInventory(inventory, scope) {
  const safe = { pantry: clean(inventory?.pantry), fridge: clean(inventory?.fridge), freezer: clean(inventory?.freezer) };
  localStorage.setItem(keyFor(scope), JSON.stringify(safe));
  return safe;
}

export function getMealPlanningIngredients(scope) {
  const mealInventory = getMealKitchenInventory(scope);
  const smoothieInventory = getKitchenInventory(scope);
  return clean([...allKitchenIngredients(smoothieInventory), ...mealInventory.pantry, ...mealInventory.fridge, ...mealInventory.freezer]);
}
