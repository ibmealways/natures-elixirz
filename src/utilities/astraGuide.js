import { httpsCallable } from "firebase/functions";
import { functions } from "../firebase";

export async function askAstraGuide(payload) {
  if (!functions) throw new Error("Connect Firebase to activate live Astra Guide conversations.");
  const call = httpsCallable(functions, "askAstraGuide");
  const result = await call(payload);
  return result.data.reply;
}

export function previewAstraReply(prompt) {
  const lower = prompt.toLowerCase();
  if (lower.includes("frequency")) {
    return "For a focus blend, I can pair the preparation ritual with gentle ambient audio. Frequency tracks are relaxation tools—not medical treatment. Members can ask me to compare options and open the matching Tier 2 experience.";
  }
  if (lower.includes("meal")) {
    return "I can turn a smoothie goal into a practical day of meals, then adapt it for dietary preferences and ingredients on hand. Personalized meal-plan generation unlocks in Tier 3.";
  }
  if (lower.includes("tai") || lower.includes("balance")) {
    return "A short beginner Tai Chi flow can complement a mindful smoothie ritual through gentle movement and balance practice. Personalized movement guidance unlocks in Tier 4.";
  }
  return "Here is how I would begin: choose the finished size, list what you have, and tell me any allergies or ingredients to avoid. I can then propose exact whole-food quantities, preparation steps, and substitutions. I provide general wellness education—not diagnosis or treatment.";
}

