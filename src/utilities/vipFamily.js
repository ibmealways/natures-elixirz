import { httpsCallable } from "firebase/functions";
import { functions } from "../firebase";

async function call(name, data = {}) {
  if (!functions) throw new Error("Firebase Functions is not configured.");
  const response = await httpsCallable(functions, name)(data);
  return response.data;
}

export const requestVipFamilyAccess = (subscriberEmail) => call("requestVipFamilyAccess", { subscriberEmail });
export const getVipFamilyAccess = () => call("getVipFamilyAccess");
export const manageVipFamilyAccess = (requestId, action) => call("manageVipFamilyAccess", { requestId, action });
