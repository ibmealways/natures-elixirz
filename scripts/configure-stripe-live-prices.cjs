const { Client } = require("firebase-tools/lib/apiv2");
const { getProjectDefaultAccount, setActiveAccount } = require("firebase-tools/lib/auth");

const projectId = "natures-elixirz-os";
const expectedAccountId = "acct_1TQIeeKt6Bc2VH4D";
const secrets = new Client({ urlPrefix: "https://secretmanager.googleapis.com", apiVersion: "v1" });

const tiers = [
  { tier: 1, label: "Blend", productPattern: /\bBlend\b/i, monthly: 1599, yearly: 15000 },
  { tier: 2, label: "Resonate", productPattern: /\bResonate\b/i, monthly: 2999, yearly: 30000 },
  { tier: 3, label: "Nourish", productPattern: /\bNourish\b/i, monthly: 4499, yearly: 48000 },
  { tier: 4, label: "Whole Life", productPattern: /\bWhole Life\b/i, monthly: 5999, yearly: 65000 },
  { tier: 5, label: "V.I.P.", productPattern: /V\.I\.P\./i, monthly: 9999, yearly: 108000 },
];

function decodeSecret(response) {
  return Buffer.from(response.body.payload.data, "base64").toString("utf8").trim();
}

async function stripeGet(secretKey, path, parameters = {}) {
  const url = new URL(`https://api.stripe.com${path}`);
  Object.entries(parameters).forEach(([key, value]) => url.searchParams.append(key, value));
  const response = await fetch(url, { headers: { Authorization: `Bearer ${secretKey}` } });
  const body = await response.json();
  if (!response.ok) throw new Error(`Stripe request failed (${response.status}): ${body?.error?.message || "unknown error"}`);
  return body;
}

function findPrice(prices, tier, interval) {
  const expectedAmount = tier[interval];
  const matches = prices.filter((price) =>
    price.active &&
    price.currency === "usd" &&
    price.type === "recurring" &&
    price.recurring?.interval === (interval === "monthly" ? "month" : "year") &&
    price.unit_amount === expectedAmount &&
    price.product?.active === true &&
    tier.productPattern.test(price.product?.name || "")
  );
  if (matches.length !== 1) {
    const details = matches.map((price) => ({
      priceId: price.id,
      productId: price.product?.id,
      productName: price.product?.name,
      created: price.created,
    }));
    throw new Error(`${tier.label} ${interval}: expected exactly one matching live price, found ${matches.length}. ${JSON.stringify(details)}`);
  }
  return matches[0];
}

async function main() {
  const activeAccount = getProjectDefaultAccount(process.cwd());
  if (!activeAccount) throw new Error("The Firebase CLI is not signed in.");
  setActiveAccount({}, activeAccount);

  const keyResponse = await secrets.get(`/projects/${projectId}/secrets/STRIPE_SECRET_KEY/versions/latest:access`);
  const secretKey = decodeSecret(keyResponse);
  if (!secretKey.startsWith("sk_live_")) throw new Error("STRIPE_SECRET_KEY is not a live Stripe key.");

  const account = await stripeGet(secretKey, "/v1/account");
  if (account.id !== expectedAccountId) {
    throw new Error(`Live key belongs to unexpected Stripe account ${account.id}.`);
  }
  const catalog = await stripeGet(secretKey, "/v1/prices", {
    active: "true",
    type: "recurring",
    limit: "100",
    "expand[]": "data.product",
  });

  const mapping = {};
  const summary = [];
  for (const tier of tiers) {
    const monthly = findPrice(catalog.data, tier, "monthly");
    const yearly = findPrice(catalog.data, tier, "yearly");
    mapping[`STRIPE_PRICE_TIER_${tier.tier}_MONTHLY`] = monthly.id;
    mapping[`STRIPE_PRICE_TIER_${tier.tier}_YEARLY`] = yearly.id;
    summary.push({ tier: tier.tier, name: tier.label, monthlyUsd: monthly.unit_amount / 100, yearlyUsd: yearly.unit_amount / 100 });
  }

  await secrets.post(`/projects/${projectId}/secrets/STRIPE_PRICES:addVersion`, {
    payload: { data: Buffer.from(JSON.stringify(mapping)).toString("base64") },
  });

  process.stdout.write(JSON.stringify({
    configured: true,
    stripeAccount: account.id,
    liveMode: true,
    mappedPriceCount: Object.keys(mapping).length,
    catalog: summary,
  }, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
