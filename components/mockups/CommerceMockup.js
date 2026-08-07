"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Check } from "lucide-react";

const TILES = [0, 1, 2, 3, 4, 5];
const POP_INDEX = 4;

export default function CommerceMockup() {
  const reduced = useReducedMotion();

  return (
    <div className="flex h-full w-full items-center gap-4">
      <div className="flex h-full flex-col justify-between py-1">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-8 w-1.5 rounded-full bg-surface-2"
            style={{ opacity: 0.5 + i * 0.15 }}
          />
        ))}
      </div>

      <div className="relative flex-1">
        <div className="grid grid-cols-3 gap-2.5">
          {TILES.map((i) => (
            <motion.div
              key={i}
              className="aspect-square rounded-lg border border-border-strong"
              style={{
                background:
                  i === POP_INDEX
                    ? "linear-gradient(160deg, var(--accent) 0%, var(--surface-2) 100%)"
                    : "linear-gradient(160deg, var(--surface-2) 0%, var(--bg) 100%)",
              }}
              animate={
                reduced || i !== POP_INDEX
                  ? undefined
                  : { scale: [1, 1.12, 1] }
              }
              transition={{
                duration: 5,
                repeat: Infinity,
                repeatDelay: 0.5,
                times: [0, 0.5, 1],
                ease: "easeInOut",
              }}
            />
          ))}
        </div>

        <motion.div
          className="absolute -bottom-2 -right-2 flex items-center gap-2 rounded-xl border border-whatsapp/40 bg-whatsapp-soft px-3 py-2"
          initial={{ opacity: 0, x: 16, scale: 0.9 }}
          animate={
            reduced
              ? { opacity: 1, x: 0, scale: 1 }
              : { opacity: [0, 1, 1, 0], x: [16, 0, 0, 16], scale: [0.9, 1, 1, 0.9] }
          }
          transition={{
            duration: 5,
            repeat: Infinity,
            repeatDelay: 0.5,
            times: [0, 0.3, 0.85, 1],
            ease: "easeInOut",
          }}
        >
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-whatsapp">
            <Check size={12} className="text-black" strokeWidth={3} />
          </span>
          <div className="flex flex-col gap-1">
            <span className="h-1.5 w-14 rounded-full bg-text-dim/50" />
            <span className="h-1.5 w-10 rounded-full bg-text-dim/30" />
          </div>
        </motion.div>
      </div>
    </div>
  );
}
