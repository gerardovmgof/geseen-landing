"use client";

import { motion } from "framer-motion";
import { useLang } from "@/lib/language-context";
import { waLink, mailLink } from "@/lib/site";
import InkBlob from "@/components/decor/InkBlob";

function WhatsAppGlyph(props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M17.5 14.4c-.3-.1-1.6-.8-1.9-.9-.3-.1-.4-.1-.6.1-.2.3-.6.9-.8 1-.1.2-.3.2-.6.1-.3-.1-1.2-.5-2.3-1.5-.9-.8-1.4-1.7-1.6-2-.1-.3 0-.4.1-.6.1-.1.3-.3.4-.5.1-.1.2-.3.2-.4.1-.2 0-.4 0-.5-.1-.1-.6-1.5-.8-2-.2-.5-.4-.4-.6-.5h-.5c-.2 0-.5.1-.7.3-.3.3-1 1-1 2.4s1 2.8 1.2 3c.1.2 2.1 3.1 5 4.4.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.6-.7 1.9-1.3.2-.6.2-1.2.2-1.3-.1-.2-.3-.2-.6-.4Z" />
      <path d="M12 2a10 10 0 0 0-8.6 15L2 22l5.2-1.4A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.1l-.3-.2-3.1.8.8-3-.2-.3A8.2 8.2 0 1 1 12 20.2Z" />
    </svg>
  );
}

export default function Contact() {
  const { t, lang } = useLang();

  return (
    <section
      id="contacto"
      className="relative overflow-hidden px-6 py-24 md:py-32"
    >
      <InkBlob className="left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" />

      <div className="relative mx-auto max-w-2xl text-center">
        <span className="font-mono text-xs text-text-faint">
          {t.contact.eyebrow}
        </span>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-text md:text-5xl">
          {t.contact.heading}
        </h2>
        <p className="mt-4 text-text-dim">{t.contact.sub}</p>

        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <motion.a
            href={waLink(lang)}
            target="_blank"
            rel="noopener noreferrer"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
            className="flex items-center gap-2 rounded-full bg-whatsapp px-6 py-3 text-sm font-medium text-black transition-shadow hover:shadow-[0_0_28px_-4px_var(--whatsapp)]"
          >
            <WhatsAppGlyph className="h-4 w-4" />
            {t.contact.whatsappLabel}
          </motion.a>
          <motion.a
            href={mailLink()}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
            className="rounded-full border border-border-strong px-6 py-3 text-sm text-text transition-colors hover:border-accent/50"
          >
            {t.contact.emailLabel}
          </motion.a>
        </div>

        <p className="mt-6 font-mono text-xs text-text-faint">
          {t.contact.note}
        </p>
      </div>
    </section>
  );
}
