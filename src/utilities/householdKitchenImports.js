const STORAGE_PREFIX = "natures-elixirz:household-kitchen-imports:v1";

const storageKey = (userId) => `${STORAGE_PREFIX}:${encodeURIComponent(String(userId || "").trim())}`;

const resolveStorage = (storage) => {
  if (storage) return storage;
  if (typeof window === "undefined") return null;
  return window.localStorage;
};

export const getAcknowledgedHouseholdKitchenImports = (userId, storage) => {
  if (!String(userId || "").trim()) return [];
  const target = resolveStorage(storage);
  if (!target) return [];

  try {
    const saved = JSON.parse(target.getItem(storageKey(userId)) || "[]");
    if (!Array.isArray(saved)) return [];
    return [...new Set(saved.map((value) => String(value || "").trim()).filter(Boolean))];
  } catch {
    return [];
  }
};

export const acknowledgeHouseholdKitchenImport = (userId, sourceScope, storage) => {
  const normalizedUserId = String(userId || "").trim();
  const normalizedSource = String(sourceScope || "").trim();
  if (!normalizedUserId || !normalizedSource) return [];

  const target = resolveStorage(storage);
  const acknowledged = getAcknowledgedHouseholdKitchenImports(normalizedUserId, target);
  if (!target || acknowledged.includes(normalizedSource)) return acknowledged;

  const next = [...acknowledged, normalizedSource];
  try {
    target.setItem(storageKey(normalizedUserId), JSON.stringify(next));
  } catch {
    return acknowledged;
  }
  return next;
};
