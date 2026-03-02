// @ts-nocheck
// app/api/share-card/[id]/route.tsx
// NO font loading — uses system fonts, guaranteed to work

import React from 'react'
import { ImageResponse } from 'next/og'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const maxDuration = 30

async function imgURI(url) {
  if (!url) return null
  try {
    const r = await fetch(url.includes('supabase') ? url + '?width=400&quality=85' : url, { signal: AbortSignal.timeout(5000) })
    if (!r.ok) return null
    const ct = r.headers.get('content-type') || ''
    if (ct.includes('html') || ct.includes('text')) return null
    const buf = Buffer.from(await r.arrayBuffer())
    if (buf[0] === 0xFF && buf[1] === 0xD8) return `data:image/jpeg;base64,${buf.toString('base64')}`
    if (buf[0] === 0x89 && buf[1] === 0x50) return `data:image/png;base64,${buf.toString('base64')}`
    return `data:image/webp;base64,${buf.toString('base64')}`
  } catch { return null }
}

const CAT_PALETTES = {
  'Vitamin Supplement':                { h:22,  s:85, l:32 },
  'Vitamin Supplement / Galactogogue': { h:210, s:80, l:28 },
  'Antibiotic':                        { h:218, s:72, l:26 },
  'Anti-inflammatory / Analgesic':     { h:338, s:78, l:30 },
  'Anthelmintic / Antiparasitic':      { h:158, s:70, l:26 },
  'Probiotic':                         { h:128, s:65, l:28 },
  'Dermatological':                    { h:272, s:60, l:30 },
  'Ectoparasiticide':                  { h:42,  s:80, l:30 },
  'Reproductive Hormone':              { h:295, s:58, l:28 },
  'Antihistamine':                     { h:200, s:68, l:26 },
  'Antidiarrheal':                     { h:168, s:65, l:26 },
  'Udder Care / Herbal Antimicrobial': { h:88,  s:62, l:28 },
  'Digestive / Antiflatulent':         { h:33,  s:78, l:30 },
}

const CAT_NORMALIZE = {
  'Anti-inflammatory': 'Anti-inflammatory / Analgesic',
  'Anti-inflammatory, Analgesic, Antipyretic': 'Anti-inflammatory / Analgesic',
  'Anti-inflammatory / Analgesic / Antipyretic': 'Anti-inflammatory / Analgesic',
  'Analgesic / Antipyretic': 'Anti-inflammatory / Analgesic',
  'Analgesic, Antipyretic': 'Anti-inflammatory / Analgesic',
  'Analgesic': 'Anti-inflammatory / Analgesic',
  'Anthelmintic': 'Anthelmintic / Antiparasitic',
  'Antiparasitic': 'Anthelmintic / Antiparasitic',
  'Antibiotic (Cephalosporin)': 'Antibiotic',
  'Antibiotic (Fluoroquinolone)': 'Antibiotic',
  'Antihistamine / Anti-allergic': 'Antihistamine',
  'Dermatological / Topical': 'Dermatological',
  'Probiotic / Immunomodulator / Vitamin Supplement': 'Probiotic',
  'Antidiarrheal / Gastrointestinal': 'Antidiarrheal',
}

function hslToRgb(h, s, l) {
  s /= 100; l /= 100
  const k = n => (n + h / 30) % 12
  const a = s * Math.min(l, 1 - l)
  const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
  return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)]
}

function getColors(id, category) {
  const base = CAT_PALETTES[category] ?? { h: 220, s: 70, l: 28 }
  const shift = ((id * 37 + 13) % 41) - 20
  const h = (base.h + shift + 360) % 360
  const { s, l } = base
  const [r, g, b] = hslToRgb(h, s, l)
  const [rb, gb, bb] = hslToRgb(h, s, l + 14)
  const [rd, gd, bd] = hslToRgb(h, s, l - 10)
  const [rdk, gdk, bdk] = hslToRgb(h, s, l - 18)
  const [rm, gm, bm] = hslToRgb(h, s, l + 7)
  return {
    primary: `rgb(${r},${g},${b})`,
    bright:  `rgb(${rb},${gb},${bb})`,
    dark:    `rgb(${rd},${gd},${bd})`,
    darkest: `rgb(${rdk},${gdk},${bdk})`,
    pale:    `hsl(${h},${s - 20}%,95%)`,
    mid:     `rgb(${rm},${gm},${bm})`,
    p15:     `rgba(${r},${g},${b},0.15)`,
    p20:     `rgba(${r},${g},${b},0.20)`,
    p25:     `rgba(${r},${g},${b},0.25)`,
    p30:     `rgba(${r},${g},${b},0.30)`,
    p12:     `rgba(${r},${g},${b},0.12)`,
    p40:     `rgba(${r},${g},${b},0.40)`,
    dk20:    `rgba(${rdk},${gdk},${bdk},0.20)`,
  }
}

