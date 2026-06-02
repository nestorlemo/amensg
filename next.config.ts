import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  experimental: {
    serverActions: { bodySizeLimit: '50mb' },
  },
  api: {
    bodyParser: { sizeLimit: '50mb' },
    responseLimit: '50mb',
  },
}

export default nextConfig
