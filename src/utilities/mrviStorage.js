// src/utilities/mrviStorage.js
// ===========================================================
// MRVI Storage — Local, user-scoped, privacy-first.
// Stores ONLY numeric metrics + derived outputs. No raw video.
// ===========================================================

const KEY = "naturesElixirz.mrvi.profile.v1";

function safeParse(json, fallback) {
  try {
    const v = JSON.parse(json);
    return v ?? fallback;
  } catch {
    return fallback;
  }
}

export function getMRVIProfile() {
  const raw = localStorage.getItem(KEY);
  const base = {
    consent: false,
    createdAt: null,
    baseline: null, // { mobility:1, balance:1, ... }
    scans: [],      // [{ timestamp, metrics, output }]
    settings: {
      retainScans: 120,
      baselineLockDays: 14,
    },
  };

  if (!raw) return base;
  return { ...base, ...safeParse(raw, base) };
}

export function saveMRVIProfile(profile) {
  localStorage.setItem(KEY, JSON.stringify(profile));
  return profile;
}

export function setMRVIConsent(consent) {
  const p = getMRVIProfile();
  p.consent = Boolean(consent);
  if (!p.createdAt) p.createdAt = new Date().toISOString();
  return saveMRVIProfile(p);
}

export function setMRVIBaseline(baselineMetrics) {
  const p = getMRVIProfile();
  p.baseline = { ...baselineMetrics };
  p.baselineSetAt = new Date().toISOString();
  return saveMRVIProfile(p);
}

export function addMRVIScan({ timestamp, metrics, output }) {
  const p = getMRVIProfile();
  const scan = { timestamp, metrics, output };
  p.scans = Array.isArray(p.scans) ? p.scans : [];
  p.scans.push(scan);

  // retention
  const retain = Number(p.settings?.retainScans ?? 120);
  if (p.scans.length > retain) {
    p.scans = p.scans.slice(-retain);
  }

  return saveMRVIProfile(p);
}

export function resetMRVIProfile() {
  localStorage.removeItem(KEY);
  return getMRVIProfile();
}
