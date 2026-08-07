// src/utilities/mrviStorage.js
// ===========================================================
// MRVI Storage — Local, user-scoped, privacy-first.
// Stores ONLY numeric metrics + derived outputs. No raw video.
// ===========================================================

const KEY_PREFIX = "naturesElixirz.mrvi.profile.v2";

function storageKey(scope) {
  const safeScope = String(scope || "guest").replace(/[^a-zA-Z0-9_-]/g, "_");
  return `${KEY_PREFIX}.${safeScope}`;
}

function safeParse(json, fallback) {
  try {
    const v = JSON.parse(json);
    return v ?? fallback;
  } catch {
    return fallback;
  }
}

export function getMRVIProfile(scope) {
  const raw = localStorage.getItem(storageKey(scope));
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

export function saveMRVIProfile(profile, scope) {
  localStorage.setItem(storageKey(scope), JSON.stringify(profile));
  notifyCloudChange(scope);
  return profile;
}

export function restoreMRVIProfile(value, scope) {
  const base = getMRVIProfile(scope);
  const safe = value && typeof value === "object" ? value : {};
  const scans = Array.isArray(safe.scans) ? safe.scans.slice(-120) : [];
  const restored = {
    ...base,
    ...safe,
    scans,
    settings: { ...base.settings, ...(safe.settings || {}) },
  };
  localStorage.setItem(storageKey(scope), JSON.stringify(restored));
  window.dispatchEvent(new CustomEvent("naturesElixirz:movement-restored"));
  return restored;
}

export function setMRVIConsent(consent, scope) {
  const p = getMRVIProfile(scope);
  p.consent = Boolean(consent);
  if (!p.createdAt) p.createdAt = new Date().toISOString();
  return saveMRVIProfile(p, scope);
}

export function setMRVIBaseline(baselineMetrics, scope) {
  const p = getMRVIProfile(scope);
  p.baseline = { ...baselineMetrics };
  p.baselineSetAt = new Date().toISOString();
  return saveMRVIProfile(p, scope);
}

export function addMRVIScan({ timestamp, metrics, output }, scope) {
  const p = getMRVIProfile(scope);
  const scan = { timestamp, metrics, output };
  p.scans = Array.isArray(p.scans) ? p.scans : [];
  p.scans.push(scan);

  // retention
  const retain = Number(p.settings?.retainScans ?? 120);
  if (p.scans.length > retain) {
    p.scans = p.scans.slice(-retain);
  }

  return saveMRVIProfile(p, scope);
}

export function resetMRVIProfile(scope) {
  localStorage.removeItem(storageKey(scope));
  notifyCloudChange(scope);
  return getMRVIProfile(scope);
}
import { notifyCloudChange } from "./cloudChange";
