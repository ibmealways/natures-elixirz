"use strict";

const net = require("node:net");
const path = require("node:path");
const { createRequire } = require("node:module");
const adminRequire = createRequire(path.resolve(__dirname, "../functions/package.json"));
const { initializeApp, getApps } = adminRequire("firebase-admin/app");
const { getAuth } = adminRequire("firebase-admin/auth");
const { getFirestore, FieldValue } = adminRequire("firebase-admin/firestore");

const PROJECT_ID = "natures-elixirz-os";
const AUTH_HOST = "127.0.0.1:9099";
const FIRESTORE_HOST = "127.0.0.1:8080";
const EMAIL = "phase2b-admin@example.test";
const PASSWORD = "PHASE2B-SYNTHETIC-ONLY-2026";

function requireExactEmulatorEnvironment() {
  if (process.env.FIREBASE_AUTH_EMULATOR_HOST !== AUTH_HOST || process.env.FIRESTORE_EMULATOR_HOST !== FIRESTORE_HOST) {
    throw new Error("Refusing bootstrap: FIREBASE_AUTH_EMULATOR_HOST and FIRESTORE_EMULATOR_HOST must be 127.0.0.1:9099 and 127.0.0.1:8080.");
  }
  if (process.env.GCLOUD_PROJECT && process.env.GCLOUD_PROJECT !== PROJECT_ID) {
    throw new Error(`Refusing bootstrap: GCLOUD_PROJECT must be ${PROJECT_ID} when supplied.`);
  }
}

function verifyReachable(host, port, label) {
  return new Promise((resolve, reject) => {
    const socket = net.connect({ host, port });
    socket.setTimeout(1500);
    socket.once("connect", () => { socket.end(); resolve(); });
    socket.once("timeout", () => { socket.destroy(); reject(new Error(`${label} emulator is unreachable.`)); });
    socket.once("error", () => reject(new Error(`${label} emulator is unreachable.`)));
  });
}

async function main() {
  requireExactEmulatorEnvironment();
  await Promise.all([verifyReachable("127.0.0.1", 9099, "Auth"), verifyReachable("127.0.0.1", 8080, "Firestore")]);
  if (!getApps().length) initializeApp({ projectId: PROJECT_ID });
  const auth = getAuth();
  const db = getFirestore();
  let account;
  try {
    account = await auth.getUserByEmail(EMAIL);
  } catch (error) {
    if (error.code !== "auth/user-not-found") throw error;
    account = await auth.createUser({ email: EMAIL, password: PASSWORD, emailVerified: true, displayName: "Phase II-B Synthetic Administrator" });
  }
  await db.doc(`betaAdmins/${account.uid}`).set({ enabled: true, displayName: "Phase II-B Synthetic Administrator", environment: "emulator-only", updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  console.log(JSON.stringify({ environment: "emulator-only", email: EMAIL, password: PASSWORD, uid: account.uid, betaAdminPath: `betaAdmins/${account.uid}` }, null, 2));
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });
