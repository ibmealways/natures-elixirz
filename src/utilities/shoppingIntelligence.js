const FRACTIONS = { "¼": .25, "½": .5, "¾": .75, "⅓": 1 / 3, "⅔": 2 / 3, "⅛": .125, "⅜": .375, "⅝": .625, "⅞": .875 };

function numericAmount(value) {
  const text = String(value || "").trim().replace(/^(\d+)\s+(\d+)\/(\d+)/, (_, whole, top, bottom) => String(Number(whole) + Number(top) / Number(bottom)));
  const unicode = Object.entries(FRACTIONS).find(([symbol]) => text.includes(symbol));
  if (unicode) return (Number.parseFloat(text) || 0) + unicode[1];
  const fraction = text.match(/^(\d+)\/(\d+)/);
  if (fraction) return Number(fraction[1]) / Number(fraction[2]);
  return Number.parseFloat(text);
}

function quantityParts(quantity) {
  const text = String(quantity || "").trim();
  const amount = numericAmount(text);
  const unit = text.replace(/^(?:\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:\.\d+)?|\d*\s*[¼½¾⅓⅔⅛⅜⅝⅞])\s*/, "").trim().toLowerCase();
  return { amount, unit, original: text };
}

const HOUSEHOLD_STAPLES = new Set(["water", "tap water", "filtered water", "ice", "ice cube", "ice cubes"]);

export function isHouseholdStapleIngredient(value) {
  return HOUSEHOLD_STAPLES.has(String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim());
}

export function consolidateShoppingIngredients(ingredients = [], isAvailable = () => false) {
  const groups = new Map();
  ingredients.filter((item) => item?.name).forEach((item) => {
    const key = item.name.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    const parts = quantityParts(item.quantity);
    const groupKey = `${key}|${parts.unit}`;
    const current = groups.get(groupKey) || { name: item.name, unit: parts.unit, amount: 0, originals: [], occurrences: 0 };
    current.occurrences += 1;
    current.originals.push(parts.original);
    if (Number.isFinite(parts.amount)) current.amount += parts.amount;
    groups.set(groupKey, current);
  });
  return [...groups.values()].map((item) => ({
    name: item.name,
    quantity: item.amount > 0 ? `${Number.isInteger(item.amount) ? item.amount : Math.round(item.amount * 100) / 100}${item.unit ? ` ${item.unit}` : ""}` : [...new Set(item.originals)].join(" + "),
    occurrences: item.occurrences,
    status: isHouseholdStapleIngredient(item.name) ? "household-staple" : isAvailable(item.name) ? "already-in-kitchen" : "need-to-purchase",
  }));
}

export function providerSearchUrl(provider, items = []) {
  const query = encodeURIComponent(items.map((item) => item.name || item).filter(Boolean).join(", "));
  return ({ instacart: `https://www.instacart.com/store/s?k=${query}`, walmart: `https://www.walmart.com/search?q=${query}`, amazon: `https://www.amazon.com/s?k=${query}` })[provider] || "";
}

export function addShoppingItem(items = [], item) {
  if (!item?.name?.trim()) return [...items];
  return [...items, { ...item, name: item.name.trim(), status: item.status || "need-to-purchase" }];
}

export function updateShoppingItem(items = [], index, changes = {}) {
  return items.map((item, itemIndex) => itemIndex === index ? { ...item, ...changes } : item);
}

export function removeShoppingItem(items = [], index) {
  return items.filter((_, itemIndex) => itemIndex !== index);
}

export function substituteShoppingItem(items = [], index, substitute) {
  if (!substitute?.name?.trim()) return [...items];
  return updateShoppingItem(items, index, {
    ...substitute,
    name: substitute.name.trim(),
    quantity: substitute.quantity || items[index]?.quantity || "",
    status: substitute.status || "need-to-purchase",
    substitutedFor: items[index]?.name || "",
  });
}

export function providerHandoff(provider, items = []) {
  const url = providerSearchUrl(provider, items);
  return url
    ? { status: "search-ready", provider, url, capability: "search-only" }
    : { status: "unavailable", provider, url: "", capability: "none" };
}
