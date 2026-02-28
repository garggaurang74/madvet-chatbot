// @ts-nocheck
// SAVE TO: app/api/share-card/[id]/route.tsx
// Fonts are fetched from Google at runtime — no local font files needed

import { ImageResponse } from 'next/og'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

// ── Font cache (one fetch per cold start) ────────────────────────────────────
type FontEntry = { name: string; data: ArrayBuffer; weight: number; style: 'normal' | 'italic' }
let cachedFonts: FontEntry[] | null = null

async function loadFonts(): Promise<FontEntry[]> {
  if (cachedFonts) return cachedFonts
  try {
    const cssResp = await fetch(
      'https://fonts.googleapis.com/css2?family=Oswald:wght@700&family=Noto+Sans+Devanagari:wght@600&family=Barlow+Condensed:wght@400&display=swap',
      { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; NextJS/15)' }, signal: AbortSignal.timeout(7000) }
    )
    if (!cssResp.ok) return []
    const css = await cssResp.text()

    // Parse @font-face blocks → extract first URL per family
    const seen = new Set<string>()
    const toFetch: { family: string; url: string }[] = []
    for (const block of css.split('@font-face')) {
      const fm = block.match(/font-family:\s*['"]?([^'"\n;]+)['"]?/)
      const um = block.match(/src:[^;]*url\(([^)]+)\)/)
      if (!fm || !um) continue
      const family = fm[1].trim()
      if (seen.has(family)) continue
      seen.add(family)
      toFetch.push({ family, url: um[1].trim() })
    }

    const weightMap: Record<string, number> = {
      'Oswald': 700,
      'Noto Sans Devanagari': 600,
      'Barlow Condensed': 400,
    }

    const results = await Promise.allSettled(
      toFetch.map(async ({ family, url }) => {
        const r = await fetch(url, { signal: AbortSignal.timeout(7000) })
        if (!r.ok) throw new Error(`HTTP ${r.status} for ${family}`)
        const data = await r.arrayBuffer()
        // Validate magic bytes — woff/woff2/otf/ttf
        const bytes = new Uint8Array(data.slice(0, 4))
        const sig = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3])
        if (!sig.startsWith('wOFF') && !(bytes[0] === 0 && bytes[1] === 1)) {
          throw new Error(`Invalid font data for ${family}`)
        }
        return { name: family, data, weight: weightMap[family] ?? 400, style: 'normal' as const }
      })
    )

    cachedFonts = results
      .filter(r => r.status === 'fulfilled')
      .map(r => (r as PromiseFulfilledResult<FontEntry>).value)

    console.log('[share-card] fonts loaded:', cachedFonts.map(f => `${f.name}(${f.data.byteLength}b)`))
    return cachedFonts
  } catch (e) {
    console.warn('[share-card] font load failed, using system fonts:', e)
    return []
  }
}

