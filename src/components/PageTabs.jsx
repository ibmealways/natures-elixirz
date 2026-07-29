// src/components/PageTabs.jsx
import React from "react";
import { NavLink } from "react-router-dom";

const tabs = [
  { to: "/smoothie",    label: "Smoothie Lab" },
  { to: "/frequencies", label: "Frequencies" },
  { to: "/tai-chi",     label: "Tai Chi Studio" },
  { to: "/meals",       label: "Meal Plans" },
  { to: "/premium",     label: "Premium" },
];

export default function PageTabs() {
  return (
    <div className="w-full flex justify-center mb-8">
      <div className="inline-flex gap-3 rounded-full bg-slate-950/40 px-3 py-2 border border-emerald-500/40 shadow-[0_0_40px_rgba(16,185,129,0.35)]">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end
            className={({ isActive }) =>
              [
                "px-5 py-2 rounded-full text-sm font-semibold transition",
                "border",
                isActive
                  ? "bg-emerald-500 text-slate-950 border-emerald-400 shadow-[0_0_30px_rgba(34,197,94,0.7)]"
                  : "bg-slate-950/60 text-emerald-100/85 border-emerald-400/50 hover:bg-slate-900 hover:border-emerald-300 hover:text-emerald-50",
              ].join(" ")
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </div>
    </div>
  );
}
