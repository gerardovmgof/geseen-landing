"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Sparkles, Check } from "lucide-react";

const CAL_CELLS = Array.from({ length: 20 });
const TARGET_CELL = 13;
const cycle = { duration: 6, repeat: Infinity, repeatDelay: 0.6, ease: "easeInOut" };

export default function BookingBotMockup() {
  const reduced = useReducedMotion();

  return (
    <div className="flex h-full w-full gap-5">
      <div className="flex flex-1 flex-col justify-center gap-2.5">
        <motion.div
          className="ml-auto flex max-w-[75%] items-center rounded-lg rounded-br-sm bg-surface-2 px-3 py-2"
          initial={{ opacity: 0, y: 6 }}
          animate={reduced ? { opacity: 1, y: 0 } : { opacity: [0, 1, 1, 1, 0], y: [6, 0, 0, 0, 0] }}
          transition={{ ...cycle, times: [0, 0.08, 0.9, 0.96, 1] }}
        >
          <span className="h-1.5 w-16 rounded-full bg-text-dim/50" />
        </motion.div>

        <motion.div
          className="flex max-w-[80%] items-center gap-2 rounded-lg rounded-bl-sm border border-accent/30 bg-accent-soft px-3 py-2"
          initial={{ opacity: 0, y: 6 }}
          animate={reduced ? { opacity: 1, y: 0 } : { opacity: [0, 0, 1, 1, 0], y: [6, 6, 0, 0, 0] }}
          transition={{ ...cycle, times: [0, 0.18, 0.28, 0.9, 1] }}
        >
          <Sparkles size={12} className="shrink-0 text-accent" />
          <motion.div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="h-1 w-1 rounded-full bg-accent"
                animate={reduced ? { opacity: 1 } : { opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
              />
            ))}
          </motion.div>
        </motion.div>
      </div>

      <div className="flex flex-1 flex-col justify-center">
        <div className="grid grid-cols-5 gap-1.5">
          {CAL_CELLS.map((_, i) => (
            <motion.div
              key={i}
              className="relative aspect-square rounded-[3px] bg-surface-2"
              animate={
                i === TARGET_CELL && !reduced
                  ? {
                      backgroundColor: [
                        "var(--surface-2)",
                        "var(--surface-2)",
                        "var(--accent)",
                        "var(--accent)",
                        "var(--surface-2)",
                      ],
                    }
                  : i === TARGET_CELL
                  ? { backgroundColor: "var(--accent)" }
                  : undefined
              }
              transition={{ ...cycle, times: [0, 0.55, 0.68, 0.92, 1] }}
            >
              {i === TARGET_CELL && (
                <motion.span
                  className="absolute inset-0 flex items-center justify-center"
                  initial={{ opacity: 0, scale: 0.4 }}
                  animate={
                    reduced
                      ? { opacity: 1, scale: 1 }
                      : { opacity: [0, 0, 1, 1, 0], scale: [0.4, 0.4, 1, 1, 0.4] }
                  }
                  transition={{ ...cycle, times: [0, 0.68, 0.78, 0.92, 1] }}
                >
                  <Check size={9} className="text-black" strokeWidth={3} />
                </motion.span>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
