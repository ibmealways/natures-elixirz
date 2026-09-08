import { httpsCallable } from "firebase/functions";
import { functions } from "../firebase";

export async function manageSecurityIncidents(action, values = {}) {
  if (!functions) throw new Error("Firebase is not configured.");
  const mutating = !["list", "get"].includes(action);
  const mutationId = mutating ? (values.mutationId || globalThis.crypto?.randomUUID?.()) : undefined;
  if (mutating && !mutationId) throw new Error("A secure mutation identifier could not be created.");
  const result = await httpsCallable(functions, "manageSecurityIncidents")({ action, ...values, ...(mutating ? { mutationId } : {}) });
  return result.data;
}
