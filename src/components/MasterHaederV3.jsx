// src/components/MasterHeaderV3.jsx
import { NavLink } from "react-router-dom";

export default function MasterHeaderV3() {
  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-black/70 border-b border-emerald-400/20">
      <div className="max-w-7xl mx-auto px-5 py-4 flex flex-wrap items-center justify-between gap-4">

        {/* BRAND */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-400 shadow-lg" />
          <div>
            <p className="text-[0.6rem] tracking-[0.3em] uppercase text-emerald-300">
              EarthSync Hybrid Reactor
            </p>
            <h1 className="text-lg font-semibold text-emerald-100">
              Nature’s Elixirz
            </h1>
            <p className="text-xs text-emerald-300/80">
              Healing • Frequencies • Flow
            </p>
          </div>
        </div>

        {/* NAV */}
        <nav className="flex flex-wrap items-center gap-2">
          {[
            { to: "/smoothie", label: "Smoothie Lab" },
            { to: "/frequencies", label: "Frequencies" },
            { to: "/tai-chi", label: "Tai Chi Studio" },
            { to: "/meals", label: "Meal Plans" },
            { to: "/premium", label: "Premium", premium: true },
          ].map(({ to, label, premium }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `px-4 py-2 rounded-full text-sm transition border
                ${
                  premium
                    ? "bg-emerald-400 text-black border-emerald-300 shadow-lg"
                    : isActive
                    ? "bg-emerald-500/20 border-emerald-400 text-emerald-100"
                    : "border-emerald-400/30 text-emerald-200 hover:bg-emerald-500/10"
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  );
}
