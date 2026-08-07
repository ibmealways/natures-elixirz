const ingredientColors = [
  [/dragon fruit|pitaya/, [225, 45, 138]], [/blueber|blackber|acai/, [70, 43, 126]],
  [/strawber|raspber|cherr/, [201, 48, 77]], [/grape/, [111, 55, 129]],
  [/mango|pineapple|banana|honey|turmeric/, [238, 177, 55]], [/orange|carrot|papaya/, [232, 115, 38]],
  [/beet/, [145, 31, 65]], [/spinach|kale|mint|basil|celery|cucumber/, [42, 112, 70]],
  [/cacao|cocoa|peanut|almond butter|cinnamon/, [119, 76, 48]],
  [/oat|soy|yogurt|coconut|milk/, [218, 207, 177]],
];

const colorFor = (name) => ingredientColors.find(([pattern]) => pattern.test(name.toLowerCase()))?.[1] || [116, 142, 101];
const mix = (colors) => colors.reduce((sum, color) => sum.map((value, index) => value + color[index]), [0, 0, 0]).map((value) => Math.round(value / colors.length));
const rgb = (color) => `rgb(${color.join(",")})`;

export function buildSmoothieVisualPreview(recipe = {}) {
  const names = (recipe.ingredients || []).map((item) => item.name);
  const colors = names.length ? names.map(colorFor) : [[85, 125, 82]];
  const base = mix(colors);
  const bright = base.map((value) => Math.min(255, Math.round(value * 1.28 + 18)));
  const deep = base.map((value) => Math.max(18, Math.round(value * .55)));
  const thick = names.some((name) => /oat|chia|flax|protein|butter|avocado|banana/i.test(name));
  const seedDots = names.some((name) => /chia|flax|berry|strawber|dragon/i.test(name));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 900"><defs><radialGradient id="bg"><stop stop-color="#12392e"/><stop offset="1" stop-color="#02070b"/></radialGradient><linearGradient id="drink" x2="0" y2="1"><stop stop-color="${rgb(bright)}"/><stop offset=".52" stop-color="${rgb(base)}"/><stop offset="1" stop-color="${rgb(deep)}"/></linearGradient><filter id="glow"><feGaussianBlur stdDeviation="12"/></filter></defs><rect width="900" height="900" fill="url(#bg)"/><circle cx="180" cy="170" r="120" fill="${rgb(base)}" opacity=".16" filter="url(#glow)"/><circle cx="720" cy="730" r="170" fill="#6d4ac7" opacity=".13" filter="url(#glow)"/><path d="M350 88h34l88 250" stroke="#d6f8ed" stroke-width="20" opacity=".72"/><path d="M210 260h430l-43 500c-4 48-42 82-90 82H343c-48 0-86-34-90-82z" fill="#d8fff5" opacity=".2" stroke="#b7f7e5" stroke-width="8"/><path d="M232 330h386l-37 422c-3 30-26 52-57 52H326c-31 0-54-22-57-52z" fill="url(#drink)"/><ellipse cx="425" cy="330" rx="193" ry="38" fill="${rgb(bright)}"/><ellipse cx="425" cy="334" rx="176" ry="25" fill="${rgb(base)}" opacity=".7"/>${thick ? `<path d="M250 355c85-38 265 34 350-9" fill="none" stroke="${rgb(bright)}" stroke-width="18" opacity=".35"/>` : ""}${seedDots ? `<g fill="#241827" opacity=".42">${Array.from({ length: 28 }, (_, index) => `<circle cx="${280 + (index * 47) % 285}" cy="${390 + (index * 67) % 330}" r="${2 + index % 3}"/>`).join("")}</g>` : ""}<path d="M636 390c105 0 122 65 108 151-13 80-57 128-139 122" fill="none" stroke="#c8fff0" stroke-width="22" opacity=".35"/><text x="425" y="610" text-anchor="middle" fill="#f0e7cd" font-family="Georgia,serif" font-size="38" opacity=".82">Nature's Elixirz</text><text x="425" y="650" text-anchor="middle" fill="#d5eee6" font-family="Arial,sans-serif" font-size="15" letter-spacing="5" opacity=".68">INGREDIENT-DERIVED PREVIEW</text></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}
