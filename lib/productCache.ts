import { fetchAllProducts } from './supabase'
import type { MadvetProduct } from './supabase'

const CACHE_TTL_MS = 5 * 60 * 1000

let cachedProducts: MadvetProduct[] = []
let cacheExpiresAt = 0
let fetchInProgress: Promise<MadvetProduct[]> | null = null

export async function getCachedProducts(): Promise<MadvetProduct[]> {
  const now = Date.now()

  if (cachedProducts.length > 0 && now < cacheExpiresAt) {
    return cachedProducts
  }

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
      if (cachedProducts.length > 0) return cachedProducts
      throw err
    })

  return fetchInProgress
}

export function invalidateProductCache(): void {
  cachedProducts = []
  cacheExpiresAt = 0
}
