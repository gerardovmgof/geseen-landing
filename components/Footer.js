"use client";

import Link from "next/link";
import { useLang } from "@/lib/language-context";
import { SLOGAN } from "@/lib/content";
import { waLink, mailLink, SITE } from "@/lib/site";

export default function Footer() {
  const { t, lang } = useLang();

  return (
    <footer className="border-t border-border px-6 py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 text-center">
        <img src="/isotype-white.png" alt="" className="h-8 w-auto opacity-80" />
        <p className="font-serif text-lg italic text-text-dim">{SLOGAN}</p>

        <div className="flex items-center gap-4 font-mono text-xs text-text-faint">
          <a
            href={waLink(lang)}
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-text"
          >
            WhatsApp
          </a>
          <span aria-hidden>·</span>
          <a href={mailLink()} className="transition-colors hover:text-text">
            {SITE.email}
          </a>
          <span aria-hidden>·</span>
          <Link href="/privacidad" className="transition-colors hover:text-text">
            {t.footer.privacy}
          </Link>
        </div>

        <p className="text-xs text-text-faint">
          GESEEN Solutions · © 2026 · {t.footer.rights}
        </p>
      </div>
    </footer>
  );
}