// ── Category config ───────────────────────────────────────────────────────────
const CAT: Record<string, { bgTop: string; bgBot: string; accent: string; problem: string; solution: string; kills: string[] }> = {
  'Anthelmintic / Antiparasitic': { bgTop: '#bbf7d0', bgBot: '#f0fdf4', accent: '#16a34a', problem: 'पेट के कीड़ों से\nहै परेशान?', solution: 'करेगा समाधान', kills: ['गोल कीड़े', 'फीताकृमि', 'फेफड़े कीड़े', 'माइट्स'] },
  'Ectoparasiticide':             { bgTop: '#bae6fd', bgBot: '#e0f2fe', accent: '#0369a1', problem: 'किलनी / चिचड़ी से\nहै परेशान?', solution: 'करेगा समाधान', kills: ['किलनी (Ticks)', 'जूँ (Lice)', 'माइट्स', 'मक्खी'] },
  'Antibiotic':                   { bgTop: '#bfdbfe', bgBot: '#eff6ff', accent: '#1d4ed8', problem: 'बुखार / संक्रमण से\nहै परेशान?', solution: 'करेगा समाधान', kills: ['बैक्टीरिया', 'संक्रमण', 'बुखार', 'सूजन'] },
  'Anti-inflammatory / Analgesic':{ bgTop: '#fecdd3', bgBot: '#fff1f2', accent: '#be123c', problem: 'दर्द / सूजन से\nहै परेशान?', solution: 'देगा राहत', kills: ['दर्द', 'सूजन', 'बुखार', 'जकड़न'] },
  'Vitamin Supplement':           { bgTop: '#fed7aa', bgBot: '#fff7ed', accent: '#c2410c', problem: 'दूध कम / कमज़ोरी\nहै परेशान?', solution: 'करेगा सुधार', kills: ['कमज़ोरी', 'दूध में कमी', 'भूख कम', 'थकान'] },
  'Vitamin Supplement / Galactogogue': { bgTop: '#bae6fd', bgBot: '#e0f2fe', accent: '#0369a1', problem: 'दूध उत्पादन\nकम हो गया?', solution: 'बढ़ाएगा दूध', kills: ['कम दूध', 'थनेला', 'कमज़ोरी', 'पोषण कमी'] },
  'Probiotic':                    { bgTop: '#bbf7d0', bgBot: '#f0fdf4', accent: '#15803d', problem: 'पाचन खराब /\nभूख नहीं लगती?', solution: 'करेगा सुधार', kills: ['दस्त', 'कब्ज', 'अफारा', 'खराब पाचन'] },
  'Dermatological':               { bgTop: '#e9d5ff', bgBot: '#faf5ff', accent: '#7c3aed', problem: 'चमड़ी रोग / खुजली\nसे है परेशान?', solution: 'करेगा ठीक', kills: ['खुजली', 'ज़ख्म', 'फंगल', 'बैक्टीरियल'] },
  'Reproductive Hormone':         { bgTop: '#f0abfc', bgBot: '#fdf4ff', accent: '#86198f', problem: 'हीट नहीं आती /\nप्रजनन समस्या?', solution: 'करेगा सुधार', kills: ['हीट न आना', 'गर्भधारण', 'हार्मोन असंतुलन', 'बांझपन'] },
  'Antihistamine':                { bgTop: '#a5f3fc', bgBot: '#ecfeff', accent: '#0e7490', problem: 'एलर्जी / सूजन से\nहै परेशान?', solution: 'देगा राहत', kills: ['एलर्जी', 'सूजन', 'खुजली', 'लाली'] },
  'Antidiarrheal':                { bgTop: '#99f6e4', bgBot: '#f0fdfa', accent: '#0f766e', problem: 'दस्त / पेचिश से\nहै परेशान?', solution: 'करेगा बंद', kills: ['दस्त', 'पेचिश', 'बैक्टीरिया', 'डिहाइड्रेशन'] },
  'Udder Care / Herbal Antimicrobial': { bgTop: '#d9f99d', bgBot: '#f7fee7', accent: '#4d7c0f', problem: 'थनेला / थन रोग\nसे है परेशान?', solution: 'करेगा ठीक', kills: ['थनेला', 'सूजन', 'बैक्टीरिया', 'दर्द'] },
  'Digestive / Antiflatulent':    { bgTop: '#fde68a', bgBot: '#fffbeb', accent: '#b45309', problem: 'अफारा / गैस से\nहै परेशान?', solution: 'देगा राहत', kills: ['अफारा', 'गैस', 'कब्ज', 'पेट दर्द'] },
}

const SPECIES: Record<string, string> = {
  Cattle: '🐄 गाय', Buffalo: '🐃 भैंस', Sheep: '🐑 भेड़', Goat: '🐐 बकरी',
  Dog: '🐕 कुत्ता', Cat: '🐈 बिल्ली', Horse: '🐴 घोड़ा', Poultry: '🐓 मुर्गी', Calf: '🐮 बछड़ा'
}

