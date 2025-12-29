import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
    unoptimized: true,
  },
  output: 'standalone',
  // Define Turbopack analysis root to the current web folder to avoid
  // workspace-root inference warnings when multiple lockfiles exist.
  turbopack: {
    root: '.'
  },
};

export default nextConfig;
