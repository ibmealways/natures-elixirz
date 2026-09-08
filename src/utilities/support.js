import { httpsCallable } from "firebase/functions";
import { functions } from "../firebase";

function callable(name) {
  if (!functions) throw new Error("Nature's Elixirz cloud services are unavailable.");
  return httpsCallable(functions, name);
}

export async function submitSupportRequest(values) {
  const response = await callable("submitSupportRequest")(values);
  return response.data;
}

export async function sendBetaTesterUpdate(values) {
  const response = await callable("sendBetaTesterUpdate")(values);
  return response.data;
}
