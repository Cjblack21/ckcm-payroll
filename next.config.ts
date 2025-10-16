import type { NextConfig } from "next";

// Allow hosting the app under a sub-path in production, e.g. /attendance-portal
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH;

const nextConfig: NextConfig = {
  ...(BASE_PATH ? { basePath: BASE_PATH } : {}),
  eslint: {
    ignoreDuringBuilds: true,
  },
  turbopack: {
    root: __dirname,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    unoptimized: true, // Disable image optimization for local development
  },
  experimental: {
    // Improve hydration stability
    optimizePackageImports: ['lucide-react', '@radix-ui/react-dropdown-menu', '@radix-ui/react-dialog', '@radix-ui/react-select'],
  },
  // Suppress hydration warnings in development
  ...(process.env.NODE_ENV === 'development' && {
    onDemandEntries: {
      maxInactiveAge: 25 * 1000,
      pagesBufferLength: 2,
    },
  }),
};

export default nextConfig;
