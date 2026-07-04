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

export const metadata: Metadata = {
  title: "Ouija · God View for Your Brain",
  description: DESCRIPTION,
  applicationName: "Ouija",
  robots: { index: false, follow: false },
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
