export function notifyCloudChange(scope) {
  if (typeof window === "undefined" || typeof CustomEvent === "undefined") return;
  window.dispatchEvent(new CustomEvent("naturesElixirz:data-changed", { detail: { scope } }));
}

export function notifyCloudRestore(scope) {
  if (typeof window === "undefined" || typeof CustomEvent === "undefined") return;
  window.dispatchEvent(new CustomEvent("naturesElixirz:data-restored", { detail: { scope } }));
}
