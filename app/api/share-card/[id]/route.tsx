// PLACE THIS FILE AT: app/api/share-card/[id]/route.tsx
// ALSO RUN: bash download-fonts.sh  (to put fonts in public/fonts/)

import { ImageResponse } from 'next/og'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'edge'

const CAT_PALETTES: Record<string, { h: number; s: number; l: number; accent: string }> = {
  'Vitamin Supplement':                { h: 22,  s: 85, l: 32, accent: '#FF6B2B' },
  'Vitamin Supplement / Galactogogue': { h: 210, s: 80, l: 28, accent: '#3B82F6' },
  'Antibiotic':                        { h: 218, s: 72, l: 26, accent: '#3B82F6' },
  'Anti-inflammatory / Analgesic':     { h: 338, s: 78, l: 30, accent: '#EC4899' },
  'Anthelmintic / Antiparasitic':      { h: 158, s: 70, l: 26, accent: '#10B981' },
  'Probiotic':                         { h: 128, s: 65, l: 28, accent: '#22C55E' },
  'Dermatological':                    { h: 272, s: 60, l: 30, accent: '#A855F7' },
  'Ectoparasiticide':                  { h: 42,  s: 80, l: 30, accent: '#F59E0B' },
  'Reproductive Hormone':              { h: 295, s: 58, l: 28, accent: '#D946EF' },
  'Antihistamine':                     { h: 200, s: 68, l: 26, accent: '#06B6D4' },
  'Antidiarrheal':                     { h: 168, s: 65, l: 26, accent: '#14B8A6' },
  'Udder Care / Herbal Antimicrobial': { h: 88,  s: 62, l: 28, accent: '#84CC16' },
  'Digestive / Antiflatulent':         { h: 33,  s: 78, l: 30, accent: '#F97316' },
}

function hsl(h: number, s: number, l: number) { return `hsl(${h},${s}%,${l}%)` }

function getColors(id: number, category: string) {
  const base = CAT_PALETTES[category] ?? { h: 220, s: 70, l: 28, accent: '#3B82F6' }
  const shift = ((id * 37 + 13) % 41) - 20
  const h = (base.h + shift + 360) % 360
  const { s, l } = base
  return {
    bg1:     hsl(h, s, 14),
    bg2:     hsl(h, s, 22),
    primary: hsl(h, s, l),
    mid:     hsl(h, s, l + 8),
    bright:  hsl(h, s, l + 18),
    accent:  base.accent,
    pale:    hsl(h, 30, 96),
    paleMid: hsl(h, 25, 92),
  }
}

function splitBenefits(txt = '', max = 4) {
  return txt.split(/[•\n,;|]+/).map(s => s.trim()).filter(s => s.length > 5).slice(0, max)
}

function splitSpecies(sp = '') {
  const M: Record<string, { e: string; h: string }> = {
    Cattle:  { e: '🐄', h: 'गाय' },
    Buffalo: { e: '🐃', h: 'भैंस' },
    Sheep:   { e: '🐑', h: 'भेड़' },
    Goat:    { e: '🐐', h: 'बकरी' },
    Dog:     { e: '🐕', h: 'कुत्ता' },
    Cat:     { e: '🐈', h: 'बिल्ली' },
    Horse:   { e: '🐴', h: 'घोड़ा' },
    Poultry: { e: '🐓', h: 'मुर्गी' },
    Calf:    { e: '🐮', h: 'बछड़ा' },
  }
  return sp.split(/[,/]/).map(s => s.trim()).filter(Boolean).slice(0, 6)
    .map(s => M[s] ?? { e: '🐾', h: s })
}

