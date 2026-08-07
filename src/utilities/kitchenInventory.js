const KEY_PREFIX = "naturesElixirz.kitchenInventory.v2";
const EMPTY = { pantry: [], fridge: [], freezer: [] };

const keyFor = (scope) => `${KEY_PREFIX}.${String(scope || "guest").replace(/[^a-zA-Z0-9_-]/g, "_")}`;

const clean = (items = []) => [...new Map(items
  .map((item) => String(item).trim())
  .filter(Boolean)
  .map((item) => [item.toLowerCase(), item])).values()];

export function getKitchenInventory(scope) {
  try {
    const saved = JSON.parse(localStorage.getItem(keyFor(scope)));
    return {
      pantry: clean(saved?.pantry),
      fridge: clean(saved?.fridge),
      freezer: clean(saved?.freezer),
    };
  } catch {
    return { ...EMPTY };
  }
}

export function saveKitchenInventory(inventory, scope) {
  const safe = {
    pantry: clean(inventory?.pantry),
    fridge: clean(inventory?.fridge),
    freezer: clean(inventory?.freezer),
  };
  localStorage.setItem(keyFor(scope), JSON.stringify(safe));
  notifyCloudChange(scope);
  return safe;
}

export function restoreKitchenInventory(inventory, scope) {
  const safe = {
    pantry: clean(inventory?.pantry),
    fridge: clean(inventory?.fridge),
    freezer: clean(inventory?.freezer),
  };
  localStorage.setItem(keyFor(scope), JSON.stringify(safe));
  return safe;
}

export function allKitchenIngredients(inventory) {
  return clean([...inventory.pantry, ...inventory.fridge, ...inventory.freezer]);
}
import { notifyCloudChange } from "./cloudChange";
