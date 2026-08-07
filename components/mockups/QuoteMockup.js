"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Check, Send } from "lucide-react";

const STEP_TIMES = [0, 0.22, 0.44, 1];
const CHIP_WIDTHS = [34, 26, 30];

export default function QuoteMockup() {
  const reduced = useReducedMotion();
  const cycle = { duration: 6, repeat: Infinity, repeatDelay: 0.6, ease: "easeInOut" };

  return (
    <div className="flex h-full w-full flex-col justify-between">
      <div>
        <div className="flex items-center">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex flex-1 items-center last:flex-none">
              <motion.span
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px]"
                animate={
                  reduced
                    ? { backgroundColor: "var(--accent)", borderColor: "var(--accent)" }
                    : {
                        backgroundColor: [
                          i === 0 ? "var(--accent)" : "var(--surface-2)",
                          i <= 1 ? "var(--accent)" : "var(--surface-2)",
                          "var(--accent)",
                          "var(--accent)",
                        ],
                        borderColor: "var(--accent)",
                      }
                }
                transition={{ ...cycle, times: STEP_TIMES }}
              />
              {i < 2 && (
                <motion.div
                  className="mx-1.5 h-[2px] flex-1 origin-left bg-accent"
                  style={{ scaleX: reduced ? 1 : 0 }}
                  animate={
                    reduced
                      ? { scaleX: 1 }
                      : { scaleX: i === 0 ? [0, 1, 1, 1] : [0, 0, 1, 1] }
                  }
                  transition={{ ...cycle, times: STEP_TIMES }}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {CHIP_WIDTHS.map((w, i) => (
          <motion.div
            key={i}
            className="flex items-center gap-1.5 rounded-full border px-2.5 py-1.5"
            animate={
              reduced
                ? { borderColor: "var(--accent)", backgroundColor: "var(--accent-soft)" }
                : {
                    borderColor: ["var(--border-strong)", "var(--border-strong)", "var(--accent)"],
                    backgroundColor: [
                      "rgba(124, 134, 255, 0)",
                      "rgba(124, 134, 255, 0)",
                      "var(--accent-soft)",
                    ],
                  }
            }
            transition={{
              ...cycle,
              times: [0, 0.2 + i * 0.12, 0.34 + i * 0.12],
            }}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            <span className="h-1.5 rounded-full bg-text-dim/50" style={{ width: w }} />
          </motion.div>
        ))}
      </div>

      <motion.div
        className="relative flex h-11 items-center justify-between overflow-hidden rounded-xl border px-4"
        animate={
          reduced
            ? { backgroundColor: "var(--whatsapp)", borderColor: "var(--whatsapp)" }
            : {
                backgroundColor: [
                  "var(--surface-2)",
                  "var(--surface-2)",
                  "var(--surface-2)",
                  "var(--whatsapp)",
                ],
                borderColor: [
                  "var(--border-strong)",
                  "var(--border-strong)",
                  "var(--border-strong)",
                  "var(--whatsapp)",
                ],
              }
        }
        transition={{ ...cycle, times: [0, 0.5, 0.78, 1] }}
      >
        <motion.div
          className="absolute inset-0 flex items-center justify-between px-4"
          animate={reduced ? { opacity: 0 } : { opacity: [1, 1, 0, 0] }}
          transition={{ ...cycle, times: [0, 0.65, 0.8, 1] }}
        >
          <span className="h-1.5 w-12 rounded-full bg-text-dim/50" />
          <span className="font-mono text-xs text-text-dim">$ ▮▮▮</span>
        </motion.div>
        <motion.div
          className="absolute inset-0 flex items-center justify-center gap-2 text-black"
          animate={reduced ? { opacity: 1 } : { opacity: [0, 0, 0, 1] }}
          transition={{ ...cycle, times: [0, 0.65, 0.8, 1] }}
        >
          <Send size={14} strokeWidth={2} />
          <span className="font-mono text-xs font-medium">WhatsApp</span>
          <Check size={14} strokeWidth={2.5} />
        </motion.div>
      </motion.div>
    </div>
  );
}