const SP_EMOJI = { Cattle:'🐄', Buffalo:'🐃', Sheep:'🐑', Goat:'🐐', Dog:'🐕', Cat:'🐈', Poultry:'🐓', Horse:'🐴' }

function splitBenefits(txt = '') {
  return txt.split(/[•\n,;|।]+/).map(s => s.trim()).filter(s => s.length > 6)
}
function splitBenefitsSafe(hi = '', en = '') {
  const p = splitBenefits(hi)
  if (p.length >= 2) return p
  const e = splitBenefits(en)
  return e.length >= 2 ? e : (p.length ? p : e)
}

const HI_IND = {
  fever: 'बुखार में असरदार', pain: 'दर्द से जल्दी राहत', inflammation: 'सूजन कम करे',
  infection: 'संक्रमण से लड़े', mastitis: 'थनिका में कारगर', diarrhea: 'दस्त रोकने में कारगर',
  respiratory: 'श्वसन रोग में राहत', skin: 'त्वचा रोग में लाभकारी', milk: 'दूध उत्पादन बढ़ाए',
  vitamin: 'विटामिन की कमी दूर करे', worm: 'कृमि खत्म करे', calcium: 'कैल्शियम की कमी पूरी करे',
}

function augmentBenefits(hiList, enList, indication = '', minCount = 4) {
  if (hiList.length >= minCount) return { hi: hiList, en: enList }
  const needed = minCount - hiList.length
  const newHi = [], newEn = []
  const terms = (indication || '').split(',').map(s => s.trim().toLowerCase()).filter(s => s.length > 2)
  for (const term of terms) {
    if (newHi.length >= needed) break
    const entry = Object.entries(HI_IND).find(([k]) => term.includes(k))
    if (entry && !hiList.includes(entry[1])) { newHi.push(entry[1]); newEn.push(term) }
  }
  return { hi: [...hiList, ...newHi].slice(0, 5), en: [...enList, ...newEn].slice(0, 5) }
}

function getDescExcerpt(desc = '', max = 130) {
  if (!desc) return ''
  const f = desc.split(/\.\s+/)[0]
  const t = f.length <= max ? f : f.slice(0, max).replace(/\s\S+$/, '') + '…'
  return t.endsWith('.') ? t : t + '.'
}

function getIndTags(ind = '') {
  return ind.split(/[,،]+/).map(s => s.trim()).filter(s => s.length > 2 && s.length < 28 && /^[a-zA-Z\s\/\-]+$/.test(s)).slice(0, 4)
}

// ── SHARED COMPONENTS ─────────────────────────────────────────────────────────

function Header({ p, c, logoImg, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', background: `linear-gradient(135deg,${c.darkest} 0%,${c.primary} 60%,${c.bright} 100%)`, padding: '18px 22px 20px' }}>
      {/* Logo row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ background: '#fff', borderRadius: 8, padding: 4, display: 'flex' }}>
            {logoImg
              ? <img src={logoImg} width={32} height={32} style={{ width: 32, height: 32, objectFit: 'contain' }} />
              : <span style={{ fontSize: 24 }}>🐾</span>
            }
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: 22, fontWeight: 900, color: '#fff', letterSpacing: 3, lineHeight: 1 }}>MADVET</span>
            <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.65)', letterSpacing: 2 }}>ANIMAL HEALTH CARE</span>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', background: 'rgba(255,255,255,0.15)', borderRadius: 4, padding: '2px 8px' }}>{p.formulation}</span>
          <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.45)', marginTop: 3 }}>{p.packaging}</span>
        </div>
      </div>
      {/* Product name */}
      <span style={{ fontSize: p.name.length > 14 ? 34 : p.name.length > 10 ? 44 : 54, fontWeight: 900, color: '#fff', letterSpacing: 2, lineHeight: 1 }}>{p.name}</span>
      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 6 }}>{p.salt}</span>
      {children}
    </div>
  )
}

