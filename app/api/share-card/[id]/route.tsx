// PLACE THIS FILE AT: app/api/share-card/[id]/route.tsx
// DELETE: app/products/[id]/share-card/ (entire folder)

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
  return sp.split(/[,/]/).map(s => s.trim()).filter(Boolean).slice(0, 6).map(s => M[s] ?? { e: '🐾', h: s })
}

function getUseCaseLabel(category: string): { hi: string; en: string; icon: string } {
  const map: Record<string, { hi: string; en: string; icon: string }> = {
    'Antibiotic':                        { hi: 'संक्रमण में दें', en: 'For Infections', icon: '🦠' },
    'Vitamin Supplement':                { hi: 'दूध व ताकत बढ़ाए', en: 'Milk & Strength', icon: '💪' },
    'Vitamin Supplement / Galactogogue': { hi: 'दूध उत्पादन बढ़ाए', en: 'Milk Production', icon: '🥛' },
    'Anti-inflammatory / Analgesic':     { hi: 'दर्द व सूजन में', en: 'Pain & Swelling', icon: '🌡️' },
    'Anthelmintic / Antiparasitic':      { hi: 'कीड़े मारे', en: 'Deworm', icon: '🐛' },
    'Probiotic':                         { hi: 'पाचन सुधारे', en: 'Digestion', icon: '🌿' },
    'Dermatological':                    { hi: 'चमड़ी रोग में', en: 'Skin Disease', icon: '🩹' },
    'Ectoparasiticide':                  { hi: 'चिचड़ी-जूँ मारे', en: 'Ticks & Lice', icon: '🪲' },
    'Reproductive Hormone':              { hi: 'प्रजनन सुधारे', en: 'Reproduction', icon: '🔬' },
    'Antihistamine':                     { hi: 'एलर्जी में दें', en: 'Allergy Relief', icon: '💊' },
    'Antidiarrheal':                     { hi: 'दस्त में दें', en: 'Diarrhea', icon: '💧' },
    'Udder Care / Herbal Antimicrobial': { hi: 'थन रोग में', en: 'Udder Care', icon: '🐄' },
    'Digestive / Antiflatulent':        { hi: 'अफारा-कब्ज में', en: 'Bloat & Gas', icon: '🫁' },
  }
  return map[category] ?? { hi: 'पशु स्वास्थ्य', en: 'Animal Health', icon: '🐾' }
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
  const name       = (p.product_name ?? p.name ?? '') as string
  const category   = (p.category ?? '') as string
  const salt       = (p.salt_ingredient ?? p.salt ?? '') as string
  const packaging  = (p.packaging ?? '') as string
  const form       = (p.formulation ?? '') as string
  const indication = (p.indication ?? '') as string
  const imageUrl   = (p.image_url ?? '') as string
  const hiRaw      = (p.usp_benefits_hi ?? p.usp_benefits ?? p.benefits ?? '') as string
  const enRaw      = (p.usp_benefits ?? p.benefits ?? '') as string
  const bHi        = splitBenefits(hiRaw, 4)
  const bEn        = splitBenefits(enRaw, 4)
  const speciesList = splitSpecies(p.species ?? '')
  const c          = getColors(id, category)
  const useCase    = getUseCaseLabel(category)
  const APP_URL    = process.env.NEXT_PUBLIC_APP_URL ?? 'https://ai.madvet.in'
  const catShort   = category.split('/')[0].trim()

  // Fonts
  const [oswaldBold, notoHindi, barlow] = await Promise.all([
    fetch('https://fonts.gstatic.com/s/oswald/v53/TK3iWkUHHAIjg752GT8Dl-1pkiHLQoiFwdk.woff').then(r => r.arrayBuffer()),
    fetch('https://fonts.gstatic.com/s/notosansdevanagari/v26/TuGOUUFzXI5FBtUq5a8bjKYTZjtRU6Sgv3NaV_SNmI0b6RFZz-SyFsRGMxDwF4FqhCO.woff').then(r => r.arrayBuffer()),
    fetch('https://fonts.gstatic.com/s/barlowcondensed/v12/HTxwL3I-JCGChYJ8VI-L6OO_au7B467nGYUAuAU.woff').then(r => r.arrayBuffer()),
  ])

  const card = (
    <div style={{ display: 'flex', flexDirection: 'column', width: 480, fontFamily: '"Barlow"', backgroundColor: '#fff' }}>

      {/* ═══ HERO — dark gradient with product identity ═══ */}
      <div style={{ display: 'flex', flexDirection: 'column', background: `linear-gradient(150deg, ${c.bg1} 0%, ${c.bg2} 60%, ${c.primary} 100%)`, padding: '18px 20px 20px' }}>

        {/* Top bar: logo + category badge */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <div style={{ background: '#fff', borderRadius: 7, width: 42, height: 42, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img src={`${APP_URL}/madvet-icon.png`} width={36} height={36} style={{ objectFit: 'contain' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontFamily: '"Oswald"', fontSize: 18, fontWeight: 700, color: '#fff', letterSpacing: 2.5, lineHeight: 1 }}>MADVET</span>
              <span style={{ fontSize: 7.5, color: 'rgba(255,255,255,0.55)', letterSpacing: 1.8, marginTop: 2 }}>ANIMAL HEALTH CARE</span>
            </div>
          </div>
          {/* Use-case tag — tells exactly when to use */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
            <div style={{ background: c.accent, borderRadius: 20, padding: '4px 12px', display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ fontSize: 14 }}>{useCase.icon}</span>
              <span style={{ fontFamily: '"Oswald"', fontSize: 11, color: '#fff', fontWeight: 700, letterSpacing: 0.8 }}>{useCase.en}</span>
            </div>
            <span style={{ fontFamily: '"NotoHindi"', fontSize: 10, color: 'rgba(255,255,255,0.7)' }}>{useCase.hi}</span>
          </div>
        </div>

        {/* Product name + image */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
            <span style={{
              fontFamily: '"Oswald"', fontWeight: 700, color: '#fff',
              lineHeight: 1, letterSpacing: 1,
              fontSize: name.length > 18 ? 26 : name.length > 13 ? 33 : name.length > 9 ? 40 : 48,
            }}>{name}</span>
            {salt ? <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)', marginTop: 5, fontStyle: 'italic', letterSpacing: 0.3 }}>{salt}</span> : null}
            {/* Formulation pill */}
            <div style={{ display: 'flex', marginTop: 10, gap: 6 }}>
              <div style={{ background: 'rgba(255,255,255,0.14)', borderRadius: 20, padding: '4px 12px', border: '1px solid rgba(255,255,255,0.22)' }}>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.9)', letterSpacing: 0.5 }}>{form}</span>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.09)', borderRadius: 20, padding: '4px 12px', border: '1px solid rgba(255,255,255,0.15)' }}>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', letterSpacing: 0.5 }}>{packaging}</span>
              </div>
            </div>
          </div>
          {/* Product image — clean white box */}
          <div style={{ width: 115, height: 115, borderRadius: 12, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {imageUrl
              ? <img src={imageUrl} width={105} height={105} style={{ objectFit: 'contain' }} />
              : <span style={{ fontSize: 46 }}>{form === 'Injection' ? '💉' : form === 'Bolus' ? '💊' : form === 'Powder' ? '🧪' : '🧴'}</span>
            }
          </div>
        </div>

        {/* Indication strip — THE key clinical signal */}
        {indication ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14, background: 'rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 12px', border: `1px solid ${c.accent}55` }}>
            <span style={{ fontSize: 16 }}>🎯</span>
            <span style={{ fontFamily: '"Barlow"', fontSize: 10.5, color: 'rgba(255,255,255,0.85)', lineHeight: 1.4, flex: 1 }}>
              {indication.length > 120 ? indication.slice(0, 120) + '…' : indication}
            </span>
          </div>
        ) : null}
      </div>

      {/* ═══ ACCENT STRIPE ═══ */}
      <div style={{ height: 4, background: `linear-gradient(90deg, ${c.accent}, ${c.bright}, ${c.accent})`, display: 'flex' }} />

      {/* ═══ BENEFITS — the sales pitch ═══ */}
      <div style={{ display: 'flex', flexDirection: 'column', background: '#fff', padding: '14px 18px 10px' }}>
        {/* Section header */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 11, gap: 8 }}>
          <div style={{ background: c.primary, borderRadius: 4, width: 4, height: 18, display: 'flex' }} />
          <span style={{ fontFamily: '"NotoHindi"', fontSize: 13, fontWeight: 800, color: c.primary }}>मुख्य फ़ायदे</span>
          <span style={{ fontSize: 9, color: '#bbb', fontStyle: 'italic', marginLeft: 4 }}>Key Benefits</span>
          <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${c.primary}30, transparent)`, display: 'flex' }} />
        </div>

        {/* Benefit rows — Hindi + English pairs */}
        {bHi.map((b: string, i: number) => (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8, padding: '9px 12px', borderRadius: 9, background: i % 2 === 0 ? c.pale : c.paleMid, border: `1px solid ${i === 0 ? c.accent + '50' : 'transparent'}` }}>
            {/* Numbered circle */}
            <div style={{ width: 26, height: 26, borderRadius: 13, flexShrink: 0, background: i === 0 ? c.accent : c.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>
              <span style={{ fontSize: 13, color: '#fff', fontWeight: 800 }}>{i + 1}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
              <span style={{ fontFamily: '"NotoHindi"', fontSize: 13, color: '#111', fontWeight: 700, lineHeight: 1.4 }}>{b}</span>
              {bEn[i] && <span style={{ fontSize: 9.5, color: '#777', marginTop: 2, lineHeight: 1.3 }}>{bEn[i]}</span>}
            </div>
          </div>
        ))}
      </div>

      {/* ═══ SPECIES ROW — who gets this medicine ═══ */}
      {speciesList.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 0, background: c.primary, padding: '10px 18px' }}>
          <span style={{ fontFamily: '"NotoHindi"', fontSize: 10, color: 'rgba(255,255,255,0.7)', marginRight: 10, flexShrink: 0 }}>किसके लिए:</span>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'nowrap' }}>
            {speciesList.map((s: { e: string; h: string }, i: number) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                <div style={{ width: 30, height: 30, borderRadius: 15, background: 'rgba(255,255,255,0.2)', border: '1.5px solid rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>{s.e}</div>
                <span style={{ fontFamily: '"NotoHindi"', fontSize: 7.5, color: 'rgba(255,255,255,0.85)' }}>{s.h}</span>
              </div>
            ))}
          </div>
          <div style={{ flex: 1, display: 'flex' }} />
          <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 6, padding: '4px 10px', border: '1px solid rgba(255,255,255,0.25)' }}>
            <span style={{ fontFamily: '"Oswald"', fontSize: 9, color: '#fff', letterSpacing: 1 }}>{catShort.toUpperCase()}</span>
          </div>
        </div>
      )}

      {/* ═══ CTA STRIP — order now ═══ */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#111827', padding: '11px 18px' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontFamily: '"NotoHindi"', fontSize: 11, color: 'rgba(255,255,255,0.5)', letterSpacing: 0.5 }}>सभी उत्पाद देखें</span>
          <span style={{ fontFamily: '"Oswald"', fontSize: 16, color: '#fff', fontWeight: 700, letterSpacing: 0.5 }}>madvet.in/products</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: c.accent, borderRadius: 8, padding: '7px 16px' }}>
          <span style={{ fontFamily: '"NotoHindi"', fontSize: 10, color: '#fff', fontWeight: 700 }}>अभी ऑर्डर करें</span>
          <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.8)' }}>Order Now</span>
        </div>
      </div>

      {/* ═══ FOOTER — yellow brand bar ═══ */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#FFD700', padding: '11px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ background: '#fff', borderRadius: 8, width: 46, height: 46, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img src={`${APP_URL}/madvet-icon.png`} width={40} height={40} style={{ objectFit: 'contain' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontFamily: '"Oswald"', fontSize: 24, fontWeight: 900, color: '#1a2f8a', letterSpacing: 3, lineHeight: 1 }}>MADVET</span>
            <span style={{ fontSize: 8.5, color: '#1a2f8a', letterSpacing: 1.5, fontWeight: 700 }}>ANIMAL HEALTH CARE</span>
            <span style={{ fontSize: 7.5, color: '#444' }}>ISO 9001:2013 · Ghaziabad</span>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
          <span style={{ fontSize: 10, fontWeight: 800, color: '#1a2f8a' }}>📞 9935257750</span>
          <span style={{ fontSize: 9, fontWeight: 700, color: '#1a2f8a' }}>8400347331</span>
          <span style={{ fontSize: 7.5, color: '#444', marginTop: 2 }}>madvet.animal@gmail.com</span>
          <span style={{ fontSize: 7.5, color: '#444' }}>www.madvet.in</span>
        </div>
      </div>

    </div>
  )

  return new ImageResponse(card, {
    width: 480,
    height: 780,
    fonts: [
      { name: 'Oswald',    data: oswaldBold, weight: 700, style: 'normal' },
      { name: 'Barlow',    data: barlow,     weight: 400, style: 'normal' },
      { name: 'NotoHindi', data: notoHindi,  weight: 600, style: 'normal' },
    ],
  })
}
