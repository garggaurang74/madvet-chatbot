// SAVE THIS FILE TO: app/api/share-card/[id]/route.tsx
// (NOT app/products/[id]/share-card/route.tsx)

import { ImageResponse } from 'next/og'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'edge'

const CAT_PALETTES: Record<string, { h: number; s: number; l: number }> = {
  'Vitamin Supplement':                { h: 22,  s: 85, l: 32 },
  'Vitamin Supplement / Galactogogue': { h: 210, s: 80, l: 28 },
  'Antibiotic':                        { h: 218, s: 72, l: 26 },
  'Anti-inflammatory / Analgesic':     { h: 338, s: 78, l: 30 },
  'Anthelmintic / Antiparasitic':      { h: 158, s: 70, l: 26 },
  'Probiotic':                         { h: 128, s: 65, l: 28 },
  'Dermatological':                    { h: 272, s: 60, l: 30 },
  'Ectoparasiticide':                  { h: 42,  s: 80, l: 30 },
  'Reproductive Hormone':              { h: 295, s: 58, l: 28 },
  'Antihistamine':                     { h: 200, s: 68, l: 26 },
  'Antidiarrheal':                     { h: 168, s: 65, l: 26 },
  'Udder Care / Herbal Antimicrobial': { h: 88,  s: 62, l: 28 },
  'Digestive / Antiflatulent':         { h: 33,  s: 78, l: 30 },
}

function hsl(h: number, s: number, l: number) {
  return `hsl(${h},${s}%,${l}%)`
}

function getColors(id: number, category: string) {
  const base = CAT_PALETTES[category] ?? { h: 220, s: 70, l: 28 }
  const shift = ((id * 37 + 13) % 41) - 20
  const h = (base.h + shift + 360) % 360
  const { s, l } = base
  return {
    primary: hsl(h, s, l),
    bright:  hsl(h, s, l + 14),
    dark:    hsl(h, s, l - 10),
    darkest: hsl(h, s, l - 18),
    mid:     hsl(h, s, l + 7),
  }
}

function splitBenefits(txt = '') {
  return txt.split(/[•\n,;|]+/).map((s: string) => s.trim()).filter((s: string) => s.length > 3).slice(0, 5)
}

