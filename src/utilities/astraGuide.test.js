import { describe, expect, it } from "vitest";
import { previewAstraReply } from "./astraGuide";

describe("Astra Guide preview", () => {
  it("keeps frequency claims in the relaxation lane", () => {
    const reply = previewAstraReply("Which frequency should I use?");
    expect(reply).toContain("relaxation");
    expect(reply).toContain("not medical treatment");
  });

  it("previews smoothie guidance without claiming a cure", () => {
    const reply = previewAstraReply("Make me a smoothie");
    expect(reply).toContain("whole-food");
    expect(reply).toContain("not diagnosis or treatment");
  });
});

