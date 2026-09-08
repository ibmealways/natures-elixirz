import { beforeEach, describe, expect, it, vi } from "vitest";
import { getAstraConversation, saveAstraConversation } from "./astraConversationStorage";

function storage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) || null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };
}

describe("Astra conversation storage", () => {
  beforeEach(() => vi.stubGlobal("localStorage", storage()));

  it("preserves a structured Kernel proposal across navigation or reload", () => {
    saveAstraConversation([{ role: "assistant", content: "Ready for review.", transfer: {
      type: "smoothie", title: "Blueberry Mango Protein Smoothie", sizeOz: 24,
      ingredients: ["Blueberries", "Mango", "Spinach", "Hemp protein", "Hemp seeds"].map((name) => ({ name })),
    } }], "subscriber-1");
    expect(getAstraConversation("subscriber-1")[0].transfer).toMatchObject({
      type: "smoothie", title: "Blueberry Mango Protein Smoothie", sizeOz: 24,
    });
  });
});
