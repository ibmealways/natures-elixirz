export const SELECTABLE_KERNELS = ["smoothies", "frequencies", "meals", "movement"];

export const LEGACY_KERNELS_BY_TIER = {
  1: ["smoothies"],
  2: ["smoothies", "frequencies"],
  3: ["smoothies", "frequencies", "meals"],
  4: [...SELECTABLE_KERNELS],
  5: [...SELECTABLE_KERNELS, "vip"],
};

export function sanitizeKernelIds(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map(String).filter((id) => SELECTABLE_KERNELS.includes(id)))];
}

export function kernelsForEntitlement(entitlement = {}) {
  const explicit = sanitizeKernelIds(entitlement.kernels || entitlement.subscriptionKernels);
  if (explicit.length) return explicit;
  return LEGACY_KERNELS_BY_TIER[Math.max(0, Math.min(5, Number(entitlement.tier) || 0))] || [];
}

export function profileHasKernelAccess(profile = {}, kernelId) {
  if (!SELECTABLE_KERNELS.includes(kernelId) && kernelId !== "vip") return false;
  if (!["active", "trialing"].includes(profile.subscriptionStatus)) return false;
  return kernelsForEntitlement(profile).includes(kernelId);
}
