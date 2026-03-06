// @ts-nocheck
import React from 'react'
import { ImageResponse } from 'next/og'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const maxDuration = 30

// ─── FONTS ───────────────────────────────────────────────────────────────────
// Fetched at runtime & cached — no local woff2 files needed, no module-level crash
let _fontsCache: any[] | null = null
async function getFonts() {
  if (_fontsCache) return _fontsCache
  try {
    const [oswald, barlow, noto] = await Promise.all([
      fetch('https://fonts.gstatic.com/s/oswald/v53/TK3_WkUHHAIjg75cFRf3bXL8LICs13NvgUFoZAaRliE.woff2').then(r => r.arrayBuffer()),
      fetch('https://fonts.gstatic.com/s/barlowcondensed/v12/HTxwL3I-JCGChYJ8VI-L6OO_au7B497y_3HcuKECcrs.woff2').then(r => r.arrayBuffer()),
      fetch('https://fonts.gstatic.com/s/notosansdevanagari/v25/TuGOUUFzXI5FBtUq5a8bh68BJxxEb2-e.woff2').then(r => r.arrayBuffer()),
    ])
    _fontsCache = [
      { name: 'Oswald',               weight: 700, style: 'normal' as const, data: oswald },
      { name: 'Barlow Condensed',     weight: 700, style: 'normal' as const, data: barlow },
      { name: 'Noto Sans Devanagari', weight: 700, style: 'normal' as const, data: noto },
    ]
  } catch (e) {
    console.warn('[share-card] Font fetch failed, will render with system fonts:', e)
    _fontsCache = []
  }
  return _fontsCache
}

// ─── IMAGE UTIL ───────────────────────────────────────────────────────────────
// Fetches image and converts to base64 data URI for Satori.
// NO query params appended — Supabase Storage doesn't support transform params unless
// you've paid for the Image Transformation add-on.
async function imgURI(url?: string): Promise<string | null> {
  if (!url) return null
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(5000) })
    if (!r.ok) return null
    const ct = r.headers.get('content-type') || ''
    if (ct.includes('html') || ct.includes('text')) return null
    const buf = Buffer.from(await r.arrayBuffer())
    if (buf[0] === 0xFF && buf[1] === 0xD8) return `data:image/jpeg;base64,${buf.toString('base64')}`
    if (buf[0] === 0x89 && buf[1] === 0x50) return `data:image/png;base64,${buf.toString('base64')}`
    return `data:image/webp;base64,${buf.toString('base64')}`
  } catch { return null }
}

// ─── COLOR SYSTEM ─────────────────────────────────────────────────────────────
const CAT_PALETTES = {
  'Vitamin Supplement':                 { h: 22,  s: 85, l: 32 },
  'Vitamin Supplement / Galactogogue':  { h: 210, s: 85, l: 25 },
  'Antibiotic':                         { h: 218, s: 72, l: 26 },
  'Anti-inflammatory / Analgesic':      { h: 338, s: 78, l: 30 },
  'Anthelmintic / Antiparasitic':       { h: 158, s: 70, l: 26 },
  'Probiotic':                          { h: 128, s: 65, l: 28 },
  'Dermatological':                     { h: 272, s: 60, l: 30 },
  'Ectoparasiticide':                   { h: 42,  s: 80, l: 30 },
  'Reproductive Hormone':               { h: 295, s: 58, l: 28 },
  'Antihistamine':                      { h: 200, s: 68, l: 26 },
  'Antidiarrheal':                      { h: 168, s: 65, l: 26 },
  'Udder Care / Herbal Antimicrobial':  { h: 88,  s: 68, l: 26 },
  'Digestive / Antiflatulent':          { h: 33,  s: 82, l: 28 },
}

const CAT_NORMALIZE = {
  'Anti-inflammatory':                              'Anti-inflammatory / Analgesic',
  'Anti-inflammatory, Analgesic, Antipyretic':      'Anti-inflammatory / Analgesic',
  'Anti-inflammatory / Analgesic / Antipyretic':    'Anti-inflammatory / Analgesic',
  'Analgesic / Antipyretic':                        'Anti-inflammatory / Analgesic',
  'Analgesic, Antipyretic':                         'Anti-inflammatory / Analgesic',
  'Analgesic':                                      'Anti-inflammatory / Analgesic',
  'Anthelmintic':                                   'Anthelmintic / Antiparasitic',
  'Antiparasitic':                                  'Anthelmintic / Antiparasitic',
  'Antibiotic (Cephalosporin)':                     'Antibiotic',
  'Antibiotic (Fluoroquinolone)':                   'Antibiotic',
  'Antihistamine / Anti-allergic':                  'Antihistamine',
  'Dermatological / Topical':                       'Dermatological',
  'Probiotic / Immunomodulator / Vitamin Supplement': 'Probiotic',
  'Antidiarrheal / Gastrointestinal':               'Antidiarrheal',
}

