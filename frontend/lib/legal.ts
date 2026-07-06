// Legal document links — the published Ethereal Computing legal PDFs. Placed
// only in the footer and Settings.

export interface LegalLink {
  label: string
  href: string
}

export const LEGAL_LINKS: LegalLink[] = [
  { label: "Privacy Policy", href: "https://www.etherealcomputing.com/legal/privacy-policy.pdf" },
  { label: "Terms of Service", href: "https://www.etherealcomputing.com/legal/terms-of-service.pdf" },
]

// The PDFs are live, so the links are no longer marked as forthcoming.
export const LEGAL_PENDING = false
