import { describe, expect, it } from "vitest";
import {
  FREQUENCY_VIDEO_IDS,
  getFrequencyVideoId,
} from "./frequencyVideos";

describe("frequency video mapping", () => {
  it("provides a distinct video for every featured and extended tone", () => {
    const ids = Object.values(FREQUENCY_VIDEO_IDS);

    expect(ids).toHaveLength(22);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("keeps 396 Hz and 639 Hz on different videos", () => {
    expect(getFrequencyVideoId(396)).toBe("Nv07q-SFgNc");
    expect(getFrequencyVideoId(639)).toBe("DLQD47iDb18");
    expect(getFrequencyVideoId(396)).not.toBe(getFrequencyVideoId(639));
  });

  it("connects the founder and repeating-number tones to exact matches", () => {
    expect(getFrequencyVideoId(723)).toBe("YmnHbJUcFwM");
    expect(getFrequencyVideoId(1111)).toBe("oGqBeHkCgQM");
    expect(getFrequencyVideoId(2222)).toBe("loCCZJSogV0");
    expect(getFrequencyVideoId(3333)).toBe("nFfEVexJHyg");
    expect(getFrequencyVideoId(4444)).toBe("H4_HWnxruz4");
    expect(getFrequencyVideoId(5555)).toBe("vPjmIb7CBA4");
  });
});