function benefits(txt = '', max = 5) {
  return txt.split(/[•\n,;|]+/).map((s: string) => s.trim()).filter((s: string) => s.length > 5).slice(0, max)
}

async function toDataURI(url: string): Promise<string | null> {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(5000) })
    if (!r.ok) return null
    const ct = r.headers.get('content-type') || ''
    // Reject HTML error pages served as 200
    if (ct.includes('text/html') || ct.includes('text/plain')) return null
    const buf = Buffer.from(await r.arrayBuffer())
    // Validate image magic bytes
    const sig = buf.slice(0, 4)
    const isJPG = sig[0] === 0xFF && sig[1] === 0xD8
    const isPNG = sig[0] === 0x89 && sig[1] === 0x50
    const isWEBP = sig.toString('ascii', 0, 4) === 'RIFF'
    const isGIF = sig.toString('ascii', 0, 3) === 'GIF'
    if (!isJPG && !isPNG && !isWEBP && !isGIF) return null
    const mimeType = isJPG ? 'image/jpeg' : isPNG ? 'image/png' : isWEBP ? 'image/webp' : 'image/gif'
    return `data:${mimeType};base64,${buf.toString('base64')}`
  } catch { return null }
}

// ── GET handler ───────────────────────────────────────────────────────────────
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await params
  const id = parseInt(rawId, 10)
  if (isNaN(id)) return new Response('Bad ID', { status: 400 })

  const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://ai.madvet.in').replace(/\/$/, '')
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
  const table = (process.env.NEXT_PUBLIC_SUPABASE_TABLE ?? 'products_enriched').trim()

  const [fonts, { data, error }, iconURI] = await Promise.all([
    loadFonts(),
    sb.from(table).select('*').eq('id', id).single(),
    toDataURI(`${APP_URL}/madvet-icon.png`),
  ])

  if (error || !data) return new Response('Not found', { status: 404 })

  // Sanitize all strings — prevent Satori crashing on special chars or excessive length
  const clean = (v: unknown, max = 120) => String(v ?? '').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').slice(0, max)
  const name     = clean(data.product_name ?? data.name, 60)
  const category = clean(data.category, 80)
  const salt     = clean(data.salt_ingredient ?? data.salt, 100)
  const packaging= clean(data.packaging, 40)
  const form     = clean(data.formulation, 40)
  const imgUrl   = clean(data.image_url, 500)
  const bHi      = benefits(clean(data.usp_benefits_hi ?? data.usp_benefits, 800), 5)
  const bEn      = benefits(clean(data.usp_benefits, 800), 5)
  const spp      = clean(data.species, 200).split(/[,\/]/).map((s: string) => s.trim()).filter(Boolean).slice(0, 6)

  // Fetch product image — isolated so a failure never crashes the whole card
  let productURI: string | null = null
  if (imgUrl) {
    try { productURI = await toDataURI(imgUrl) } catch { productURI = null }
  }

  const cfg = CAT[category]
  const bgTop   = cfg?.bgTop   ?? '#bfdbfe'
  const bgBot   = cfg?.bgBot   ?? '#eff6ff'
  const accent  = cfg?.accent  ?? '#1d4ed8'
  const pLines  = (cfg?.problem ?? 'पशु की बीमारी\nसे है परेशान?').split('\n')
  const solution= cfg?.solution ?? 'करेगा समाधान'
  const kills   = cfg?.kills ?? bEn.slice(0, 4)
  const nfs     = name.length > 18 ? 28 : name.length > 13 ? 36 : name.length > 9 ? 44 : 52

  const OW  = fonts.some(f => f.name === 'Oswald')                ? '"Oswald", sans-serif'                : '"Arial Black", sans-serif'
  const HI  = fonts.some(f => f.name.includes('Devanagari'))      ? '"Noto Sans Devanagari", sans-serif'  : 'sans-serif'
  const BAR = fonts.some(f => f.name.includes('Barlow'))          ? '"Barlow Condensed", sans-serif'      : '"Arial Narrow", sans-serif'

  try {
    return new ImageResponse(
      (
        <div style={{ display: 'flex', flexDirection: 'column', width: 520, backgroundColor: bgBot }}>

          {/* HEADER */}
          <div style={{ display: 'flex', flexDirection: 'column', background: `linear-gradient(180deg,${bgTop},${bgBot})`, padding: '16px 20px 12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ background: '#fff', borderRadius: 50, width: 60, height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #cbd5e1' }}>
                {iconURI ? <img src={iconURI} width={50} height={50} style={{ objectFit: 'contain' }} /> : <div style={{ display: 'flex', fontSize: 30 }}>🐾</div>}
              </div>
              <div style={{ background: '#991b1b', borderRadius: 28, padding: '8px 20px', display: 'flex' }}>
                <span style={{ fontFamily: OW, fontSize: 16, fontWeight: 700, color: '#fff' }}>{packaging}</span>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 10 }}>
              <span style={{ fontFamily: BAR, fontSize: 13, color: '#1e3a5f', fontWeight: 700 }}>{salt}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 4 }}>
              <span style={{ fontFamily: OW, fontSize: nfs, fontWeight: 700, color: '#7f1d1d', letterSpacing: 1 }}>{name}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 5 }}>
              <span style={{ fontFamily: BAR, fontSize: 12, color: '#1e3a5f', fontWeight: 700 }}>{form} · {spp.slice(0, 4).join(', ')}</span>
            </div>
          </div>

          {/* BODY */}
          <div style={{ display: 'flex', background: `linear-gradient(180deg,${bgBot},#f8fafc)`, padding: '16px 18px', gap: 16 }}>

            {/* LEFT */}
            <div style={{ display: 'flex', flexDirection: 'column', width: 188 }}>
              {pLines.map((line: string, i: number) => (
                <span key={i} style={{ fontFamily: HI, fontSize: 23, color: '#dc2626', fontWeight: 800, lineHeight: 1.25 }}>{line}</span>
              ))}
              <span style={{ fontFamily: HI, fontSize: 21, color: '#dc2626', fontWeight: 800, lineHeight: 1.3, marginTop: 10 }}>{name}</span>
              <span style={{ fontFamily: HI, fontSize: 21, color: '#dc2626', fontWeight: 800, lineHeight: 1.3 }}>{solution}</span>
              <div style={{ width: 180, height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 12 }}>
                {productURI
                  ? <img src={productURI} width={172} height={172} style={{ objectFit: 'contain' }} />
                  : <div style={{ display: 'flex', fontSize: 80 }}>{form === 'Injection' ? '💉' : form === 'Bolus' ? '💊' : '🧴'}</div>
                }
              </div>
            </div>

            {/* RIGHT */}
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: 8 }}>
              <div style={{ background: '#1e3a8a', borderRadius: 8, padding: '9px 13px', display: 'flex' }}>
                <span style={{ fontFamily: BAR, fontSize: 14, color: '#fff', fontWeight: 700, fontStyle: 'italic' }}>Unique Mode of Action :</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {bEn.slice(0, 5).map((b: string, i: number) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                    <span style={{ color: '#dc2626', fontSize: 13, flexShrink: 0, marginTop: 2 }}>◆</span>
                    <span style={{ fontFamily: BAR, fontSize: 12, color: '#1e293b', lineHeight: 1.4, fontWeight: 600 }}>{b}</span>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 4 }}>
                {kills.slice(0, 4).map((k: string, i: number) => (
                  <div key={i} style={{ display: 'flex', background: '#fee2e2', borderRadius: 20, padding: '3px 8px', border: '1.5px solid #fca5a5', alignItems: 'center', gap: 3 }}>
                    <span style={{ fontSize: 10, color: '#dc2626' }}>✕</span>
                    <span style={{ fontFamily: HI, fontSize: 9, color: '#991b1b', fontWeight: 700 }}>{k}</span>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 2 }}>
                {bHi.slice(0, 3).map((b: string, i: number) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', background: 'rgba(255,255,255,0.85)', borderRadius: 6, padding: '5px 9px' }}>
                    <span style={{ fontFamily: HI, fontSize: 11, color: '#1e3a8a', fontWeight: 700, lineHeight: 1.4 }}>✓ {b}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* SPECIES */}
          <div style={{ display: 'flex', alignItems: 'center', background: '#1e3a8a', padding: '9px 20px', gap: 10 }}>
            <span style={{ fontFamily: HI, fontSize: 10, color: 'rgba(255,255,255,0.5)', flexShrink: 0 }}>उपयोग :</span>
            <div style={{ display: 'flex', gap: 10, flex: 1 }}>
              {spp.map((sp: string, i: number) => (
                <span key={i} style={{ fontFamily: HI, fontSize: 11, color: '#fff', fontWeight: 700 }}>{SPECIES[sp] ?? sp}</span>
              ))}
            </div>
            <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 20, padding: '3px 11px', display: 'flex' }}>
              <span style={{ fontFamily: OW, fontSize: 9, color: '#fff', letterSpacing: 1 }}>{form.toUpperCase()}</span>
            </div>
          </div>

          {/* CTA */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0f172a', padding: '11px 20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontFamily: HI, fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>सभी उत्पाद देखें</span>
              <span style={{ fontFamily: OW, fontSize: 16, color: '#fff', fontWeight: 700 }}>madvet.in/products</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: accent, borderRadius: 9, padding: '8px 18px' }}>
              <span style={{ fontFamily: HI, fontSize: 13, color: '#fff', fontWeight: 700 }}>अभी ऑर्डर करें</span>
              <span style={{ fontFamily: BAR, fontSize: 10, color: 'rgba(255,255,255,0.85)' }}>📞 9935257750</span>
            </div>
          </div>

          {/* YELLOW FOOTER */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#FFD700', padding: '13px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
              <div style={{ background: '#fff', borderRadius: 8, width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {iconURI ? <img src={iconURI} width={42} height={42} style={{ objectFit: 'contain' }} /> : <div style={{ display: 'flex', fontSize: 26 }}>🐾</div>}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontFamily: OW, fontSize: 27, fontWeight: 900, color: '#1a2f8a', letterSpacing: 3, lineHeight: 1 }}>MADVET</span>
                <span style={{ fontFamily: BAR, fontSize: 10, color: '#1a2f8a', letterSpacing: 1.5, fontWeight: 700 }}>Animal Healthcare</span>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
              <span style={{ fontFamily: BAR, fontSize: 9, color: '#111' }}>Ghaziabad (U.P.) | I.S.O. 9001:2013 COMPANY</span>
              <span style={{ fontFamily: BAR, fontSize: 9, color: '#333' }}>Email: madvet.animal@gmail.com</span>
              <span style={{ fontFamily: BAR, fontSize: 9, color: '#333' }}>www.madvet.in | support@madvet.in</span>
              <span style={{ fontFamily: OW, fontSize: 11, fontWeight: 800, color: '#1a2f8a', marginTop: 2 }}>Customer Care: 9935257750</span>
            </div>
          </div>

        </div>
      ),
      { width: 520, height: 860, fonts: fonts as Parameters<typeof ImageResponse>[1]['fonts'] }
    )
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[share-card] render error:', msg)
    return new ImageResponse(
      (
        <div style={{ display: 'flex', width: 520, height: 200, background: '#fee2e2', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <span style={{ fontSize: 13, color: '#991b1b', fontFamily: 'sans-serif', lineHeight: 1.6 }}>
            Render error (check Vercel logs): {msg.slice(0, 220)}
          </span>
        </div>
      ),
      { width: 520, height: 200 }
    )
  }
}
