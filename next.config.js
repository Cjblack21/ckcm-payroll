/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Disable ESLint during production builds
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Already passing type checks, so ignore during build
    ignoreBuildErrors: false,
  },
  experimental: {
    serverActions: {
      allowedOrigins: ['payrollmanagement.space', '72.60.233.210', 'localhost:3000']
    }
  }
}

module.exports = nextConfig
