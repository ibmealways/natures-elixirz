// CosmicHeader.jsx – unified EarthSync header
import React from "react";
import { Link, useLocation } from "react-router-dom";
import "../styles/CosmicShell.css";

const NAV_ITEMS = [
  { to: "/smoothie", label: "Smoothie Lab", icon: "🥤", key: "smoothie" },
  { to: "/frequencies", label: "Frequencies", icon: "🎧", key: "freq" },
  { to: "/tai-chi", label: "Tai Chi Studio", icon: "🧘‍♂️", key: "taichi" },
  { to: "/meals", label: "Meal Plans", icon: "🥗", key: "meals" },
  { to: "/premium", label: "Premium", icon: "⭐", key: "premium" },
];

export default function CosmicHeader({ title, subtitle }) {
  const location = useLocation();

  const activeKey = React.useMemo(() => {
    if (location.pathname.startsWith("/smoothie")) return "smoothie";
    if (location.pathname.startsWith("/frequencies")) return "freq";
    if (location.pathname.startsWith("/tai-chi")) return "taichi";
    if (location.pathname.startsWith("/meals")) return "meals";
    if (location.pathname.startsWith("/premium")) return "premium";
    return null;
  }, [location.pathname]);

  return (
    <>
      {/* Background layers – sit under everything */}
      <div className="cosmic-bg-layer" />
      <div className="cosmic-bg-noise" />
      <div className="cosmic-aurora-layer" />
      <div className="cosmic-particles-layer" />

      <header className="fixed top-0 left-0 right-0 z-10">
        <div className="max-w-6xl mx-auto px-4 pt-4 pb-3 sm:px-6">
          {/* Brand strip */}
          <div className="rounded-3xl border border-emerald-400/40 bg-black/60 backdrop-blur-xl shadow-[0_0_40px_rgba(16,185,129,0.45)] px-4 py-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {/* Brand + page title */}
            <div>
              <div className="text-[0.65rem] uppercase tracking-[0.35em] text-emerald-200/80 hologram-text mb-1">
                EarthSync Hybrid Reactor
              </div>
              <div className="flex flex-col sm:flex-row sm:items-baseline gap-1">
                <h1 className="text-lg sm:text-xl md:text-2xl font-semibold text-emerald-50">
                  {title || "Nature’s Elixirz"}
                </h1>
                {subtitle && (
                  <p className="text-xs sm:text-sm text-emerald-100/80 sm:ml-3">
                    {subtitle}
                  </p>
                )}
              </div>
            </div>

            {/* Nav pills */}
            <nav className="flex flex-wrap gap-2 mt-1 sm:mt-0 justify-start sm:justify-end">
              {NAV_ITEMS.map((item) => {
                const isActive = item.key === activeKey;
                return (
                  <Link
                    key={item.key}
                    to={item.to}
                    className={[
                      "inline-flex items-center rounded-full px-3.5 py-1.5 text-[0.75rem] font-semibold border transition shadow-sm",
                      isActive
                        ? "border-emerald-300/80 bg-emerald-500/20 text-emerald-50 shadow-[0_0_22px_rgba(16,185,129,0.85)]"
                        : "border-emerald-500/30 bg-emerald-950/70 text-emerald-100/80 hover:border-emerald-300/70 hover:bg-emerald-900/70",
                    ].join(" ")}
                  >
                    <span className="mr-1.5">{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      </header>
    </>
  );
}



