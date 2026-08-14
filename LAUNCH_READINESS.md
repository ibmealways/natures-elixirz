# Nature's Elixirz OS — Production Launch Readiness

Audit date: August 14, 2026

## Current decision

**Controlled beta is operational. General paid launch is not yet authorized.**

The application and production operations are healthy, but Stripe is still in test mode. Do not advertise or accept real paid subscriptions until the live billing checklist below is complete.

Run the repeatable production gate with:

```powershell
npm run audit:launch
```

The command reports operational status and Stripe mode without displaying secret keys, price IDs, subscriber wellness data, or payment information.

## Verified in production

- Primary-owner Tier 5 access is active and independent of beta expiration.
- Email/password authentication and email-enumeration protection are enabled.
- Branded verification email is automatically queued when an account is created, with subscriber resend and bounded automatic retry.
- `support@natureselixirz.com` SMTP is active; recent Gmail and domain delivery records are successful.
- All ten Stripe monthly/yearly catalog slots are configured; checkout, billing portal, webhook, entitlement recovery, cancellation, and scheduled reconciliation functions are deployed.
- Stripe reconciliation, Firestore backup validation, and autonomy monitoring last reported healthy.
- Daily native Firestore backups are active with 14-day retention; the latest backup is READY.
- A restore drill was validated against an isolated database without touching production.
- Export, clinician handoff, deletion, generated-image cleanup, and Stripe cancellation-before-deletion are implemented.
- Public privacy, terms, subscription/refund, wellness, AI, movement, deletion, and support notices are available on every route.
- Firestore account scoping, server-owned entitlements, sensitive-context consent, bounded learning memory, and account-level cloud synchronization are implemented.
- Production currently has no unresolved AI service incidents and no operations-alert mail awaiting intervention.
- Required launch functions are deployed and active.

## Required before paid public launch

1. **Activate Stripe live mode.** Create/confirm ten live recurring prices, install the live secret key, live price catalog, and live webhook signing secret, then redeploy the billing functions. Confirm the audit reports `stripe.mode: live` and `catalogComplete: true`.
2. **Exercise real billing end to end.** With an owner-approved low-risk live transaction, verify checkout return, webhook entitlement, tier access, billing portal, cancellation-at-period-end, access expiry, refund/support procedure, ledger metrics, and reconciliation. Never test this with a real subscriber first.
3. **Enable public signup mode.** Set `PUBLIC_SIGNUP_MODE=true` only after live billing passes. This stops new accounts from entering the beta-approval queue while preserving the existing beta roster.
4. **Complete verification-email deliverability signoff.** Create fresh post-repair accounts at iCloud and Cox (or their successor mail domain), verify inbox/junk delivery and link completion, and retain only delivery metadata—not message contents or credentials.
5. **Complete App Check rollout.** Monitoring is active, but enforcement remains off because a legitimate Edge request was previously rejected. Validate Edge, Chrome, iPhone Safari, and Android Chrome before setting `ENFORCE_APP_CHECK=true` and redeploying callable functions.
6. **Obtain professional reviews.** Qualified counsel must approve privacy, subscription/refund, sensitive-health-data, state-law, retention, and wellness/AI language. A qualified clinical reviewer should review high-risk nutrition, movement, mental-wellness, herbal, and escalation boundaries.
7. **Complete real-device acceptance.** Test current iPhone/Safari and Android/Chrome accounts through signup, verification, profile consent, synchronization, checkout return, each purchased tier, video, camera consent, clinician/data export, billing portal, and deletion staging.
8. **Assign launch operations.** Confirm a named incident owner, support coverage hours, escalation procedure, Stripe dispute/refund owner, security contact, and cloud-budget alerts.

## Launch activation order

1. Complete legal/clinical and real-device signoff.
2. Install live Stripe catalog and webhook configuration.
3. Run an owner-controlled live billing test and cancellation/refund drill.
4. Confirm email delivery across required providers.
5. Validate and enforce App Check.
6. Set `PUBLIC_SIGNUP_MODE=true` and redeploy the account-creation trigger.
7. Run `npm run verify` and `npm run audit:launch`.
8. Preserve the release commit, tag the launch version, and begin monitored enrollment in a small cohort before opening broadly.
