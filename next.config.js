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
  ],
  // Enable SWC minification
  swcMinify: true,
  // Optimize chunks
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          default: false,
          vendors: false,
          framework: {
            chunks: 'all',
            name: 'framework',
            test: /[\\/]node_modules[\\/](react|react-dom|scheduler|prop-types)[\\/]/,
            priority: 40,
            enforce: true,
          },
          lib: {
            test(module) {
              return (
                module.size() > 160000 &&
                /node_modules[/\\]/.test(module.identifier())
              )
            },
            name(module) {
              const hash = crypto.createHash('sha1')
              hash.update(module.identifier())
              return hash.digest('hex').substring(0, 8)
            },
            priority: 30,
            minChunks: 1,
            reuseExistingChunk: true,
          },
          commons: {
            name: 'commons',
            minChunks: 2,
            priority: 20,
          },
          shared: {
            name: 'shared',
            priority: 10,
            minChunks: 2,
          },
        },
      }
    }
    return config
  },
}

module.exports = nextConfig
