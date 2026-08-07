"use client";

// Sliding-pill pattern adapted from Watermelon UI's fluid-tabs
// (registry.watermelon.sh/r/fluid-tabs.json), simplified to a two-option ES/EN switch.

import { motion } from "framer-motion";
import { useLang } from "@/lib/language-context";

const OPTIONS = ["es", "en"];

export default function LangToggle() {
  const { lang, setLang } = useLang();

  return (
    <div className="relative flex items-center gap-0.5 rounded-full border border-border bg-surface p-0.5">
      {OPTIONS.map((option) => {
        const isActive = lang === option;
        return (
          <button
            key={option}
            type="button"
            onClick={() => setLang(option)}
            className="relative rounded-full px-3 py-1.5 font-mono text-xs uppercase outline-none"
          >
            {isActive && (
              <motion.span
                layoutId="lang-pill"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                className="absolute inset-0 rounded-full bg-accent-soft border border-accent/40"
              />
            )}
            <span
              className={`relative z-10 ${
                isActive ? "text-text" : "text-text-faint"
              }`}
            >
              {option}
            </span>
          </button>
        );
      })}
    </div>
  );
}
