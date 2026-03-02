import { fetchAllProducts } from './supabase'
import type { MadvetProduct } from './supabase'

// ─────────────────────────────────────────────
// Single cache layer — supabase.ts no longer caches
// Singleton promise prevents thundering herd
// ─────────────────────────────────────────────
const CACHE_TTL_MS = 15 * 60 * 1000 // 15 minutes (increased from 5)

// Temporary cache invalidation to fetch Hindi fields
console.log('[ProductCache] Initializing - checking for Hindi field support...')
let needsInvalidation = true

let cachedProducts:  MadvetProduct[] = []
let cacheExpiresAt:  number = 0
let fetchInProgress: Promise<MadvetProduct[]> | null = null

export async function getCachedProducts(): Promise<MadvetProduct[]> {
  const now = Date.now()

  // Invalidate cache once to fetch Hindi fields
  if (needsInvalidation && cachedProducts.length > 0) {
    console.log('[ProductCache] Invalidating cache to fetch Hindi fields...')
    needsInvalidation = false
    cachedProducts = []
    cacheExpiresAt = 0
    fetchInProgress = null
  }

  // Cache hit
  if (cachedProducts.length > 0 && now < cacheExpiresAt) {
    console.log(`[ProductCache] Cache hit: ${cachedProducts.length} products`)
    return cachedProducts
  }

  // Dedup concurrent requests
  if (fetchInProgress) {
    console.log('[ProductCache] Request deduped, waiting for in-progress fetch')
    return fetchInProgress
  }

  console.log('[ProductCache] Cache miss, fetching products...')
  fetchInProgress = fetchAllProducts()
    .then((products) => {
      cachedProducts  = products
      cacheExpiresAt  = Date.now() + CACHE_TTL_MS
      fetchInProgress = null
      console.log(`[ProductCache] Loaded ${products.length} products, cached for ${CACHE_TTL_MS/1000/60} minutes`)
      return products
    })
    .catch((err) => {
      fetchInProgress = null
      console.error('[ProductCache] Fetch failed:', err)
      // Return stale cache rather than crashing
      if (cachedProducts.length > 0) {
        console.log('[ProductCache] Returning stale cache due to fetch error')
        return cachedProducts
      }
      throw err
    })

  return fetchInProgress
}

export function invalidateProductCache(): void {
  console.log('[ProductCache] Cache invalidated - will fetch Hindi fields on next load')
  cachedProducts = []
  cacheExpiresAt = 0
  fetchInProgress = null
}
