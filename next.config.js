/** @type {import('next').NextConfig} */
const nextConfig = {
  compress: true,
  poweredByHeader: false,
  experimental: { optimizeCss: true },
  images: {
    remotePatterns: [{ protocol: 'https', hostname: 'pzijwpqaadhdfcjjtobf.supabase.co', pathname: '/storage/v1/object/public/**' }],
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 3600,
  },
  headers: async () => [
    { source: '/_next/static/(.*)', headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }] },
    { source: '/api/share-card/(.*)', headers: [{ key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=3600' }] },
  ],
}
module.exports = nextConfig