function getUseCaseLabel(category: string): { hi: string; en: string } {
  const map: Record<string, { hi: string; en: string }> = {
    'Antibiotic':                        { hi: 'संक्रमण में दें', en: 'For Infections' },
    'Vitamin Supplement':                { hi: 'दूध व ताकत बढ़ाए', en: 'Milk & Strength' },
    'Vitamin Supplement / Galactogogue': { hi: 'दूध उत्पादन बढ़ाए', en: 'Milk Production' },
    'Anti-inflammatory / Analgesic':     { hi: 'दर्द व सूजन में', en: 'Pain & Swelling' },
    'Anthelmintic / Antiparasitic':      { hi: 'कीड़े मारे', en: 'Deworm' },
    'Probiotic':                         { hi: 'पाचन सुधारे', en: 'Digestion' },
    'Dermatological':                    { hi: 'चमड़ी रोग में', en: 'Skin Disease' },
    'Ectoparasiticide':                  { hi: 'चिचड़ी-जूँ मारे', en: 'Ticks & Lice' },
    'Reproductive Hormone':              { hi: 'प्रजनन सुधारे', en: 'Reproduction' },
    'Antihistamine':                     { hi: 'एलर्जी में दें', en: 'Allergy Relief' },
    'Antidiarrheal':                     { hi: 'दस्त में दें', en: 'Diarrhea' },
    'Udder Care / Herbal Antimicrobial': { hi: 'थन रोग में', en: 'Udder Care' },
    'Digestive / Antiflatulent':         { hi: 'अफारा-कब्ज में', en: 'Bloat & Gas' },
  }
  return map[category] ?? { hi: 'पशु स्वास्थ्य', en: 'Animal Health' }
}

