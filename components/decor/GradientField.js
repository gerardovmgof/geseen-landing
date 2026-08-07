"use client";

import { motion, useReducedMotion } from "framer-motion";

const BLOBS = [
  { top: "10%", left: "15%", size: 520, delay: 0 },
  { top: "45%", left: "70%", size: 620, delay: 1.5 },
  { top: "75%", left: "25%", size: 460, delay: 3 },
];

export default function GradientField() {
  const reduced = useReducedMotion();

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      <div className="absolute inset-0 dot-grid opacity-30 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
      {BLOBS.map((blob, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full blur-3xl"
          style={{
            top: blob.top,
            left: blob.left,
            width: blob.size,
            height: blob.size,
            background:
              "radial-gradient(circle, var(--accent) 0%, transparent 70%)",
            opacity: 0.1,
          }}
          animate={
            reduced
              ? undefined
              : {
                  x: [0, 40, -20, 0],
                  y: [0, -30, 20, 0],
                }
          }
          transition={{
            duration: 20,
            delay: blob.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}
