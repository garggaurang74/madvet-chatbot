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
    // Products listing + detail pages — never cache, so admin image updates show immediately
    {
      source: '/products',
      headers: [{ key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate' }]
    },
    {
      source: '/products/:id',
      headers: [{ key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate' }]
    },
  ],
  // The old WordPress madvet.in (2020) pages, so links already out there land
  // on their replacements once madvet.in points here.
  redirects: async () => [
    { source: '/home',         destination: '/',        permanent: true },
    { source: '/who-we-are',   destination: '/about',   permanent: true },
    { source: '/our-team',     destination: '/about',   permanent: true },
    { source: '/career',       destination: '/careers', permanent: true },
    { source: '/contact-us',   destination: '/contact', permanent: true },
    { source: '/wp-admin/:p*', destination: '/',        permanent: false },
    { source: '/wp-content/:p*', destination: '/',      permanent: false },
  ],
}

module.exports = nextConfig
