import { NextRequest } from 'next/server'
import { getSupabaseClient } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    // Simple secret-based auth — set ADMIN_SECRET in Vercel env vars
    const authHeader = req.headers.get('x-admin-secret')
    const expectedSecret = process.env.ADMIN_SECRET

    if (expectedSecret && authHeader !== expectedSecret) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }

    const product = await req.json()
    const supabase = getSupabaseClient()
    if (!supabase) {
      return new Response(JSON.stringify({ error: 'Supabase not configured' }), { status: 500 })
    }

    // Sanitize — only allow known fields
    const allowed = [
      'product_name', 'salt_ingredient', 'packaging', 'description',
      'category', 'species', 'indication', 'aliases', 'dosage', 'usp_benefits'
    ]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const safe: Record<string, any> = {}
    for (const key of allowed) {
      if (product[key] !== undefined) safe[key] = product[key]
    }

    if (!safe.product_name) {
      return new Response(JSON.stringify({ error: 'product_name is required' }), { status: 400 })
    }

    const { data, error } = await supabase
      .from('products_enriched')
      .insert(safe)
      .select()
      .single()

    if (error) {
      console.error('[Save Product Error]', error)
      return new Response(JSON.stringify({ error: error.message }), { status: 500 })
    }

    return new Response(JSON.stringify({ success: true, product: data }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  }
}
