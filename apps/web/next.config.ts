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
  // Allow importing .md files as raw strings (bundled at build time — works on Cloudflare Pages edge)
  webpack(config) {
    config.module.rules.push({
      test: /\.md$/,
      type: 'asset/source',
    })
    return config
  },
}

export default config
