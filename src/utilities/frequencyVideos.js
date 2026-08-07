export const FREQUENCY_VIDEO_IDS = Object.freeze({
  174: "lXZlP-xp9XU",
  285: "2pB1yzdU8JU",
  396: "Nv07q-SFgNc",
  432: "qHDN9Qy02AU",
  528: "PRJpLROt170",
  639: "DLQD47iDb18",
  741: "jK2hS40pr-g",
  852: "xDIbyz70brE",
  963: "6CohA5Ou8NY",
});

export function getFrequencyVideoId(hz) {
  return FREQUENCY_VIDEO_IDS[hz] || null;
}
