// @ts-nocheck
// SAVE TO: app/api/share-card/[id]/route.tsx

import { ImageResponse } from 'next/og'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

// ── Font loader (cached per cold start) ─────────────────────────────────────
let _fonts = null
async function loadFonts() {
  if (_fonts) return _fonts
  try {
    const css = await fetch(
      'https://fonts.googleapis.com/css2?family=Oswald:wght@400;600;700&family=Noto+Sans+Devanagari:wght@400;700;900&family=Barlow+Condensed:wght@400;600;700&display=swap',
      { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1)' }, signal: AbortSignal.timeout(8000) }
    ).then(r => r.text())

    const seen = new Set()
    const jobs = []
    const weights = { 'Oswald': [700], 'Noto Sans Devanagari': [700, 900], 'Barlow Condensed': [600, 700] }

    for (const block of css.split('@font-face')) {
      const fm = block.match(/font-family:\s*['"]?([^'"\n;]+)['"]?/)
      const wm = block.match(/font-weight:\s*(\d+)/)
      const um = block.match(/src:[^;]*url\(([^)]+)\)/)
      if (!fm || !um || !wm) continue
      const key = `${fm[1].trim()}:${wm[1]}`
      if (seen.has(key)) continue
      seen.add(key)
      jobs.push({ name: fm[1].trim(), weight: parseInt(wm[1]), url: um[1].trim() })
    }

    const results = await Promise.allSettled(
      jobs.map(async ({ name, weight, url }) => {
        const r = await fetch(url, { signal: AbortSignal.timeout(8000) })
        if (!r.ok) throw new Error('HTTP ' + r.status)
        const data = await r.arrayBuffer()
        const b = new Uint8Array(data.slice(0, 4))
        if (b[0] !== 0x77 && b[0] !== 0x00 && !(b[0] === 79 && b[1] === 84)) throw new Error('bad font')
        return { name, data, weight, style: 'normal' }
      })
    )

    _fonts = results.filter(r => r.status === 'fulfilled').map(r => r.value)
    return _fonts
  } catch { return [] }
}

// ── Image → base64 with strict validation ────────────────────────────────────
async function imgURI(url) {
  if (!url) return null
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(6000) })
    if (!r.ok) return null
    const ct = r.headers.get('content-type') || ''
    if (ct.includes('html') || ct.includes('text')) return null
    const buf = Buffer.from(await r.arrayBuffer())
    const b = buf.slice(0, 4)
    if (b[0] === 0xFF && b[1] === 0xD8) return `data:image/jpeg;base64,${buf.toString('base64')}`
    if (b[0] === 0x89 && b[1] === 0x50) return `data:image/png;base64,${buf.toString('base64')}`
    if (b.toString('ascii', 0, 4) === 'RIFF') return `data:image/webp;base64,${buf.toString('base64')}`
    return null
  } catch { return null }
}

