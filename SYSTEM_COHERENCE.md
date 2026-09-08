# Nature's Elixirz OS coherence contract

## Active application path

`index.jsx` mounts `App.jsx`, which owns the provider order:

1. Firebase authentication
2. Subscriber profile and server-owned entitlement
3. MRVI numeric movement state
4. React Router and the active page

Every primary page uses `GlowNav`, the shared brand and route map.

## Tier contract

Paid access is granted only when `subscriptionStatus` is `active` or `trialing`
and the server entitlement tier meets the page minimum:

- Tier 1: Smoothies and live Astra Guide
- Tier 2: Frequencies, plus Tier 1
- Tier 3: Meal plans, plus Tiers 1–2
- Tier 4: Tai Chi and Movement/G.A.I.T., plus Tiers 1–3
- Tier 5: V.I.P. Circle, plus Tiers 1–4

Profile forms, local imports, cloud profile restores, and checkout previews cannot
set paid access. Stripe webhooks write the trusted Firestore entitlement document.

## Cross-tier journey contract

`utilities/wellnessJourney.js` is the canonical local handoff:

- Smoothie intention feeds Frequency and Meal recommendations.
- Movement focus maps to Smoothie, Frequency, Meal, and Tai Chi continuations.
- Frequency selections, saved meal plans, and Tai Chi focus update the journey.
- With subscriber consent, Astra receives a bounded summary of these selections
  so its next-step guidance remains consistent across tiers.
- Meal generation applies dietary pattern, allergy, and avoid-list substitutions
  in the shared engine before a plan reaches the page.
- Explicit cloud sync includes the journey and numeric MRVI history.
- Raw camera video is never saved by G.A.I.T. or included in cloud sync.

## Personalized Kernel memory contract

Each Kernel keeps bounded, structured subscriber memory rather than training a
private model. Memory contains recent goals, focuses, accepted selections, an
interaction count, and timestamps. Smoothie, Frequency, Meal, Tai Chi, Movement,
and Astra contexts can consult only the relevant summaries. Memory is scoped to
the authenticated user, synchronized in the private `users/{uid}` document, and
never contains raw camera frames. It remains inspectable and can be included in
future export and deletion controls.

## Data boundaries

- Local profile: `naturesElixirz.subscriber.v1`
- Saved recipes: `naturesElixirz.recipes.v1`
- Journey handoffs: `naturesElixirz.journey.v1`
- Numeric movement history: `naturesElixirz.mrvi.profile.v1`
- Server entitlement: `users/{uid}/private/entitlement`
- Astra rate use: `users/{uid}/private/astraUsage`

Firestore rules allow members to access only their own profile and recipes. Client
writes to entitlement documents are denied.

## Active server contracts

- `createCheckoutSession`: verified Firebase user → validated Stripe price
- `stripeWebhook`: verified Stripe event → server-owned tier/status
- `askAstraGuide`: verified Firebase user + active entitlement → OpenAI response

Unknown Stripe prices resolve to Tier 0/inactive and never grant fallback access.

Local Vite development (`npm run dev`) unlocks every tier for developer testing.
The override uses the compile-time `import.meta.env.DEV` flag and is false in
production builds; it cannot grant a production subscriber entitlement.

## Quarantined legacy surfaces

Old Frequency history, graphs, timer, and chamber source files remain for future
reference but their routes render the current evidence-aware Frequencies page.
Older unrouted smoothie/frequency prototype components are not part of the active
runtime contract.

## Verification

Run:

```powershell
npm run verify
```

This executes client engine/contract tests, Firebase Function tests, and the
production build.

## External launch blockers

The code can run in local preview without integrations. Production requires:

- correct Firebase web configuration in `.env` (the six current values are blank)
- the verified Nature's Elixirz Firebase project in `.firebaserc` (the current
  default is `cohost-command` and must be verified before deployment)
- deployed Firestore rules and Functions
- Stripe keys, five monthly/yearly price pairs, and webhook secret
- OpenAI function secret
- production HTTPS `APP_URL`
- reliable access to the MediaPipe pose-landmarker model currently loaded from
  Google storage, or a reviewed self-hosted copy for production
- clinical, privacy, legal, accessibility, and subscription review