// ── Fetch a font from app's own domain (reliable on Edge) ──────────────────
async function fetchFont(appUrl: string, filename: string): Promise<ArrayBuffer | null> {
  try {
    const res = await fetch(`${appUrl}/fonts/${filename}`, { cache: 'force-cache' })
    if (!res.ok) return null
    return res.arrayBuffer()
  } catch {
    return null
  }
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: rawId } = await params
  const id = parseInt(rawId, 10)
  if (isNaN(id)) return new Response('Invalid ID', { status: 400 })

  const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://ai.madvet.in'

  // Fetch fonts from own domain — never fails due to CORS/CDN issues
  const [oswaldData, notoData, barlowData] = await Promise.all([
    fetchFont(APP_URL, 'oswald-bold.woff'),
    fetchFont(APP_URL, 'noto-devanagari.woff'),
    fetchFont(APP_URL, 'barlow-condensed.woff'),
  ])

  // If fonts are missing, return helpful error instead of blank image
  if (!oswaldData || !notoData || !barlowData) {
    return new Response(
      JSON.stringify({
        error: 'Fonts not found in /public/fonts/. Run: bash download-fonts.sh',
        missing: [
          !oswaldData && 'oswald-bold.woff',
          !notoData && 'noto-devanagari.woff',
          !barlowData && 'barlow-condensed.woff',
        ].filter(Boolean)
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }

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
  const indication  = (p.indication ?? '') as string
  const imageUrl    = (p.image_url ?? '') as string
  const bHi         = splitBenefits(p.usp_benefits_hi ?? p.usp_benefits ?? '', 4)
  const bEn         = splitBenefits(p.usp_benefits ?? '', 4)
  const speciesList = splitSpecies(p.species ?? '')
  const c           = getColors(id, category)
  const useCase     = getUseCaseLabel(category)
  const catShort    = category.split('/')[0].trim()
  const indicShort  = indication.length > 110 ? indication.slice(0, 110) + '…' : indication

  const card = (
    <div style={{ display: 'flex', flexDirection: 'column', width: 480, backgroundColor: '#ffffff' }}>

      {/* ── HERO HEADER ── */}
      <div style={{ display: 'flex', flexDirection: 'column', background: `linear-gradient(150deg, ${c.bg1} 0%, ${c.bg2} 60%, ${c.primary} 100%)`, padding: '18px 20px 20px' }}>

        {/* Logo row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ background: '#fff', borderRadius: 7, width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img src={`${APP_URL}/madvet-icon.png`} width={38} height={38} style={{ objectFit: 'contain' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontFamily: '"Oswald"', fontSize: 19, fontWeight: 700, color: '#fff', letterSpacing: 2.5 }}>MADVET</span>
              <span style={{ fontFamily: '"Barlow"', fontSize: 8, color: 'rgba(255,255,255,0.6)', letterSpacing: 1.5 }}>ANIMAL HEALTH CARE · ISO 9001:2013</span>
            </div>
          </div>
          {/* Use-case pill */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
            <div style={{ background: c.accent, borderRadius: 20, padding: '5px 13px', display: 'flex', alignItems: 'center' }}>
              <span style={{ fontFamily: '"Oswald"', fontSize: 11, color: '#fff', fontWeight: 700, letterSpacing: 0.8 }}>{useCase.en}</span>
            </div>
            <span style={{ fontFamily: '"NotoHindi"', fontSize: 10, color: 'rgba(255,255,255,0.75)' }}>{useCase.hi}</span>
          </div>
        </div>

        {/* Product name + image */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
            <span style={{
              fontFamily: '"Oswald"', fontWeight: 700, color: '#fff', lineHeight: 1, letterSpacing: 1,
              fontSize: name.length > 18 ? 26 : name.length > 13 ? 33 : name.length > 9 ? 40 : 48,
            }}>{name}</span>
            {salt ? (
              <span style={{ fontFamily: '"Barlow"', fontSize: 10, color: 'rgba(255,255,255,0.55)', marginTop: 6, fontStyle: 'italic' }}>{salt}</span>
            ) : null}
            <div style={{ display: 'flex', marginTop: 10, gap: 6 }}>
              <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 20, padding: '4px 12px', border: '1px solid rgba(255,255,255,0.25)', display: 'flex' }}>
                <span style={{ fontFamily: '"Barlow"', fontSize: 10, color: 'rgba(255,255,255,0.9)' }}>{form}</span>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 20, padding: '4px 12px', border: '1px solid rgba(255,255,255,0.15)', display: 'flex' }}>
                <span style={{ fontFamily: '"Barlow"', fontSize: 10, color: 'rgba(255,255,255,0.7)' }}>{packaging}</span>
              </div>
            </div>
          </div>
          {/* Product image */}
          <div style={{ width: 112, height: 112, borderRadius: 12, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {imageUrl
              ? <img src={imageUrl} width={104} height={104} style={{ objectFit: 'contain' }} />
              : <span style={{ fontSize: 44 }}>{form === 'Injection' ? '💉' : form === 'Bolus' ? '💊' : '🧴'}</span>
            }
          </div>
        </div>

        {/* Indication strip */}
        {indicShort ? (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginTop: 14, background: 'rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 12px', border: `1px solid ${c.accent}60` }}>
            <span style={{ fontFamily: '"Barlow"', fontSize: 11, color: 'rgba(255,255,255,0.85)', lineHeight: 1.4, flex: 1 }}>
              🎯 {indicShort}
            </span>
          </div>
        ) : null}
      </div>

      {/* ── ACCENT STRIPE ── */}
      <div style={{ height: 4, background: `linear-gradient(90deg, ${c.accent}, ${c.bright}, ${c.accent})`, display: 'flex' }} />

      {/* ── BENEFITS ── */}
      <div style={{ display: 'flex', flexDirection: 'column', background: '#fff', padding: '14px 18px 10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 11, gap: 8 }}>
          <div style={{ background: c.primary, borderRadius: 4, width: 4, height: 18, display: 'flex' }} />
          <span style={{ fontFamily: '"NotoHindi"', fontSize: 13, fontWeight: 800, color: c.primary }}>मुख्य फ़ायदे</span>
          <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${c.primary}40, transparent)`, display: 'flex' }} />
          <span style={{ fontFamily: '"Barlow"', fontSize: 9, color: '#bbb', fontStyle: 'italic' }}>Key Benefits</span>
        </div>

        {bHi.map((b: string, i: number) => (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 7, padding: '9px 12px', borderRadius: 9, background: i % 2 === 0 ? c.pale : c.paleMid, border: `1px solid ${i === 0 ? c.accent + '55' : 'transparent'}` }}>
            <div style={{ width: 26, height: 26, borderRadius: 13, flexShrink: 0, background: i === 0 ? c.accent : c.primary, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontFamily: '"Oswald"', fontSize: 13, color: '#fff', fontWeight: 800 }}>{i + 1}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
              <span style={{ fontFamily: '"NotoHindi"', fontSize: 12.5, color: '#111', fontWeight: 700, lineHeight: 1.4 }}>{b}</span>
              {bEn[i] ? <span style={{ fontFamily: '"Barlow"', fontSize: 9.5, color: '#777', marginTop: 2 }}>{bEn[i]}</span> : null}
            </div>
          </div>
        ))}
      </div>

      {/* ── SPECIES ── */}
      {speciesList.length > 0 ? (
        <div style={{ display: 'flex', alignItems: 'center', background: c.primary, padding: '10px 18px', gap: 10 }}>
          <span style={{ fontFamily: '"NotoHindi"', fontSize: 10, color: 'rgba(255,255,255,0.7)', flexShrink: 0 }}>किसके लिए:</span>
          <div style={{ display: 'flex', gap: 8 }}>
            {speciesList.map((s: { e: string; h: string }, i: number) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                <div style={{ width: 30, height: 30, borderRadius: 15, background: 'rgba(255,255,255,0.2)', border: '1.5px solid rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>{s.e}</div>
                <span style={{ fontFamily: '"NotoHindi"', fontSize: 7.5, color: 'rgba(255,255,255,0.85)' }}>{s.h}</span>
              </div>
            ))}
          </div>
          <div style={{ flex: 1, display: 'flex' }} />
          <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 6, padding: '4px 10px', border: '1px solid rgba(255,255,255,0.25)', display: 'flex' }}>
            <span style={{ fontFamily: '"Oswald"', fontSize: 9, color: '#fff', letterSpacing: 1 }}>{catShort.toUpperCase()}</span>
          </div>
        </div>
      ) : null}

      {/* ── CTA STRIP ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#111827', padding: '11px 18px' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontFamily: '"NotoHindi"', fontSize: 10, color: 'rgba(255,255,255,0.45)' }}>सभी उत्पाद देखें</span>
          <span style={{ fontFamily: '"Oswald"', fontSize: 15, color: '#fff', fontWeight: 700 }}>madvet.in/products</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: c.accent, borderRadius: 8, padding: '7px 16px' }}>
          <span style={{ fontFamily: '"NotoHindi"', fontSize: 10, color: '#fff', fontWeight: 700 }}>अभी ऑर्डर करें</span>
          <span style={{ fontFamily: '"Barlow"', fontSize: 9, color: 'rgba(255,255,255,0.85)' }}>Order Now</span>
        </div>
      </div>

      {/* ── FOOTER ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#FFD700', padding: '12px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ background: '#fff', borderRadius: 8, width: 46, height: 46, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img src={`${APP_URL}/madvet-icon.png`} width={40} height={40} style={{ objectFit: 'contain' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontFamily: '"Oswald"', fontSize: 24, fontWeight: 900, color: '#1a2f8a', letterSpacing: 3, lineHeight: 1 }}>MADVET</span>
            <span style={{ fontFamily: '"Barlow"', fontSize: 8.5, color: '#1a2f8a', letterSpacing: 1.5, fontWeight: 700 }}>ANIMAL HEALTH CARE</span>
            <span style={{ fontFamily: '"Barlow"', fontSize: 7.5, color: '#444' }}>ISO 9001:2013 · Ghaziabad (U.P.)</span>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
          <span style={{ fontFamily: '"Oswald"', fontSize: 11, fontWeight: 800, color: '#1a2f8a' }}>📞 9935257750</span>
          <span style={{ fontFamily: '"Oswald"', fontSize: 10, fontWeight: 700, color: '#1a2f8a' }}>8400347331</span>
          <span style={{ fontFamily: '"Barlow"', fontSize: 7.5, color: '#444', marginTop: 2 }}>madvet.animal@gmail.com</span>
          <span style={{ fontFamily: '"Barlow"', fontSize: 7.5, color: '#444' }}>www.madvet.in</span>
        </div>
      </div>

    </div>
  )

  return new ImageResponse(card, {
    width: 480,
    height: 800,
    fonts: [
      { name: 'Oswald',    data: oswaldData,  weight: 700, style: 'normal' },
      { name: 'Barlow',    data: barlowData,  weight: 400, style: 'normal' },
      { name: 'NotoHindi', data: notoData,    weight: 600, style: 'normal' },
    ],
  })
}
