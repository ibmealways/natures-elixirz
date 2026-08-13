import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { findIngredientEvidence, ingredientEvidenceSummary, refluxProfileEnabled } from "./ingredient-evidence.js";

describe("ingredient evidence database", () => {
  it("resolves aliases to a source-traceable canonical ingredient", () => {
    const spinach = findIngredientEvidence("Baby spinach");
    assert.equal(spinach.name, "spinach");
    assert.ok(spinach.nutrients.includes("folate"));
    assert.ok(spinach.sources.includes("USDA-FDC"));
  });

  it("keeps reflux considerations dormant without explicit profile consent", () => {
    const summary = ingredientEvidenceSummary([{ name: "Mint" }, { name: "Pineapple" }], { conditions: [] });
    assert.equal(summary.refluxScreeningEnabled, false);
    assert.deepEqual(summary.refluxConsiderations, []);
    assert.equal(summary.sources.some((source) => source.id === "NIDDK-GERD"), false);
  });

  it("activates reflux evidence only when reflux is saved in the profile", () => {
    const profile = { conditions: ["Acid reflux / GERD"] };
    assert.equal(refluxProfileEnabled(profile), true);
    const summary = ingredientEvidenceSummary([{ name: "Mint" }, { name: "Pineapple" }], profile);
    assert.equal(summary.refluxConsiderations.length, 2);
    assert.ok(summary.refluxConsiderations.every((item) => item.source === "NIDDK-GERD"));
  });

  it("preserves study provenance without turning ingredient research into a formula claim", () => {
    const summary = ingredientEvidenceSummary([{ name: "Blueberries" }, { name: "Baby spinach" }], {});
    assert.equal(summary.catalogVersion, "ingredient-evidence-v2");
    assert.equal(summary.studyReadiness.status, "candidate-mechanisms-identified");
    assert.equal(summary.studyReadiness.candidateStudies[0].pmid, "34000994");
    assert.match(summary.studyReadiness.boundary, /do not prove/i);
    assert.equal(summary.matchedIngredients[0].foodIdentity.matchStatus, "verified-generic");
    assert.equal(summary.matchedIngredients[0].foodIdentity.fdcId, 2346411);
  });
});
