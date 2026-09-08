const STORAGE_KEY = "naturesElixirz.measurements.v1";
const FRACTIONS = [
  [0, ""], [1 / 8, "1/8"], [1 / 4, "1/4"], [3 / 8, "3/8"],
  [1 / 2, "1/2"], [5 / 8, "5/8"], [3 / 4, "3/4"], [7 / 8, "7/8"],
];

export function getMeasurementSystem() {
  return localStorage.getItem(STORAGE_KEY) === "metric" ? "metric" : "standard";
}

export function saveMeasurementSystem(system) {
  const safe = system === "metric" ? "metric" : "standard";
  localStorage.setItem(STORAGE_KEY, safe);
  return safe;
}

export function formatKitchenNumber(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return String(value);
  let whole = Math.floor(numeric);
  const remainder = numeric - whole;
  let [fractionValue, fractionLabel] = FRACTIONS.reduce((closest, candidate) => (
    Math.abs(candidate[0] - remainder) < Math.abs(closest[0] - remainder) ? candidate : closest
  ));
  if (remainder > 15 / 16) {
    whole += 1;
    fractionValue = 0;
    fractionLabel = "";
  }
  if (!whole && !fractionValue) return "1/8";
  return [whole || "", fractionLabel].filter(Boolean).join(" ");
}

const pluralize = (unit, amount) => {
  if (unit === "cup" && Number(amount) > 1) return "cups";
  return unit;
};

export function formatIngredientMeasurement(amount, unit, system = "standard") {
  const numeric = Number(amount);
  if (!Number.isFinite(numeric)) return `${amount} ${unit}`.trim();
  if (system === "metric") {
    if (unit === "cup") return `${Math.round(numeric * 240)} mL`;
    if (unit === "tbsp") return `${Math.round(numeric * 30) / 2} mL`;
    if (unit === "tsp") return `${Math.round(numeric * 10) / 2} mL`;
    if (unit === "oz") return `${Math.round(numeric * 28.35)} g`;
  }
  return `${formatKitchenNumber(numeric)} ${pluralize(unit, numeric)}`;
}

const parseKitchenNumber = (value) => value.split(/\s+/).reduce((total, part) => {
  if (!part.includes("/")) return total + Number(part);
  const [numerator, denominator] = part.split("/").map(Number);
  return total + numerator / denominator;
}, 0);

export function formatQuantityText(quantity, system = "standard") {
  const source = String(quantity || "").trim();
  const match = source.match(/^(\d+(?:\s+\d+\/\d+)?|\d+\/\d+|\d*\.\d+)\s+([a-z-]+)\b(.*)$/i);
  if (!match) return source;
  const amount = parseKitchenNumber(match[1]);
  const unit = match[2].toLowerCase().replace("cups", "cup");
  return `${formatIngredientMeasurement(amount, unit, system)}${match[3]}`;
}

export function formatYield(sizeOz, system = "standard") {
  return system === "metric" ? `${Math.round(Number(sizeOz) * 29.5735)} mL` : `${sizeOz} oz`;
}
