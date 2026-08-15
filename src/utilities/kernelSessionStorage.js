import { notifyCloudChange } from "./cloudChange";

const PREFIX = "naturesElixirz.kernelSession.v1";
const keyFor = (scope, kernel) => `${PREFIX}.${String(scope || "guest").replace(/[^a-zA-Z0-9_-]/g, "_")}.${kernel}`;

export function getKernelSession(scope, kernel) {
  try {
    const value = JSON.parse(localStorage.getItem(keyFor(scope, kernel)) || "null");
    return value && typeof value === "object" ? value : null;
  } catch {
    return null;
  }
}

export function saveKernelSession(scope, kernel, value) {
  try {
    localStorage.setItem(keyFor(scope, kernel), JSON.stringify({ ...value, restoredAt: new Date().toISOString() }));
    notifyCloudChange(scope);
    return true;
  } catch {
    return false;
  }
}

export function getKernelSessions(scope) {
  return {
    smoothie: getKernelSession(scope, "smoothie"),
    meals: getKernelSession(scope, "meals"),
  };
}

export function restoreKernelSessions(sessions, scope) {
  if (!sessions || typeof sessions !== "object") return;
  for (const kernel of ["smoothie", "meals"]) {
    if (sessions[kernel] && typeof sessions[kernel] === "object") {
      localStorage.setItem(keyFor(scope, kernel), JSON.stringify(sessions[kernel]));
    }
  }
}

export function clearKernelSession(scope, kernel) {
  try { localStorage.removeItem(keyFor(scope, kernel)); } catch { /* Browser storage unavailable. */ }
}
