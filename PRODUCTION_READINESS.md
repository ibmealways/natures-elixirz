# Nature's Elixirz production readiness

Last verified: August 7, 2026

## Verified technical foundation

- 82 web tests and 31 server tests pass.
- The production Vite build completes successfully.
- Firebase Authentication, Firestore rules, Functions, Hosting, Stripe billing,
  data export/deletion, subscription recovery, and the verified support mailbox
  are connected.
- The public Trust & Policy Center publishes
  `support@natureselixirz.com`.
- Authenticated Astra access was smoke-tested successfully on the live site after
  the August 7 deployment.
- Monthly and annual planning windows and the three-smoothies-per-day server
  limit are deployed.
- Account ownership was audited for the two active beta subscribers: each email
  resolves to one cloud owner record with profile, smoothie kitchen, meal
  kitchen, movement, journey, exchange, and recipe data.
- Live iPhone-size (390 x 844) layout checks passed without horizontal overflow
  on Smoothies, Meal Plans, Profile, Tai Chi, Movement, and Plans.
- A stale profile-clear marker found in a recovered profile is now removed during
  restore and repaired in the canonical cloud snapshot; the hosting fix is live.

## Launch gates still open

1. **App Check enforcement:** token collection is active, but enforcement must
   stay disabled until legitimate Edge, Chrome, and iPhone Safari requests all
   validate. A monitored enforcement attempt rejected a valid signed-in Edge
   request and was rolled back without leaving subscriber access broken.
2. **Professional review:** privacy, consumer subscription, wellness, AI, and
   movement language still needs review by qualified counsel. The in-app policy
   center truthfully labels the material as a draft for professional review.
3. **Paid-flow acceptance:** complete one controlled live-mode Stripe purchase,
   billing-portal cancellation, entitlement recovery, renewal/expiry simulation,
   and refund/support case before opening paid enrollment broadly.
4. **Cross-device acceptance:** the automated account-ownership and responsive
   checks pass. One clean iPhone Safari sign-in per subscriber remains required
   to verify profile, pantry, saved recipes, plan limits, and deletion/export on
   actual iOS hardware.
5. **Email deliverability:** verify signup and support delivery to Gmail, Outlook,
   and iCloud, including spam/junk behavior and SPF, DKIM, and DMARC alignment.
   The delivery audit currently has no post-installation `mail` records to use as
   evidence, so successful provider delivery has not yet been established.

## Launch decision

The application is suitable for controlled beta testing. Public paid launch is a
no-go until all five launch gates above have recorded pass evidence.
