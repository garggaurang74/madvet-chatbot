// SAVE TO: app/api/share-card/[id]/route.tsx

import { ImageResponse } from 'next/og'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'edge'

// ── Category config: problem statement + mode of action + kill icons ─────────
const CAT_CONFIG: Record<string, {
  h: number; s: number; l: number
  accent: string; bg: string
  problem: string        // Hindi: "X से है परेशान?"
  solution: string       // Hindi: "Y करेगा समाधान"
  modeLabel: string      // "Unique Mode of Action" equivalent
  kills: string[]        // what it eliminates (shown as badges)
}> = {
  'Anthelmintic / Antiparasitic': {
    h: 158, s: 68, l: 28, accent: '#16a34a', bg: '#e8f5e9',
    problem: 'पेट के कीड़ों से\nहै परेशान?',
    solution: 'करेगा समाधान',
    modeLabel: 'कैसे काम करता है',
    kills: ['गोल कीड़े', 'फीताकृमि', 'फेफड़े के कीड़े', 'खुजली के कीट'],
  },
  'Ectoparasiticide': {
    h: 42, s: 78, l: 28, accent: '#b45309', bg: '#fef3c7',
    problem: 'किलनी/चिचड़ी से\nहै परेशान?',
    solution: 'करेगा समाधान',
    modeLabel: 'Unique Mode of Action',
    kills: ['किलनी (Ticks)', 'जूँ (Lice)', 'खुजली के कीट', 'माइट्स'],
  },
  'Antibiotic': {
    h: 218, s: 72, l: 26, accent: '#1d4ed8', bg: '#eff6ff',
    problem: 'बुखार/संक्रमण से\nहै परेशान?',
    solution: 'करेगा समाधान',
    modeLabel: 'कार्यप्रणाली',
    kills: ['बैक्टीरिया', 'संक्रमण', 'बुखार', 'सूजन'],
  },
  'Anti-inflammatory / Analgesic': {
    h: 338, s: 78, l: 28, accent: '#be123c', bg: '#fff1f2',
    problem: 'दर्द/सूजन से\nहै परेशान?',
    solution: 'देगा राहत',
    modeLabel: 'कार्यप्रणाली',
    kills: ['दर्द', 'सूजन', 'बुखार', 'जकड़न'],
  },
  'Vitamin Supplement': {
    h: 22, s: 85, l: 30, accent: '#c2410c', bg: '#fff7ed',
    problem: 'दूध कम हो गया\nकमज़ोरी है?',
    solution: 'करेगा सुधार',
    modeLabel: 'कैसे काम करता है',
    kills: ['कमज़ोरी', 'दूध में कमी', 'भूख कम', 'थकान'],
  },
  'Vitamin Supplement / Galactogogue': {
    h: 210, s: 80, l: 26, accent: '#0369a1', bg: '#e0f2fe',
    problem: 'दूध उत्पादन\nकम हो गया?',
    solution: 'बढ़ाएगा दूध',
    modeLabel: 'कैसे काम करता है',
    kills: ['कम दूध', 'थनेला', 'कमज़ोरी', 'पोषण की कमी'],
  },
  'Probiotic': {
    h: 128, s: 65, l: 26, accent: '#15803d', bg: '#f0fdf4',
    problem: 'पाचन खराब है\nभूख नहीं लगती?',
    solution: 'करेगा सुधार',
    modeLabel: 'कैसे काम करता है',
    kills: ['दस्त', 'कब्ज', 'अफारा', 'खराब पाचन'],
  },
  'Dermatological': {
    h: 272, s: 58, l: 28, accent: '#7c3aed', bg: '#faf5ff',
    problem: 'चमड़ी रोग/खुजली\nसे है परेशान?',
    solution: 'करेगा ठीक',
    modeLabel: 'कार्यप्रणाली',
    kills: ['खुजली', 'ज़ख्म', 'फंगल', 'बैक्टीरियल'],
  },
  'Reproductive Hormone': {
    h: 295, s: 56, l: 26, accent: '#86198f', bg: '#fdf4ff',
    problem: 'प्रजनन समस्या\nहीट नहीं आती?',
    solution: 'करेगा सुधार',
    modeLabel: 'कार्यप्रणाली',
    kills: ['हीट न आना', 'गर्भधारण समस्या', 'हार्मोन असंतुलन', 'बांझपन'],
  },
  'Antihistamine': {
    h: 200, s: 68, l: 24, accent: '#0e7490', bg: '#ecfeff',
    problem: 'एलर्जी/सूजन से\nहै परेशान?',
    solution: 'देगा राहत',
    modeLabel: 'कार्यप्रणाली',
    kills: ['एलर्जी', 'सूजन', 'खुजली', 'लाली'],
  },
  'Antidiarrheal': {
    h: 168, s: 65, l: 24, accent: '#0f766e', bg: '#f0fdfa',
    problem: 'दस्त/पेचिश से\nहै परेशान?',
    solution: 'करेगा बंद',
    modeLabel: 'कार्यप्रणाली',
    kills: ['दस्त', 'पेचिश', 'बैक्टीरिया', 'डिहाइड्रेशन'],
  },
  'Udder Care / Herbal Antimicrobial': {
    h: 88, s: 60, l: 26, accent: '#4d7c0f', bg: '#f7fee7',
    problem: 'थनेला/थन रोग\nसे है परेशान?',
    solution: 'करेगा ठीक',
    modeLabel: 'कार्यप्रणाली',
    kills: ['थनेला', 'सूजन', 'बैक्टीरिया', 'दर्द'],
  },
  'Digestive / Antiflatulent': {
    h: 33, s: 78, l: 28, accent: '#b45309', bg: '#fffbeb',
    problem: 'अफारा/गैस से\nहै परेशान?',
    solution: 'करेगा राहत',
    modeLabel: 'कार्यप्रणाली',
    kills: ['अफारा', 'गैस', 'कब्ज', 'पेट दर्द'],
  },
}