// ── Category themes ──────────────────────────────────────────────────────────
const THEMES = {
  'Anthelmintic / Antiparasitic': {
    bg1: '#0d4f2e', bg2: '#1a7a44', accent: '#22c55e', pale: '#dcfce7',
    problem: 'पेट के कीड़े\nपरेशान कर रहे हैं?',
    hook: 'एक डोज़ में कीड़ों का सफाया',
    kills: ['गोल कीड़े', 'फीताकृमि', 'फेफड़े कीड़े', 'जिगर कीड़े'],
  },
  'Ectoparasiticide': {
    bg1: '#4a1d00', bg2: '#7c3a00', accent: '#f97316', pale: '#ffedd5',
    problem: 'किलनी–चिचड़ी से\nजानवर बेहाल है?',
    hook: 'एक बार लगाएं, लंबे समय तक आराम',
    kills: ['किलनी (Ticks)', 'जूँ (Lice)', 'माइट्स', 'मक्खी'],
  },
  'Antibiotic': {
    bg1: '#0f2a5e', bg2: '#1e40af', accent: '#60a5fa', pale: '#dbeafe',
    problem: 'बुखार–संक्रमण से\nजानवर कमज़ोर हो रहा है?',
    hook: 'तेज़ असर, जल्दी रिकवरी',
    kills: ['बैक्टीरिया', 'संक्रमण', 'बुखार', 'सूजन'],
  },
  'Anti-inflammatory / Analgesic': {
    bg1: '#5b0a1a', bg2: '#9f1239', accent: '#fb7185', pale: '#ffe4e6',
    problem: 'दर्द–सूजन से\nजानवर उठ नहीं पा रहा?',
    hook: 'दर्द मिटाए, काम पर वापस लाए',
    kills: ['दर्द', 'सूजन', 'बुखार', 'लंगड़ाहट'],
  },
  'Vitamin Supplement': {
    bg1: '#431407', bg2: '#9a3412', accent: '#fb923c', pale: '#ffedd5',
    problem: 'दूध कम हो गया?\nजानवर कमज़ोर दिखता है?',
    hook: 'दूध बढ़ाएं, ताकत लाएं',
    kills: ['कमज़ोरी', 'दूध कमी', 'भूख न लगना', 'थकान'],
  },
  'Vitamin Supplement / Galactogogue': {
    bg1: '#0c3460', bg2: '#0369a1', accent: '#38bdf8', pale: '#e0f2fe',
    problem: 'दूध उत्पादन\nकम हो गया है?',
    hook: 'दूध 2 गुना बढ़ाने का सिद्ध फार्मूला',
    kills: ['कम दूध', 'थनेला', 'कमज़ोरी', 'पोषण कमी'],
  },
  'Probiotic': {
    bg1: '#052e16', bg2: '#166534', accent: '#4ade80', pale: '#dcfce7',
    problem: 'पाचन खराब?\nभूख नहीं लगती?',
    hook: 'पेट ठीक तो जानवर ठीक',
    kills: ['दस्त', 'कब्ज़', 'अफारा', 'खराब पाचन'],
  },
  'Dermatological': {
    bg1: '#2e1065', bg2: '#6d28d9', accent: '#a78bfa', pale: '#f5f3ff',
    problem: 'खुजली–चमड़ी रोग से\nजानवर तड़प रहा है?',
    hook: 'जड़ से ठीक करे, दोबारा न हो',
    kills: ['खुजली', 'ज़ख्म', 'फंगस', 'बैक्टीरियल इन्फेक्शन'],
  },
  'Reproductive Hormone': {
    bg1: '#4a044e', bg2: '#86198f', accent: '#e879f9', pale: '#fdf4ff',
    problem: 'हीट नहीं आती?\nगाभिन नहीं होती?',
    hook: 'प्रजनन सुधारे, नुकसान बचाए',
    kills: ['हीट न आना', 'गर्भधारण में परेशानी', 'हार्मोन असंतुलन', 'बांझपन'],
  },
  'Antihistamine': {
    bg1: '#0c4a6e', bg2: '#0e7490', accent: '#22d3ee', pale: '#ecfeff',
    problem: 'एलर्जी–सूजन से\nजानवर बेचैन है?',
    hook: 'एलर्जी पर तुरंत काबू',
    kills: ['एलर्जी', 'सूजन', 'खुजली', 'लाली'],
  },
  'Antidiarrheal': {
    bg1: '#042f2e', bg2: '#0f766e', accent: '#2dd4bf', pale: '#f0fdfa',
    problem: 'दस्त–पेचिश से\nजानवर टूट रहा है?',
    hook: 'दस्त बंद करे, ताकत वापस लाए',
    kills: ['दस्त', 'पेचिश', 'बैक्टीरिया', 'डिहाइड्रेशन'],
  },
  'Udder Care / Herbal Antimicrobial': {
    bg1: '#1a2e05', bg2: '#365314', accent: '#86efac', pale: '#f7fee7',
    problem: 'थनेला से दूध\nबंद हो गया है?',
    hook: 'थन ठीक करे, दूध वापस लाए',
    kills: ['थनेला', 'सूजन', 'बैक्टीरिया', 'दर्द'],
  },
  'Digestive / Antiflatulent': {
    bg1: '#431407', bg2: '#b45309', accent: '#fbbf24', pale: '#fef9c3',
    problem: 'अफारा–गैस से\nजानवर दर्द में है?',
    hook: 'अफारा मिटाए, भूख जगाए',
    kills: ['अफारा', 'गैस', 'कब्ज़', 'पेट दर्द'],
  },
}

const DEFAULT_THEME = {
  bg1: '#0f172a', bg2: '#1e3a8a', accent: '#60a5fa', pale: '#dbeafe',
  problem: 'पशु की बीमारी\nठीक करें तुरंत', hook: 'असरदार और भरोसेमंद',
  kills: ['बीमारी', 'कमज़ोरी', 'संक्रमण', 'दर्द'],
}

const SPECIES_EMOJI = {
  Cattle: '🐄', Buffalo: '🐃', Sheep: '🐑', Goat: '🐐',
  Dog: '🐕', Cat: '🐈', Horse: '🐴', Poultry: '🐓', Calf: '🐮',
}
const SPECIES_HI = {
  Cattle: 'गाय', Buffalo: 'भैंस', Sheep: 'भेड़', Goat: 'बकरी',
  Dog: 'कुत्ता', Cat: 'बिल्ली', Horse: 'घोड़ा', Poultry: 'मुर्गी', Calf: 'बछड़ा',
}

