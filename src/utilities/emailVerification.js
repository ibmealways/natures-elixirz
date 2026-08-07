import { httpsCallable } from "firebase/functions";
import { functions } from "../firebase";

export async function requestBrandedVerificationEmail() {
  if (!functions) throw new Error("Cloud email is not configured.");
  const response = await httpsCallable(functions, "requestVerificationEmail")({});
  return response.data;
}