function splitSpecies(sp = '') {
  const M: Record<string, string> = {
    Cattle: '🐄', Buffalo: '🐃', Sheep: '🐑', Goat: '🐐',
    Dog: '🐕', Cat: '🐈', Horse: '🐴', Poultry: '🐓', Calf: '🐮',
  }
  return sp.split(/[,/]/).map((s: string) => s.trim()).filter(Boolean).slice(0, 5).map((s: string) => M[s] || '🐾')
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: rawId } = await params
  const id = parseInt(rawId, 10)
  if (isNaN(id)) return new Response('Invalid ID', { status: 400 })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const table = (process.env.NEXT_PUBLIC_SUPABASE_TABLE ?? 'products_enriched').trim()
  const { data, error } = await supabase.from(table).select('*').eq('id', id).single()
  if (error || !data) return new Response('Product not found', { status: 404 })

  const p = data
  const name        = (p.product_name ?? p.name ?? '') as string
  const category    = (p.category ?? '') as string
  const salt        = (p.salt_ingredient ?? p.salt ?? '') as string
  const packaging   = (p.packaging ?? '') as string
  const form        = (p.formulation ?? '') as string
  const imageUrl    = (p.image_url ?? '') as string
  const benefitsHi  = splitBenefits(p.usp_benefits_hi ?? p.usp_benefits ?? p.benefits ?? '')
  const benefitsEn  = splitBenefits(p.usp_benefits ?? p.benefits ?? '')
  const species     = splitSpecies(p.species ?? '')
  const c           = getColors(id, category)
  const APP_URL     = process.env.NEXT_PUBLIC_APP_URL ?? 'https://ai.madvet.in'
  const catH        = CAT_PALETTES[category]?.h ?? 220

  const [oswaldBold, notoDevanagari, barlowCondensed] = await Promise.all([
    fetch('https://fonts.gstatic.com/s/oswald/v53/TK3iWkUHHAIjg752GT8Dl-1pkiHLQoiFwdk.woff').then(r => r.arrayBuffer()),
    fetch('https://fonts.gstatic.com/s/notosansdevanagari/v26/TuGOUUFzXI5FBtUq5a8bjKYTZjtRU6Sgv3NaV_SNmI0b6RFZz-SyFsRGMxDwF4FqhCO.woff').then(r => r.arrayBuffer()),
    fetch('https://fonts.gstatic.com/s/barlowcondensed/v12/HTxwL3I-JCGChYJ8VI-L6OO_au7B467nGYUAuAU.woff').then(r => r.arrayBuffer()),
  ])

  // Satori only supports flexbox — no position:relative/absolute, no overflow:hidden, no CSS grid
  const card = (
    <div style={{ display: 'flex', flexDirection: 'column', width: 480, backgroundColor: '#ffffff', fontFamily: '"BarlowCondensed"' }}>

      {/* HEADER */}
      <div style={{ display: 'flex', flexDirection: 'column', background: `linear-gradient(135deg, ${c.darkest} 0%, ${c.dark} 50%, ${c.primary} 100%)`, padding: '16px 18px 18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ background: '#fff', borderRadius: 6, padding: '4px 5px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img src={`${APP_URL}/madvet-icon.png`} width={34} height={34} style={{ objectFit: 'contain' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontFamily: '"Oswald"', fontSize: 20, fontWeight: 700, color: '#fff', letterSpacing: 3 }}>MADVET</span>
              <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.7)', letterSpacing: 1.5 }}>ANIMAL HEALTH CARE</span>
              <span style={{ fontSize: 7, color: 'rgba(255,255,255,0.45)', letterSpacing: 0.8 }}>AN I.S.O. 9001:2013 COMPANY</span>
            </div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.18)', borderRadius: 4, padding: '4px 12px', border: '1px solid rgba(255,255,255,0.3)' }}>
            <span style={{ fontSize: 10, color: '#fff', fontWeight: 700, letterSpacing: 1 }}>{category.split('/')[0].trim()}</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
            <span style={{ fontFamily: '"Oswald"', fontWeight: 700, color: '#fff', letterSpacing: 1.5, lineHeight: 1, fontSize: name.length > 16 ? 28 : name.length > 12 ? 36 : 44 }}>{name}</span>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.65)', marginTop: 5, fontStyle: 'italic' }}>{salt}</span>
            <div style={{ display: 'flex', marginTop: 10 }}>
              <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 4, padding: '3px 10px', border: '1px solid rgba(255,255,255,0.2)' }}>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.85)', letterSpacing: 0.8 }}>{form} · {packaging}</span>
              </div>
            </div>
          </div>
          <div style={{ width: 110, height: 110, borderRadius: 10, background: 'linear-gradient(145deg,#f0ece4,#e4ddd2)', border: '2px solid rgba(255,255,255,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {imageUrl
              ? <img src={imageUrl} width={100} height={100} style={{ objectFit: 'contain' }} />
              : <span style={{ fontSize: 38 }}>{form === 'Injection' ? '💉' : form === 'Bolus' ? '💊' : '🧴'}</span>
            }
          </div>
        </div>
      </div>

      {/* DIVIDER */}
      <div style={{ height: 5, background: `linear-gradient(90deg,${c.darkest},${c.bright},${c.darkest})`, display: 'flex' }} />

      {/* BENEFITS */}
      <div style={{ display: 'flex', flexDirection: 'column', padding: '14px 18px 10px', background: '#fff' }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10 }}>
          <span style={{ fontFamily: '"NotoDevanagari"', fontSize: 14, fontWeight: 800, color: c.primary }}>प्रमुख लाभ</span>
          <div style={{ flex: 1, height: 2, background: `linear-gradient(90deg,${c.primary}55,transparent)`, margin: '0 10px', display: 'flex' }} />
          <span style={{ fontSize: 9, color: '#aaa', fontStyle: 'italic' }}>Key Benefits</span>
        </div>
        {benefitsHi.map((b: string, i: number) => (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 7, padding: '8px 12px', borderRadius: 8, background: i === 0 ? `hsl(${catH},30%,95%)` : i === 1 ? `hsl(${catH},20%,97%)` : '#f8f8f8', border: `1px solid ${i < 2 ? c.primary + '35' : '#ebebeb'}` }}>
            <div style={{ width: 24, height: 24, borderRadius: 12, flexShrink: 0, background: i === 0 ? c.primary : i === 1 ? c.mid : c.bright, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 12, color: '#fff', fontWeight: 800 }}>{i + 1}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
              <span style={{ fontFamily: '"NotoDevanagari"', fontSize: 12.5, color: '#111', fontWeight: 600, lineHeight: 1.4 }}>{b}</span>
              {benefitsEn[i] && <span style={{ fontSize: 9, color: '#999', marginTop: 2 }}>{benefitsEn[i]}</span>}
            </div>
          </div>
        ))}
      </div>

      {/* SPECIES */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 8, padding: '2px 0 12px', background: '#fff' }}>
        {species.map((emoji: string, i: number) => (
          <div key={i} style={{ width: 32, height: 32, borderRadius: 16, background: `hsl(${catH},28%,93%)`, border: `1.5px solid ${c.primary}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>{emoji}</div>
        ))}
      </div>

      {/* LINK STRIP */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: `linear-gradient(90deg,${c.darkest},${c.primary})`, padding: '10px 20px' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.5)', letterSpacing: 2 }}>VIEW ALL PRODUCTS · सभी उत्पाद</span>
          <span style={{ fontFamily: '"Oswald"', fontSize: 15, color: '#fff', fontWeight: 700, letterSpacing: 1 }}>madvet.in/products</span>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.13)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 6, padding: '5px 14px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <span style={{ fontSize: 7, color: 'rgba(255,255,255,0.5)', letterSpacing: 1 }}>AI ASSISTANT</span>
          <span style={{ fontFamily: '"Oswald"', fontSize: 12, color: '#fff', letterSpacing: 0.5 }}>ai.madvet.in</span>
        </div>
      </div>

      {/* FOOTER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#FFD700', padding: '12px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ background: '#fff', borderRadius: 8, padding: '4px 5px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img src={`${APP_URL}/madvet-icon.png`} width={42} height={42} style={{ objectFit: 'contain' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontFamily: '"Oswald"', fontSize: 25, fontWeight: 900, color: '#1a2f8a', letterSpacing: 3, lineHeight: 1 }}>MADVET</span>
            <span style={{ fontSize: 9, color: '#1a2f8a', letterSpacing: 1.5, fontWeight: 700 }}>ANIMAL HEALTH CARE</span>
            <span style={{ fontSize: 7.5, color: '#444', letterSpacing: 0.8 }}>Ghaziabad (U.P.)</span>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
          <span style={{ fontSize: 8, fontWeight: 700, color: '#111' }}>AN I.S.O. 9001:2013 COMPANY</span>
          <span style={{ fontSize: 7.5, color: '#333' }}>madvet.animal@gmail.com</span>
          <span style={{ fontSize: 7.5, color: '#333' }}>www.madvet.in | support@madvet.in</span>
          <span style={{ fontSize: 9, fontWeight: 800, color: '#1a2f8a', marginTop: 2 }}>📞 9935257750 · 8400347331</span>
        </div>
      </div>

    </div>
  )

  return new ImageResponse(card, {
    width: 480,
    height: 720,
    fonts: [
      { name: 'Oswald',          data: oswaldBold,       weight: 700, style: 'normal' },
      { name: 'BarlowCondensed', data: barlowCondensed,  weight: 400, style: 'normal' },
      { name: 'NotoDevanagari',  data: notoDevanagari,   weight: 600, style: 'normal' },
    ],
  })
}
