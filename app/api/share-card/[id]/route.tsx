// @ts-nocheck
// app/api/share-card/[id]/route.tsx
// Server-side PNG — renders the SAME 5 templates as the React preview cards.
// Uses next/og (Satori) — real fonts, pixel-perfect, no html2canvas.

import { ImageResponse } from 'next/og'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

// ── Font loader ───────────────────────────────────────────────────────────────
let _fonts = null
async function loadFonts() {
  if (_fonts) return _fonts
  try {
    const css = await fetch(
      'https://fonts.googleapis.com/css2?family=Oswald:wght@700;900&family=Noto+Sans+Devanagari:wght@600;700;800&family=Barlow+Condensed:wght@600;700;800&display=swap',
      { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1)' }, signal: AbortSignal.timeout(8000) }
    ).then(r => r.text())

    const seen = new Set()
    const jobs = []
    for (const block of css.split('@font-face')) {
      const fm = block.match(/font-family:\s*['"]?([^'"\n;]+)['"]?/)
      const wm = block.match(/font-weight:\s*(\d+)/)
      const um = block.match(/url\(([^)]+\.woff2)\)/)
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
        return { name, data: await r.arrayBuffer(), weight, style: 'normal' }
      })
    )
    _fonts = results.filter(r => r.status === 'fulfilled').map(r => r.value)
    return _fonts
  } catch { return [] }
}

// ── Image → base64 URI ────────────────────────────────────────────────────────
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
    return `data:image/webp;base64,${buf.toString('base64')}`
  } catch { return null }
}

