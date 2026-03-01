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
      .select('id,product_name,salt_ingredient,packaging,formulation,category,species,indication,description,usp_benefits,usp_benefits_hi,image_url')
      .eq('id', id)
      .single()

    if (error || !data) return new Response('Not found', { status: 404 })

    const name = (data.product_name || '').trim()
    const benefits = (data.usp_benefits_hi || data.usp_benefits || '')
      .split(/[•\n,;|।]+/).map(s => s.trim()).filter(s => s.length > 6).slice(0, 5)

    return new ImageResponse(
      <div style={{ display: 'flex', flexDirection: 'column', width: 480, height: 700, background: '#fff', fontFamily: 'sans-serif' }}>
        {/* Header */}
        <div style={{ display: 'flex', flexDirection: 'column', background: '#1a2f8a', padding: '20px 24px' }}>
          <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', marginBottom: 4 }}>MADVET ANIMAL HEALTH CARE</span>
          <span style={{ fontSize: 40, fontWeight: 'bold', color: '#fff', lineHeight: 1.1 }}>{name}</span>
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 6 }}>{(data.salt_ingredient || '').trim()}</span>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>{(data.formulation || '').trim()} · {(data.packaging || '').trim()}</span>
        </div>
        {/* Benefits */}
        <div style={{ display: 'flex', flexDirection: 'column', padding: '20px 24px', gap: 10, flexGrow: 1 }}>
          <span style={{ fontSize: 15, fontWeight: 'bold', color: '#1a2f8a', marginBottom: 6 }}>प्रमुख लाभ / Key Benefits</span>
          {benefits.map((b, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: i === 0 ? '#eef2ff' : '#f9f9f9', borderRadius: 8 }}>
              <span style={{ fontSize: 16, fontWeight: 'bold', color: '#1a2f8a', width: 24 }}>{i + 1}</span>
              <span style={{ fontSize: 13, color: '#222' }}>{b}</span>
            </div>
          ))}
        </div>
        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#FFD700', padding: '14px 24px' }}>
          <span style={{ fontSize: 22, fontWeight: 'bold', color: '#1a2f8a' }}>MADVET</span>
          <span style={{ fontSize: 11, color: '#333' }}>madvet.in/products</span>
        </div>
      </div>,
      { width: 480, height: 700 }
    )
  } catch (err) {
    return new Response('Error: ' + String(err?.message || err), { status: 500 })
  }
}
