import { beforeEach, describe, expect, it, vi } from "vitest";
import { allKitchenIngredients, getKitchenInventory, saveKitchenInventory } from "./kitchenInventory";

const storage = () => {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) || null,
    setItem: (key, value) => values.set(key, value),
  };
};

describe("kitchen inventory", () => {
  beforeEach(() => vi.stubGlobal("localStorage", storage()));

  it("remembers pantry, fridge, and freezer ingredients", () => {
    saveKitchenInventory({ pantry: ["Chia seeds"], fridge: ["Spinach"], freezer: ["Blueberries"] });
    expect(getKitchenInventory()).toEqual({
      pantry: ["Chia seeds"], fridge: ["Spinach"], freezer: ["Blueberries"],
    });
  });

  it("combines locations without duplicate ingredients", () => {
    expect(allKitchenIngredients({
      pantry: ["Water"], fridge: ["Spinach"], freezer: ["spinach", "Mango"],
    })).toEqual(["Water", "spinach", "Mango"]);
  });

  it("isolates kitchen inventory between subscriber accounts", () => {
    saveKitchenInventory({ pantry: ["Chia seeds"] }, "ivan");
    saveKitchenInventory({ pantry: ["Mango"] }, "heather");
    expect(getKitchenInventory("ivan").pantry).toEqual(["Chia seeds"]);
    expect(getKitchenInventory("heather").pantry).toEqual(["Mango"]);
  });
});