function hslToRgb(h: number, s: number, l: number) {
  s /= 100; l /= 100
  const k = n => (n + h / 30) % 12
  const a = s * Math.min(l, 1 - l)
  const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
  return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)]
}

function getColors(id: number, cat: string) {
  const base = CAT_PALETTES[cat] ?? { h: 220, s: 70, l: 28 }
  const shift = ((id * 37 + 13) % 41) - 20
  const h = (base.h + shift + 360) % 360
  const { s, l } = base
  const [r,  g,  b]  = hslToRgb(h, s, l)
  const [rb, gb, bb] = hslToRgb(h, s, l + 14)
  const [rd, gd, bd] = hslToRgb(h, s, l - 10)
  const [rk, gk, bk] = hslToRgb(h, s, l - 18)
  const [rm, gm, bm] = hslToRgb(h, s, l + 7)
  return {
    primary: `rgb(${r},${g},${b})`,
    bright:  `rgb(${rb},${gb},${bb})`,
    dark:    `rgb(${rd},${gd},${bd})`,
    darkest: `rgb(${rk},${gk},${bk})`,
    pale:    `hsl(${h},${Math.max(s - 30, 20)}%,95%)`,
    mid:     `rgb(${rm},${gm},${bm})`,
    p12:     `rgba(${r},${g},${b},0.12)`,
    p15:     `rgba(${r},${g},${b},0.15)`,
  }
}

// ─── DATA HELPERS ─────────────────────────────────────────────────────────────
const SP: Record<string,string> = { Cattle:'🐄', Buffalo:'🐃', Sheep:'🐑', Goat:'🐐', Dog:'🐕', Cat:'🐈', Poultry:'🐓', Horse:'🐴' }

function splitB(t = '') { return t.split(/[•\n,;|।]+/).map(s => s.trim()).filter(s => s.length > 6) }
function splitBSafe(hi = '', en = '') {
  const p = splitB(hi); if (p.length >= 2) return p
  const e = splitB(en); return e.length >= 2 ? e : (p.length ? p : e)
}
function getDesc(d = '', max = 130) {
  if (!d) return ''
  const f = d.split(/\.\s+/)[0]
  return (f.length <= max ? f : f.slice(0, max).replace(/\s\S+$/, '') + '…').replace(/\.$/, '') + '.'
}
function getTags(ind = '') {
  return ind.split(/[,،]+/).map(s => s.trim()).filter(s => s.length > 2 && s.length < 28 && /^[a-zA-Z\s\/\-]+$/.test(s)).slice(0, 4)
}
function speciesList(sp = '') { return sp.split(/[,\/]/).map(s => s.trim()).filter(Boolean).slice(0, 6) }

function getTemplate(category: string) {
  if (['Vitamin Supplement', 'Vitamin Supplement / Galactogogue'].includes(category))  return 'vitality'
  if (['Probiotic', 'Digestive / Antiflatulent', 'Antidiarrheal'].includes(category))  return 'digest'
  if (['Reproductive Hormone', 'Udder Care / Herbal Antimicrobial'].includes(category)) return 'herbal'
  if (['Dermatological', 'Ectoparasiticide', 'Antihistamine'].includes(category))       return 'shield'
  return 'clinical'
}

// ─── SHARED LAYOUT PIECES ─────────────────────────────────────────────────────
function Header({ p, c, logoImg, children }: any) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {logoImg
          ? <img src={logoImg} width={30} height={30} style={{ width: 30, height: 30, objectFit: 'contain' }} />
          : <span style={{ fontSize: 22 }}>🐾</span>}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: 17, fontWeight: 700, color: '#fff', letterSpacing: 3, lineHeight: 1, fontFamily: 'Oswald' }}>MADVET</span>
          <span style={{ fontSize: 7.5, color: 'rgba(255,255,255,0.6)', letterSpacing: 1.5, fontFamily: 'Barlow Condensed' }}>ANIMAL HEALTH CARE</span>
        </div>
      </div>
      {children}
    </div>
  )
}

