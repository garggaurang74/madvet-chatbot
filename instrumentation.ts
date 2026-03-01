// instrumentation.ts — runs once when the Next.js server starts
// Pre-warms the product cache so the FIRST user request doesn't pay the
// Supabase round-trip cost (saves 1–3 seconds on cold start).

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    try {
      const { getCachedProducts } = await import('@/lib/productCache')
      await getCachedProducts()
      console.log('[Instrumentation] Product cache warmed up')
    } catch (e) {
      // Non-fatal — cache will be populated on first real request
      console.warn('[Instrumentation] Warm-up failed (non-fatal):', e)
    }
  }
}
