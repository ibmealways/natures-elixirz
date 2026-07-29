// src/context/MRVIContext.jsx
import React, { createContext, useContext, useMemo, useState, useCallback } from "react";
import { evaluateMRVI } from "../utilities/mrviEngine";
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
  const [profile, setProfile] = useState(() => getMRVIProfile());

  const refresh = useCallback(() => setProfile(getMRVIProfile()), []);

  const giveConsent = useCallback((consent) => {
    setMRVIConsent(consent);
    refresh();
  }, [refresh]);

  const setBaseline = useCallback((baselineMetrics) => {
    setMRVIBaseline(baselineMetrics);
    refresh();
  }, [refresh]);

  const addScanFromMetrics = useCallback((metrics) => {
    const p = getMRVIProfile();
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
      });
    }

    const latestProfile = getMRVIProfile();
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

    addMRVIScan({ timestamp, metrics, output });
    refresh();
    return output;
  }, [refresh]);

  const setSettings = useCallback((settingsPatch) => {
    const p = getMRVIProfile();
    p.settings = { ...(p.settings || {}), ...(settingsPatch || {}) };
    saveMRVIProfile(p);
    refresh();
  }, [refresh]);

  const resetAll = useCallback(() => {
    resetMRVIProfile();
    refresh();
  }, [refresh]);

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
