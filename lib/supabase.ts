import { createClient } from '@supabase/supabase-js'

// ─────────────────────────────────────────────
// CANONICAL TYPE — matches DB exactly
// Single source of truth — no more dual column names
// ─────────────────────────────────────────────
export interface MadvetProduct {
  id?:              number
  product_name?:    string
  salt_ingredient?: string   // canonical — DB column name
  packaging?:       string   // canonical — DB column name
  category?:        string
  species?:         string
  indication?:      string
  description?:     string
  usp_benefits?:    string
  aliases?:         string
  dosage?:          string   // stored in DB but NEVER shown to user
  created_at?:      string
  updated_at?:      string
}

// ─────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────
function getConfig() {
  const url   = process.env.NEXT_PUBLIC_SUPABASE_URL   ?? ''
  const key   = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
  const table = (
    process.env.NEXT_PUBLIC_SUPABASE_TABLE ??
    process.env.SUPABASE_PRODUCTS_TABLE    ??
    'products_enriched'
  ).trim()

  const valid = Boolean(
    url && key &&
    url.startsWith('http') &&
    !url.includes('YOUR_')
  )

  return { url, key, table, valid }
}

export function getSupabaseClient() {
  const { url, key, valid } = getConfig()
  if (!valid) return null
  return createClient(url, key)
}

// ─────────────────────────────────────────────
// FETCH — single cache layer (productCache.ts handles TTL)
// ─────────────────────────────────────────────
export async function fetchAllProducts(): Promise<MadvetProduct[]> {
  const { table } = getConfig()
  const supabase  = getSupabaseClient()

  if (!supabase) {
    console.warn('[Madvet] Supabase not configured')
    return []
  }

  try {
    const { data, error } = await supabase
      .from(table)
      .select(
        'id, product_name, salt_ingredient, packaging, category, ' +
        'species, indication, description, usp_benefits, aliases, dosage'
      )
      .limit(500)

    if (error) {
      console.error('[Madvet] Supabase fetch error:', error.message)
      return []
    }

    // Normalize rows — ensure every field is a string or undefined
    const products = (data ?? []).map((row: any): MadvetProduct => ({
      id:              Number(row.id) || undefined,
      product_name:    str(row.product_name),
      salt_ingredient: str(row.salt_ingredient),
      packaging:       str(row.packaging),
      category:        str(row.category),
      species:         str(row.species),
      indication:      str(row.indication),
      description:     str(row.description),
      usp_benefits:    str(row.usp_benefits),
      aliases:         str(row.aliases),
      dosage:          str(row.dosage),
    }))
    return products
  } catch (err) {
    console.error('[Madvet] Supabase fetch exception:', err)
    return []
  }
}

function str(v: unknown): string | undefined {
  if (v == null) return undefined
  const s = String(v).trim()
  return s.length > 0 ? s : undefined
}
