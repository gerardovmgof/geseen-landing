"use client";

import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useLang } from "@/lib/language-context";
import { SLOGAN } from "@/lib/content";
import ShimmerButton from "@/components/ui/ShimmerButton";
import GradientField from "@/components/decor/GradientField";

const container = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.12, delayChildren: 0.2 },
  },
};

const item = {
  hidden: { opacity: 0, y: 20, filter: "blur(6px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { type: "spring", stiffness: 260, damping: 30 },
  },
};

export default function Hero() {
  const { lang, t } = useLang();
  const reduced = useReducedMotion();

  return (
    <section
      id="hero"
      className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden px-6 pt-16 text-center"
    >
      <GradientField />

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="relative z-10 flex flex-col items-center"
      >
        <motion.img
          src="/isotype-white.png"
          alt="GESEEN"
          className="h-20 w-auto md:h-24"
          initial={
            reduced
              ? { opacity: 1 }
              : { clipPath: "inset(0 0 100% 0)", opacity: 0.6 }
          }
          animate={{ clipPath: "inset(0 0 0% 0)", opacity: 1 }}
          transition={{ duration: 0.9, ease: "easeOut" }}
        />

        <motion.h1
          variants={item}
          className="mt-8 max-w-3xl text-4xl font-semibold tracking-tight text-text md:text-6xl"
        >
          <AnimatePresence mode="wait">
            <motion.span
              key={lang}
              initial={{ opacity: 0, filter: "blur(4px)" }}
              animate={{ opacity: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, filter: "blur(4px)" }}
              transition={{ duration: 0.25 }}
              className="block"
            >
              {t.hero.headline}
            </motion.span>
          </AnimatePresence>
        </motion.h1>

        <motion.p
          variants={item}
          className="mt-5 max-w-xl text-base text-text-dim md:text-lg"
        >
          {t.hero.sub}
        </motion.p>

        <motion.p
          variants={item}
          className="mt-6 flex items-center gap-2 font-mono text-sm text-text-faint"
        >
          <span>[</span>
          <span className="font-serif text-lg italic text-text-dim">
            {SLOGAN}
          </span>
          <span>]</span>
        </motion.p>

        <motion.div
          variants={item}
          className="mt-10 flex flex-col items-center gap-4 sm:flex-row"
        >
          <ShimmerButton href="#contacto" variant="primary">
            {t.hero.ctaPrimary}
          </ShimmerButton>
          <ShimmerButton href="#portafolio" variant="ghost">
            {t.hero.ctaSecondary}
          </ShimmerButton>
        </motion.div>

        <motion.div
          variants={item}
          className="mt-16 flex items-center gap-4 font-mono text-xs tracking-widest text-text-faint"
        >
          {t.hero.strip.map((word, i) => (
            <span key={word} className="flex items-center gap-4">
              {i > 0 && <span aria-hidden>·</span>}
              {word}
            </span>
          ))}
        </motion.div>
      </motion.div>
    </section>
  );
}
