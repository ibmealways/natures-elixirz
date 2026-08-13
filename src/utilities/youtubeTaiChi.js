import { httpsCallable } from "firebase/functions";
import { functions } from "../firebase";

export async function searchYouTubeTaiChi(query) {
  if (!functions) throw new Error("YouTube search requires the connected Nature's Elixirz service.");
  const callable = httpsCallable(functions, "searchTaiChiYouTube", { timeout: 30000 });
  const response = await callable({ query });
  return Array.isArray(response.data?.results) ? response.data.results : [];
}
