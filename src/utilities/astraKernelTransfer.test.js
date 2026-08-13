import { beforeEach, describe, expect, it, vi } from "vitest";
import { getAstraKernelTransfer, sanitizeAstraKernelTransfer, saveAstraKernelTransfer } from "./astraKernelTransfer";

const storage = () => { let data = {}; return { getItem: (key) => data[key] ?? null, setItem: (key, value) => { data[key] = value; }, removeItem: (key) => { delete data[key]; } }; };

describe("Astra Kernel transfers", () => {
  beforeEach(() => { vi.stubGlobal("localStorage", storage()); vi.stubGlobal("sessionStorage", storage()); });
  it("rejects incomplete smoothie transfers", () => expect(sanitizeAstraKernelTransfer({ type: "smoothie", ingredients: [{ name: "Pear" }] })).toBeNull());
  it("stores an exact scoped transfer for Kernel review", () => {
    saveAstraKernelTransfer({ type: "smoothie", title: "Second formula", ingredients: [
      { name: "Pear", amount: 1, unit: "cup", group: "Fruit" },
      { name: "Spinach", amount: 1, unit: "cup", group: "Vegetable" },
      { name: "Hemp seeds", amount: 2, unit: "tbsp", group: "Seed" },
      { name: "Soy milk", amount: 1, unit: "cup", group: "Liquid" },
      { name: "Ginger", amount: 1, unit: "tsp", group: "Spice" },
    ] }, "user-1");
    expect(getAstraKernelTransfer("user-1", "smoothie").ingredients.map((item) => item.name)).toEqual(["Pear", "Spinach", "Hemp seeds", "Soy milk", "Ginger"]);
    expect(getAstraKernelTransfer("user-2", "smoothie")).toBeNull();
  });
});
