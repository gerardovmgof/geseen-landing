"use client";

import { useRef } from "react";
import { motion } from "framer-motion";
import {
  Code2,
  ShoppingBag,
  Bot,
  Sparkles,
  QrCode,
  LayoutDashboard,
} from "lucide-react";
import { useLang } from "@/lib/language-context";

const ICONS = [Code2, ShoppingBag, Bot, Sparkles, QrCode, LayoutDashboard];

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const item = {
  hidden: { opacity: 0, y: 24, filter: "blur(6px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { type: "spring", stiffness: 260, damping: 30 },
  },
};

function ServiceCard({ index, title, description, Icon }) {
  const ref = useRef(null);

  function handleMouseMove(e) {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--x", `${e.clientX - rect.left}px`);
    el.style.setProperty("--y", `${e.clientY - rect.top}px`);
  }

  return (
    <motion.div
      ref={ref}
      variants={item}
      onMouseMove={handleMouseMove}
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className="group relative overflow-hidden rounded-2xl border border-border bg-surface p-6 transition-colors hover:border-accent/40"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background:
            "radial-gradient(240px circle at var(--x) var(--y), var(--accent-soft), transparent 70%)",
        }}
      />
      <div className="relative z-10">
        <div className="flex items-center justify-between">
          <span className="font-mono text-xs text-text-faint">
            [{String(index + 1).padStart(2, "0")}]
          </span>
          <Icon size={18} className="text-accent" strokeWidth={1.75} />
        </div>
        <h3 className="mt-4 font-medium text-text">{title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-text-dim">
          {description}
        </p>
      </div>
    </motion.div>
  );
}

export default function Services() {
  const { t } = useLang();

  return (
    <section id="servicios" className="py-24 px-6 md:py-32">
      <div className="mx-auto max-w-6xl">
        <div className="max-w-xl">
          <span className="font-mono text-xs text-text-faint">
            {t.services.eyebrow}
          </span>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-text md:text-4xl">
            {t.services.heading}
          </h2>
          <p className="mt-3 text-text-dim">{t.services.sub}</p>
        </div>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          className="mt-12 grid gap-4 md:grid-cols-3"
        >
          {t.services.items.map((s, i) => (
            <ServiceCard
              key={s.title}
              index={i}
              title={s.title}
              description={s.description}
              Icon={ICONS[i]}
            />
          ))}
        </motion.div>
      </div>
    </section>
  );
}
