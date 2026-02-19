/**
 * Simple in-process product cache
 * Avoids refetching from Supabase on every request
 * TTL: 5 minutes (configurable)
 */
import { fetchAllProducts } from './supabase'
import type { MadvetProduct } from './supabase'

const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

let cachedProducts: MadvetProduct[] = []
let cacheExpiresAt = 0
let fetchInProgress: Promise<MadvetProduct[]> | null = null

export async function getCachedProducts(): Promise<MadvetProduct[]> {
  const now = Date.now()

  // Cache hit
  if (cachedProducts.length > 0 && now < cacheExpiresAt) {
    return cachedProducts
  }

  // Deduplicate concurrent fetches (stampede protection)
  if (fetchInProgress) return fetchInProgress

  fetchInProgress = fetchAllProducts()
    .then((products) => {
      cachedProducts  = products
      cacheExpiresAt  = Date.now() + CACHE_TTL_MS
      fetchInProgress = null
      return products
    })
    .catch((err) => {
      fetchInProgress = null
      console.error('[ProductCache] Fetch failed:', err)
      // Return stale cache if available, otherwise throw
      if (cachedProducts.length > 0) return cachedProducts
      throw err
    })

  return fetchInProgress
}

export function invalidateProductCache(): void {
  cachedProducts  = []
  cacheExpiresAt  = 0
}
