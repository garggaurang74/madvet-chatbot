/** @type {import('next').NextConfig} */
const nextConfig = {
  compress: true,
  poweredByHeader: false,
  experimental: {
    optimizeCss: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'pzijwpqaadhdfcjjtobf.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 3600,
    deviceSizes: [320, 420, 640, 750, 828, 1080],
  },
  headers: async () => [
    {
      source: '/fonts/(.*)',
      headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
    },
    {
      source: '/_next/static/(.*)',
      headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
    },
    {
      source: '/api/share-card/(.*)',
      headers: [{ key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=3600' }],
    },
    {
      // Cache static assets in public folder
      source: '/(madvet-icon|madvet-logo|madvet-center).(png|jpg|webp)',
      headers: [{ key: 'Cache-Control', value: 'public, max-age=86400' }],
    },
  ],
}

module.exports = nextConfig
