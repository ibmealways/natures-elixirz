// src/utilities/mrviRecommendations.js
import { FOCUS } from "./mrviEngine";

export function getFrequencyPresetForFocus(focus) {
  switch (focus) {
    case FOCUS.JOINT_REPAIR:
      return {
        title: "Recovery Grounding",
        frequencies: [
          { hz: 174, label: "Grounding support" },
          { hz: 285, label: "Recovery support" },
        ],
        durationMin: 15,
        tip: "Use during rest or evening recovery.",
      };

    case FOCUS.ENERGY_RESTORATION:
      return {
        title: "Coherence & Energy",
        frequencies: [
          { hz: 432, label: "Coherence" },
          { hz: 528, label: "Energy support" },
        ],
        durationMin: 12,
        tip: "Use in the morning or before movement.",
      };

    case FOCUS.BALANCE_STABILITY:
      return {
        title: "Stability & Reset",
        frequencies: [
          { hz: 396, label: "Grounding stability" },
          { hz: 417, label: "Pattern reset" },
        ],
        durationMin: 12,
        tip: "Use when you feel off-balance or stressed.",
      };

    case FOCUS.PERFORMANCE_VITALITY:
      return {
        title: "Vitality Boost",
        frequencies: [
          { hz: 528, label: "Momentum" },
          { hz: 639, label: "Flow" },
        ],
        durationMin: 10,
        tip: "Use before training or creative work.",
      };

    default:
      return {
        title: "Balanced Maintenance",
        frequencies: [{ hz: 432, label: "Coherence" }],
        durationMin: 10,
        tip: "Maintain your current cycle and re-scan soon.",
      };
  }
}

export function getMealGuidanceForFocus(focus) {
  switch (focus) {
    case FOCUS.JOINT_REPAIR:
      return [
        "Hydration-forward meals and mineral replenishment.",
        "Clean proteins and anti-inflammatory sides.",
        "Avoid heavy late-night digestion for this cycle.",
      ];
    case FOCUS.ENERGY_RESTORATION:
      return [
        "Prioritize protein timing and steady fueling.",
        "Choose quality carbs over refined sugar spikes.",
        "Support minerals: magnesium/potassium sources.",
      ];
    case FOCUS.BALANCE_STABILITY:
      return [
        "Stable blood sugar meals, avoid stimulant overload.",
        "Electrolyte consistency + hydration routine.",
        "Gentle digestion meals while you stabilize.",
      ];
    case FOCUS.PERFORMANCE_VITALITY:
      return [
        "Recovery-forward nutrition post-activity.",
        "Adequate protein and antioxidant density.",
        "Consistency beats intensity. Keep the rhythm.",
      ];
    default:
      return [
        "Maintain a balanced plate: protein + fiber + hydration.",
        "Keep sleep and hydration consistent.",
        "Re-scan to confirm your next focus cycle.",
      ];
  }
}

export function getSmoothieFocusTags(focus) {
  switch (focus) {
    case FOCUS.JOINT_REPAIR:
      return ["joint-repair", "anti-inflammatory", "hydration"];
    case FOCUS.ENERGY_RESTORATION:
      return ["energy", "circulation", "mitochondria"];
    case FOCUS.BALANCE_STABILITY:
      return ["nervous-system", "electrolytes", "grounding"];
    case FOCUS.PERFORMANCE_VITALITY:
      return ["performance", "recovery", "longevity"];
    default:
      return ["balanced", "maintenance"];
  }
}
