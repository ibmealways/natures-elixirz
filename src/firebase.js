import { initializeApp } from "firebase/app";
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from "firebase/app-check";
import { connectAuthEmulator, getAuth } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";
import { connectFunctionsEmulator, getFunctions } from "firebase/functions";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const isFirebaseConfigured = Object.values(firebaseConfig).every(Boolean);

const emulatorModeRequested = import.meta.env.VITE_USE_FIREBASE_EMULATORS === "true";
export const isFirebaseEmulatorMode = Boolean(import.meta.env.DEV && emulatorModeRequested);
export const firebaseEmulatorTargets = {
  auth: "http://127.0.0.1:9099",
  firestore: "127.0.0.1:8080",
  functions: "127.0.0.1:5001",
};

const app = isFirebaseConfigured ? initializeApp(firebaseConfig) : null;
const appCheckSiteKey = import.meta.env.VITE_FIREBASE_APPCHECK_RECAPTCHA_ENTERPRISE_SITE_KEY;

// App Check begins sending attestations as soon as a site key is configured.
// Backend enforcement is enabled separately after legitimate-traffic metrics are reviewed.
// App Check is a protective layer, so a provider/configuration failure must never prevent
// the application shell from loading while enforcement is still disabled.
function safelyInitializeAppCheck() {
  if (!app || !appCheckSiteKey || isFirebaseEmulatorMode || typeof window === "undefined") return null;

  try {
    return initializeAppCheck(app, {
      provider: new ReCaptchaEnterpriseProvider(appCheckSiteKey),
      isTokenAutoRefreshEnabled: true,
    });
  } catch (error) {
    console.error("Firebase App Check initialization failed; continuing without attestation.", {
      code: error?.code || "app-check-initialization-failed",
    });
    return null;
  }
}

export const appCheck = safelyInitializeAppCheck();

export const auth = app ? getAuth(app) : null;
export const db = app ? getFirestore(app) : null;
export const functions = app ? getFunctions(app) : null;

if (isFirebaseEmulatorMode && app && auth && db && functions) {
  connectAuthEmulator(auth, firebaseEmulatorTargets.auth, { disableWarnings: true });
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
  connectFunctionsEmulator(functions, "127.0.0.1", 5001);
}

async function confirmEmulatorReachable(name, target) {
  try {
    await fetch(target, { mode: "no-cors", cache: "no-store" });
    return name;
  } catch {
    throw new Error(`Local ${name} emulator is unavailable at ${target}. Start the acceptance emulators; production services are not used.`);
  }
}

export const firebaseEmulatorReadiness = isFirebaseEmulatorMode
  ? Promise.all([
    confirmEmulatorReachable("Auth", firebaseEmulatorTargets.auth),
    confirmEmulatorReachable("Firestore", `http://${firebaseEmulatorTargets.firestore}`),
    confirmEmulatorReachable("Functions", `http://${firebaseEmulatorTargets.functions}`),
  ])
  : Promise.resolve([]);
