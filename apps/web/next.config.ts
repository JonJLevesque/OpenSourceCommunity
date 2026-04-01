import type { NextConfig } from 'next'

const config: NextConfig = {
  // Required for Cloudflare Pages deployment
  experimental: {
    // Optimize icon library imports to reduce bundle size
    optimizePackageImports: ['lucide-react'],
  },
  // Disable image optimization — Cloudflare Images handles this at the edge
  images: {
    unoptimized: true,
  },
  // Ensure env vars are available at build time
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8787',
  },
}

export default config
