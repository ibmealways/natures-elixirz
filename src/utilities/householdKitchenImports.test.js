import { describe, expect, it } from "vitest";
import { acknowledgeHouseholdKitchenImport, getAcknowledgedHouseholdKitchenImports } from "./householdKitchenImports";

const createStorage = () => {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
};

describe("household kitchen import acknowledgements", () => {
  it("persists an imported source without duplicating it", () => {
    const storage = createStorage();
    acknowledgeHouseholdKitchenImport("ivan", "hannah-local-profile", storage);
    acknowledgeHouseholdKitchenImport("ivan", "hannah-local-profile", storage);

    expect(getAcknowledgedHouseholdKitchenImports("ivan", storage)).toEqual(["hannah-local-profile"]);
  });

  it("keeps acknowledgements isolated by destination account", () => {
    const storage = createStorage();
    acknowledgeHouseholdKitchenImport("ivan", "hannah-local-profile", storage);

    expect(getAcknowledgedHouseholdKitchenImports("heather", storage)).toEqual([]);
  });

  it("recovers safely from malformed local storage", () => {
    const storage = { getItem: () => "not-json", setItem: () => {} };
    expect(getAcknowledgedHouseholdKitchenImports("ivan", storage)).toEqual([]);
  });
});
