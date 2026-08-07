const PREFIX = "naturesElixirz:smoothie-customization:v1";

const storageKey = (scope, goals) => `${PREFIX}:${scope || "guest"}:${[...(goals || [])].sort().join("+") || "general"}`;

export function getSmoothiePreference(scope, goals) {
  try {
    const value = JSON.parse(localStorage.getItem(storageKey(scope, goals)) || "null");
    return value && typeof value === "object"
      ? { excludedNames: Array.isArray(value.excludedNames) ? value.excludedNames : [], ingredientReplacements: value.ingredientReplacements || {} }
      : { excludedNames: [], ingredientReplacements: {} };
  } catch {
    return { excludedNames: [], ingredientReplacements: {} };
  }
}

export function saveSmoothiePreference(scope, goals, preference) {
  localStorage.setItem(storageKey(scope, goals), JSON.stringify({
    excludedNames: [...new Set(preference.excludedNames || [])],
    ingredientReplacements: preference.ingredientReplacements || {},
  }));
}
