import { fetchAllProducts } from './supabase'
import type { MadvetProduct } from './supabase'

// ─────────────────────────────────────────────
// Single cache layer — supabase.ts no longer caches
// Singleton promise prevents thundering herd
// ─────────────────────────────────────────────
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

let cachedProducts:  MadvetProduct[] = []
let cacheExpiresAt:  number = 0
let fetchInProgress: Promise<MadvetProduct[]> | null = null

export async function getCachedProducts(): Promise<MadvetProduct[]> {
  const now = Date.now()

  // Cache hit
  if (cachedProducts.length > 0 && now < cacheExpiresAt) {
    return cachedProducts
  }

  // Dedup concurrent requests
  if (fetchInProgress) return fetchInProgress

  fetchInProgress = fetchAllProducts()
    .then((products) => {
      cachedProducts  = products
      cacheExpiresAt  = Date.now() + CACHE_TTL_MS
      fetchInProgress = null
      console.log(`[ProductCache] Loaded ${products.length} products`)
      return products
    })
    .catch((err) => {
      fetchInProgress = null
      console.error('[ProductCache] Fetch failed:', err)
      // Return stale cache rather than crashing
      if (cachedProducts.length > 0) return cachedProducts
      throw err
    })

  return fetchInProgress
}

export function invalidateProductCache(): void {
  cachedProducts = []
  cacheExpiresAt = 0
  fetchInProgress = null
}
