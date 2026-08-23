import { describe, expect, it } from "vitest";
import MealPlansErrorBoundary from "./MealPlansErrorBoundary";

describe("MealPlansErrorBoundary", () => {
  it("enters its controlled recovery state after a render failure", () => {
    expect(MealPlansErrorBoundary.getDerivedStateFromError(new Error("test"))).toEqual({ failed: true });
  });

  it("renders recovery UI without exposing exception details", () => {
    const boundary = new MealPlansErrorBoundary({ children: "meal plans" });
    boundary.state = { failed: true };
    const recovery = boundary.render();
    expect(recovery.props.role).toBe("alert");
    expect(JSON.stringify(recovery)).toContain("still intact");
    expect(JSON.stringify(recovery)).not.toContain("test exception");
  });
});
