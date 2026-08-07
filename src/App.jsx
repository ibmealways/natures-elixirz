// ===========================================================
// App.js — Dynamic Page Shell (No Floating Header)
// Nature’s Elixirz — Premium Cosmic UI + MRVI
// ===========================================================

import React, { lazy, Suspense, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
} from "react-router-dom";

// =====================
// MRVI PROVIDER
// =====================
import { MRVIProvider } from "./context/MRVIContext";
import { SubscriberProvider } from "./context/SubscriberContext";
import { AuthProvider } from "./context/AuthContext";
import { useAuth } from "./context/AuthContext";
import { useSubscriber } from "./context/SubscriberContext";
import { subscribeEntitlement } from "./utilities/cloudSync";
import { LanguageProvider } from "./context/LanguageContext";

const SmoothieLab = lazy(() => import("./pages/SmoothieLab"));
const Frequencies = lazy(() => import("./pages/Frequencies"));
const TaiChiStudio = lazy(() => import("./pages/TaiChiStudio"));
const MealPlanLab = lazy(() => import("./pages/MealPlanLab"));
const PremiumPortal = lazy(() => import("./pages/PremiumPortal"));
const AccountPage = lazy(() => import("./pages/AccountPage"));
const MRVIPage = lazy(() => import("./pages/MRVI"));
const VIPCircle = lazy(() => import("./pages/VIPCircle"));
const SavedSmoothies = lazy(() => import("./pages/SavedSmoothies"));
const AstraGuide = lazy(() => import("./pages/AstraGuide"));
const BetaAdmin = lazy(() => import("./pages/BetaAdmin"));
const LegalCenter = lazy(() => import("./pages/LegalCenter"));

function PageLoader() {
  return <div className="min-h-screen bg-black px-6 py-24 text-center text-emerald-200">Loading Nature&apos;s Elixirz…</div>;
}

function EntitlementBridge() {
  const { user, configured } = useAuth();
  const { setEntitlement } = useSubscriber();
  useEffect(() => {
    if (!configured) return;
    if (!user) {
      setEntitlement({ tier: 0, status: "inactive" });
      return;
    }
    // Lock paid tools while the server-owned entitlement is being resolved.
    setEntitlement({ tier: 0, status: "inactive" });
    const unsubscribe = subscribeEntitlement(
      user,
      (entitlement) => setEntitlement(entitlement),
      () => setEntitlement({ tier: 0, status: "inactive" }),
    );
    return unsubscribe;
  }, [user, configured, setEntitlement]);
  return null;
}

// ======================================================
// DYNAMIC SHELL (NO HEADER RENDERED HERE)
// ======================================================
function Shell() {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [location.pathname]);

  // Frequency routes use darker background
  const isFrequencyRoute =
    location.pathname === "/frequencies" ||
    location.pathname.startsWith("/frequencies/");

  const shellBgClass = isFrequencyRoute
    ? "min-h-screen bg-black text-emerald-50"
    : "min-h-screen bg-gradient-to-b from-black via-emerald-950 to-black text-emerald-50";

  return (
    <div className={shellBgClass}>
      {/* PAGE CONTENT ONLY — headers are embedded per page */}
      <div className="pt-0 pb-20 md:pb-10">
        <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* MAIN */}
          <Route path="/" element={<SmoothieLab />} />
          <Route path="/smoothie" element={<SmoothieLab />} />
          <Route path="/frequencies" element={<Frequencies />} />
          <Route path="/tai-chi" element={<TaiChiStudio />} />
          <Route path="/meals" element={<MealPlanLab />} />
          <Route path="/premium" element={<PremiumPortal />} />
          <Route path="/account" element={<AccountPage />} />
          <Route path="/saved" element={<SavedSmoothies />} />
          <Route path="/vip" element={<VIPCircle />} />
          <Route path="/astra" element={<AstraGuide />} />
          <Route path="/beta-admin" element={<BetaAdmin />} />
          <Route path="/legal" element={<LegalCenter />} />
          <Route path="/legal/:section" element={<LegalCenter />} />

          {/* FREQUENCY SUB */}
          <Route
            path="/frequencies/history"
            element={<Frequencies />}
          />
          <Route
            path="/frequencies/graphs"
            element={<Frequencies />}
          />
          <Route
            path="/frequencies/chamber"
            element={<Frequencies />}
          />
          <Route
            path="/frequencies/timer"
            element={<Frequencies />}
          />

          {/* MRVI */}
          <Route path="/mrvi" element={<MRVIPage />} />
          <Route path="*" element={<SmoothieLab />} />
        </Routes>
        </Suspense>
      </div>
      <footer className="public-legal-footer" aria-label="Legal and support links">
        <span>© {new Date().getFullYear()} AstraMind Technologies</span>
        <nav>
          <Link to="/legal/privacy">Privacy</Link>
          <Link to="/legal/terms">Terms</Link>
          <Link to="/legal/wellness">Wellness disclaimer</Link>
          <Link to="/legal/subscriptions">Subscriptions</Link>
          <Link to="/legal/deletion">Data deletion</Link>
          <Link to="/legal/support">Support</Link>
        </nav>
      </footer>
    </div>
  );
}

// ======================================================
// ROOT APP WRAPPER
// ======================================================
export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <SubscriberProvider>
          <EntitlementBridge />
          <MRVIProvider>
            <Router>
              <Shell />
            </Router>
          </MRVIProvider>
        </SubscriberProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}


