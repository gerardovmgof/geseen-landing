"use client";

import { motion, useReducedMotion } from "framer-motion";

// Deterministic decorative pattern (not a scannable QR).
const QR_PATTERN = [
  1, 1, 0, 1, 1,
  1, 0, 1, 0, 1,
  0, 1, 1, 1, 0,
  1, 0, 1, 0, 1,
  1, 1, 0, 1, 1,
];

const MENU_ROWS = [70, 55, 62, 40];

function QrGrid({ size }) {
  return (
    <div
      className="grid grid-cols-5 gap-[2px] rounded-sm bg-text p-1"
      style={{ width: size, height: size }}
    >
      {QR_PATTERN.map((on, i) => (
        <span
          key={i}
          className="rounded-[1px]"
          style={{ background: on ? "var(--bg)" : "transparent" }}
        />
      ))}
    </div>
  );
}

export default function QrMenuMockup() {
  const reduced = useReducedMotion();
  const timing = { duration: 5, repeat: Infinity, repeatDelay: 0.5, ease: "easeInOut" };

  return (
    <div className="flex h-full w-full items-center justify-center gap-8">
      <div className="relative flex h-full max-h-56 w-32 flex-col items-center rounded-[1.75rem] border-2 border-border-strong bg-bg px-3 py-4">
        <span className="h-1 w-8 rounded-full bg-border-strong" />

        <motion.div
          className="absolute left-3 top-8"
          initial={{ scale: 1.6, x: 20, y: 20 }}
          animate={
            reduced
              ? { scale: 0.55, x: 0, y: 0 }
              : { scale: [1.6, 1.6, 0.55, 0.55], x: [20, 20, 0, 0], y: [20, 20, 0, 0] }
          }
          transition={{ ...timing, times: [0, 0.15, 0.4, 1] }}
        >
          <QrGrid size={40} />
        </motion.div>

        <div className="mt-24 flex w-full flex-col gap-2.5">
          {MENU_ROWS.map((w, i) => (
            <motion.span
              key={i}
              className="h-2 rounded-full bg-surface-2"
              style={{ width: `${w}%` }}
              initial={{ opacity: 0, y: 8 }}
              animate={
                reduced
                  ? { opacity: 1, y: 0 }
                  : { opacity: [0, 0, 1, 1], y: [8, 8, 0, 0] }
              }
              transition={{
                ...timing,
                times: [0, 0.35 + i * 0.06, 0.55 + i * 0.06, 1],
              }}
            />
          ))}
        </div>
      </div>

      <svg width="40" height="70" viewBox="0 0 40 70" fill="none" aria-hidden>
        <motion.path
          d="M20 40 C 10 32, 30 24, 20 16 C 10 8, 30 4, 24 0"
          stroke="var(--text-faint)"
          strokeWidth="1.5"
          strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={
            reduced
              ? { pathLength: 1, opacity: 0.6 }
              : { pathLength: [0, 1, 1], opacity: [0, 0.6, 0] }
          }
          transition={{ duration: 3.5, repeat: Infinity, repeatDelay: 0.8, ease: "easeInOut" }}
        />
        <circle cx="20" cy="52" r="10" fill="var(--surface-2)" stroke="var(--border-strong)" />
      </svg>
    </div>
  );
}
