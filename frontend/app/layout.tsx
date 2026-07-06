import type React from "react"
import type { Metadata, Viewport } from "next"
import localFont from "next/font/local"
import "./globals.css"

// Fonts are vendored locally so builds have no network dependency.
// Display = Chakra Petch · Data = IBM Plex Mono · Body = Inter.
const chakraPetch = localFont({
  src: [
    { path: "./fonts/chakra-petch-400.woff2", weight: "400", style: "normal" },
    { path: "./fonts/chakra-petch-600.woff2", weight: "600", style: "normal" },
    { path: "./fonts/chakra-petch-700.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-display",
  display: "swap",
  fallback: ["system-ui", "sans-serif"],
})

const plexMono = localFont({
  src: [
    { path: "./fonts/ibm-plex-mono-400.woff2", weight: "400", style: "normal" },
    { path: "./fonts/ibm-plex-mono-500.woff2", weight: "500", style: "normal" },
    { path: "./fonts/ibm-plex-mono-600.woff2", weight: "600", style: "normal" },
  ],
  variable: "--font-plex",
  display: "swap",
  fallback: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
})

const inter = localFont({
  src: [
    { path: "./fonts/inter-400.woff2", weight: "400", style: "normal" },
    { path: "./fonts/inter-500.woff2", weight: "500", style: "normal" },
    { path: "./fonts/inter-600.woff2", weight: "600", style: "normal" },
    { path: "./fonts/inter-700.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-body",
  display: "swap",
  fallback: ["system-ui", "sans-serif"],
})

const DESCRIPTION =
  "Ouija — an open-science neuro-data console that visualizes your own EEG, HRV, imaging and physiological signals. Not a diagnostic instrument."

const SHARE_TITLE = "Ouija ❍ God-View for your Brain"
// Resolve OG/asset URLs per deployment so the social card unfurls everywhere:
// production → the clean alias; any Vercel preview → that deployment's own URL
// (so og.png resolves on the preview too); local build → the production alias.
const PROD_URL = "https://ouija-ten.vercel.app"
const SITE_URL =
  process.env.VERCEL_ENV === "production"
    ? PROD_URL
    : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : PROD_URL

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: SHARE_TITLE,
  description: DESCRIPTION,
  applicationName: "Ouija",
  robots: { index: false, follow: false },
  // Favicon = the actual Ouija moon mark (the real logo asset, not a redraw).
  icons: {
    icon: "/ethereal-mark.png",
    shortcut: "/ethereal-mark.png",
    apple: "/ethereal-mark.png",
  },
  // Social preview — a screenshot of the live UI + the share copy, so the card
  // unfurls the same everywhere (Slack, iMessage, X, Discord, Facebook, …).
  openGraph: {
    type: "website",
    siteName: "Ouija",
    url: SITE_URL,
    title: SHARE_TITLE,
    description: DESCRIPTION,
    images: [{ url: "/og.png", width: 2400, height: 1260, alt: SHARE_TITLE }],
  },
  twitter: {
    card: "summary_large_image",
    title: SHARE_TITLE,
    description: DESCRIPTION,
    images: ["/og.png"],
  },
}

export const viewport: Viewport = {
  themeColor: "#060309",
  width: "device-width",
  initialScale: 1,
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${chakraPetch.variable} ${plexMono.variable} ${inter.variable} dark`}
      suppressHydrationWarning
    >
      <body className="font-body antialiased">{children}</body>
    </html>
  )
}
