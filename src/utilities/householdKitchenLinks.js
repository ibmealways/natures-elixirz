import { httpsCallable } from "firebase/functions";
import { functions } from "../firebase";

async function call(name, data = {}) {
  if (!functions) throw new Error("Firebase Functions is not configured.");
  return (await httpsCallable(functions, name)(data)).data;
}

export const requestHouseholdKitchenLink = (email) => call("requestHouseholdKitchenLink", { email });
export const getHouseholdKitchenLinks = () => call("getHouseholdKitchenLinks");
export const manageHouseholdKitchenLink = (linkId, action) => call("manageHouseholdKitchenLink", { linkId, action });
