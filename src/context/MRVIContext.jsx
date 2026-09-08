// src/context/MRVIContext.jsx
import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import { evaluateMRVI } from "../utilities/mrviEngine";
import { useAuth } from "./AuthContext";
import {
  getMRVIProfile,
  saveMRVIProfile,
  setMRVIConsent,
  setMRVIBaseline,
  addMRVIScan,
  resetMRVIProfile,
} from "../utilities/mrviStorage";

const MRVIContext = createContext(null);

export function MRVIProvider({ children }) {
  const { user, loading } = useAuth();
  const storageScope = user?.uid || "guest";
  const [profile, setProfile] = useState(() => getMRVIProfile("guest"));

  const refresh = useCallback(() => setProfile(getMRVIProfile(storageScope)), [storageScope]);
  useEffect(() => {
    if (!loading) refresh();
  }, [loading, refresh]);
  useEffect(() => {
    window.addEventListener("naturesElixirz:movement-restored", refresh);
    return () => window.removeEventListener("naturesElixirz:movement-restored", refresh);
  }, [refresh]);

  const giveConsent = useCallback((consent) => {
    setMRVIConsent(consent, storageScope);
    refresh();
  }, [refresh, storageScope]);

  const setBaseline = useCallback((baselineMetrics) => {
    setMRVIBaseline(baselineMetrics, storageScope);
    refresh();
  }, [refresh, storageScope]);

  const addScanFromMetrics = useCallback((metrics) => {
    const p = getMRVIProfile(storageScope);
    const timestamp = new Date().toISOString();

    if (!p.consent) {
      throw new Error("MRVI consent is required before adding scans.");
    }

    // If no baseline, first scan becomes baseline (v1 behavior)
    if (!p.baseline) {
      setMRVIBaseline({
        mobility: 1,
        balance: 1,
        symmetry: 1,
        energyFlow: 1,
        smoothness: 1,
        ...metrics,
      }, storageScope);
    }

    const latestProfile = getMRVIProfile(storageScope);
    const baseline = latestProfile.baseline;

    const history = (latestProfile.scans || []).map((s) => ({
      timestamp: s.timestamp,
      metrics: s.metrics,
    }));

    const output = evaluateMRVI({
      timestamp,
      metrics,
      baseline,
      history,
    });

    addMRVIScan({ timestamp, metrics, output }, storageScope);
    refresh();
    return output;
  }, [refresh, storageScope]);

  const setSettings = useCallback((settingsPatch) => {
    const p = getMRVIProfile(storageScope);
    p.settings = { ...(p.settings || {}), ...(settingsPatch || {}) };
    saveMRVIProfile(p, storageScope);
    refresh();
  }, [refresh, storageScope]);

  const resetAll = useCallback(() => {
    resetMRVIProfile(storageScope);
    refresh();
  }, [refresh, storageScope]);

  const latestScan = useMemo(() => {
    const scans = profile?.scans || [];
    return scans.length ? scans[scans.length - 1] : null;
  }, [profile]);

  const value = useMemo(() => ({
    profile,
    latestScan,
    giveConsent,
    setBaseline,
    addScanFromMetrics,
    setSettings,
    resetAll,
    refresh,
  }), [profile, latestScan, giveConsent, setBaseline, addScanFromMetrics, setSettings, resetAll, refresh]);

  return <MRVIContext.Provider value={value}>{children}</MRVIContext.Provider>;
}

export function useMRVI() {
  const ctx = useContext(MRVIContext);
  if (!ctx) throw new Error("useMRVI must be used inside MRVIProvider");
  return ctx;
}
