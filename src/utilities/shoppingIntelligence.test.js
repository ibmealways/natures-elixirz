import { describe, expect, it } from "vitest";
import { addShoppingItem, consolidateShoppingIngredients, isHouseholdStapleIngredient, providerHandoff, providerSearchUrl, removeShoppingItem, substituteShoppingItem, updateShoppingItem } from "./shoppingIntelligence";
describe("shopping intelligence", () => {
  it("consolidates quantities and classifies coverage", () => {
    const result = consolidateShoppingIngredients([{ name: "Broccoli", quantity: "1 cup" }, { name: "Broccoli", quantity: "1/2 cup" }, { name: "Eggs", quantity: "2 count" }], (name) => name === "Eggs");
    expect(result).toEqual(expect.arrayContaining([expect.objectContaining({ name: "Broccoli", quantity: "1.5 cup", status: "need-to-purchase" }), expect.objectContaining({ name: "Eggs", status: "already-in-kitchen" })]));
  });
  it("creates search handoffs without claiming a cart", () => expect(providerSearchUrl("instacart", [{ name: "brown rice" }])).toContain("brown%20rice"));
  it("excludes exact ordinary staples without colliding with coconut water", () => {
    const result = consolidateShoppingIngredients([{ name: "Water", quantity: "1 cup" }, { name: "Ice cubes", quantity: "1 cup" }, { name: "Coconut water", quantity: "1 cup" }]);
    expect(result.find((item) => item.name === "Water")?.status).toBe("household-staple");
    expect(result.find((item) => item.name === "Ice cubes")?.status).toBe("household-staple");
    expect(result.find((item) => item.name === "Coconut water")?.status).toBe("need-to-purchase");
    expect(isHouseholdStapleIngredient("Coconut water")).toBe(false);
  });
  it("parses Unicode fractions without corrupting quantities", () => {
    expect(consolidateShoppingIngredients([{ name: "Rice", quantity: "½ cup" }, { name: "Rice", quantity: "¼ cup" }])[0].quantity).toBe("0.75 cup");
  });
  it("adds, edits, marks available, removes, and substitutes without mutating the source", () => {
    const source = [{ name: "Rice", quantity: "1 cup", status: "need-to-purchase" }];
    const added = addShoppingItem(source, { name: " Spinach ", quantity: "2 cup" });
    const edited = updateShoppingItem(added, 0, { quantity: "2 cup", status: "already-in-kitchen" });
    const substituted = substituteShoppingItem(edited, 1, { name: "Kale", quantity: "1 cup" });
    const removed = removeShoppingItem(substituted, 0);
    expect(source).toEqual([{ name: "Rice", quantity: "1 cup", status: "need-to-purchase" }]);
    expect(removed).toEqual([{ name: "Kale", quantity: "1 cup", status: "need-to-purchase", substitutedFor: "Spinach" }]);
  });
  it("returns an explicit unavailable fallback for unsupported providers", () => {
    expect(providerHandoff("unsupported", [{ name: "Rice" }])).toEqual({ status: "unavailable", provider: "unsupported", url: "", capability: "none" });
    expect(providerHandoff("walmart", [{ name: "Rice" }])).toMatchObject({ status: "search-ready", capability: "search-only" });
  });
});
