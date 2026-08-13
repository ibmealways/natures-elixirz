const KEY = "naturesElixirz.astraKernelTransfer.v1";
const keyFor = (scope = "guest") => `${KEY}.${scope}`;

const VALID_TYPES = new Set(["smoothie", "meal_plan"]);
const VALID_GROUPS = new Set(["Fruit", "Vegetable", "Protein", "Seed", "Liquid", "Spice", "Grain", "Nut butter", "Sweetener"]);
const VALID_UNITS = new Set(["cup", "tbsp", "tsp", "scoop", "piece"]);

export function sanitizeAstraKernelTransfer(value = {}) {
  if (!VALID_TYPES.has(value.type)) return null;
  const ingredients = (Array.isArray(value.ingredients) ? value.ingredients : []).slice(0, 24).map((item) => ({
    name: String(item?.name || "").trim().slice(0, 80),
    amount: Math.max(0.01, Math.min(8, Number(item?.amount) || 1)),
    unit: VALID_UNITS.has(item?.unit) ? item.unit : "cup",
    group: VALID_GROUPS.has(item?.group) ? item.group : "Vegetable",
    reason: String(item?.reason || "Selected in Astra Chat for subscriber review.").trim().slice(0, 180),
  })).filter((item) => item.name);
  if (value.type === "smoothie" && ingredients.length < 5) return null;
  return {
    id: String(value.id || globalThis.crypto?.randomUUID?.() || Date.now()),
    type: value.type,
    title: String(value.title || (value.type === "smoothie" ? "Astra smoothie transfer" : "Astra meal-plan transfer")).trim().slice(0, 100),
    goal: String(value.goal || "general").trim().slice(0, 40),
    sizeOz: Math.max(8, Math.min(64, Number(value.sizeOz) || 16)),
    days: Math.max(1, Math.min(7, Number(value.days) || 1)),
    ingredients,
    notes: (Array.isArray(value.notes) ? value.notes : []).slice(0, 8).map((note) => String(note).trim().slice(0, 220)).filter(Boolean),
    createdAt: new Date().toISOString(),
  };
}

export function saveAstraKernelTransfer(value, scope = "guest") {
  const safe = sanitizeAstraKernelTransfer(value);
  if (!safe) throw new Error("Astra did not provide a complete Kernel transfer.");
  localStorage.setItem(keyFor(scope), JSON.stringify(safe));
  sessionStorage.setItem(keyFor(scope), JSON.stringify(safe));
  return safe;
}

export function getAstraKernelTransfer(scope = "guest", expectedType) {
  for (const storage of [sessionStorage, localStorage]) {
    try {
      const safe = sanitizeAstraKernelTransfer(JSON.parse(storage.getItem(keyFor(scope)) || "null"));
      if (safe && (!expectedType || safe.type === expectedType)) return safe;
    } catch { /* ignore malformed storage */ }
  }
  return null;
}

export function clearAstraKernelTransfer(scope = "guest") {
  sessionStorage.removeItem(keyFor(scope));
  localStorage.removeItem(keyFor(scope));
}
