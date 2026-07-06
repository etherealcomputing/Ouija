"use client"

// Slim persistent dashboard footer. Best-practice home for legal links
// (Privacy Policy · Terms of Service) alongside a neutral disclaimer. Legal
// links appear only here and in Settings.

import { LEGAL_LINKS, LEGAL_PENDING } from "@/lib/legal"

export function ConsoleFooter() {
  return (
    <footer className="shrink-0 border-t border-border px-4 sm:px-5 lg:px-7 py-2.5 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
      <span className="text-[9px] font-mono text-text-faint tracking-wide">Not a diagnostic instrument.</span>
      <nav className="flex items-center gap-4" aria-label="Legal">
        {LEGAL_LINKS.map((l) => (
          <a
            key={l.href}
            href={l.href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[9px] font-mono text-text-dim hover:text-perception transition-colors tracking-wide"
          >
            {l.label}
            {LEGAL_PENDING && <span className="text-text-faint"> (soon)</span>}
          </a>
        ))}
      </nav>
    </footer>
  )
}
