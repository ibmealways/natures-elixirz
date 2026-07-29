// ===========================================================
// App.js — Dynamic Page Shell (No Floating Header)
// Nature’s Elixirz — Premium Cosmic UI + MRVI
// ===========================================================

import React from "react";
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

// =====================
// MAIN PAGES
// =====================
import SmoothieLab from "./pages/SmoothieLab";
import Frequencies from "./pages/Frequencies";
import TaiChiStudio from "./pages/TaiChiStudio";
import MealPlanLab from "./pages/MealPlanLab";
import PremiumPortal from "./pages/PremiumPortal";
import AccountPage from "./pages/AccountPage";

// =====================
// FREQUENCY SUB-PAGES
// =====================
import FrequencyHistoryPage from "./pages/FrequencyHistoryPage";
import FrequencyGraphsPage from "./pages/FrequencyGraphsPage";
import FrequencyChamberPage from "./pages/FrequencyChamberPage";
import FrequencyTimerPage from "./pages/FrequencyTimerPage";

// =====================
// MRVI PAGE
// =====================
import MRVIPage from "./pages/MRVI";

// ======================================================
// DYNAMIC SHELL (NO HEADER RENDERED HERE)
// ======================================================
function Shell() {
  const location = useLocation();

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
        <Routes>
          {/* MAIN */}
          <Route path="/" element={<SmoothieLab />} />
          <Route path="/smoothie" element={<SmoothieLab />} />
          <Route path="/frequencies" element={<Frequencies />} />
          <Route path="/tai-chi" element={<TaiChiStudio />} />
          <Route path="/meals" element={<MealPlanLab />} />
          <Route path="/premium" element={<PremiumPortal />} />
          <Route path="/account" element={<AccountPage />} />

          {/* FREQUENCY SUB */}
          <Route
            path="/frequencies/history"
            element={<FrequencyHistoryPage />}
          />
          <Route
            path="/frequencies/graphs"
            element={<FrequencyGraphsPage />}
          />
          <Route
            path="/frequencies/chamber"
            element={<FrequencyChamberPage />}
          />
          <Route
            path="/frequencies/timer"
            element={<FrequencyTimerPage />}
          />

          {/* MRVI */}
          <Route path="/mrvi" element={<MRVIPage />} />
        </Routes>
      </div>
    </div>
  );
}

// ======================================================
// ROOT APP WRAPPER
// ======================================================
export default function App() {
  return (
    <MRVIProvider>
      <Router>
        <Shell />
      </Router>
    </MRVIProvider>
  );
}


