# Nature's Elixirz external integration setup

The application runs locally without external services. Production accounts, cloud synchronization, and paid tier enforcement require Firebase and Stripe.

## 1. Firebase

Current production foundation:

- Project: `natures-elixirz-os`
- Hosting: `https://natures-elixirz-os.web.app`
- Firestore: Native mode, `nam5`
- Security rules and indexes: deployed
- Web configuration: installed locally in the ignored `.env`

Still required:

1. Enable Email/Password Authentication in Firebase Console.
2. Upgrade the project to Blaze before deploying Functions or using Secret Manager.
3. Add the OpenAI and Stripe secrets described below.
4. Deploy Functions after completing the production catalog.

Health profile fields can include sensitive information. Before production launch, publish a privacy policy, establish deletion/export procedures, choose a retention period, and complete the appropriate legal review.

## 2. Stripe catalog

Create monthly and yearly recurring prices for all five tiers. Keep the resulting `price_...` identifiers in a JSON object:

```json
{
  "STRIPE_PRICE_TIER_1_MONTHLY": "price_...",
  "STRIPE_PRICE_TIER_1_YEARLY": "price_...",
  "STRIPE_PRICE_TIER_2_MONTHLY": "price_...",
  "STRIPE_PRICE_TIER_2_YEARLY": "price_...",
  "STRIPE_PRICE_TIER_3_MONTHLY": "price_...",
  "STRIPE_PRICE_TIER_3_YEARLY": "price_...",
  "STRIPE_PRICE_TIER_4_MONTHLY": "price_...",
  "STRIPE_PRICE_TIER_4_YEARLY": "price_...",
  "STRIPE_PRICE_TIER_5_MONTHLY": "price_...",
  "STRIPE_PRICE_TIER_5_YEARLY": "price_..."
}
```

Set the Firebase function secrets when prompted:

```powershell
npx firebase-tools functions:secrets:set STRIPE_SECRET_KEY
npx firebase-tools functions:secrets:set STRIPE_WEBHOOK_SECRET
npx firebase-tools functions:secrets:set STRIPE_PRICES
```

Set `APP_URL` to the production HTTPS origin in the Firebase environment, then deploy functions:

```powershell
npx firebase-tools deploy --only functions
```

Use `https://natures-elixirz-os.web.app` as the current production `APP_URL`.
The non-secret production parameters are already stored in
`functions/.env.natures-elixirz-os`.

## 3. Stripe webhook

In Stripe Workbench, register the deployed `stripeWebhook` HTTPS endpoint and subscribe to:

- `checkout.session.completed`
- `customer.subscription.updated`
- `customer.subscription.deleted`

Copy that endpoint's signing secret into `STRIPE_WEBHOOK_SECRET`. Test mode and live mode use different API keys, prices, and webhook secrets.

## 4. Astra Guide AI

Astra Guide calls OpenAI only from a protected Firebase callable function. The API key must never use a `VITE_` variable or appear in browser code.

Set the production secret:

```powershell
npx firebase-tools functions:secrets:set OPENAI_API_KEY
```

The default model is `gpt-5.6-terra`, selected for a balance of quality, latency, and cost. Set the Firebase `OPENAI_MODEL` parameter during deployment if a different approved model is required. The function independently verifies Firebase authentication, verified email, active subscription entitlement, message size, and rate limits.

Before launch, test refusal and escalation behavior for medical emergencies, medication changes, disease-treatment requests, eating-disorder prompts, allergies, pregnancy, and kidney/cardiovascular conditions. Have the wellness language and privacy flow reviewed by qualified healthcare, privacy, and legal professionals.

## 5. Hosting

Build and deploy:

```powershell
npm run build
npx firebase-tools deploy --only hosting
```

Before enabling live mode, test account creation, email verification policy, profile sync consent, payment success and cancellation, webhook retries, tier upgrades/downgrades, subscription expiry, account deletion, refunds, and customer-support recovery.

## App Check rollout

The web client initializes Firebase App Check with the registered reCAPTCHA
Enterprise site key and automatic token refresh. Production callable enforcement
is controlled by `ENFORCE_APP_CHECK` in
`functions/.env.natures-elixirz-os`.

Keep enforcement disabled while validating token acceptance on Edge, Chrome, and
iPhone Safari. An August 7, 2026 authenticated smoke test showed that enabling
enforcement rejected a legitimate signed-in Edge request, so enforcement was
rolled back while token collection remains active. Do not set the flag to `true`
until legitimate requests succeed on every supported device and the App Check
metrics show valid tokens.

## Developer tier access

Running `npm run dev` unlocks all five tiers plus Movement/G.A.I.T. for local
developer testing. This uses Vite's compile-time development flag and is excluded
from production builds. Production access continues to require a trusted
Firestore entitlement written by the Stripe webhook.

Frequency and Tai Chi provide in-application YouTube players scoped to the
selected frequency or pathway. YouTube may still display its own controls and
privacy notices. Nature's Elixirz does not represent third-party videos as
medical treatment or as owned content.
