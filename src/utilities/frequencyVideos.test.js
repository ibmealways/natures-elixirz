import { describe, expect, it } from "vitest";
import {
  FREQUENCY_VIDEO_IDS,
  getFrequencyVideoId,
} from "./frequencyVideos";

describe("frequency video mapping", () => {
  it("provides a distinct video for every listening realm", () => {
    const ids = Object.values(FREQUENCY_VIDEO_IDS);

    expect(ids).toHaveLength(9);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("keeps 396 Hz and 639 Hz on different videos", () => {
    expect(getFrequencyVideoId(396)).toBe("Nv07q-SFgNc");
    expect(getFrequencyVideoId(639)).toBe("DLQD47iDb18");
    expect(getFrequencyVideoId(396)).not.toBe(getFrequencyVideoId(639));
  });
});