function BenefitsList({ hi, en, c }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '14px 20px 8px' }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: c.primary, letterSpacing: 1, marginBottom: 4 }}>प्रमुख लाभ / KEY BENEFITS</span>
      {hi.slice(0, 5).map((b, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '7px 12px', borderRadius: 8, background: i === 0 ? c.pale : i % 2 === 0 ? '#f8f8f8' : '#ffffff', borderLeftWidth: 3, borderLeftStyle: 'solid', borderLeftColor: i === 0 ? c.primary : c.bright, borderTopWidth: 0, borderRightWidth: 0, borderBottomWidth: 0 }}>
          <div style={{ width: 22, height: 22, borderRadius: 11, background: i === 0 ? c.primary : c.mid, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ fontSize: 12, color: '#fff', fontWeight: 800 }}>{i + 1}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, flexShrink: 1, flexBasis: 0 }}>
            <span style={{ fontSize: 13, color: '#111', fontWeight: 600, lineHeight: 1.35 }}>{b}</span>
            {en[i] && <span style={{ fontSize: 10, color: '#888', marginTop: 1 }}>{en[i]}</span>}
          </div>
        </div>
      ))}
    </div>
  )
}

function DescBar({ desc, tags, c }) {
  if (!desc && !tags.length) return null
  return (
    <div style={{ display: 'flex', flexDirection: 'column', padding: '10px 20px 8px', background: c.pale }}>
      {desc && <span style={{ fontSize: 11, color: '#333', lineHeight: 1.5, marginBottom: tags.length ? 6 : 0 }}>{desc}</span>}
      {tags.length > 0 && (
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: 9, color: c.primary, fontWeight: 800, letterSpacing: 1 }}>TREATS:</span>
          {tags.map((t, i) => (
            <div key={i} style={{ display: 'flex', fontSize: 9, color: c.dark, background: c.p12, borderRadius: 20, padding: '2px 8px', fontWeight: 600 }}>
              <span>{t}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function Species({ sp, c }) {
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', padding: '4px 20px 10px' }}>
      {(sp || '').split(/[,\/]/).map(s => s.trim()).filter(Boolean).slice(0, 6).map((s, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, background: c.pale, borderRadius: 20, padding: '3px 10px' }}>
          <span style={{ fontSize: 13 }}>{SP_EMOJI[s] || '🐾'}</span>
          <span style={{ fontSize: 10, color: c.primary, fontWeight: 600 }}>{s}</span>
        </div>
      ))}
    </div>
  )
}

function ProductImg({ uri, c, emoji = '🧴' }) {
  return (
    <div style={{ width: 110, height: 130, flexShrink: 0, borderRadius: 10, background: c.pale, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '12px 20px 0 0' }}>
      {uri
        ? <img src={uri} width={106} height={126} style={{ objectFit: 'contain', width: 106, height: 126 }} />
        : <span style={{ fontSize: 40 }}>{emoji}</span>
      }
    </div>
  )
}

function Footer({ c, logoImg }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', marginTop: 8 }}>
      {/* CTA bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: `linear-gradient(90deg,${c.darkest},${c.primary})`, padding: '8px 20px' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.5)', letterSpacing: 2 }}>VIEW ALL PRODUCTS</span>
          <span style={{ fontSize: 14, color: '#fff', fontWeight: 800, letterSpacing: 1 }}>madvet.in/products</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', background: 'rgba(255,255,255,0.12)', borderRadius: 6, padding: '4px 12px', alignItems: 'center' }}>
          <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.5)' }}>AI ASSISTANT</span>
          <span style={{ fontSize: 11, color: '#fff', fontWeight: 700 }}>ai.madvet.in</span>
        </div>
      </div>
      {/* Gold footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#FFD700', padding: '12px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ background: '#fff', borderRadius: 8, padding: '3px 5px', display: 'flex' }}>
            {logoImg
              ? <img src={logoImg} width={36} height={36} style={{ width: 36, height: 36, objectFit: 'contain' }} />
              : <span style={{ fontSize: 28 }}>🐾</span>
            }
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: 22, fontWeight: 900, color: '#1a2f8a', letterSpacing: 3, lineHeight: 1 }}>MADVET</span>
            <span style={{ fontSize: 9, color: '#1a2f8a', letterSpacing: 1.5, fontWeight: 700 }}>ANIMAL HEALTH CARE</span>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
          <span style={{ fontSize: 9, color: '#111', fontWeight: 800 }}>ISO 9001:2013 COMPANY</span>
          <span style={{ fontSize: 9, color: '#333', marginTop: 2 }}>madvet.animal@gmail.com</span>
          <span style={{ fontSize: 10, color: '#1a2f8a', fontWeight: 800, marginTop: 2 }}>📞 9935257750 · 8400347331</span>
        </div>
      </div>
    </div>
  )
}

// ── MAIN CARD ─────────────────────────────────────────────────────────────────

function Card({ p, c, productImg, logoImg }) {
  const hiRaw = splitBenefitsSafe(p.usp_benefits_hi, p.benefits)
  const enRaw = splitBenefits(p.benefits)
  const { hi, en } = augmentBenefits(hiRaw, enRaw, p.indication)
  const desc = getDescExcerpt(p.description)
  const tags = getIndTags(p.indication)
  const isInj = p.formulation === 'Injection'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: 480, background: '#fff' }}>
      <Header p={p} c={c} logoImg={logoImg}>
        {/* Gold tagline */}
        {hi[0] && (
          <div style={{ display: 'flex', marginTop: 12, alignSelf: 'flex-start' }}>
            <div style={{ background: '#FFE000', borderRadius: 6, padding: '6px 14px', display: 'flex' }}>
              <span style={{ fontSize: 14, fontWeight: 800, color: c.darkest }}>{hi[0]}</span>
            </div>
          </div>
        )}
      </Header>

      <DescBar desc={desc} tags={tags} c={c} />

      {/* Benefits + image row */}
      <div style={{ display: 'flex', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, flexShrink: 1, flexBasis: 0 }}>
          <BenefitsList hi={hi.slice(1)} en={en.slice(1)} c={c} />
        </div>
        <ProductImg uri={productImg} c={c} emoji={isInj ? '💉' : p.formulation === 'Bolus' ? '💊' : '🧴'} />
      </div>

      <div style={{ height: 2, background: `linear-gradient(90deg,${c.darkest},${c.bright})`, display: 'flex' }} />
      <Species sp={p.species} c={c} />
      <Footer c={c} logoImg={logoImg} />
    </div>
  )
}

// ── GET ───────────────────────────────────────────────────────────────────────

export async function GET(_req, { params }) {
  const { id: rawId } = await params
  const id = parseInt(rawId, 10)
  if (isNaN(id)) return new Response('Bad ID', { status: 400 })

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
  const table = (process.env.NEXT_PUBLIC_SUPABASE_TABLE ?? 'products_enriched').trim()

  const [{ data, error }, logoImg] = await Promise.all([
    sb.from(table)
      .select('id,product_name,salt_ingredient,packaging,formulation,category,species,indication,description,usp_benefits,usp_benefits_hi,image_url')
      .eq('id', id)
      .single(),
    imgURI('https://ai.madvet.in/madvet-icon.png'),
  ])

  if (error || !data) return new Response('Not found', { status: 404 })

  const rawCat = (data.category || '').trim()
  const category = CAT_NORMALIZE[rawCat] || rawCat
  const p = {
    id,
    name:            (data.product_name    || '').trim(),
    salt:            (data.salt_ingredient || '').trim(),
    packaging:       (data.packaging       || '').trim(),
    formulation:     (data.formulation     || '').trim(),
    category,
    species:         (data.species         || '').trim(),
    indication:      (data.indication      || '').trim(),
    description:     (data.description     || '').trim(),
    benefits:        (data.usp_benefits    || '').trim(),
    usp_benefits_hi: (data.usp_benefits_hi || '').trim(),
    image_url:       (data.image_url       || '').trim(),
  }

  const c = getColors(id, category)
  const productImg = await imgURI(p.image_url)
  const numBenefits = Math.min(splitBenefitsSafe(p.usp_benefits_hi, p.benefits).length, 6)
  const height = Math.min(900, Math.max(600, 200 + numBenefits * 52 + 260))

  try {
    return new ImageResponse(
      <Card p={p} c={c} productImg={productImg} logoImg={logoImg} />,
      { width: 480, height }
      // NO fonts parameter — system fonts work perfectly and never crash
    )
  } catch (err) {
    console.error('[share-card] error:', String(err?.message || err))
    return new Response('Error: ' + String(err?.message || err).slice(0, 200), { status: 500 })
  }
}
