import { describe, expect, it } from "vitest";
import { dedupeSmoothieIngredients, mergeAiSmoothieProposal } from "./aiSmoothie";

describe("mergeAiSmoothieProposal", () => {
  it("combines duplicate ingredient rows before display", () => {
    expect(dedupeSmoothieIngredients([
      { name: "Coconut milk", group: "Liquid", amount: 0.75, unit: "cup" },
      { name: " coconut milk ", group: "Liquid", amount: 0.75, unit: "cup" },
    ])).toEqual([{ name: "Coconut milk", group: "Liquid", amount: 1.5, unit: "cup" }]);
  });
  it("uses the validated AI ingredients and labels the source", () => {
    const ingredients = ["Pear", "Blueberries", "Spinach", "Oats", "Water"].map((name, index) => ({
      name, group: index === 4 ? "Liquid" : index === 3 ? "Grain" : index === 2 ? "Vegetable" : "Fruit", amount: 0.5, unit: "cup", reason: `${name} has a defined role.`,
    }));
    const proposal = { name: "New blend", description: "A deliberately distinct berry and pear formula.", type: "Berry oat smoothie", ingredients, benefits: [], preparation: ["Blend."], practicalTips: ["Serve cold."], reflux: { level: "Lower trigger potential", summary: "Conservative formula.", triggers: [], adjustments: [] }, nutritionIntelligence: { evidence: { catalogVersion: "ingredient-evidence-v2" } } };
    const result = mergeAiSmoothieProposal(proposal, { safety: {}, sizeOz: 16 });
    expect(result.generationSource).toBe("ai");
    expect(result.ingredients.map((item) => item.name)).toEqual(["Pear", "Blueberries", "Spinach", "Oats", "Water"]);
    expect(result.assessment.reflux.level).toBe("Lower trigger potential");
    expect(result.nutritionIntelligence.evidence.catalogVersion).toBe("ingredient-evidence-v2");
  });
  it("omits reflux from the display model when the server suppresses it", () => {
    const ingredients = ["Pear", "Blueberries", "Spinach", "Oats", "Water"].map((name, index) => ({ name, group: index === 4 ? "Liquid" : "Fruit", amount: 0.5, unit: "cup", reason: "Defined role." }));
    const result = mergeAiSmoothieProposal({ name: "Blend", description: "A complete evidence-aware smoothie formula.", type: "Fruit smoothie", ingredients, benefits: [], preparation: ["Blend."], practicalTips: [] }, { safety: {}, sizeOz: 16 });
    expect(result.assessment.reflux).toBeUndefined();
  });
});