function DescBar({ p, c }: any) {
  const desc = getDesc(p.description)
  const tags = getTags(p.indication)
  if (!desc && tags.length === 0) return null
  return (
    <div style={{ display: 'flex', flexDirection: 'column', padding: '9px 18px 7px', background: c.pale }}>
      {desc && <span style={{ fontSize: 10.5, color: '#2a2a2a', lineHeight: 1.5, fontFamily: 'Barlow Condensed' }}>{desc}</span>}
      {tags.length > 0 && (
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center', marginTop: desc ? 5 : 0 }}>
          <span style={{ fontSize: 8.5, color: c.primary, fontWeight: 700, letterSpacing: 1, fontFamily: 'Oswald' }}>TREATS:</span>
          {tags.map((t, i) => (
            <div key={i} style={{ display: 'flex', fontSize: 9, color: c.dark, background: c.p12, borderRadius: 20, padding: '2px 8px', fontFamily: 'Barlow Condensed' }}>
              <span>{t}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function SpeciesRow({ sp, c }: any) {
  return (
    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
      {speciesList(sp).map((s, i) => (
        <div key={i} style={{ width: 26, height: 26, borderRadius: 13, background: c.p15, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>
          <span>{SP[s] || '🐾'}</span>
        </div>
      ))}
    </div>
  )
}

function ProductImg({ src, w, h, emoji }: any) {
  const box = { width: w, height: h, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.10)' }
  return src
    ? <div style={box}><img src={src} width={w - 6} height={h - 6} style={{ objectFit: 'contain', width: w - 6, height: h - 6 }} /></div>
    : <div style={box}><span style={{ fontSize: Math.round(w * 0.36) }}>{emoji}</span></div>
}

function Footer({ c, logoImg }: any) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: `linear-gradient(90deg,${c.darkest},${c.primary})`, padding: '8px 18px' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: 7.5, color: 'rgba(255,255,255,0.5)', letterSpacing: 2, fontFamily: 'Barlow Condensed' }}>सभी उत्पाद · VIEW ALL PRODUCTS</span>
          <span style={{ fontSize: 13, color: '#fff', fontWeight: 700, fontFamily: 'Oswald', letterSpacing: 0.5 }}>madvet.in/products</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', background: 'rgba(255,255,255,0.12)', borderRadius: 6, padding: '4px 12px', alignItems: 'center' }}>
          <span style={{ fontSize: 7.5, color: 'rgba(255,255,255,0.5)', fontFamily: 'Barlow Condensed', letterSpacing: 1 }}>AI ASSISTANT</span>
          <span style={{ fontSize: 11, color: '#fff', fontFamily: 'Oswald', letterSpacing: 0.5 }}>ai.madvet.in</span>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#FFD700', padding: '11px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {logoImg
            ? <img src={logoImg} width={34} height={34} style={{ width: 34, height: 34, objectFit: 'contain' }} />
            : <span style={{ fontSize: 26 }}>🐾</span>}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: 20, fontWeight: 700, color: '#1a2f8a', letterSpacing: 3, lineHeight: 1, fontFamily: 'Oswald' }}>MADVET</span>
            <span style={{ fontSize: 8.5, color: '#1a2f8a', letterSpacing: 1.5, fontWeight: 700, fontFamily: 'Barlow Condensed' }}>ANIMAL HEALTH CARE</span>
            <span style={{ fontSize: 7.5, color: '#555', fontFamily: 'Barlow Condensed' }}>Ghaziabad (U.P.)</span>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
          <span style={{ fontSize: 8.5, color: '#111', fontWeight: 700, fontFamily: 'Barlow Condensed' }}>I.S.O. 9001:2013 COMPANY</span>
          <span style={{ fontSize: 8, color: '#333', fontFamily: 'Barlow Condensed' }}>madvet.animal@gmail.com</span>
          <span style={{ fontSize: 9.5, color: '#1a2f8a', fontWeight: 700, fontFamily: 'Barlow Condensed' }}>📞 9935257750 · 8400347331</span>
        </div>
      </div>
    </div>
  )
}

// ─── TEMPLATE 1: VITALITY (Vitamin / Tonic) ─────────────────────────────────
function CardVitality({ p, c, productImg, logoImg }: any) {
  const benefits = splitBSafe(p.usp_benefits_hi, p.benefits)
  const nameSz = p.name.length > 14 ? 36 : p.name.length > 10 ? 48 : 58
  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: 480, background: '#fff' }}>
      {/* Hero gradient header */}
      <div style={{ display: 'flex', flexDirection: 'column', background: `linear-gradient(140deg,${c.darkest} 0%,${c.primary} 55%,${c.mid} 100%)`, padding: '16px 18px 0' }}>
        <Header p={p} c={c} logoImg={logoImg}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
            <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.75)', background: 'rgba(255,255,255,0.15)', borderRadius: 4, padding: '2px 8px', fontFamily: 'Barlow Condensed' }}>{p.formulation}</span>
            <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.45)', fontFamily: 'Barlow Condensed' }}>{p.packaging}</span>
          </div>
        </Header>
        {/* Name band */}
        <div style={{ display: 'flex', flexDirection: 'column', background: 'rgba(0,0,0,0.25)', margin: '12px -18px 0', padding: '10px 18px', borderTop: `2px solid ${c.bright}` }}>
          <span style={{ fontSize: nameSz, fontWeight: 700, color: '#fff', letterSpacing: 2, lineHeight: 1, fontFamily: 'Oswald' }}>{p.name}</span>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.65)', marginTop: 4, fontFamily: 'Barlow Condensed' }}>{p.salt}</span>
        </div>
        {/* Top benefit pill — hi[0] shown here; gold strip below shows hi[1] so no duplicate */}
        {benefits[0] && (
          <div style={{ display: 'flex', margin: '10px 0 14px' }}>
            <div style={{ background: '#FFE000', borderRadius: 6, padding: '6px 14px', display: 'flex' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: c.darkest, fontFamily: 'Noto Sans Devanagari' }}>{benefits[0]}</span>
            </div>
          </div>
        )}
      </div>
      {/* Gold strip — shows hi[1], NOT hi[0] again — fixes the duplicate benefit bug */}
      {benefits[1] && (
        <div style={{ display: 'flex', padding: '7px 18px', background: `linear-gradient(90deg,#FFE000,#FFD000)` }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: c.darkest, fontFamily: 'Noto Sans Devanagari' }}>{benefits[1]}</span>
        </div>
      )}
      <DescBar p={p} c={c} />
      {/* Benefits + product image */}
      <div style={{ display: 'flex', padding: '12px 0 8px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, paddingLeft: 16, paddingRight: 8 }}>
          {benefits.slice(2, 7).map((b, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 9, padding: '7px 10px', borderRadius: 7, background: i === 0 ? c.pale : i % 2 === 0 ? '#f8f8f8' : '#fff', marginBottom: 5, borderLeft: `3px solid ${i === 0 ? c.primary : c.bright}`, borderTop: '0px', borderRight: '0px', borderBottom: '0px' }}>
              <div style={{ width: 20, height: 20, borderRadius: 10, background: i === 0 ? c.primary : c.mid, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: 11, color: '#fff', fontWeight: 700, fontFamily: 'Oswald' }}>{i + 1}</span>
              </div>
              <span style={{ fontSize: 12, color: '#111', fontWeight: 600, lineHeight: 1.35, fontFamily: 'Noto Sans Devanagari' }}>{b}</span>
            </div>
          ))}
        </div>
        <div style={{ width: 110, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, paddingRight: 14, paddingTop: 2 }}>
          <ProductImg src={productImg} w={96} h={120} emoji={p.formulation === 'Injection' ? '💉' : p.formulation === 'Bolus' ? '💊' : '🧴'} />
          <SpeciesRow sp={p.species} c={c} />
        </div>
      </div>
      <div style={{ height: 2, background: `linear-gradient(90deg,${c.darkest},${c.bright})`, display: 'flex', margin: '2px 0' }} />
      <Footer c={c} logoImg={logoImg} />
    </div>
  )
}

