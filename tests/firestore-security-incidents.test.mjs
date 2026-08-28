import test, { after } from "node:test";
import { readFileSync } from "node:fs";
import { assertFails, initializeTestEnvironment } from "@firebase/rules-unit-testing";
import { collection, deleteDoc, doc, getDoc, getDocs, setDoc, updateDoc } from "firebase/firestore";

const environment = await initializeTestEnvironment({
  projectId: "natures-elixirz-os",
  firestore: { rules: readFileSync(new URL("../firestore.rules", import.meta.url), "utf8") },
});
after(async () => environment.cleanup());

const callers = [
  ["unauthenticated", () => environment.unauthenticatedContext()],
  ["subscriber", () => environment.authenticatedContext("subscriber-user", { role: "subscriber", tier: 1 })],
  ["beta tester", () => environment.authenticatedContext("beta-tester-user", { betaTester: true, tier: 5 })],
  ["enabled beta admin", () => environment.authenticatedContext("enabled-admin-user", { enabled: true, role: "admin" })],
];
const collections = ["securityIncidents", "securityIncidentAudit"];
const operations = {
  GET: (db, name, id) => getDoc(doc(db, name, id)),
  LIST: (db, name) => getDocs(collection(db, name)),
  CREATE: (db, name, id) => setDoc(doc(db, name, id), { synthetic: true }),
  UPDATE: (db, name, id) => updateDoc(doc(db, name, id), { synthetic: false }),
  DELETE: (db, name, id) => deleteDoc(doc(db, name, id)),
};

for (const [callerName, context] of callers) {
  for (const collectionName of collections) {
    for (const [operationName, operation] of Object.entries(operations)) {
      test(`${callerName} cannot ${operationName} ${collectionName} directly`, async () => {
        const db = context().firestore();
        const id = `${callerName.replace(/\s+/g, "-")}-${operationName.toLowerCase()}`;
        await assertFails(operation(db, collectionName, id));
      });
    }
  }
}
