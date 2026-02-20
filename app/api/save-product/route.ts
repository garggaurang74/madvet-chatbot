import { NextRequest } from 'next/server'
import { getSupabaseClient } from '@/lib/supabase'
import { invalidateProductCache } from '@/lib/productCache'

export async function POST(req: NextRequest) {
  try {
    // FIX: Use ADMIN_SECRET (server-only env) — not NEXT_PUBLIC version
    const authHeader     = req.headers.get('x-admin-secret')
    const expectedSecret = process.env.ADMIN_SECRET

    if (expectedSecret && authHeader !== expectedSecret) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const product  = await req.json()
    const supabase = getSupabaseClient()

    if (!supabase) {
      return Response.json({ error: 'Supabase not configured' }, { status: 500 })
    }

    // Only allow canonical column names — matches DB exactly
    const ALLOWED_FIELDS = [
      'product_name',
      'salt_ingredient',  // FIX: canonical name
      'packaging',        // FIX: canonical name
      'description',
      'category',
      'species',
      'indication',
      'aliases',
      'dosage',
      'usp_benefits',
    ] as const

    const safe: Record<string, string> = {}
    for (const key of ALLOWED_FIELDS) {
      if (product[key] !== undefined && product[key] !== '') {
        safe[key] = String(product[key]).trim()
      }
    }

    if (!safe.product_name) {
      return Response.json({ error: 'product_name is required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('products_enriched')
      .insert(safe)
      .select()
      .single()

    if (error) {
      console.error('[Save Product]', error)
      return Response.json({ error: error.message }, { status: 500 })
    }

    // FIX: Invalidate cache so bot picks up new product immediately
    invalidateProductCache()

    return Response.json({ success: true, product: data })
  } catch (err) {
    console.error('[Save Product] Exception:', err)
    return Response.json({ error: String(err) }, { status: 500 })
  }
}
