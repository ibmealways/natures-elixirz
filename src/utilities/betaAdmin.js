import { httpsCallable } from "firebase/functions";
import { functions } from "../firebase";

function callable(name) {
  if (!functions) throw new Error("Firebase Functions are not configured.");
  return httpsCallable(functions, name);
}

export async function manageBetaTesters(action, values = {}) {
  const response = await callable("manageBetaTesters")({ action, ...values });
  return response.data;
}
