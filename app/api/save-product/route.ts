import { NextRequest } from 'next/server'
import { getSupabaseClient } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const product = await req.json()
    const supabase = getSupabaseClient()
    if (!supabase) return Response.json({ error: 'Supabase not configured' }, { status: 500 })

    // Remove id if present (let Supabase auto-generate)
    const { id, ...productData } = product

    const { data, error } = await supabase
      .from('products_enriched')
      .insert(productData)
      .select()
      .single()

    if (error) {
      console.error('[Save Product Error]', error)
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json({ success: true, product: data })
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 })
  }
}
