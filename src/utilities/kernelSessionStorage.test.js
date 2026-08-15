import { beforeEach, describe, expect, it } from "vitest";
import { clearKernelSession, getKernelSession, saveKernelSession } from "./kernelSessionStorage";

describe("Kernel session storage", () => {
  beforeEach(() => {
    const values = new Map();
    globalThis.localStorage = { getItem: (key) => values.get(key) || null, setItem: (key, value) => values.set(key, String(value)), removeItem: (key) => values.delete(key) };
  });
  it("restores generated state only to the same account and Kernel", () => {
    saveKernelSession("subscriber-a", "smoothie", { generatedRecipe: { name: "Exact blend" } });
    expect(getKernelSession("subscriber-a", "smoothie").generatedRecipe.name).toBe("Exact blend");
    expect(getKernelSession("subscriber-b", "smoothie")).toBeNull();
    expect(getKernelSession("subscriber-a", "meals")).toBeNull();
    clearKernelSession("subscriber-a", "smoothie");
    expect(getKernelSession("subscriber-a", "smoothie")).toBeNull();
  });
});
