"use client";

import { motion } from "framer-motion";
import { useLang } from "@/lib/language-context";
import LangToggle from "@/components/ui/LangToggle";

const LINKS = ["servicios", "portafolio", "contacto"];

export default function Navbar() {
  const { t } = useLang();

  return (
    <motion.nav
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 30, delay: 0.1 }}
      className="fixed top-0 inset-x-0 z-50 border-b border-border bg-bg/60 backdrop-blur-md"
    >
      <div className="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between">
        <a href="#hero" className="flex items-center gap-2">
          <img src="/isotype-white.png" alt="" className="h-6 w-auto" />
          <span className="font-mono text-sm tracking-wide">GESEEN</span>
        </a>

        <div className="hidden md:flex items-center gap-8 font-mono text-xs uppercase tracking-wide">
          {LINKS.map((link) => (
            <a
              key={link}
              href={`#${link}`}
              className="text-text-faint transition-colors hover:text-text"
            >
              {t.nav[link]}
            </a>
          ))}
        </div>

        <LangToggle />
      </div>
    </motion.nav>
  );
}
