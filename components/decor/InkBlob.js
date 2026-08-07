"use client";

import { motion, useReducedMotion } from "framer-motion";

export default function InkBlob({ className = "" }) {
  const reduced = useReducedMotion();

  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute -z-10 ${className}`}
    >
      <motion.svg
        width="640"
        height="640"
        viewBox="0 0 640 640"
        animate={reduced ? undefined : { rotate: [0, 8, -6, 0] }}
        transition={{ duration: 24, repeat: Infinity, ease: "easeInOut" }}
      >
        <path
          d="M320 90c72 0 118 62 168 108s96 96 60 168-134 96-206 96-152-30-198-96S60 210 128 152 248 90 320 90Z"
          fill="var(--accent)"
          opacity="0.08"
        />
      </motion.svg>
    </div>
  );
}
