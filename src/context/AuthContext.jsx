import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth, firebaseEmulatorReadiness, isFirebaseConfigured, isFirebaseEmulatorMode } from "../firebase";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(auth));
  const [emulatorStatus, setEmulatorStatus] = useState(isFirebaseEmulatorMode ? "checking" : "off");

  useEffect(() => {
    if (!auth) return undefined;
    return onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!isFirebaseEmulatorMode) return undefined;
    let active = true;
    firebaseEmulatorReadiness.then(() => {
      if (active) setEmulatorStatus("ready");
    }).catch((error) => {
      if (active) setEmulatorStatus(error.message || "Local Firebase emulators are unavailable.");
    });
    return () => { active = false; };
  }, []);

  const value = useMemo(() => ({
    user,
    loading,
    configured: isFirebaseConfigured,
    emulatorMode: isFirebaseEmulatorMode,
    emulatorStatus,
    signOut: () => auth ? signOut(auth) : Promise.resolve(),
  }), [user, loading, emulatorStatus]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