function parseBenefits(txt, max = 4) {
  return (txt || '').split(/[•\n,;|]+/).map(s => s.trim()).filter(s => s.length > 6).slice(0, max)
}

// ── GET ───────────────────────────────────────────────────────────────────────
export async function GET(_req, { params }) {
  const { id: rawId } = await params
  const id = parseInt(rawId, 10)
  if (isNaN(id)) return new Response('Bad ID', { status: 400 })

  const APP = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://ai.madvet.in').replace(/\/$/, '')
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  const table = (process.env.NEXT_PUBLIC_SUPABASE_TABLE ?? 'products_enriched').trim()

  const [fonts, { data, error }, logoURI] = await Promise.all([
    loadFonts(),
    sb.from(table).select('*').eq('id', id).single(),
    imgURI(`${APP}/madvet-icon.png`),
  ])

  if (error || !data) return new Response('Not found', { status: 404 })

  const name      = (data.product_name ?? data.name ?? '').trim()
  const category  = (data.category ?? '').trim()
  const salt      = (data.salt_ingredient ?? '').trim()
  const packaging = (data.packaging ?? '').trim()
  const form      = (data.formulation ?? '').trim()
  const species   = (data.species ?? '').split(/[,/]/).map(s => s.trim()).filter(Boolean).slice(0, 5)
  const bEn       = parseBenefits(data.usp_benefits, 4)
  const bHi       = parseBenefits(data.usp_benefits_hi ?? data.usp_benefits, 4)
  const indication= (data.indication ?? '').split(/[,;]/).map(s => s.trim()).filter(Boolean).slice(0, 3)

  const productImg = await imgURI(data.image_url)

  const T = THEMES[category] ?? DEFAULT_THEME
  const problemLines = T.problem.split('\n')
  const nameFontSize = name.length > 16 ? 32 : name.length > 12 ? 40 : name.length > 8 ? 50 : 60

  // font helpers
  const hasOswald = fonts.some(f => f.name === 'Oswald')
  const hasNoto   = fonts.some(f => f.name.includes('Devanagari'))
  const hasBarlow = fonts.some(f => f.name.includes('Barlow'))
  const OW  = hasOswald ? '"Oswald"'              : 'Arial Black'
  const HI  = hasNoto   ? '"Noto Sans Devanagari"': 'sans-serif'
  const BAR = hasBarlow ? '"Barlow Condensed"'    : 'Arial Narrow'

  try {
    return new ImageResponse(
      (
        <div style={{
          display: 'flex', flexDirection: 'column',
          width: 540, backgroundColor: '#fff',
          fontFamily: BAR,
        }}>

          {/* ── HERO BAND ── dark gradient with problem + product name ─────── */}
          <div style={{
            display: 'flex', flexDirection: 'column',
            background: `linear-gradient(160deg, ${T.bg1} 0%, ${T.bg2} 100%)`,
            padding: '20px 22px 0',
            position: 'relative',
          }}>
            {/* Top row: logo + packaging */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                background: 'rgba(255,255,255,0.12)', borderRadius: 30,
                padding: '6px 14px 6px 6px',
              }}>
                {logoURI
                  ? <img src={logoURI} width={32} height={32} style={{ objectFit: 'contain', borderRadius: '50%', background: '#fff' }} />
                  : <div style={{ display: 'flex', fontSize: 20 }}>🐾</div>
                }
                <span style={{ fontFamily: OW, fontSize: 18, fontWeight: 700, color: '#fff', letterSpacing: 2 }}>MADVET</span>
              </div>
              <div style={{
                background: T.accent, borderRadius: 20, padding: '6px 16px', display: 'flex',
              }}>
                <span style={{ fontFamily: OW, fontSize: 14, fontWeight: 700, color: T.bg1 }}>{packaging}</span>
              </div>
            </div>

            {/* Problem statement + product name side by side */}
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, marginTop: 18 }}>
              {/* LEFT: problem in Hindi */}
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                {problemLines.map((line, i) => (
                  <span key={i} style={{
                    fontFamily: HI, fontSize: 26, fontWeight: 900,
                    color: i === 0 ? '#fff' : T.accent,
                    lineHeight: 1.2, textShadow: '0 2px 12px rgba(0,0,0,0.4)',
                  }}>{line}</span>
                ))}
                {/* Hook line */}
                <div style={{
                  display: 'flex', marginTop: 10,
                  background: T.accent, borderRadius: 6, padding: '7px 12px',
                  alignSelf: 'flex-start',
                }}>
                  <span style={{ fontFamily: HI, fontSize: 14, fontWeight: 700, color: T.bg1 }}>✓ {T.hook}</span>
                </div>
              </div>

              {/* RIGHT: product image */}
              <div style={{
                display: 'flex', width: 150, height: 150,
                alignItems: 'flex-end', justifyContent: 'center',
                flexShrink: 0,
              }}>
                {productImg
                  ? <img src={productImg} width={148} height={148} style={{ objectFit: 'contain' }} />
                  : <div style={{ display: 'flex', fontSize: 90, lineHeight: 1 }}>
                    {form === 'Injection' ? '💉' : form === 'Bolus' ? '💊' : form === 'Spray' ? '💨' : '🧴'}
                  </div>
                }
              </div>
            </div>

            {/* Product name — massive, straddling the section */}
            <div style={{
              display: 'flex', justifyContent: 'center',
              background: 'rgba(0,0,0,0.25)',
              margin: '14px -22px 0', padding: '10px 22px',
              borderTop: `3px solid ${T.accent}`,
            }}>
              <span style={{
                fontFamily: OW, fontSize: nameFontSize, fontWeight: 700,
                color: '#fff', letterSpacing: 2,
                textShadow: `0 0 30px ${T.accent}88, 2px 3px 0 rgba(0,0,0,0.5)`,
                textAlign: 'center',
              }}>{name}</span>
            </div>
          </div>

          {/* Salt + formulation ribbon */}
          <div style={{
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            background: T.pale, padding: '7px 20px', gap: 12,
          }}>
            <span style={{ fontFamily: BAR, fontSize: 11, color: T.bg1, fontWeight: 700, textAlign: 'center' }}>
              {salt}
            </span>
            {form && (
              <span style={{
                fontFamily: OW, fontSize: 10, color: T.bg2, fontWeight: 700,
                background: 'rgba(0,0,0,0.08)', borderRadius: 10, padding: '2px 8px',
              }}>{form.toUpperCase()}</span>
            )}
          </div>

          {/* ── BENEFITS BLOCK ────────────────────────────────────────────── */}
          <div style={{ display: 'flex', background: '#fff', padding: '16px 20px', gap: 14 }}>

            {/* LEFT col: Unique Mode of Action */}
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1.1 }}>
              <div style={{
                display: 'flex', background: T.bg1, borderRadius: 7,
                padding: '8px 12px', marginBottom: 10,
              }}>
                <span style={{ fontFamily: BAR, fontSize: 13, color: T.accent, fontWeight: 700, fontStyle: 'italic' }}>
                  Unique Mode of Action :
                </span>
              </div>
              {bEn.map((b, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 8,
                  marginBottom: 8, padding: '7px 10px',
                  background: i === 0 ? T.pale : '#f8fafc',
                  borderRadius: 7, borderLeft: `4px solid ${i === 0 ? T.accent : '#e2e8f0'}`,
                }}>
                  <span style={{ color: T.bg2, fontSize: 12, flexShrink: 0, fontWeight: 900, marginTop: 1 }}>◆</span>
                  <span style={{ fontFamily: BAR, fontSize: 12, color: '#1e293b', lineHeight: 1.4, fontWeight: 600 }}>{b}</span>
                </div>
              ))}
            </div>

            {/* RIGHT col: Hindi benefits */}
            <div style={{ display: 'flex', flexDirection: 'column', width: 190 }}>
              <div style={{
                display: 'flex', background: T.bg2, borderRadius: 7,
                padding: '8px 12px', marginBottom: 10,
              }}>
                <span style={{ fontFamily: HI, fontSize: 12, color: '#fff', fontWeight: 700 }}>
                  मुख्य फायदे :
                </span>
              </div>
              {bHi.map((b, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 6,
                  marginBottom: 7, padding: '7px 9px',
                  background: i % 2 === 0 ? T.pale : '#fff',
                  borderRadius: 7, border: `1px solid ${T.accent}33`,
                }}>
                  <span style={{ color: T.accent, fontSize: 13, flexShrink: 0, fontWeight: 900 }}>✓</span>
                  <span style={{ fontFamily: HI, fontSize: 11, color: '#1e293b', lineHeight: 1.4, fontWeight: 700 }}>{b}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── KILLS / TARGET STRIP ─────────────────────────────────────── */}
          <div style={{
            display: 'flex', background: T.bg1,
            padding: '10px 20px', gap: 8, alignItems: 'center',
          }}>
            <span style={{ fontFamily: HI, fontSize: 11, color: T.accent, fontWeight: 700, flexShrink: 0 }}>
              इसमें काम करे :
            </span>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {T.kills.map((k, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  background: 'rgba(255,255,255,0.1)',
                  border: `1px solid ${T.accent}55`,
                  borderRadius: 20, padding: '4px 10px',
                }}>
                  <span style={{ color: '#ef4444', fontSize: 10 }}>✕</span>
                  <span style={{ fontFamily: HI, fontSize: 10, color: '#fff', fontWeight: 700 }}>{k}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── SPECIES + INDICATION ─────────────────────────────────────── */}
          <div style={{
            display: 'flex', background: T.pale,
            padding: '10px 20px', gap: 14, alignItems: 'center',
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontFamily: BAR, fontSize: 10, color: T.bg2, fontWeight: 700, letterSpacing: 1 }}>
                FOR ANIMALS :
              </span>
              <div style={{ display: 'flex', gap: 8 }}>
                {species.map((sp, i) => (
                  <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                    <span style={{ fontSize: 22 }}>{SPECIES_EMOJI[sp] ?? '🐾'}</span>
                    <span style={{ fontFamily: HI, fontSize: 9, color: T.bg1, fontWeight: 700 }}>
                      {SPECIES_HI[sp] ?? sp}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            {indication.length > 0 && (
              <div style={{
                display: 'flex', flexDirection: 'column', flex: 1,
                borderLeft: `3px solid ${T.accent}`, paddingLeft: 12,
              }}>
                <span style={{ fontFamily: BAR, fontSize: 10, color: T.bg2, fontWeight: 700, letterSpacing: 1, marginBottom: 4 }}>
                  USE FOR :
                </span>
                {indication.slice(0, 2).map((ind, i) => (
                  <span key={i} style={{ fontFamily: BAR, fontSize: 11, color: '#374151', fontWeight: 600 }}>
                    • {ind}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* ── CTA STRIP ────────────────────────────────────────────────── */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            background: T.bg2, padding: '12px 20px',
          }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontFamily: HI, fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>
                सभी उत्पाद देखें
              </span>
              <span style={{ fontFamily: OW, fontSize: 18, color: '#fff', fontWeight: 700, letterSpacing: 1 }}>
                madvet.in/products
              </span>
            </div>
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              background: T.accent, borderRadius: 10, padding: '10px 20px',
            }}>
              <span style={{ fontFamily: HI, fontSize: 15, color: T.bg1, fontWeight: 900 }}>अभी ऑर्डर करें</span>
              <span style={{ fontFamily: OW, fontSize: 11, color: T.bg1, fontWeight: 700 }}>📞 9935257750</span>
            </div>
          </div>

          {/* ── YELLOW FOOTER ────────────────────────────────────────────── */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            background: '#FFD700', padding: '14px 20px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                background: '#fff', borderRadius: 10, width: 52, height: 52,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              }}>
                {logoURI
                  ? <img src={logoURI} width={44} height={44} style={{ objectFit: 'contain' }} />
                  : <div style={{ display: 'flex', fontSize: 28 }}>🐾</div>
                }
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontFamily: OW, fontSize: 30, fontWeight: 900, color: '#1a2f8a', letterSpacing: 3, lineHeight: 1 }}>
                  MADVET
                </span>
                <span style={{ fontFamily: BAR, fontSize: 11, color: '#1a2f8a', fontWeight: 700, letterSpacing: 1.5 }}>
                  Animal Healthcare
                </span>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
              <span style={{ fontFamily: BAR, fontSize: 9, color: '#1a2a5e', fontWeight: 700 }}>
                Ghaziabad (U.P.) | I.S.O. 9001:2013 COMPANY
              </span>
              <span style={{ fontFamily: BAR, fontSize: 9, color: '#333' }}>madvet.animal@gmail.com</span>
              <span style={{ fontFamily: BAR, fontSize: 9, color: '#333' }}>www.madvet.in | support@madvet.in</span>
              <span style={{ fontFamily: OW, fontSize: 12, fontWeight: 800, color: '#1a2f8a', marginTop: 2 }}>
                Customer Care: 9935257750
              </span>
            </div>
          </div>

        </div>
      ),
      { width: 540, height: 920, fonts }
    )
  } catch (err) {
    const msg = String(err?.message ?? err).slice(0, 200)
    console.error('[share-card] crash:', msg)
    return new ImageResponse(
      (
        <div style={{ display: 'flex', width: 540, height: 160, background: '#fee2e2', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <span style={{ fontSize: 13, color: '#991b1b', fontFamily: 'sans-serif' }}>
            Error: {msg}
          </span>
        </div>
      ),
      { width: 540, height: 160 }
    )
  }
}
