import { describe, expect, it } from "vitest";
import { evaluateComponentStatus } from "./mrviEngine";

describe("MRVI directional thresholds", () => {
  it("keeps every component stable when it has not changed", () => {
    ["mobility", "balance", "symmetry", "energyFlow", "smoothness"].forEach((key) => {
      expect(evaluateComponentStatus(key, 1, 1).status).toBe("STABLE");
    });
  });

  it("treats lower sway, asymmetry, and jerk ratios as improvement", () => {
    expect(evaluateComponentStatus("balance", 0.93, 1).status).toBe("IMPROVING");
    expect(evaluateComponentStatus("symmetry", 0.94, 1).status).toBe("IMPROVING");
    expect(evaluateComponentStatus("smoothness", 0.91, 1).status).toBe("IMPROVING");
  });

  it("treats higher sway, asymmetry, and jerk ratios as decline", () => {
    expect(evaluateComponentStatus("balance", 1.07, 1).status).toBe("DECLINING");
    expect(evaluateComponentStatus("symmetry", 1.06, 1).status).toBe("DECLINING");
    expect(evaluateComponentStatus("smoothness", 1.09, 1).status).toBe("DECLINING");
  });
});