function hsl(h: number, s: number, l: number) { return `hsl(${h},${s}%,${l}%)` }

function getColors(id: number, category: string) {
  const cfg = CAT_CONFIG[category]
  const base = cfg ?? { h: 220, s: 70, l: 26 }
  const shift = ((id * 37 + 13) % 41) - 20
  const h = (base.h + shift + 360) % 360
  return {
    dark:    hsl(h, base.s, base.l - 8),
    primary: hsl(h, base.s, base.l),
    mid:     hsl(h, base.s, base.l + 10),
    accent:  cfg?.accent ?? '#2563eb',
    bg:      cfg?.bg ?? '#f0f4ff',
  }
}

function splitBenefits(txt = '', max = 5) {
  return txt.split(/[•\n,;|]+/).map(s => s.trim()).filter(s => s.length > 5).slice(0, max)
}

function getSpeciesEmoji(sp: string): string {
  const M: Record<string, string> = {
    Cattle: '🐄 गाय', Buffalo: '🐃 भैंस', Sheep: '🐑 भेड़',
    Goat: '🐐 बकरी', Dog: '🐕 कुत्ता', Cat: '🐈 बिल्ली',
    Horse: '🐴 घोड़ा', Poultry: '🐓 मुर्गी', Calf: '🐮 बछड़ा',
  }
  return M[sp.trim()] ?? sp.trim()
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: rawId } = await params
  const id = parseInt(rawId, 10)
  if (isNaN(id)) return new Response('Invalid ID', { status: 400 })

  const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://ai.madvet.in').replace(/\/$/, '')

  // ── Fonts: try own domain first, fall back gracefully ──────────────────────
  let oswaldData: ArrayBuffer | null = null
  let notoData: ArrayBuffer | null = null
  let barlowData: ArrayBuffer | null = null
  try {
    const results = await Promise.allSettled([
      fetch(`${APP_URL}/fonts/oswald-bold.woff`,       { cache: 'force-cache' }).then(r => r.ok ? r.arrayBuffer() : null),
      fetch(`${APP_URL}/fonts/noto-devanagari.woff`,   { cache: 'force-cache' }).then(r => r.ok ? r.arrayBuffer() : null),
      fetch(`${APP_URL}/fonts/barlow-condensed.woff`,  { cache: 'force-cache' }).then(r => r.ok ? r.arrayBuffer() : null),
    ])
    oswaldData = results[0].status === 'fulfilled' ? results[0].value : null
    notoData   = results[1].status === 'fulfilled' ? results[1].value : null
    barlowData = results[2].status === 'fulfilled' ? results[2].value : null
  } catch { /* fonts unavailable — render with system fonts */ }


  const fonts = [
    ...(oswaldData  ? [{ name: 'Oswald',    data: oswaldData,  weight: 700 as const, style: 'normal' as const }] : []),
    ...(notoData    ? [{ name: 'NotoHindi', data: notoData,    weight: 600 as const, style: 'normal' as const }] : []),
    ...(barlowData  ? [{ name: 'Barlow',    data: barlowData,  weight: 400 as const, style: 'normal' as const }] : []),
  ]

  const OW  = oswaldData  ? '"Oswald"'    : 'sans-serif'
  const HI  = notoData    ? '"NotoHindi"' : 'sans-serif'
  const BAR = barlowData  ? '"Barlow"'    : 'sans-serif'

  // ── Fetch product ──────────────────────────────────────────────────────────
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const table = (process.env.NEXT_PUBLIC_SUPABASE_TABLE ?? 'products_enriched').trim()
  const { data, error } = await supabase.from(table).select('*').eq('id', id).single()
  if (error || !data) return new Response('Product not found', { status: 404 })

  const p           = data
  const name        = (p.product_name ?? p.name ?? '') as string
  const category    = (p.category ?? '') as string
  const salt        = (p.salt_ingredient ?? p.salt ?? '') as string
  const packaging   = (p.packaging ?? '') as string
  const form        = (p.formulation ?? '') as string
  const imageUrl    = (p.image_url ?? '') as string
  const bHi         = splitBenefits(p.usp_benefits_hi ?? p.usp_benefits ?? '', 5)
  const bEn         = splitBenefits(p.usp_benefits ?? '', 5)
  const speciesArr  = (p.species ?? '').split(/[,/]/).map((s: string) => s.trim()).filter(Boolean).slice(0, 6)
  const cfg         = CAT_CONFIG[category]
  const c           = getColors(id, category)
  const catShort    = category.split('/')[0].trim()
  const nameFontSize = name.length > 18 ? 32 : name.length > 13 ? 40 : name.length > 9 ? 48 : 56

  // Problem statement lines
  const problemLines = (cfg?.problem ?? 'पशु की बीमारी\nसे है परेशान?').split('\n')
  const solutionLine = name + ' ' + (cfg?.solution ?? 'करेगा सुधार')
  const killItems    = cfg?.kills ?? bEn.slice(0, 4).map(b => b.split(' ').slice(0, 3).join(' '))
  const modeLabel    = cfg?.modeLabel ?? 'कार्यप्रणाली'

  const card = (
    <div style={{ display: 'flex', flexDirection: 'column', width: 500, backgroundColor: '#dbeafe', fontFamily: BAR }}>

      {/* ═══ TOP HEADER BAND ═══ */}
      <div style={{ display: 'flex', flexDirection: 'column', background: `linear-gradient(180deg, #bfdbfe 0%, #dbeafe 100%)`, padding: '16px 18px 14px' }}>

        {/* Row: logo | packaging badge */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ background: '#fff', borderRadius: 50, width: 58, height: 58, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #cbd5e1' }}>
            <img src={`${APP_URL}/madvet-icon.png`} width={48} height={48} style={{ objectFit: 'contain' }} />
          </div>
          <div style={{ background: '#991b1b', borderRadius: 24, padding: '6px 18px', display: 'flex', alignItems: 'center' }}>
            <span style={{ fontFamily: OW, fontSize: 15, fontWeight: 700, color: '#fff' }}>{packaging}</span>
          </div>
        </div>

        {/* Salt / ingredient */}
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 10 }}>
          <span style={{ fontFamily: BAR, fontSize: 13, color: '#1e3a5f', fontWeight: 700, letterSpacing: 0.3 }}>{salt}</span>
        </div>

        {/* PRODUCT NAME — huge, with shadow effect via layered text */}
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 4 }}>
          <span style={{
            fontFamily: OW, fontSize: nameFontSize, fontWeight: 700,
            color: '#7f1d1d',
            
            letterSpacing: 1,
          }}>{name}</span>
        </div>

        {/* Formulation + species tagline */}
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 4 }}>
          <span style={{ fontFamily: BAR, fontSize: 12, color: '#1e3a5f', fontWeight: 700 }}>
            {form} — For {catShort} · {speciesArr.join(', ')}
          </span>
        </div>
      </div>

      {/* ═══ MAIN BODY: Hindi problem | Mode of action ═══ */}
      <div style={{ display: 'flex', background: `linear-gradient(180deg, #dbeafe 0%, #eff6ff 100%)`, padding: '14px 16px', gap: 14 }}>

        {/* LEFT: Hindi problem → solution */}
        <div style={{ display: 'flex', flexDirection: 'column', width: 180, alignItems: 'flex-start', gap: 4 }}>
          {/* Problem in red Hindi — just like the flyer */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {problemLines.map((line: string, i: number) => (
              <span key={i} style={{ fontFamily: HI, fontSize: 22, color: '#dc2626', fontWeight: 800, lineHeight: 1.25 }}>{line}</span>
            ))}
          </div>
          {/* Solution in red Hindi */}
          <div style={{ display: 'flex', flexDirection: 'column', marginTop: 6 }}>
            <span style={{ fontFamily: HI, fontSize: 20, color: '#dc2626', fontWeight: 800, lineHeight: 1.3 }}>{name}</span>
            <span style={{ fontFamily: HI, fontSize: 20, color: '#dc2626', fontWeight: 800, lineHeight: 1.3 }}>{cfg?.solution ?? 'करेगा समाधान'}</span>
          </div>

          {/* Product image below problem statement */}
          <div style={{ width: 160, height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 10 }}>
            {imageUrl
              ? <img src={imageUrl} width={148} height={148} style={{ objectFit: 'contain' }} />
              : <span style={{ fontSize: 60 }}>{form === 'Injection' ? '💉' : form === 'Bolus' ? '💊' : '🧴'}</span>
            }
          </div>
        </div>

        {/* RIGHT: Mode of action */}
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: 8 }}>
          {/* Mode of action header — dark blue box like the flyer */}
          <div style={{ background: '#1e3a8a', borderRadius: 8, padding: '8px 12px', display: 'flex' }}>
            <span style={{ fontFamily: BAR, fontSize: 13, color: '#fff', fontWeight: 700, lineHeight: 1.3 }}>
              {modeLabel} :
            </span>
          </div>

          {/* Benefits with diamond bullets */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {bEn.map((b: string, i: number) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                <span style={{ color: '#dc2626', fontSize: 14, flexShrink: 0, marginTop: 1 }}>◆</span>
                <span style={{ fontFamily: BAR, fontSize: 12, color: '#1e293b', lineHeight: 1.4, fontWeight: 600 }}>{b}</span>
              </div>
            ))}
          </div>

          {/* "What it kills" pill badges — like the crossed-out pest icons */}
          <div style={{ display: 'flex', flexWrap: 'nowrap', gap: 5, marginTop: 6 }}>
            {killItems.slice(0, 4).map((k: string, i: number) => (
              <div key={i} style={{ display: 'flex', background: '#fee2e2', borderRadius: 20, padding: '4px 9px', border: '1.5px solid #fca5a5', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: 11, color: '#dc2626' }}>✕</span>
                <span style={{ fontFamily: HI, fontSize: 9.5, color: '#991b1b', fontWeight: 700 }}>{k}</span>
              </div>
            ))}
          </div>

          {/* Hindi benefits */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
            {bHi.slice(0, 3).map((b: string, i: number) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, background: 'rgba(255,255,255,0.7)', borderRadius: 6, padding: '5px 8px' }}>
                <span style={{ fontFamily: HI, fontSize: 11, color: '#1e3a8a', fontWeight: 700, lineHeight: 1.4 }}>✓ {b}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ═══ SPECIES STRIP ═══ */}
      <div style={{ display: 'flex', alignItems: 'center', background: '#1e3a8a', padding: '8px 18px', gap: 8 }}>
        <span style={{ fontFamily: HI, fontSize: 10, color: 'rgba(255,255,255,0.7)', flexShrink: 0 }}>उपयोग:</span>
        <div style={{ display: 'flex', gap: 10, flex: 1 }}>
          {speciesArr.map((sp: string, i: number) => (
            <span key={i} style={{ fontFamily: HI, fontSize: 11, color: '#fff', fontWeight: 700 }}>{getSpeciesEmoji(sp)}</span>
          ))}
        </div>
        <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 20, padding: '3px 12px', border: '1px solid rgba(255,255,255,0.3)', display: 'flex' }}>
          <span style={{ fontFamily: OW, fontSize: 9, color: '#fff', letterSpacing: 1 }}>{form.toUpperCase()}</span>
        </div>
      </div>

      {/* ═══ ORDER CTA ═══ */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#111827', padding: '10px 18px' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontFamily: HI, fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>सभी उत्पाद देखें</span>
          <span style={{ fontFamily: OW, fontSize: 14, color: '#fff', fontWeight: 700 }}>madvet.in/products</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: c.accent, borderRadius: 8, padding: '6px 16px' }}>
          <span style={{ fontFamily: HI, fontSize: 12, color: '#fff', fontWeight: 700 }}>अभी ऑर्डर करें</span>
          <span style={{ fontFamily: BAR, fontSize: 9, color: 'rgba(255,255,255,0.85)' }}>Order Now · 9935257750</span>
        </div>
      </div>

      {/* ═══ FOOTER — yellow, matches official flyer ═══ */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#FFD700', padding: '12px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ background: '#fff', borderRadius: 8, width: 46, height: 46, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img src={`${APP_URL}/madvet-icon.png`} width={40} height={40} style={{ objectFit: 'contain' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontFamily: OW, fontSize: 26, fontWeight: 900, color: '#1a2f8a', letterSpacing: 2.5, lineHeight: 1 }}>MADVET</span>
            <span style={{ fontFamily: BAR, fontSize: 9, color: '#1a2f8a', letterSpacing: 1.2, fontWeight: 700 }}>Animal Healthcare</span>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
          <span style={{ fontFamily: BAR, fontSize: 8, color: '#111' }}>Ghaziabad (U.P.) | AN I.S.O. 9001:2013 COMPANY</span>
          <span style={{ fontFamily: BAR, fontSize: 8, color: '#333' }}>Email: madvet.animal@gmail.com | web: www.madvet.in</span>
          <span style={{ fontFamily: BAR, fontSize: 9, fontWeight: 800, color: '#1a2f8a', marginTop: 2 }}>Customer Care: support@madvet.in</span>
        </div>
      </div>

    </div>
  )

  return new ImageResponse(card, {
    width: 500,
    height: 820,
    fonts,
  })
}
