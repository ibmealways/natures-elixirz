import { httpsCallable } from "firebase/functions";
import { functions } from "../firebase";

const call = (name) => {
  if (!functions) throw new Error("Cloud account controls are unavailable.");
  return httpsCallable(functions, name);
};

export async function exportAccountData() {
  const response = await call("exportSubscriberData")({});
  return response.data;
}

export async function deleteAccountData() {
  const response = await call("deleteSubscriberAccount")({ confirmation: "DELETE MY ACCOUNT" });
  return response.data;
}

export function downloadAccountArchive(data, uid) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `natures-elixirz-data-${String(uid).slice(0, 8)}-${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}
