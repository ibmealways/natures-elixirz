export const FREQUENCY_VIDEO_IDS = Object.freeze({
  40: "1_G60OdEzXs",
  128: "GbUNc_JylrQ",
  136: "g_yk907B8jc",
  174: "lXZlP-xp9XU",
  256: "hClxQDAMAtw",
  285: "2pB1yzdU8JU",
  396: "Nv07q-SFgNc",
  417: "awL9KlYhTtU",
  432: "qHDN9Qy02AU",
  440: "8HgoBFX4Spw",
  528: "PRJpLROt170",
  639: "DLQD47iDb18",
  723: "YmnHbJUcFwM",
  741: "jK2hS40pr-g",
  852: "xDIbyz70brE",
  888: "GxDYUdFMf5Q",
  963: "6CohA5Ou8NY",
  1111: "oGqBeHkCgQM",
  2222: "loCCZJSogV0",
  3333: "nFfEVexJHyg",
  4444: "H4_HWnxruz4",
  5555: "vPjmIb7CBA4",
});

export function getFrequencyVideoId(hz) {
  return FREQUENCY_VIDEO_IDS[hz] || null;
}