// ─── TEMPLATE 2: DIGEST (Probiotic / Digestive) ──────────────────────────────
function CardDigest({ p, c, productImg, logoImg }: any) {
  const benefits = splitBSafe(p.usp_benefits_hi, p.benefits)
  const nameSz = p.name.length > 12 ? 36 : p.name.length > 8 ? 46 : 56
  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: 480, background: '#fff' }}>
      {/* White header — product image is rectangular (NOT round — circle crop cuts packaging) */}
      <div style={{ display: 'flex', flexDirection: 'column', padding: '16px 18px 14px', background: '#fff', borderBottom: `3px solid ${c.primary}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, paddingRight: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
              {logoImg ? <img src={logoImg} width={26} height={26} style={{ width: 26, height: 26, objectFit: 'contain' }} /> : <span style={{ fontSize: 18 }}>🐾</span>}
              <span style={{ fontSize: 15, fontWeight: 700, color: c.primary, letterSpacing: 2.5, fontFamily: 'Oswald' }}>MADVET</span>
              <span style={{ fontSize: 7.5, color: '#aaa', letterSpacing: 1, fontFamily: 'Barlow Condensed' }}>ANIMAL HEALTH CARE</span>
            </div>
            <span style={{ fontSize: nameSz, fontWeight: 700, color: c.primary, letterSpacing: 1.5, lineHeight: 1, fontFamily: 'Oswald' }}>{p.name}</span>
            <span style={{ fontSize: 9.5, color: '#888', marginTop: 4, fontFamily: 'Barlow Condensed' }}>{p.salt}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
              <span style={{ fontSize: 9, color: c.primary, fontWeight: 700, background: c.pale, borderRadius: 4, padding: '2px 8px', fontFamily: 'Barlow Condensed', letterSpacing: 0.5 }}>{p.formulation?.toUpperCase()}</span>
              <span style={{ fontSize: 8.5, color: '#aaa', fontFamily: 'Barlow Condensed' }}>{p.packaging}</span>
            </div>
            {benefits[0] && (
              <div style={{ marginTop: 10, background: c.primary, borderRadius: 5, padding: '6px 14px', display: 'flex', alignSelf: 'flex-start' }}>
                <span style={{ fontSize: 12.5, color: '#fff', fontFamily: 'Noto Sans Devanagari', fontWeight: 700 }}>{benefits[0]}</span>
              </div>
            )}
          </div>
          {/* Rectangular product image — NOT circle (round=true cuts off product packaging) */}
          <div style={{ width: 108, height: 108, borderRadius: 10, background: c.pale, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {productImg
              ? <img src={productImg} width={100} height={100} style={{ objectFit: 'contain', width: 100, height: 100 }} />
              : <span style={{ fontSize: 36 }}>{p.formulation === 'Bolus' ? '💊' : '🧴'}</span>}
          </div>
        </div>
      </div>
      <DescBar p={p} c={c} />
      <div style={{ display: 'flex', padding: '12px 18px 8px', gap: 12 }}>
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: c.primary, fontFamily: 'Noto Sans Devanagari', marginBottom: 8 }}>प्रयोग एवं लक्षण :</span>
          {benefits.slice(1, 7).map((b, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 9, marginBottom: 6, padding: '7px 11px', borderRadius: 7, background: i % 2 === 0 ? c.pale : 'transparent', borderLeft: `3.5px solid ${i % 2 === 0 ? c.primary : c.bright}`, borderTop: '0px', borderRight: '0px', borderBottom: '0px' }}>
              <div style={{ width: 7, height: 7, borderRadius: 4, background: i % 2 === 0 ? c.primary : c.bright, flexShrink: 0, marginTop: 5 }} />
              <span style={{ fontSize: 12, color: '#181818', fontWeight: 600, lineHeight: 1.35, fontFamily: 'Noto Sans Devanagari' }}>{b}</span>
            </div>
          ))}
        </div>
        <div style={{ width: 100, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', background: `linear-gradient(155deg,${c.darkest},${c.primary})`, borderRadius: 10, padding: '12px 8px', alignItems: 'center', width: '100%' }}>
            <span style={{ fontSize: 7.5, color: 'rgba(255,255,255,0.55)', fontFamily: 'Barlow Condensed', letterSpacing: 1.5, marginBottom: 3 }}>{p.formulation?.toUpperCase()}</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#fff', lineHeight: 1.2, letterSpacing: 0.5, fontFamily: 'Oswald', textAlign: 'center' }}>{p.name}</span>
            <span style={{ fontSize: 7.5, color: 'rgba(255,255,255,0.6)', marginTop: 3, fontFamily: 'Barlow Condensed' }}>{p.packaging}</span>
          </div>
          <SpeciesRow sp={p.species} c={c} />
        </div>
      </div>
      <div style={{ height: 3, background: `linear-gradient(90deg,${c.darkest},${c.bright},${c.darkest})`, display: 'flex', margin: '2px 0' }} />
      <Footer c={c} logoImg={logoImg} />
    </div>
  )
}

// ─── TEMPLATE 3: HERBAL (Reproductive / Udder Care) ──────────────────────────
function CardHerbal({ p, c, productImg, logoImg }: any) {
  const benefits = splitBSafe(p.usp_benefits_hi, p.benefits)
  const nameSz = p.name.length > 14 ? 32 : p.name.length > 10 ? 42 : 52
  // Alternate name words white/yellow — only split on spaces, NOT hyphens, to avoid
  // "Tikk's-Stop" → ["Tikk's", "Stop"] making the second word unexpectedly yellow.
  const words = p.name.split(' ').filter(Boolean)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: 480, background: '#fff' }}>
      <div style={{ display: 'flex', flexDirection: 'column', background: `linear-gradient(155deg,${c.darkest} 0%,${c.primary} 55%,${c.bright} 100%)`, padding: '16px 18px 16px' }}>
        <Header p={p} c={c} logoImg={logoImg}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.65)', fontFamily: 'Barlow Condensed', letterSpacing: 0.8 }}>{p.category?.split('/')[0]?.trim()}</span>
            <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.45)', fontFamily: 'Barlow Condensed' }}>{p.packaging}</span>
          </div>
        </Header>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, marginTop: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {words.map((w, i) => (
                <span key={i} style={{ fontSize: nameSz, fontWeight: 700, color: i % 2 === 0 ? '#fff' : '#FFE000', lineHeight: 1, letterSpacing: 2, fontFamily: 'Oswald' }}>{w}</span>
              ))}
            </div>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.72)', marginTop: 5, fontFamily: 'Barlow Condensed' }}>{p.salt?.split(',')[0]?.trim()}</span>
          </div>
          <ProductImg src={productImg} w={90} h={90} emoji="🌿" />
        </div>
        {benefits[0] && (
          <div style={{ display: 'flex', marginTop: 10, alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.13)', borderRadius: 7, padding: '7px 13px', alignSelf: 'flex-start' }}>
            <span style={{ fontSize: 15, lineHeight: 1 }}>🌱</span>
            <span style={{ fontSize: 13, color: '#FFE000', fontWeight: 700, fontFamily: 'Noto Sans Devanagari' }}>{benefits[0]}</span>
          </div>
        )}
      </div>
      {/* DescBar placed ABOVE the benefits heading — was incorrectly sandwiched inside it */}
      <DescBar p={p} c={c} />
      <div style={{ display: 'flex', flexDirection: 'column', padding: '12px 16px 8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 9 }}>
          <div style={{ width: 4, height: 15, background: c.primary, borderRadius: 2 }} />
          <span style={{ fontSize: 12.5, fontWeight: 700, color: c.primary, fontFamily: 'Noto Sans Devanagari' }}>प्रमुख लाभ एवं उपयोग :</span>
        </div>
        {/* 2-column layout using flexbox wrap — NOT CSS Grid (Grid crashes Satori/next/og) */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
          {benefits.slice(1, 7).map((b, i) => (
            <div key={i} style={{ display: 'flex', gap: 7, padding: '8px 10px', background: i < 2 ? c.pale : '#fafafa', borderRadius: 8, alignItems: 'flex-start', width: '46%', flexShrink: 0 }}>
              <span style={{ color: c.primary, fontSize: 12, fontWeight: 700, flexShrink: 0, lineHeight: 1.2, fontFamily: 'Oswald' }}>►</span>
              <span style={{ fontSize: 11, color: '#1e1e1e', lineHeight: 1.35, fontWeight: 600, fontFamily: 'Noto Sans Devanagari' }}>{b}</span>
            </div>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 16px 10px' }}>
        <SpeciesRow sp={p.species} c={c} />
        <div style={{ background: c.pale, borderRadius: 6, padding: '4px 12px' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: c.primary, fontFamily: 'Barlow Condensed' }}>{p.formulation}</span>
        </div>
      </div>
      <div style={{ height: 2, background: `linear-gradient(90deg,${c.darkest},${c.bright})`, display: 'flex', margin: '2px 0' }} />
      <Footer c={c} logoImg={logoImg} />
    </div>
  )
}

// ─── TEMPLATE 4: SHIELD (Dermatological / Topical) ───────────────────────────
function CardShield({ p, c, productImg, logoImg }: any) {
  const benefits = splitBSafe(p.usp_benefits_hi, p.benefits)
  const nameSz = p.name.length > 14 ? 32 : p.name.length > 10 ? 44 : 54
  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: 480, background: '#fff' }}>
      <div style={{ display: 'flex', flexDirection: 'column', background: `linear-gradient(125deg,${c.darkest} 0%,${c.primary} 100%)`, padding: '16px 18px 18px' }}>
        <Header p={p} c={c} logoImg={logoImg}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'rgba(255,255,255,0.15)', borderRadius: 5, padding: '3px 11px' }}>
            <span style={{ fontSize: 10, color: '#FFE000', fontWeight: 700, letterSpacing: 1.5, fontFamily: 'Barlow Condensed' }}>{p.formulation?.toUpperCase()}</span>
            <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.55)', fontFamily: 'Barlow Condensed' }}>{p.packaging}</span>
          </div>
        </Header>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, marginTop: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
            <span style={{ fontSize: nameSz, fontWeight: 700, color: '#fff', letterSpacing: 2, lineHeight: 1, fontFamily: 'Oswald' }}>{p.name}</span>
            <span style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.68)', marginTop: 5, fontFamily: 'Barlow Condensed' }}>{p.salt}</span>
            {benefits[0] && (
              <div style={{ display: 'flex', marginTop: 10, alignSelf: 'flex-start' }}>
                <div style={{ background: '#FFE000', borderRadius: 6, padding: '6px 14px', display: 'flex' }}>
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: c.darkest, fontFamily: 'Noto Sans Devanagari' }}>{benefits[0]}</span>
                </div>
              </div>
            )}
          </div>
          <ProductImg src={productImg} w={96} h={96} emoji={p.formulation === 'Spray' ? '🫧' : '🧼'} />
        </div>
      </div>
      <DescBar p={p} c={c} />
      <div style={{ display: 'flex', flexDirection: 'column', padding: '12px 16px 6px' }}>
        <span style={{ fontSize: 12.5, fontWeight: 700, color: c.primary, fontFamily: 'Noto Sans Devanagari', marginBottom: 9 }}>लाभ एवं उपयोग :</span>
        {benefits.slice(1, 6).map((b, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 7, padding: '9px 12px', borderRadius: 7, background: i === 0 ? c.pale : '#fafafa', borderLeft: `4px solid ${i === 0 ? c.primary : c.bright}`, borderTop: '0px', borderRight: '0px', borderBottom: '0px' }}>
            <div style={{ width: 22, height: 22, borderRadius: 11, background: i === 0 ? c.primary : c.mid, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ fontSize: 12, color: '#fff', fontWeight: 700, fontFamily: 'Oswald' }}>✓</span>
            </div>
            <span style={{ fontSize: 12.5, color: '#111', fontWeight: 600, lineHeight: 1.35, fontFamily: 'Noto Sans Devanagari' }}>{b}</span>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', padding: '4px 16px 10px' }}>
        <SpeciesRow sp={p.species} c={c} />
      </div>
      <div style={{ height: 2, background: `linear-gradient(90deg,${c.darkest},${c.bright})`, display: 'flex', margin: '2px 0' }} />
      <Footer c={c} logoImg={logoImg} />
    </div>
  )
}

// ─── TEMPLATE 5: CLINICAL (Antibiotic / Anti-inflammatory) ───────────────────
function CardClinical({ p, c, productImg, logoImg }: any) {
  const benefits = splitBSafe(p.usp_benefits_hi, p.benefits)
  const nameSz = p.name.length > 14 ? 32 : p.name.length > 10 ? 42 : 52
  const isInj = p.formulation === 'Injection'
  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: 480, background: '#fff' }}>
      <div style={{ display: 'flex', flexDirection: 'column', background: `linear-gradient(135deg,${c.darkest} 0%,${c.dark} 45%,${c.primary} 100%)`, padding: '16px 18px 18px' }}>
        <Header p={p} c={c} logoImg={logoImg}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
            <div style={{ background: c.bright, borderRadius: 4, padding: '2px 10px' }}>
              <span style={{ fontSize: 9.5, color: '#fff', fontWeight: 700, letterSpacing: 0.8, fontFamily: 'Barlow Condensed' }}>{p.category?.split('/')[0]?.trim()}</span>
            </div>
            <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.5)', fontFamily: 'Barlow Condensed' }}>{p.packaging}</span>
          </div>
        </Header>
        {/* Name band */}
        <div style={{ display: 'flex', flexDirection: 'column', background: 'rgba(0,0,0,0.2)', margin: '12px -18px 0', padding: '10px 18px', borderTop: `2px solid ${c.bright}` }}>
          <span style={{ fontSize: nameSz, fontWeight: 700, color: '#fff', letterSpacing: 1.5, lineHeight: 1, fontFamily: 'Oswald' }}>{p.name}</span>
          <span style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.65)', marginTop: 4, fontFamily: 'Barlow Condensed' }}>{p.salt}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
            <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.75)', background: 'rgba(255,255,255,0.13)', borderRadius: 4, padding: '3px 10px', alignSelf: 'flex-start', fontFamily: 'Barlow Condensed', letterSpacing: 0.8 }}>{p.formulation} · {p.packaging}</span>
            {benefits[0] && (
              <span style={{ fontSize: 12.5, color: '#FFE000', fontWeight: 700, marginTop: 9, fontFamily: 'Noto Sans Devanagari' }}>{benefits[0]}</span>
            )}
          </div>
          <ProductImg src={productImg} w={90} h={96} emoji={isInj ? '💉' : '💊'} />
        </div>
      </div>
      <div style={{ height: 3, background: `linear-gradient(90deg,${c.darkest},${c.bright},${c.primary})`, display: 'flex' }} />
      <DescBar p={p} c={c} />
      <div style={{ display: 'flex', flexDirection: 'column', padding: '12px 16px 6px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 9 }}>
          <span style={{ fontSize: 12.5, fontWeight: 700, color: c.primary, fontFamily: 'Noto Sans Devanagari' }}>प्रमुख लाभ</span>
          <span style={{ fontSize: 9, color: '#bbb', fontFamily: 'Barlow Condensed' }}>Key Benefits</span>
        </div>
        {/* Dosage is intentionally NOT shown here — it is internal-only data per DB convention */}
        {benefits.slice(1, 6).map((b, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 7, padding: '9px 12px', borderRadius: 7, background: i === 0 ? c.pale : i === 1 ? '#f3f3f3' : '#fafafa' }}>
            <div style={{ width: 23, height: 23, borderRadius: 12, background: i === 0 ? c.primary : i === 1 ? c.mid : c.bright, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ fontSize: 12, color: '#fff', fontWeight: 700, fontFamily: 'Oswald' }}>{i + 1}</span>
            </div>
            <span style={{ fontSize: 12.5, color: '#111', lineHeight: 1.35, fontWeight: 600, fontFamily: 'Noto Sans Devanagari' }}>{b}</span>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', padding: '4px 16px 10px' }}>
        <SpeciesRow sp={p.species} c={c} />
      </div>
      <div style={{ height: 2, background: `linear-gradient(90deg,${c.darkest},${c.bright})`, display: 'flex', margin: '2px 0' }} />
      <Footer c={c} logoImg={logoImg} />
    </div>
  )
}

const TEMPLATES: Record<string, any> = {
  vitality: CardVitality,
  digest:   CardDigest,
  herbal:   CardHerbal,
  shield:   CardShield,
  clinical: CardClinical,
}

// ─── ROUTE HANDLER ────────────────────────────────────────────────────────────
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await params
  const id = parseInt(rawId, 10)
  if (isNaN(id)) return new Response('Bad ID', { status: 400 })

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const table = (process.env.NEXT_PUBLIC_SUPABASE_TABLE ?? 'products_enriched').trim()

  const [{ data, error }, logoImg, fonts] = await Promise.all([
    sb.from(table)
      .select('id,product_name,salt_ingredient,packaging,formulation,category,species,indication,description,usp_benefits,usp_benefits_hi,image_url')
      .eq('id', id)
      .single(),
    imgURI('https://ai.madvet.in/madvet-icon.png'),
    getFonts(),
  ])

  if (error || !data) return new Response('Not found', { status: 404 })

  const rawCat = (data.category || '').trim()
  const category = CAT_NORMALIZE[rawCat] || rawCat

  const p = {
    id,
    name:          (data.product_name    || '').trim(),
    salt:          (data.salt_ingredient || '').trim(),
    packaging:     (data.packaging       || '').trim(),
    formulation:   (data.formulation     || '').trim(),
    category,
    species:       (data.species         || '').trim(),
    indication:    (data.indication      || '').trim(),
    description:   (data.description     || '').trim(),
    benefits:      (data.usp_benefits    || '').trim(),
    usp_benefits_hi: (data.usp_benefits_hi || '').trim(),
    image_url:     (data.image_url       || '').trim(),
  }

  const c          = getColors(id, category)
  const productImg = await imgURI(p.image_url)
  const tmpl       = getTemplate(category)
  const Card       = TEMPLATES[tmpl]

  const nb     = Math.min(splitBSafe(p.usp_benefits_hi, p.benefits).length, 6)
  const height = Math.min(1400, Math.max(700, 280 + nb * 68 + 260))

  try {
    return new ImageResponse(
      <Card p={p} c={c} productImg={productImg} logoImg={logoImg} />,
      { width: 480, height, fonts }
    )
  } catch (err) {
    console.error('[share-card] RENDER FAILED:', { message: String(err?.message || err), product: p.name, template: tmpl })
    return new Response('Render error: ' + String(err?.message || err).slice(0, 200), { status: 500 })
  }
}
