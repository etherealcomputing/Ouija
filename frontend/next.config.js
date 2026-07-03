/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