// ── Color system (exact mirror of ProductDetailClient.tsx) ────────────────────
const CAT_PALETTES = {
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
const CAT_NORMALIZE = {
  'Anti-inflammatory':                               'Anti-inflammatory / Analgesic',
  'Anti-inflammatory, Analgesic, Antipyretic':       'Anti-inflammatory / Analgesic',
  'Anti-inflammatory / Analgesic / Antipyretic':     'Anti-inflammatory / Analgesic',
  'Analgesic / Antipyretic':                         'Anti-inflammatory / Analgesic',
  'Analgesic, Antipyretic':                          'Anti-inflammatory / Analgesic',
  'Analgesic':                                       'Anti-inflammatory / Analgesic',
  'Anthelmintic':                                    'Anthelmintic / Antiparasitic',
  'Antiparasitic':                                   'Anthelmintic / Antiparasitic',
  'Antibiotic (Cephalosporin)':                      'Antibiotic',
  'Antibiotic (Fluoroquinolone)':                    'Antibiotic',
  'Antihistamine / Anti-allergic':                   'Antihistamine',
  'Dermatological / Topical':                        'Dermatological',
  'Probiotic / Immunomodulator / Vitamin Supplement':'Probiotic',
  'Antidiarrheal / Gastrointestinal':                'Antidiarrheal',
}

function getColors(id, category) {
  const base = CAT_PALETTES[category] ?? { h: 220, s: 70, l: 28 }
  const shift = ((id * 37 + 13) % 41) - 20
  const h = (base.h + shift + 360) % 360
  const { s, l } = base
  return {
    h, s, l,
    primary: `hsl(${h},${s}%,${l}%)`,
    bright:  `hsl(${h},${s}%,${l + 14}%)`,
    dark:    `hsl(${h},${s}%,${l - 10}%)`,
    darkest: `hsl(${h},${s}%,${l - 18}%)`,
    pale:    `hsl(${h},${s - 20}%,95%)`,
    mid:     `hsl(${h},${s}%,${l + 7}%)`,
    glow:    `hsla(${h},${s}%,${l + 10}%,0.35)`,
  }
}

function getTemplate(category) {
  if (['Vitamin Supplement', 'Vitamin Supplement / Galactogogue'].includes(category)) return 'vitality'
  if (['Probiotic', 'Digestive / Antiflatulent', 'Antidiarrheal'].includes(category)) return 'digest'
  if (['Reproductive Hormone', 'Udder Care / Herbal Antimicrobial'].includes(category)) return 'herbal'
  if (['Dermatological', 'Ectoparasiticide', 'Antihistamine'].includes(category)) return 'shield'
  return 'clinical'
}

// ── Data helpers ──────────────────────────────────────────────────────────────
const isHindi = s => /[\u0900-\u097F]/.test(s)

function splitBenefits(txt = '') {
  return txt.split(/[•\n,;|।]+/).map(s => s.trim()).filter(s => s.length > 6)
}
function splitBenefitsSafe(hi = '', en = '') {
  const p = splitBenefits(hi)
  if (p.length >= 2) return p
  const e = splitBenefits(en)
  if (e.length >= 2) return e
  return p.length ? p : e
}

const HI_IND = {
  'fever': 'बुखार में असरदार', 'pain': 'दर्द से जल्दी राहत',
  'inflammation': 'सूजन कम करे', 'arthritis': 'गठिया में असरदार',
  'infection': 'संक्रमण से लड़े', 'mastitis': 'थनिका में कारगर',
  'lameness': 'लंगड़ेपन में राहत', 'colic': 'पेट दर्द में असरदार',
  'diarrhea': 'दस्त रोकने में कारगर', 'respiratory': 'श्वसन रोग में राहत',
  'skin': 'त्वचा रोग में लाभकारी', 'milk': 'दूध उत्पादन बढ़ाए',
  'vitamin': 'विटामिन की कमी दूर करे', 'worm': 'कृमि खत्म करे',
}

function augmentBenefits(hiList, enList, indication = '', description = '', minCount = 4) {
  if (hiList.length >= minCount) return { hi: hiList, en: enList }
  const needed = minCount - hiList.length
  const newHi = [], newEn = []
  const indTerms = indication.split(',').map(s => s.trim().toLowerCase()).filter(s => s.length > 2 && !isHindi(s))
  for (const term of indTerms) {
    if (newHi.length >= needed) break
    const covered = [...hiList, ...newHi].some(b => b.toLowerCase().includes(term))
    if (covered) continue
    const hiPhrase = Object.entries(HI_IND).find(([k]) => term.includes(k))?.[1]
    if (hiPhrase && !hiList.includes(hiPhrase)) {
      newHi.push(hiPhrase)
      newEn.push(term.charAt(0).toUpperCase() + term.slice(1))
    }
  }
  return { hi: [...hiList, ...newHi].slice(0, 5), en: [...enList, ...newEn].slice(0, 5) }
}

function getDescExcerpt(desc = '', maxLen = 145) {
  if (!desc) return ''
  const first = desc.split(/\.\s+/)[0]
  const t = first.length <= maxLen ? first : first.slice(0, maxLen).replace(/\s\S+$/, '') + '…'
  return t.endsWith('.') ? t : t + '.'
}
function getIndicationTags(indication = '') {
  return indication.split(/[,،]+/).map(s => s.trim())
    .filter(s => s.length > 2 && s.length < 28 && /^[a-zA-Z\s\/\-]+$/.test(s)).slice(0, 4)
}

const SPECIES_EMOJI = {
  Cattle: '🐄', Buffalo: '🐃', Sheep: '🐑', Goat: '🐐',
  Dog: '🐕', Cat: '🐈', Poultry: '🐓', Horse: '🐴', Calf: '🐮',
}

// ── Shared sub-components (Satori-compatible: all display:flex, no grid) ───────

function Logo({ size = 1 }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 * size, flexShrink: 0 }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: 36 * size, height: 40 * size }}>
        <span style={{ fontSize: 28 * size, lineHeight: 1 }}>🐾</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <span style={{ fontFamily: 'Oswald', fontSize: 20 * size, fontWeight: 700, color: '#fff', letterSpacing: 2.5, lineHeight: 1 }}>MADVET</span>
        <span style={{ fontFamily: 'Barlow Condensed', fontSize: 8 * size, color: 'rgba(255,255,255,0.70)', letterSpacing: 1.8, marginTop: 1, fontWeight: 600 }}>ANIMAL HEALTH CARE</span>
        <span style={{ fontFamily: 'Barlow Condensed', fontSize: 7 * size, color: 'rgba(255,255,255,0.45)', letterSpacing: 0.8, marginTop: 1 }}>AN I.S.O. 9001:2013 COMPANY</span>
      </div>
    </div>
  )
}

