import React from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import GlowNav from "../components/GlowNav";
import "../styles/legalCenter.css";

const updated = "August 4, 2026";
const sections = [
  ["privacy", "Privacy"], ["terms", "Terms"], ["subscriptions", "Subscriptions & refunds"],
  ["wellness", "Wellness disclaimer"], ["ai", "AI disclosure"], ["movement", "Camera & movement"],
  ["deletion", "Data deletion"], ["support", "Support"],
];

const content = {
  privacy: <>
    <h2>Privacy Notice</h2><p>Nature&apos;s Elixirz is operated by AstraMind Technologies. This notice describes the current web application and is a launch draft pending review by qualified privacy counsel.</p>
    <h3>Information you provide</h3><p>We may process account identifiers; profile details such as name, age, height, weight, preferences and goals; dietary restrictions, allergies, medications and wellness considerations; optional tobacco or alcohol context; pantry and recipe information; subscription records; and movement metrics you choose to create.</p>
    <h3>No location or behavioral surveillance</h3><p>Nature&apos;s Elixirz does not request or access device geolocation, derive location from an IP address, or collect precise location. Subscribers may voluntarily provide a country and broad state, province, or region solely to help us understand community reach. This information is optional, reported only in aggregate, and very small groups are hidden. Enabling location services on a phone or computer does not give Nature&apos;s Elixirz access to them. We do not use advertising pixels or behavioral-tracking profiles.</p>
    <h3>How information is used</h3><p>We use it to authenticate your account, synchronize your information across devices, personalize educational wellness content, provide requested AI features, enforce subscriptions, secure the service, troubleshoot failures, and meet legal obligations. We do not use health-profile information for advertising or sell it.</p>
    <h3>Service providers and disclosures</h3><p>Firebase supports authentication, cloud data, hosting, functions and generated-image storage. Stripe processes payments and billing. OpenAI processes prompts required for Astra and requested image generation. YouTube may receive device and network information only after an embedded video is loaded. We may disclose information when required by law, to protect users or the service, or during a properly governed business transaction.</p>
    <h3>Your choices</h3><p>You decide which optional profile fields to provide and whether Astra receives profile context. Sensitive lifestyle fields remain concealed in the interface until you reveal them. Signed-in subscribers can export or delete account data from the Profile Kernel. Browser storage also holds account-scoped copies and preferences on each device.</p>
    <h3>Retention and security</h3><p>Account data is generally retained while the account exists and removed through the deletion process, subject to security, fraud, billing, backup and legal-retention needs. We use account-scoped access rules, server-controlled entitlements and encrypted transport, but no system can promise absolute security.</p>
    <h3>Children and location</h3><p>The service is not directed to children under 13. The current service is operated for United States users; cross-border processing may occur through our providers.</p>
  </>,
  terms: <>
    <h2>Terms of Service</h2><p>By creating an account or using Nature&apos;s Elixirz, you agree to these terms. You must be at least 18, or use the service with the involvement and consent of a parent or legal guardian where permitted.</p>
    <h3>Educational service</h3><p>The service provides general wellness education and organizational tools. It is not healthcare, medical diagnosis, treatment, prescribing, emergency assistance or a substitute for a qualified professional.</p>
    <h3>Your responsibilities</h3><p>Provide accurate account information, protect your credentials, use only your own account, respect intellectual-property and platform rights, and do not probe, automate, overload, reverse engineer, misuse, or attempt unauthorized access to the service.</p>
    <h3>Content and availability</h3><p>You retain rights in content you submit and grant us the limited rights needed to host, process, synchronize and display it for you. Generated suggestions may be incomplete or inaccurate and must be independently evaluated. Features, third-party media and availability may change.</p>
    <h3>Suspension and liability</h3><p>We may limit or suspend access for security, abuse, nonpayment or legal reasons. To the extent permitted by law, the service is provided without warranties and AstraMind Technologies is not liable for indirect, incidental, special or consequential losses. Rights that cannot legally be waived remain unaffected.</p>
  </>,
  subscriptions: <>
    <h2>Subscription, Cancellation & Refund Policy</h2><p>Before purchase, the checkout identifies the selected tier, billing interval, price and renewal terms. Web subscriptions are processed by Stripe and renew automatically until canceled.</p>
    <h3>Cancellation</h3><p>Use <Link to="/premium">Plans</Link> and choose the billing-management option. Unless checkout or applicable law says otherwise, cancellation stops future renewal and access continues through the paid billing period. Deleting an account initiates cancellation of a linked web subscription before account deletion proceeds.</p>
    <h3>Tier changes and recovery</h3><p>Billing-provider rules determine proration and effective dates for plan changes. If paid access is missing, use Restore membership access on the Plans page while signed into the purchasing account.</p>
    <h3>Refunds</h3><p>Payments are generally nonrefundable after a billing period begins except where required by law or expressly stated at purchase. Duplicate or erroneous charges should be reported promptly through Support. Native-app purchases, when offered, will follow the applicable Apple or Google billing and refund process.</p>
  </>,
  wellness: <>
    <h2>Wellness & Medical Disclaimer</h2><p>Nature&apos;s Elixirz provides educational information about food, movement, relaxation and wellness practices. It does not diagnose, treat, cure or prevent disease and does not establish a clinician–patient relationship.</p>
    <p>Ingredient effects and individual responses vary. Check allergies, intolerances, pregnancy considerations, health conditions, medication interactions and appropriate quantities with a qualified clinician or pharmacist. Do not start, stop or change medication or medical treatment based on this service.</p>
    <p>Movement activities carry risk. Stop if you experience pain, dizziness, shortness of breath or instability. For an emergency, contact local emergency services; do not use Astra.</p>
  </>,
  ai: <>
    <h2>AI-Generated Content Disclosure</h2><p>Astra responses and some smoothie or meal images are generated using artificial intelligence. Outputs can be inaccurate, incomplete, generalized or visually inconsistent with an actual result. An image is an illustration, not a nutrition calculation or safety assurance.</p>
    <p>When you expressly enable profile context, relevant profile and journey information may be included in a request to personalize the response. Concealed lifestyle fields are included only when you separately enable sensitive-profile context. AI output is educational and should be verified before acting on it.</p>
  </>,
  movement: <>
    <h2>Camera & Movement Data</h2><p>The Movement Kernel may request camera permission to estimate pose and movement measurements. Current analysis runs in the browser. Raw camera video is not uploaded or retained by Nature&apos;s Elixirz; only numeric metrics and derived results you save may synchronize to your account.</p>
    <p>You can deny or revoke camera permission through browser or device settings. Use a clear, safe area, stable device position and nearby support when appropriate. Results are not biometric identification, diagnosis, injury detection or a clinical gait assessment.</p>
  </>,
  deletion: <>
    <h2>Data Export & Deletion</h2><p>While signed in, open the <Link to="/account">Profile Kernel</Link> and use Download your data for a portable JSON archive. To delete the account, use Delete account and enter the displayed confirmation phrase. Recent authentication is required.</p>
    <p>Deletion removes the Firebase Authentication account, primary wellness record, saved recipes, generated-image records and stored generated images associated with the account. A linked Stripe subscription is canceled first to prevent continued billing. Stripe may retain transaction records required for financial, fraud-prevention or legal purposes. Browser-held copies can also be cleared through browser/site-data settings.</p>
    <p>If the in-app process fails, use the Support instructions below and identify the account email. Never send passwords, medication lists or other sensitive profile values in a support message.</p>
  </>,
  support: <>
    <h2>Contact & Support</h2><p>For account, billing, privacy, accessibility, safety or deletion help, use the authenticated controls in the <Link to="/account">Profile Kernel</Link>. A dedicated business-controlled support email and mailing contact must be published here before public paid launch.</p>
    <p><strong>Launch hold:</strong> Nature&apos;s Elixirz should remain in controlled beta until verified support contact information and legally reviewed policies are published.</p>
  </>,
};

export default function LegalCenter() {
  const { section = "privacy" } = useParams();
  if (!content[section]) return <Navigate to="/legal/privacy" replace />;
  return <div className="legal-shell"><GlowNav /><main className="legal-page">
    <header><p>Nature&apos;s Elixirz · Public information</p><h1>Trust &amp; Policy Center</h1><span>Last updated {updated}</span></header>
    <nav className="legal-tabs" aria-label="Policy sections">{sections.map(([key, label]) => <Link className={section === key ? "active" : ""} key={key} to={`/legal/${key}`}>{label}</Link>)}</nav>
    <article>{content[section]}<aside><strong>Draft for professional review</strong><p>These policies describe the application&apos;s current technical behavior but do not replace advice from qualified privacy, consumer-protection, healthcare and subscription counsel.</p></aside></article>
  </main></div>;
}
