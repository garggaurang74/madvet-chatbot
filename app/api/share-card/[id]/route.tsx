// @ts-nocheck
import { ImageResponse } from 'next/og'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'edge'
export const maxDuration = 30

export async function GET(_req, { params }) {
  const { id: rawId } = await params
  const id = parseInt(rawId, 10)
  if (isNaN(id)) return new Response('Bad ID', { status: 400 })

  try {
    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )
    const table = (process.env.NEXT_PUBLIC_SUPABASE_TABLE ?? 'products_enriched').trim()
    const { data, error } = await sb
      .from(table)
      .select('id,product_name,category,usp_benefits_hi')
      .eq('id', id)
      .single()

    if (error || !data) return new Response('Not found: ' + JSON.stringify(error), { status: 404 })

    return new ImageResponse(
      <div style={{ display: 'flex', flexDirection: 'column', width: 480, height: 300, background: '#FFD700', padding: 30, gap: 10 }}>
        <span style={{ fontSize: 28, color: '#1a2f8a', fontWeight: 'bold' }}>{data.product_name}</span>
        <span style={{ fontSize: 16, color: '#333' }}>{data.category}</span>
        <span style={{ fontSize: 13, color: '#555' }}>{(data.usp_benefits_hi || '').slice(0, 80)}</span>
      </div>,
      { width: 480, height: 300 }
    )
  } catch (err) {
    return new Response('Error: ' + String(err?.message || err), { status: 500 })
  }
}
