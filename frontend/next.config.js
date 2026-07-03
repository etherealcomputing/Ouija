/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Fully client-rendered SPA (no API routes / SSR) → static export. Produces a
  // plain `out/` folder Vercel can serve as static files, which lets the app
  // deploy from the frontend/ subdirectory via a repo-root vercel.json without
  // relying on Vercel's Root Directory setting.
  output: "export",
  // High-consequence posture: type errors fail the build. ESLint runs via
  // editor tooling / CI; no lint config is committed yet, so builds skip it.
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    unoptimized: true,
  },
}

module.exports = nextConfig
