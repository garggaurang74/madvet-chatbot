/** @type {import('next').NextConfig} */
const nextConfig = {
  compress: true,
  poweredByHeader: false,
  experimental: { optimizeCss: true },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'pzijwpqaadhdfcjjtobf.supabase.co', pathname: '/storage/v1/object/public/**' }
    ],
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 3600,
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  headers: async () => [
    // Static assets - long cache
    { 
      source: '/_next/static/(.*)', 
      headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }] 
    },
    // Images - long cache
    { 
      source: '/images/(.*)', 
      headers: [{ key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=3600' }] 
    },
    // API routes - short cache
    { 
      source: '/api/(.*)', 
      headers: [{ key: 'Cache-Control', value: 'public, max-age=60, stale-while-revalidate=30' }] 
    },
    // Image proxy - medium cache
    { 
      source: '/api/images/proxy', 
      headers: [{ key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=3600' }] 
    },
    // Share cards - medium cache
    { 
      source: '/api/share-card/(.*)', 
      headers: [{ key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=3600' }] 
    },
    // Font files - long cache
    { 
      source: '/fonts/(.*)', 
      headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }] 
    },
    // Product detail pages — never cache, so admin image updates show immediately
    {
      source: '/products/:id',
      headers: [{ key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate' }]
    },
  ],
}

module.exports = nextConfig
