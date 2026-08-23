// ===========================================================
// App.js — Dynamic Page Shell (No Floating Header)
// Nature’s Elixirz — Premium Cosmic UI + MRVI
// ===========================================================

import React, {
  lazy,
  Suspense,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
import { clearKernelSession } from "./utilities/kernelSessionStorage";
import MealPlansErrorBoundary from "./components/MealPlansErrorBoundary";

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
const SupportCenter = lazy(() => import("./pages/SupportCenter"));

function PageLoader() {
  return <div className="min-h-screen bg-black px-6 py-24 text-center text-emerald-200">Loading Nature&apos;s Elixirz…</div>;
}

const RESUMABLE_KERNELS = [
  { id: "smoothie", label: "Smoothie", matches: (path) => path === "/" || path === "/smoothie", component: SmoothieLab },
  { id: "frequencies", label: "Frequency", matches: (path) => path === "/frequencies" || path.startsWith("/frequencies/"), component: Frequencies },
  { id: "tai-chi", label: "Tai Chi", matches: (path) => path === "/tai-chi", component: TaiChiStudio },
  { id: "meals", label: "Meal Plans", matches: (path) => path === "/meals", component: MealPlanLab },
  { id: "premium", label: "Plans", matches: (path) => path === "/premium", component: PremiumPortal },
  { id: "account", label: "Profile", matches: (path) => path === "/account", component: AccountPage },
  { id: "saved", label: "Saved", matches: (path) => path === "/saved", component: SavedSmoothies },
  { id: "vip", label: "V.I.P.", matches: (path) => path === "/vip", component: VIPCircle },
  { id: "astra", label: "Astra AI", matches: (path) => path === "/astra", component: AstraGuide },
  { id: "movement", label: "Movement", matches: (path) => path === "/mrvi", component: MRVIPage },
];

function sessionScrollKey(accountKey, kernelId) {
  return `ne-kernel-scroll:${accountKey}:${kernelId}`;
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
  const { user } = useAuth();
  const partnerInvitation = new URLSearchParams(location.search).get("invite");
  const isKoyaInvitation = partnerInvitation === "koya-webb";
  const accountKey = user?.uid || "guest";
  const activeKernel = useMemo(
    () => RESUMABLE_KERNELS.find((kernel) => kernel.matches(location.pathname)) || null,
    [location.pathname],
  );
  const [visitedKernels, setVisitedKernels] = useState(
    () => new Set(activeKernel ? [activeKernel.id] : []),
  );
  const [kernelRevisions, setKernelRevisions] = useState({});
  const [cloudHydrationRevision, setCloudHydrationRevision] = useState(0);
  const previousAccountKey = useRef(accountKey);

  useEffect(() => {
    const showRestoredAccountData = () => setCloudHydrationRevision((current) => current + 1);
    window.addEventListener("naturesElixirz:data-ready", showRestoredAccountData, { once: true });
    return () => window.removeEventListener("naturesElixirz:data-ready", showRestoredAccountData);
  }, [accountKey]);

  useEffect(() => {
    if (previousAccountKey.current === accountKey) return;
    previousAccountKey.current = accountKey;
    setVisitedKernels(new Set(activeKernel ? [activeKernel.id] : []));
    setKernelRevisions({});
  }, [accountKey, activeKernel]);

  useEffect(() => {
    if (!activeKernel) return;
    setVisitedKernels((current) => {
      if (current.has(activeKernel.id)) return current;
      const next = new Set(current);
      next.add(activeKernel.id);
      return next;
    });
  }, [activeKernel]);

  useLayoutEffect(() => {
    if (!activeKernel) {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      return undefined;
    }

    const key = sessionScrollKey(accountKey, activeKernel.id);
    const rememberedTop = Number.parseInt(sessionStorage.getItem(key) || "0", 10);
    window.scrollTo({ top: Number.isFinite(rememberedTop) ? rememberedTop : 0, left: 0, behavior: "auto" });

    const rememberPosition = () => sessionStorage.setItem(key, String(window.scrollY));
    window.addEventListener("scroll", rememberPosition, { passive: true });
    return () => {
      rememberPosition();
      window.removeEventListener("scroll", rememberPosition);
    };
  }, [accountKey, activeKernel]);

  const startNewKernelSession = () => {
    if (!activeKernel) return;
    const confirmed = window.confirm(
      `Start a new ${activeKernel.label} session? Your saved profile, pantry, recipes, and cloud records will stay intact.`,
    );
    if (!confirmed) return;
    clearKernelSession(accountKey, activeKernel.id);
    sessionStorage.removeItem(sessionScrollKey(accountKey, activeKernel.id));
    setKernelRevisions((current) => ({
      ...current,
      [activeKernel.id]: (current[activeKernel.id] || 0) + 1,
    }));
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  };

  // Frequency routes use darker background
  const isFrequencyRoute =
    location.pathname === "/frequencies" ||
    location.pathname.startsWith("/frequencies/");

  const shellBgClass = isFrequencyRoute
    ? "min-h-screen bg-black text-emerald-50"
    : "min-h-screen bg-gradient-to-b from-black via-emerald-950 to-black text-emerald-50";

  return (
    <div className={shellBgClass}>
      {isKoyaInvitation && <aside className="mx-auto flex max-w-6xl items-center justify-between gap-4 border-b border-emerald-300/30 bg-emerald-950/90 px-5 py-3 text-emerald-50 shadow-lg shadow-emerald-950/30">
        <span><strong className="text-emerald-200">Private beta invitation for Koya Webb.</strong> Welcome to Nature&apos;s Elixirz OS - explore the experience at your own pace.</span>
        <Link className="shrink-0 rounded-full border border-emerald-300/50 px-3 py-1.5 text-sm font-semibold text-emerald-100 hover:bg-emerald-300 hover:text-emerald-950" to="/astra?invite=koya-webb&source=partner-media-kit">Begin with Astra</Link>
      </aside>}
      {/* PAGE CONTENT ONLY — headers are embedded per page */}
      <div className="pt-0 pb-20 md:pb-10">
        <Suspense fallback={<PageLoader />}>
          {RESUMABLE_KERNELS.map((kernel) => {
            if (!visitedKernels.has(kernel.id)) return null;
            const KernelComponent = kernel.component;
            const isActive = activeKernel?.id === kernel.id;
            return (
              <section
                key={`${accountKey}:${kernel.id}:${cloudHydrationRevision}:${kernelRevisions[kernel.id] || 0}`}
                hidden={!isActive}
                className="kernel-workspace"
              >
                {kernel.id === "meals" ? (
                  <MealPlansErrorBoundary>
                    <KernelComponent />
                  </MealPlansErrorBoundary>
                ) : <KernelComponent />}
              </section>
            );
          })}
          {!activeKernel && (
            <Routes>
              <Route path="/beta-admin" element={<BetaAdmin />} />
              <Route path="/support" element={<SupportCenter />} />
              <Route path="/legal" element={<LegalCenter />} />
              <Route path="/legal/:section" element={<LegalCenter />} />
              <Route path="*" element={<SmoothieLab />} />
            </Routes>
          )}
        </Suspense>
      </div>
      {activeKernel && (
        <aside className="kernel-session-control" aria-label={`${activeKernel.label} session controls`}>
          <span><strong>Session resumed</strong> where you left off</span>
          <button type="button" onClick={startNewKernelSession}>Start new session</button>
        </aside>
      )}
      <footer className="public-legal-footer" aria-label="Legal and support links">
        <span>© {new Date().getFullYear()} AstraMind Technologies</span>
        <nav>
          <Link to="/legal/privacy">Privacy</Link>
          <Link to="/legal/terms">Terms</Link>
          <Link to="/legal/wellness">Wellness disclaimer</Link>
          <Link to="/legal/subscriptions">Subscriptions</Link>
          <Link to="/legal/deletion">Data deletion</Link>
          <Link to="/support">Support</Link>
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


