"use client";

import { motion } from "framer-motion";

export default function PortfolioCard({ index, tag, title, description, reverse, children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 32, filter: "blur(6px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ type: "spring", stiffness: 220, damping: 30 }}
      className="grid items-center gap-8 py-10 md:grid-cols-2 md:gap-14 md:py-14"
    >
      <div className={reverse ? "md:order-2" : ""}>
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs text-text-faint">
            [{String(index).padStart(2, "0")}]
          </span>
          <span className="font-mono text-[11px] tracking-wide text-accent">
            {tag}
          </span>
        </div>
        <h3 className="mt-4 text-2xl font-semibold tracking-tight text-text md:text-3xl">
          {title}
        </h3>
        <p className="mt-3 max-w-md text-text-dim">{description}</p>
      </div>

      <div className={reverse ? "md:order-1" : ""}>
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-3xl border border-border bg-surface p-6">
          {children}
        </div>
      </div>
    </motion.div>
  );
}