function Species({ sp, c }) {
  const arr = (sp || '').split(/[,/]/).map(s => s.trim()).filter(Boolean).slice(0, 5)
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, justifyContent: 'center' }}>
      {arr.map((s, i) => (
        <div key={i} style={{ width: 28, height: 28, borderRadius: 14, background: `${c.primary}18`, border: `1.5px solid ${c.primary}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>
          <span>{SPECIES_EMOJI[s] || '🐾'}</span>
        </div>
      ))}
    </div>
  )
}

function ImgBox({ uri, w, h, c, emoji = '🧴', round = false }) {
  return (
    <div style={{ width: w, height: h, flexShrink: 0, overflow: 'hidden', borderRadius: round ? w / 2 : 12, background: `linear-gradient(145deg,${c.pale},white)`, border: `2px solid ${c.primary}30`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {uri
        ? <img src={uri} width={w - 4} height={h - 4} style={{ objectFit: round ? 'cover' : 'contain', width: w - 4, height: h - 4 }} />
        : <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span style={{ fontSize: w * 0.32 }}>{emoji}</span>
            <span style={{ fontSize: 7.5, color: c.primary, marginTop: 3, fontFamily: 'Barlow Condensed', letterSpacing: 0.5 }}>IMAGE COMING SOON</span>
          </div>
      }
    </div>
  )
}

function DescBar({ desc, tags, c }) {
  if (!desc && !tags.length) return null
  return (
    <div style={{ display: 'flex', flexDirection: 'column', margin: 0, padding: '10px 18px 8px', background: c.pale, borderBottom: `1.5px solid ${c.primary}18` }}>
      {desc && <span style={{ fontSize: 10.5, color: '#2a2a2a', lineHeight: 1.5, fontFamily: 'Barlow Condensed', fontWeight: 500, fontStyle: 'italic', marginBottom: tags.length ? 6 : 0 }}>{desc}</span>}
      {tags.length > 0 && (
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: 8.5, color: c.primary, fontWeight: 800, letterSpacing: 1, fontFamily: 'Oswald' }}>TREATS:</span>
          {tags.map((t, i) => (
            <div key={i} style={{ display: 'flex', fontSize: 9, color: c.dark, background: `${c.primary}14`, border: `1px solid ${c.primary}25`, borderRadius: 20, padding: '2px 8px', fontFamily: 'Barlow Condensed', fontWeight: 600 }}>
              <span>{t}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function AllProductsTag({ c }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: `linear-gradient(90deg, ${c.darkest}, ${c.primary})`, padding: '9px 20px', marginTop: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 30, height: 30, borderRadius: 15, background: 'rgba(255,255,255,0.15)', border: '1.5px solid rgba(255,255,255,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>
          <span>🔗</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.55)', fontFamily: 'Barlow Condensed', letterSpacing: 2 }}>VIEW ALL PRODUCTS · सभी उत्पाद</span>
          <span style={{ fontSize: 14, color: '#fff', fontWeight: 700, fontFamily: 'Oswald', letterSpacing: 1, lineHeight: 1.2 }}>madvet.in/products</span>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 6, padding: '4px 12px', alignItems: 'center' }}>
        <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.55)', fontFamily: 'Barlow Condensed', letterSpacing: 1 }}>AI ASSISTANT</span>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.9)', fontFamily: 'Oswald', letterSpacing: 0.5 }}>ai.madvet.in</span>
      </div>
    </div>
  )
}

function Footer({ c }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ height: 4, background: `linear-gradient(90deg,${c.darkest},${c.bright},${c.darkest})`, display: 'flex' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(135deg,#FFE600 0%,#FFD000 50%,#FFE600 100%)', padding: '14px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ background: '#fff', borderRadius: 8, padding: '4px 6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 32, lineHeight: 1 }}>🐾</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontFamily: 'Oswald', fontSize: 26, fontWeight: 700, color: '#1a2f8a', letterSpacing: 3, lineHeight: 1 }}>MADVET</span>
            <span style={{ fontFamily: 'Barlow Condensed', fontSize: 9, color: '#1a2f8a', letterSpacing: 1.5, fontWeight: 700, marginTop: 1 }}>ANIMAL HEALTH CARE</span>
            <span style={{ fontFamily: 'Barlow Condensed', fontSize: 8, color: '#555', marginTop: 1 }}>Ghaziabad (U.P.)</span>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', fontFamily: 'Barlow Condensed', fontSize: 8.5, color: '#333', lineHeight: 1.75 }}>
          <span style={{ fontWeight: 800, color: '#111', fontSize: 9 }}>I.S.O. 9001:2013 COMPANY</span>
          <span>madvet.animal@gmail.com</span>
          <span>www.madvet.in · support@madvet.in</span>
          <span style={{ fontWeight: 800, color: '#1a2f8a', fontSize: 10, marginTop: 1 }}>📞 9935257750 · 8400347331</span>
        </div>
      </div>
    </div>
  )
}

// ── TEMPLATE 1: VITALITY ──────────────────────────────────────────────────────
function CardVitality({ p, c, productImg }) {
  const _hiRaw = splitBenefitsSafe(p.usp_benefits_hi, p.benefits)
  const _enRaw = splitBenefits(p.benefits)
  const { hi, en } = augmentBenefits(_hiRaw, _enRaw, p.indication, p.description)
  const nameSz = p.name.length > 12 ? 44 : p.name.length > 9 ? 54 : 66
  const desc = getDescExcerpt(p.description)
  const tags = getIndicationTags(p.indication)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: 480, background: '#fff', fontFamily: 'Barlow Condensed' }}>
      {/* HERO */}
      <div style={{ display: 'flex', flexDirection: 'column', background: `linear-gradient(135deg,${c.darkest} 0%,${c.primary} 55%,${c.bright} 100%)`, padding: '18px 20px 60px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', right: -60, top: -60, width: 220, height: 220, borderRadius: 110, border: '1px solid rgba(255,255,255,0.08)', display: 'flex' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative' }}>
          <Logo size={0.9} />
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.65)', letterSpacing: 1, fontFamily: 'Barlow Condensed' }}>{p.packaging}</span>
            <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)', letterSpacing: 0.5, fontFamily: 'Barlow Condensed' }}>{p.formulation}</span>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', marginTop: 10, position: 'relative' }}>
          <span style={{ fontFamily: 'Oswald', fontWeight: 700, fontSize: nameSz, color: '#fff', letterSpacing: 3, lineHeight: 1 }}>{p.name}</span>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 5, letterSpacing: 0.5, fontFamily: 'Barlow Condensed' }}>{p.salt}</span>
        </div>
      </div>

      {/* Gold tagline badge overlapping hero */}
      <div style={{ display: 'flex', marginTop: -28, zIndex: 2, paddingLeft: 24 }}>
        <div style={{ display: 'flex', background: '#FFE000', borderRadius: 6, padding: '7px 16px' }}>
          <span style={{ fontFamily: 'Noto Sans Devanagari', fontWeight: 800, fontSize: 14, color: c.darkest }}>{hi[0] || p.name}</span>
        </div>
      </div>

      {/* Desc bar */}
      <DescBar desc={desc} tags={tags} c={c} />

      {/* Body */}
      <div style={{ display: 'flex', padding: '16px 16px 6px', gap: 14 }}>
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          {hi.slice(0, 7).map((b, i) => {
            const big = i === 0 || i === 1 || i === 3 || i === 5
            const arrowColor = big ? c.primary : c.mid
            return (
              <div key={i} style={{ display: 'flex', position: 'relative', marginBottom: big ? 8 : 5 }}>
                <div style={{ flex: 1, background: big ? `linear-gradient(90deg,${c.darkest},${c.primary})` : `linear-gradient(90deg,${c.primary},${c.mid})`, borderRadius: '6px 0 0 6px', padding: big ? '9px 40px 9px 14px' : '6px 36px 6px 12px' }}>
                  <div style={{ position: 'absolute', right: -15, top: 0, bottom: 0, width: 0, borderTop: `${big ? 22 : 17}px solid transparent`, borderBottom: `${big ? 22 : 17}px solid transparent`, borderLeft: `15px solid ${arrowColor}`, display: 'flex' }} />
                  <span style={{ fontFamily: isHindi(b) ? 'Noto Sans Devanagari' : 'Barlow Condensed', fontSize: big ? 13 : 11.5, color: '#fff', fontWeight: big ? 800 : 600, lineHeight: 1.3, display: 'block' }}>{b}</span>
                  {en[i] && <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.58)', fontFamily: 'Barlow Condensed', marginTop: 2, display: 'block' }}>{en[i]}</span>}
                </div>
              </div>
            )
          })}
        </div>
        <div style={{ width: 118, display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
          <ImgBox uri={productImg} w={114} h={160} c={c} emoji={p.formulation === 'Bolus' ? '💊' : '🧴'} />
          <Species sp={p.species} c={c} />
        </div>
      </div>

      <div style={{ height: 3, background: `linear-gradient(90deg,${c.darkest},${c.bright},${c.darkest}30)`, display: 'flex' }} />
      <AllProductsTag c={c} />
      <Footer c={c} />
    </div>
  )
}

// ── TEMPLATE 2: DIGEST ────────────────────────────────────────────────────────
function CardDigest({ p, c, productImg }) {
  const _hiRaw = splitBenefitsSafe(p.usp_benefits_hi, p.benefits)
  const _enRaw = splitBenefits(p.benefits)
  const { hi, en } = augmentBenefits(_hiRaw, _enRaw, p.indication, p.description)
  const nameSz = p.name.length > 12 ? 36 : p.name.length > 8 ? 46 : 56
  const desc = getDescExcerpt(p.description)
  const tags = getIndicationTags(p.indication)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: 480, background: '#fff', fontFamily: 'Barlow Condensed' }}>
      <div style={{ display: 'flex', flexDirection: 'column', padding: '16px 20px 0', background: '#fff', position: 'relative' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, paddingRight: 140 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#c8220a', fontFamily: 'Noto Sans Devanagari', lineHeight: 1.3, marginBottom: 6 }}>{p.indication?.split(',')[0]?.trim() || 'असरदार और तुरंत राहत'}</span>
            <span style={{ fontFamily: 'Oswald', fontWeight: 700, fontSize: nameSz, color: c.primary, letterSpacing: 2, lineHeight: 1 }}>{p.name}</span>
            <div style={{ display: 'flex', marginTop: 6 }}>
              <div style={{ background: c.pale, border: `1.5px solid ${c.primary}40`, borderRadius: 4, padding: '3px 10px', display: 'flex' }}>
                <span style={{ fontSize: 11, color: c.primary, fontWeight: 700, letterSpacing: 2 }}>{(p.formulation || '').toUpperCase()}</span>
              </div>
            </div>
            <div style={{ display: 'flex', marginTop: 8 }}>
              <div style={{ background: c.primary, borderRadius: 4, padding: '6px 14px', display: 'flex' }}>
                <span style={{ fontSize: 13, color: '#fff', fontFamily: 'Noto Sans Devanagari', fontWeight: 700 }}>{hi[0] || 'तुरंत असर, लंबे समय तक फायदा'}</span>
              </div>
            </div>
          </div>
          <div style={{ position: 'absolute', top: 12, right: 16, display: 'flex' }}>
            <ImgBox uri={productImg} w={128} h={128} c={c} emoji="💊" round />
          </div>
        </div>
      </div>

      <div style={{ height: 3, background: `linear-gradient(90deg,${c.darkest},${c.bright},${c.darkest}20)`, margin: '12px 0 0', display: 'flex' }} />
      <DescBar desc={desc} tags={tags} c={c} />

      <div style={{ display: 'flex', padding: '12px 20px', gap: 14 }}>
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <span style={{ fontFamily: 'Noto Sans Devanagari', fontSize: 13, fontWeight: 800, color: c.primary }}>प्रयोग एवं लक्षण :</span>
            <div style={{ flex: 1, height: 1.5, background: `${c.primary}30`, display: 'flex' }} />
          </div>
          {hi.slice(0, 7).map((b, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8, padding: '6px 10px', borderRadius: 6, background: i % 2 === 0 ? c.pale : 'transparent', borderLeft: `3px solid ${i % 2 === 0 ? c.primary : c.bright}` }}>
              <div style={{ width: 7, height: 7, borderRadius: 4, background: c.primary, flexShrink: 0, marginTop: 5, display: 'flex' }} />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontFamily: isHindi(b) ? 'Noto Sans Devanagari' : 'Barlow Condensed', fontSize: 12, color: '#1a1a1a', fontWeight: isHindi(b) ? 600 : 700, lineHeight: 1.35 }}>{b}</span>
                {en[i] && <span style={{ fontSize: 9.5, color: '#888', fontFamily: 'Barlow Condensed', marginTop: 1 }}>{en[i]}</span>}
              </div>
            </div>
          ))}
        </div>
        <div style={{ width: 108, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center', paddingTop: 4 }}>
          <div style={{ display: 'flex', flexDirection: 'column', background: `linear-gradient(160deg,${c.darkest},${c.primary})`, borderRadius: 10, padding: '14px 8px', alignItems: 'center', width: '100%' }}>
            <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.6)', fontFamily: 'Barlow Condensed', letterSpacing: 1.5, marginBottom: 4 }}>{(p.formulation || '').toUpperCase()}</span>
            <span style={{ fontFamily: 'Oswald', fontSize: 15, fontWeight: 700, color: '#fff', lineHeight: 1.15, letterSpacing: 1 }}>{p.name}</span>
            <span style={{ fontSize: 8.5, color: 'rgba(255,255,255,0.65)', marginTop: 4, fontFamily: 'Barlow Condensed' }}>{p.packaging}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', background: c.pale, borderRadius: 8, padding: '8px', alignItems: 'center', border: `1px solid ${c.primary}25`, width: '100%' }}>
            <span style={{ fontSize: 8.5, color: c.primary, fontWeight: 700, fontFamily: 'Barlow Condensed', letterSpacing: 1, marginBottom: 5 }}>SPECIES</span>
            <Species sp={p.species} c={c} />
          </div>
        </div>
      </div>

      <div style={{ height: 5, background: `linear-gradient(90deg,${c.darkest},${c.bright},${c.darkest}60)`, marginBottom: 6, display: 'flex' }} />
      <AllProductsTag c={c} />
      <Footer c={c} />
    </div>
  )
}

// ── TEMPLATE 3: HERBAL ────────────────────────────────────────────────────────
function CardHerbal({ p, c, productImg }) {
  const _hiRaw = splitBenefitsSafe(p.usp_benefits_hi, p.benefits)
  const _enRaw = splitBenefits(p.benefits)
  const { hi, en } = augmentBenefits(_hiRaw, _enRaw, p.indication, p.description)
  const c2 = `hsl(${(c.h + 40) % 360},75%,36%)`
  const desc = getDescExcerpt(p.description)
  const tags = getIndicationTags(p.indication)
  const nameSz = p.name.length > 14 ? 32 : p.name.length > 10 ? 42 : 50

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: 480, background: '#fff', fontFamily: 'Barlow Condensed' }}>
      <div style={{ display: 'flex', flexDirection: 'column', background: `linear-gradient(160deg,${c.darkest} 0%,${c.primary} 60%,${c2} 100%)`, padding: '16px 20px 18px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Logo size={0.88} />
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', letterSpacing: 1, fontStyle: 'italic', fontFamily: 'Barlow Condensed' }}>{p.category}</span>
            <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)', fontFamily: 'Barlow Condensed' }}>{p.packaging}</span>
          </div>
        </div>
        <div style={{ display: 'flex', marginTop: 10, alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
            <span style={{ fontFamily: 'Oswald', fontWeight: 700, fontSize: nameSz, lineHeight: 1, letterSpacing: 2, color: '#fff' }}>{p.name}</span>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.78)', marginTop: 5, letterSpacing: 0.5, fontFamily: 'Barlow Condensed' }}>{(p.salt || '').split(',')[0]?.trim()}</span>
          </div>
          <ImgBox uri={productImg} w={100} h={100} c={c} emoji="🌿" />
        </div>
        <div style={{ display: 'flex', marginTop: 10, background: 'rgba(255,255,255,0.15)', borderRadius: 6, padding: '6px 14px', border: '1px solid rgba(255,255,255,0.25)', alignItems: 'center', gap: 8, alignSelf: 'flex-start' }}>
          <span style={{ fontSize: 16, lineHeight: 1 }}>🌱</span>
          <span style={{ fontFamily: 'Noto Sans Devanagari', fontSize: 13, color: '#FFE000', fontWeight: 700 }}>{hi[0] || p.indication}</span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', padding: '14px 18px 8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <div style={{ width: 4, height: 16, background: c.primary, borderRadius: 2, display: 'flex' }} />
          <span style={{ fontFamily: 'Noto Sans Devanagari', fontSize: 13, fontWeight: 800, color: c.primary }}>प्रमुख लाभ एवं उपयोग :</span>
          <div style={{ flex: 1, height: 1, background: `${c.primary}20`, display: 'flex' }} />
        </div>
        <DescBar desc={desc} tags={tags} c={c} />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: 8 }}>
          {hi.slice(0, 6).map((b, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, padding: '7px 10px', background: i < 2 ? c.pale : '#fafafa', borderRadius: 7, border: `1px solid ${i < 2 ? c.primary + '33' : '#eeeeee'}`, alignItems: 'flex-start', width: '46%' }}>
              <span style={{ color: c.primary, fontSize: 15, fontWeight: 900, flexShrink: 0, lineHeight: 1.2 }}>►</span>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontFamily: isHindi(b) ? 'Noto Sans Devanagari' : 'Barlow Condensed', fontSize: 11, color: '#222', lineHeight: 1.35, fontWeight: isHindi(b) ? 500 : 700 }}>{b}</span>
                {en[i] && <span style={{ fontSize: 8.5, color: '#999', fontFamily: 'Barlow Condensed', marginTop: 1 }}>{en[i]}</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 18px 8px' }}>
        <Species sp={p.species} c={c} />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
          <span style={{ fontSize: 9, color: '#aaa', letterSpacing: 0.5, fontFamily: 'Barlow Condensed' }}>FORMULATION</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: c.primary, fontFamily: 'Barlow Condensed' }}>{p.formulation}</span>
        </div>
      </div>
      <AllProductsTag c={c} />
      <Footer c={c} />
    </div>
  )
}

// ── TEMPLATE 4: SHIELD ────────────────────────────────────────────────────────
function CardShield({ p, c, productImg }) {
  const _hiRaw = splitBenefitsSafe(p.usp_benefits_hi, p.benefits)
  const _enRaw = splitBenefits(p.benefits)
  const { hi, en } = augmentBenefits(_hiRaw, _enRaw, p.indication, p.description)
  const nameSz = p.name.length > 14 ? 34 : p.name.length > 10 ? 44 : 54
  const desc = getDescExcerpt(p.description)
  const tags = getIndicationTags(p.indication)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: 480, background: '#fff', fontFamily: 'Barlow Condensed' }}>
      <div style={{ display: 'flex', flexDirection: 'column', background: `linear-gradient(125deg,${c.darkest} 0%,${c.primary} 100%)`, padding: '18px 20px 22px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
          <Logo size={0.88} />
          <div style={{ display: 'flex', flexDirection: 'column', background: 'rgba(255,255,255,0.18)', borderRadius: 5, padding: '4px 12px', border: '1px solid rgba(255,255,255,0.3)', alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: '#FFE000', fontWeight: 700, letterSpacing: 2, fontFamily: 'Oswald' }}>{(p.formulation || '').toUpperCase()}</span>
            <span style={{ fontSize: 8.5, color: 'rgba(255,255,255,0.65)', fontFamily: 'Barlow Condensed' }}>{p.packaging}</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
            <span style={{ fontFamily: 'Oswald', fontWeight: 700, fontSize: nameSz, color: '#fff', letterSpacing: 2, lineHeight: 1 }}>{p.name}</span>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.72)', marginTop: 6, letterSpacing: 0.5, fontFamily: 'Barlow Condensed' }}>{p.salt}</span>
            <div style={{ display: 'flex', marginTop: 10 }}>
              <div style={{ background: '#FFE000', borderRadius: 5, padding: '5px 14px', display: 'flex' }}>
                <span style={{ fontFamily: 'Noto Sans Devanagari', fontSize: 13, fontWeight: 800, color: c.darkest }}>{hi[0] || p.indication}</span>
              </div>
            </div>
          </div>
          <ImgBox uri={productImg} w={108} h={108} c={c} emoji={p.formulation === 'Spray' ? '🫧' : '🧼'} />
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', padding: '14px 18px 6px' }}>
        <DescBar desc={desc} tags={tags} c={c} />
        <span style={{ fontFamily: 'Noto Sans Devanagari', fontSize: 13, fontWeight: 800, color: c.primary, marginBottom: 10, marginTop: 8 }}>लाभ एवं उपयोग :</span>
        {hi.slice(0, 5).map((b, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 7, padding: '8px 12px', borderRadius: 7, background: `linear-gradient(90deg,${c.pale},white)`, border: `1px solid ${c.primary}25`, borderLeft: `4px solid ${i === 0 ? c.primary : c.bright}` }}>
            <div style={{ width: 22, height: 22, borderRadius: 11, background: c.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ fontSize: 13, color: '#fff', fontWeight: 900 }}>✓</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontFamily: isHindi(b) ? 'Noto Sans Devanagari' : 'Barlow Condensed', fontSize: 12, color: '#111', fontWeight: isHindi(b) ? 600 : 700, lineHeight: 1.35 }}>{b}</span>
              {en[i] && <span style={{ fontSize: 9.5, color: '#888', fontFamily: 'Barlow Condensed', marginTop: 1 }}>{en[i]}</span>}
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', padding: '4px 18px 8px' }}>
        <Species sp={p.species} c={c} />
      </div>
      <AllProductsTag c={c} />
      <Footer c={c} />
    </div>
  )
}

// ── TEMPLATE 5: CLINICAL ──────────────────────────────────────────────────────
function CardClinical({ p, c, productImg }) {
  const _hiRaw = splitBenefitsSafe(p.usp_benefits_hi, p.benefits)
  const _enRaw = splitBenefits(p.benefits)
  const { hi, en } = augmentBenefits(_hiRaw, _enRaw, p.indication, p.description)
  const isInj = p.formulation === 'Injection'
  const nameSz = p.name.length > 14 ? 32 : p.name.length > 10 ? 42 : 52
  const desc = getDescExcerpt(p.description)
  const tags = getIndicationTags(p.indication)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: 480, background: '#fff', fontFamily: 'Barlow Condensed' }}>
      <div style={{ display: 'flex', flexDirection: 'column', background: `linear-gradient(135deg,hsl(${c.h},${c.s}%,${c.l - 18}%) 0%,hsl(${c.h},${c.s}%,${c.l - 10}%) 50%,${c.primary} 100%)`, padding: '16px 20px 20px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <Logo size={0.88} />
          <div style={{ display: 'flex' }}>
            <div style={{ background: c.primary, borderRadius: 4, padding: '3px 10px', display: 'flex' }}>
              <span style={{ fontSize: 10, color: '#fff', fontWeight: 700, letterSpacing: 1, fontFamily: 'Barlow Condensed' }}>{(p.category || '').split('/')[0]?.trim()}</span>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14 }}>
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
            <span style={{ fontFamily: 'Oswald', fontWeight: 700, fontSize: nameSz, color: '#fff', letterSpacing: 1.5, lineHeight: 1 }}>{p.name}</span>
            <span style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.72)', marginTop: 5, letterSpacing: 0.3, fontStyle: 'italic', fontFamily: 'Barlow Condensed' }}>{p.salt}</span>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 4, padding: '3px 10px', border: '1px solid rgba(255,255,255,0.2)', display: 'flex' }}>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.85)', letterSpacing: 1, fontFamily: 'Barlow Condensed' }}>{p.formulation} · {p.packaging}</span>
              </div>
            </div>
          </div>
          <ImgBox uri={productImg} w={104} h={110} c={c} emoji={isInj ? '💉' : '💊'} />
        </div>
      </div>

      <div style={{ height: 4, background: `linear-gradient(90deg,${c.darkest},${c.bright},hsl(${(c.h + 35) % 360},90%,52%))`, display: 'flex' }} />
      <DescBar desc={desc} tags={tags} c={c} />

      <div style={{ display: 'flex', flexDirection: 'column', padding: '14px 18px 6px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <span style={{ fontFamily: 'Noto Sans Devanagari', fontSize: 13, fontWeight: 800, color: c.primary }}>प्रमुख लाभ</span>
          <div style={{ flex: 1, height: 2, background: `linear-gradient(90deg,${c.primary}50,transparent)`, display: 'flex' }} />
          <span style={{ fontSize: 9.5, color: '#aaa', fontStyle: 'italic', fontFamily: 'Barlow Condensed' }}>Key Benefits</span>
        </div>
        {hi.slice(0, 5).map((b, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 7, padding: '8px 12px', borderRadius: 8, background: i === 0 ? c.pale : i === 1 ? `${c.pale}88` : '#fafafa', border: `1px solid ${i < 2 ? c.primary + '30' : '#eeeeee'}` }}>
            <div style={{ width: 24, height: 24, borderRadius: 12, background: i === 0 ? c.primary : i === 1 ? c.mid : c.bright, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#fff', fontWeight: 800, flexShrink: 0 }}>
              <span style={{ fontFamily: 'Barlow Condensed' }}>{i + 1}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
              <span style={{ fontFamily: isHindi(b) ? 'Noto Sans Devanagari' : 'Barlow Condensed', fontSize: 12, color: '#111', lineHeight: 1.35, fontWeight: isHindi(b) ? 600 : 700 }}>{b}</span>
              {en[i] && <span style={{ fontSize: 9.5, color: '#888', fontFamily: 'Barlow Condensed', marginTop: 1 }}>{en[i]}</span>}
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', padding: '4px 18px 8px' }}>
        <Species sp={p.species} c={c} />
      </div>
      <AllProductsTag c={c} />
      <Footer c={c} />
    </div>
  )
}

// ── GET ───────────────────────────────────────────────────────────────────────
export async function GET(_req, { params }) {
  const { id: rawId } = await params
  const id = parseInt(rawId, 10)
  if (isNaN(id)) return new Response('Bad ID', { status: 400 })

  const sb    = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  const table = (process.env.NEXT_PUBLIC_SUPABASE_TABLE ?? 'products_enriched').trim()

  const [fonts, { data, error }] = await Promise.all([
    loadFonts(),
    sb.from(table)
      .select('id,product_name,salt_ingredient,packaging,formulation,category,species,indication,description,usp_benefits,usp_benefits_hi,image_url')
      .eq('id', id).single(),
  ])

  if (error || !data) return new Response('Not found', { status: 404 })

  const name     = (data.product_name    || '').trim()
  const rawCat   = (data.category        || '').trim()
  const category = CAT_NORMALIZE[rawCat] || rawCat

  const p = {
    id,
    name,
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

  const [c, productImg] = [getColors(id, category), await imgURI(p.image_url)]
  const tmpl = getTemplate(category)

  const CardMap = { vitality: CardVitality, digest: CardDigest, herbal: CardHerbal, shield: CardShield, clinical: CardClinical }
  const CardComp = CardMap[tmpl] || CardClinical

  // Estimate height: hero + tagline + descbar + benefits rows + species + link band + footer
  const numBenefits = Math.min(splitBenefitsSafe(p.usp_benefits_hi, p.benefits).length + 1, 7)
  const benefitH = numBenefits * 44
  const cardH = 200 + 42 + 60 + benefitH + 36 + 54 + 108
  const height = Math.min(860, Math.max(620, cardH))

  try {
    return new ImageResponse(
      <CardComp p={p} c={c} productImg={productImg} />,
      {
        width: 480,
        height,
        fonts,
        headers: {
          'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600',
        },
      }
    )
  } catch (err) {
    console.error('[share-card]', err)
    return new ImageResponse(
      <div style={{ display: 'flex', width: 480, height: 120, background: '#fee2e2', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <span style={{ fontSize: 13, color: '#991b1b' }}>Error rendering card — {String(err?.message || err).slice(0, 120)}</span>
      </div>,
      { width: 480, height: 120 }
    )
  }
}
