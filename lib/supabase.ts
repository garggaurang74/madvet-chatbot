import { createClient } from '@supabase/supabase-js'

export interface MadvetProduct {
  product_name?: string
  salt?: string
  salt_ingredient?: string
  dosage?: string
  packing?: string
  packaging?: string
  category?: string
  species?: string
  indication?: string
  description?: string
  usp_benefits?: string
  aliases?: string
  [key: string]: unknown
}

let cachedProducts: MadvetProduct[] = []
let cacheTimestamp = 0
let resolvedTableName: string | null = null
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

// Fallback table names to try (Supabase table names are often lowercase)
const FALLBACK_TABLE_NAMES = [
  'products_enriched',
  'products',
  'product',
  'madvet_products',
  'madvet_product',
  'items',
]

function getConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  const table = process.env.NEXT_PUBLIC_SUPABASE_TABLE?.trim() || ''
  const valid =
    url && key && url.startsWith('http') && !url.includes('YOUR_')
  return { url, key, table, valid }
}

export function getSupabaseClient() {
  const { url, key, valid } = getConfig()
  if (!valid) return null
  return createClient(url, key)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function resolveTableName(supabase: any): Promise<string> {
  if (resolvedTableName) return resolvedTableName
  const { table } = getConfig()
  const toTry = table ? [table, ...FALLBACK_TABLE_NAMES.filter((t) => t !== table)] : FALLBACK_TABLE_NAMES
  for (const name of toTry) {
    const { error } = await supabase.from(name).select('*').limit(1)
    if (!error) {
      resolvedTableName = name
      return name
    }
  }
  return toTry[0] || 'products'
}

export async function fetchAllProducts(): Promise<MadvetProduct[]> {
  const now = Date.now()
  if (cachedProducts.length > 0 && now - cacheTimestamp < CACHE_TTL_MS) {
    return cachedProducts
  }

  const supabase = getSupabaseClient()
  if (!supabase) {
    return []
  }

  try {
    const table = await resolveTableName(supabase)
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .limit(500)

    if (error) {
      console.error('[Madvet] Supabase fetch error:', error)
      return cachedProducts.length > 0 ? cachedProducts : []
    }

    const products = (data || []).map((row: Record<string, unknown>) => {
      const p: MadvetProduct = {}
      for (const [k, v] of Object.entries(row)) {
        if (v != null && typeof v === 'string') {
          p[k] = v
        } else if (v != null) {
          p[k] = String(v)
        }
      }
      return p
    }) as MadvetProduct[]

    cachedProducts = products
    cacheTimestamp = now
    return products
  } catch (err) {
    console.error('[Madvet] Supabase fetch exception:', err)
    return cachedProducts.length > 0 ? cachedProducts : []
  }
}
