// Legal document links. PDFs are supplied later and dropped into
// `public/legal/`; until then the links resolve to those future locations and
// the UI marks them as forthcoming. Placed only in the footer and Settings.

export interface LegalLink {
  label: string
  href: string
}

export const LEGAL_LINKS: LegalLink[] = [
  { label: "Privacy Policy", href: "/legal/privacy.pdf" },
  { label: "Terms of Service", href: "/legal/terms.pdf" },
]

// Until the PDFs land, the links are marked as forthcoming.
export const LEGAL_PENDING = true
