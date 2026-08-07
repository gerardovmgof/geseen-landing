"use client";

import { motion } from "framer-motion";
import { useLang } from "@/lib/language-context";
import PortfolioCard from "@/components/PortfolioCard";
import ShimmerButton from "@/components/ui/ShimmerButton";
import CommerceMockup from "@/components/mockups/CommerceMockup";
import QrMenuMockup from "@/components/mockups/QrMenuMockup";
import QuoteMockup from "@/components/mockups/QuoteMockup";
import BookingBotMockup from "@/components/mockups/BookingBotMockup";
import LegalAiMockup from "@/components/mockups/LegalAiMockup";

const MOCKUPS = [CommerceMockup, QrMenuMockup, QuoteMockup, BookingBotMockup, LegalAiMockup];

export default function Portfolio() {
  const { t } = useLang();
  const words = t.portfolio.closing.statement.split(" ");

  return (
    <section id="portafolio" className="px-6 py-24 md:py-32">
      <div className="mx-auto max-w-6xl">
        <div className="max-w-xl">
          <span className="font-mono text-xs text-text-faint">
            {t.portfolio.eyebrow}
          </span>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-text md:text-4xl">
            {t.portfolio.heading}
          </h2>
          <p className="mt-3 text-text-dim">{t.portfolio.sub}</p>
        </div>

        <div className="mt-6 divide-y divide-border">
          {t.portfolio.items.map((p, i) => {
            const Mockup = MOCKUPS[i];
            return (
              <PortfolioCard
                key={p.title}
                index={i + 1}
                tag={p.tag}
                title={p.title}
                description={p.description}
                reverse={i % 2 === 1}
              >
                <Mockup />
              </PortfolioCard>
            );
          })}
        </div>

        <div className="mt-20 flex flex-col items-center text-center">
          <motion.p
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-80px" }}
            transition={{ staggerChildren: 0.05 }}
            className="max-w-2xl font-serif text-3xl italic text-text md:text-5xl"
          >
            {words.map((word, i) => (
              <motion.span
                key={i}
                variants={{
                  hidden: { opacity: 0, filter: "blur(6px)", y: 8 },
                  show: { opacity: 1, filter: "blur(0px)", y: 0 },
                }}
                transition={{ type: "spring", stiffness: 260, damping: 30 }}
                className="inline-block"
              >
                {word}&nbsp;
              </motion.span>
            ))}
          </motion.p>
          <p className="mt-4 text-text-dim">{t.portfolio.closing.sub}</p>
          <div className="mt-8">
            <ShimmerButton href="#contacto" variant="primary">
              {t.portfolio.closing.cta}
            </ShimmerButton>
          </div>
        </div>
      </div>
    </section>
  );
}
