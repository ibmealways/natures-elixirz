import { describe, expect, it } from "vitest";
import { accountAccessPath, BETA_ADMIN_RETURN_PATH, safeAuthReturnPath } from "./authReturnPath";

describe("authentication return paths", () => {
  it("preserves the explicit Beta Admin return path", () => {
    expect(safeAuthReturnPath("?returnTo=%2Fbeta-admin")).toBe(BETA_ADMIN_RETURN_PATH);
    expect(accountAccessPath(BETA_ADMIN_RETURN_PATH)).toBe("/account?returnTo=%2Fbeta-admin#account-access");
  });

  it("rejects external and unapproved internal destinations", () => {
    expect(safeAuthReturnPath("?returnTo=https%3A%2F%2Fevil.example")).toBeNull();
    expect(safeAuthReturnPath("?returnTo=%2Fpremium")).toBeNull();
    expect(accountAccessPath(safeAuthReturnPath("?returnTo=%2Fpremium"))).toBe("/account#account-access");
  });
});
