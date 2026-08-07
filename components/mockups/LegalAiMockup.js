"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Check } from "lucide-react";

const LINES = [90, 75, 82, 60, 88, 70, 50];
const BULLETS = [0, 1, 2];
const cycle = { duration: 6, repeat: Infinity, repeatDelay: 0.6, ease: "easeInOut" };

export default function LegalAiMockup() {
  const reduced = useReducedMotion();

  return (
    <div className="flex h-full w-full gap-5">
      <div className="relative flex-1 rounded-lg border border-border bg-surface-2 p-3">
        <div className="flex h-full flex-col justify-between gap-1.5">
          {LINES.map((w, i) => {
            const t = 0.08 + (i / LINES.length) * 0.42;
            return (
              <motion.span
                key={i}
                className="h-1.5 rounded-full bg-text-dim/40"
                style={{ width: `${w}%` }}
                animate={
                  reduced
                    ? undefined
                    : {
                        backgroundColor: [
                          "var(--text-faint)",
                          "var(--text-faint)",
                          "var(--accent)",
                          "var(--text-faint)",
                        ],
                      }
                }
                transition={{ ...cycle, times: [0, t, t + 0.05, t + 0.15] }}
              />
            );
          })}
        </div>

        <motion.div
          className="absolute inset-x-3 h-6 rounded"
          style={{
            background:
              "linear-gradient(180deg, transparent, var(--accent-soft), transparent)",
          }}
          initial={{ top: "4%" }}
          animate={reduced ? { opacity: 0 } : { top: ["4%", "88%"], opacity: [1, 1, 0] }}
          transition={{ ...cycle, times: [0, 0.5, 0.55] }}
        />
      </div>

      <div className="flex flex-1 flex-col justify-center gap-2.5">
        {BULLETS.map((i) => (
          <motion.div
            key={i}
            className="flex items-center gap-2 rounded-lg border border-border-strong bg-surface px-2.5 py-2"
            initial={{ opacity: 0, x: 10 }}
            animate={
              reduced
                ? { opacity: 1, x: 0 }
                : { opacity: [0, 0, 1, 1, 0], x: [10, 10, 0, 0, 0] }
            }
            transition={{
              ...cycle,
              times: [0, 0.58 + i * 0.08, 0.66 + i * 0.08, 0.92, 1],
            }}
          >
            <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-accent">
              <Check size={9} className="text-white" strokeWidth={3} />
            </span>
            <span
              className="h-1.5 rounded-full bg-text-dim/50"
              style={{ width: 40 + i * 8 }}
            />
          </motion.div>
        ))}
      </div>
    </div>
  );
}
