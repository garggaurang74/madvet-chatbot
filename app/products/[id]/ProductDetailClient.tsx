'use client'

import Link from 'next/link'
import React, { useState, useRef, useEffect } from 'react'
import type { Product } from '../types'

type Lang = 'en' | 'hi'

const HI_SP: Record<string, string> = {
  Cattle: 'गाय', Buffalo: 'भैंस', Sheep: 'भेड़', Goat: 'बकरी',
  Dog: 'कुत्ता', Cat: 'बिल्ली', Poultry: 'मुर्गी', Horse: 'घोड़ा',
}

const HI_CATS: Record<string, string> = {
  'Antibiotic':                    'एंटीबायोटिक',
  'Anti-inflammatory / Analgesic': 'दर्द व बुखार की दवा',
  'Vitamin Supplement':            'विटामिन / पोषण',
  'Anthelmintic / Antiparasitic':  'पेट के कीड़े की दवा',
  'Ectoparasiticide':              'टिक / जूँ की दवा',
  'Reproductive Hormone':          'प्रजनन हार्मोन',
  'Probiotic':                     'पेट के अच्छे बैक्टीरिया',
  'Antidiarrheal':                 'दस्त की दवा',
  'Antihistamine':                 'एलर्जी की दवा',
  'Dermatological':                'त्वचा / चमड़ी की दवा',
  'Udder Care':                    'थन की देखभाल',
}

const HI_FORM: Record<string, string> = {
  'Bolus':         'बोलस (गोली)',
  'Injection':     'इंजेक्शन',
  'Liquid':        'तरल (लिक्विड)',
  'Tablet':        'टैबलेट',
  'Powder':        'पाउडर',
  'Spray':         'स्प्रे',
  'Gel / Ointment':'जेल / मलहम',
  'Soap':          'साबुन',
  'Suspension':    'सस्पेंशन',
  'Pour-On':       'पोर-ऑन',
  'Other':         'अन्य',
}

const CAT_COLORS: Record<string, string> = {
  'Antibiotic':                    '#3b82f6',
  'Anti-inflammatory / Analgesic': '#f59e0b',
  'Vitamin Supplement':            '#10b981',
  'Anthelmintic / Antiparasitic':  '#8b5cf6',
  'Ectoparasiticide':              '#ef4444',
  'Reproductive Hormone':          '#f472b6',
  'Probiotic':                     '#14b8a6',
  'Antidiarrheal':                 '#84cc16',
  'Antihistamine':                 '#a78bfa',
  'Dermatological':                '#fb7185',
  'Udder Care':                    '#2dd4bf',
}
const getColor = (cat: string) => CAT_COLORS[cat] || '#94a3b8'

const SPECIES_EMOJI: Record<string, string> = {
  Cattle: '🐄', Buffalo: '🐃', Sheep: '🐑', Goat: '🐐',
  Dog: '🐕', Cat: '🐈', Poultry: '🐓', Horse: '🐴',
}

// ── Share card color + template logic (mirrors ShareCards-Premium) ──────────
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

function getShareColors(id: number, category: string) {
  const base = CAT_PALETTES[category] ?? { h: 220, s: 70, l: 28 }
  const shift = ((id * 37 + 13) % 41) - 20
  const h = (base.h + shift + 360) % 360
  const { s, l } = base
  return {
    h, s, l,
    primary:  `hsl(${h},${s}%,${l}%)`,
    bright:   `hsl(${h},${s}%,${l + 14}%)`,
    dark:     `hsl(${h},${s}%,${l - 10}%)`,
    darkest:  `hsl(${h},${s}%,${l - 18}%)`,
    pale:     `hsl(${h},${s - 20}%,95%)`,
    mid:      `hsl(${h},${s}%,${l + 7}%)`,
    glow:     `hsla(${h},${s}%,${l + 10}%,0.35)`,
  }
}

function getTemplate(category: string) {
  if (['Vitamin Supplement', 'Vitamin Supplement / Galactogogue'].includes(category)) return 'vitality'
  if (['Probiotic', 'Digestive / Antiflatulent', 'Antidiarrheal'].includes(category)) return 'digest'
  if (['Reproductive Hormone', 'Udder Care / Herbal Antimicrobial'].includes(category)) return 'herbal'
  if (['Dermatological', 'Ectoparasiticide', 'Antihistamine'].includes(category)) return 'shield'
  return 'clinical'
}

// ── Detect if a string contains Hindi/Devanagari characters
const isHindi = (s: string) => /[\u0900-\u097F]/.test(s)

// ── Font helper: pick correct font family based on content language
function benefitFont(text: string): string {
  return isHindi(text)
    ? "'Noto Sans Devanagari',sans-serif"
    : "'Barlow Condensed','Arial Narrow',sans-serif"
}
function benefitFontSize(text: string, base = 13): number {
  return isHindi(text) ? base : base + 1.5
}

// usp_benefits_hi uses । (Hindi danda) as sentence terminator — must be in the split regex
function splitBenefits(txt = '') {
  return txt
    .split(/[•\n,;|।]+/)
    .map(s => s.trim())
    .filter(s => s.length > 6)
    .slice(0, 8)
}

// Safe wrapper: if split gives < 2 items, fall back to English, then sentence-split
function splitBenefitsSafe(hi = '', en = '') {
  const primary = splitBenefits(hi)
  if (primary.length >= 2) return primary
  const fromEn = splitBenefits(en)
  if (fromEn.length >= 2) return fromEn
  const fromSent = hi.split(/[.।]+/).map(s => s.trim()).filter(s => s.length > 8)
  return fromSent.length >= 2 ? fromSent.slice(0, 8) : (primary.length ? primary : fromEn)
}

// ── Hindi lookup for common indication terms → benefit phrases
const HI_IND: Record<string, string> = {
  'fever': 'बुखार में असरदार',
  'pain': 'दर्द से जल्दी राहत',
  'inflammation': 'सूजन कम करे',
  'arthritis': 'गठिया में असरदार',
  'infection': 'संक्रमण से लड़े',
  'bacterial infections': 'बैक्टीरिया संक्रमण में कारगर',
  'respiratory': 'श्वसन रोग में राहत',
  'mastitis': 'थनिका (mastitis) में कारगर',
  'lameness': 'लंगड़ेपन में राहत',
  'colic': 'पेट दर्द (कोलिक) में असरदार',
  'diarrhea': 'दस्त रोकने में कारगर',
  'deworming': 'पेट के कीड़े खत्म करे',
  'ticks': 'टिक्स और जूँ से बचाव',
  'skin': 'त्वचा रोग में लाभकारी',
  'udder': 'थन की सेहत सुधारे',
  'milk': 'दूध उत्पादन बढ़ाए',
  'reproductive': 'प्रजनन क्षमता सुधारे',
  'heat': 'मद चक्र नियमित करे',
  'liver': 'लिवर की देखभाल',
  'calcium': 'कैल्शियम की कमी पूरी करे',
  'vitamin': 'विटामिन की कमी दूर करे',
  'bloat': 'गैस और अफारे से राहत',
  'worm': 'कृमि (कीड़े) खत्म करे',
  'mange': 'खुजली और स्कैबीज में कारगर',
  'antibiotic': 'बैक्टीरिया संक्रमण में कारगर',
}

// ── Augment benefit list to minimum `minCount` using indication + description fields
function augmentBenefits(
  hiList: string[],
  enList: string[],
  indication = '',
  description = '',
  minCount = 4
): { hi: string[]; en: string[] } {
  if (hiList.length >= minCount) return { hi: hiList, en: enList }

  const needed = minCount - hiList.length
  const newHi: string[] = []
  const newEn: string[] = []

  // Try to extract from indication field
  const indTerms = indication
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(s => s.length > 2 && !/[\u0900-\u097F]/.test(s)) // English only

  for (const term of indTerms) {
    if (newHi.length >= needed) break
    // Skip if this term is already covered in existing benefits
    const covered = [...hiList, ...newHi].some(b => b.toLowerCase().includes(term))
      || [...enList, ...newEn].some(b => b.toLowerCase().includes(term))
    if (covered) continue

    // Look for a matching Hindi phrase
    const hiPhrase = Object.entries(HI_IND).find(([k]) => term.includes(k))?.[1]
    if (hiPhrase && !hiList.includes(hiPhrase)) {
      newHi.push(hiPhrase)
      // Create English version
      const enPhrase = term.length < 3 ? `Treats ${term}` :
        term.charAt(0).toUpperCase() + term.slice(1)
      newEn.push(enPhrase)
    }
  }

  // If still not enough, try splitting description into sentences
  if (newHi.length < needed) {
    const descSentences = description
      .split(/\.\s+/)
      .map(s => s.trim())
      .filter(s => s.length > 20 && s.length < 120)
      .filter(s => !s.toLowerCase().includes('for cattle') && !s.toLowerCase().includes('for use'))
    for (const s of descSentences) {
      if (newHi.length >= needed) break
      const covered = [...hiList, ...enList, ...newEn].some(b => b.toLowerCase().includes(s.slice(0, 15).toLowerCase()))
      if (!covered) {
        newHi.push(s)
        newEn.push(s)
      }
    }
  }

  return {
    hi: [...hiList, ...newHi].slice(0, 5),
    en: [...enList, ...newEn].slice(0, 5),
  }
}

// ── Description / indication helpers ────────────────────────────────────────
function getDescExcerpt(desc = '', maxLen = 145) {
  if (!desc) return ''
  const first = desc.split(/\.\s+/)[0]
  const t = first.length <= maxLen ? first : first.slice(0, maxLen).replace(/\s\S+$/, '') + '…'
  return t.endsWith('.') ? t : t + '.'
}

function getIndicationTags(indication = '') {
  return indication
    .split(/[,،]+/)
    .map(s => s.trim())
    .filter(s => s.length > 2 && s.length < 28 && /^[a-zA-Z\s\/\-]+$/.test(s))
    .slice(0, 4)
}

function ShareDescBar({ p, c }: { p: Product; c: ReturnType<typeof getShareColors> }) {
  const desc = getDescExcerpt(p.description)
  const tags = getIndicationTags(p.indication)
  if (!desc && tags.length === 0) return null
  return (
    <div style={{ margin: '0', padding: '10px 18px 8px', background: c.pale, borderBottom: `1.5px solid ${c.primary}18` }}>
      {desc && (
        <p style={{ margin: '0 0 6px', fontSize: 10.5, color: '#2a2a2a', lineHeight: 1.5, fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 600, fontStyle: 'italic' }}>
          {desc}
        </p>
      )}
      {tags.length > 0 && (
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: 8.5, color: c.primary, fontWeight: 800, letterSpacing: 1, fontFamily: "'Oswald',sans-serif" }}>TREATS:</span>
          {tags.map((t, i) => (
            <span key={i} style={{ fontSize: 9, color: c.dark, background: `${c.primary}14`, border: `1px solid ${c.primary}25`, borderRadius: 20, padding: '2px 8px', fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 600, letterSpacing: 0.3 }}>
              {t}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Shared share-card sub-components ────────────────────────────────────────
/* ── Real logo using actual uploaded images ── */
function ShareMadvetLogoLight({ size = 1, logoSrc }: { size?: number; logoSrc?: string }) {
  const h = Math.round(52 * size)
  // logoSrc is a pre-inverted base64 version passed during export so html2canvas can render it
  const src = logoSrc || '/madvet-icon.png'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: Math.round(8 * size), flexShrink: 0 }}>
      <img src={src} alt="Madvet"
        style={{ height: h, width: h, objectFit: 'contain', ...(logoSrc ? {} : { filter: 'brightness(0) invert(1)' }) }} />
      <div>
        <div style={{ fontFamily: "'Oswald','Arial Black',sans-serif", fontSize: Math.round(22 * size), fontWeight: 900, color: '#fff', letterSpacing: 3, lineHeight: 1 }}>MADVET</div>
        <div style={{ fontFamily: "'Barlow Condensed','Arial Narrow',sans-serif", fontSize: Math.round(9 * size), color: 'rgba(255,255,255,0.75)', letterSpacing: 1.5, marginTop: 1, fontWeight: 600 }}>ANIMAL HEALTH CARE</div>
        <div style={{ fontFamily: "'Barlow Condensed','Arial Narrow',sans-serif", fontSize: Math.round(7.5 * size), color: 'rgba(255,255,255,0.5)', letterSpacing: 0.8, marginTop: 1 }}>AN I.S.O. 9001:2013 COMPANY</div>
      </div>
    </div>
  )
}

function ShareImgBox({ url, w, h, c, emoji = '🧴', round = false }: { url: string; w: number; h: number; c: ReturnType<typeof getShareColors>; emoji?: string; round?: boolean }) {
  const [err, setErr] = useState(false)
  const style: { width: number; height: number; flexShrink: number; overflow: string; borderRadius: number | string; background: string; border: string; display: string; alignItems: string; justifyContent: string; boxShadow: string } = {
    width: w, height: h, flexShrink: 0, overflow: 'hidden',
    borderRadius: 12,
    background: `linear-gradient(145deg,${c.pale},white)`,
    border: `2px solid ${c.primary}30`,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: `0 6px 24px ${c.glow}, 0 2px 8px rgba(0,0,0,0.12)`,
  }
  if (url && !err) return (
    <div style={style}>
      <img src={url} onError={() => setErr(true)}
        style={{ width: '100%', height: '100%', objectFit: round ? 'cover' : 'contain' }} />
    </div>
  )
  return (
    <div style={style}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: w * 0.32 }}>{emoji}</div>
        <div style={{ fontSize: 8, color: c.primary, opacity: 0.5, marginTop: 4, fontFamily: "'Barlow Condensed',sans-serif", letterSpacing: 0.5 }}>IMAGE COMING SOON</div>
      </div>
    </div>
  )
}

function ShareSpecies({ sp = '', c }: { sp: string; c: ReturnType<typeof getShareColors> }) {
  const arr = sp.split(/[,/]/).map(s => s.trim()).filter(Boolean).slice(0, 5)
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, justifyContent: 'center', overflow: 'hidden' }}>
      {arr.map(s => (
        <div key={s} style={{ background: `${c.primary}18`, border: `1.5px solid ${c.primary}55`, borderRadius: 4, padding: '3px 7px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 9, fontWeight: 700, color: c.dark, fontFamily: "'Barlow Condensed',sans-serif", letterSpacing: 0.5, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{s}</span>
        </div>
      ))}
    </div>
  )
}

function ShareAllProductsTag({ c }: { c: ReturnType<typeof getShareColors> }) {
  return (
    <div style={{ margin: '8px 0 0', background: `linear-gradient(90deg, ${c.darkest}, ${c.primary})`, padding: '9px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', border: '1.5px solid rgba(255,255,255,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, color: '#fff', fontWeight: 700 }}>→</div>
        <div>
          <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.55)', fontFamily: "'Barlow Condensed',sans-serif", letterSpacing: 2, textTransform: 'uppercase' }}>View all products · सभी उत्पाद</div>
          <div style={{ fontSize: 14, color: '#fff', fontWeight: 700, fontFamily: "'Oswald',sans-serif", letterSpacing: 1, lineHeight: 1.2 }}>madvet.in/products</div>
        </div>
      </div>
      <div style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 6, padding: '4px 12px', textAlign: 'center' }}>
        <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.55)', fontFamily: "'Barlow Condensed',sans-serif", letterSpacing: 1 }}>AI ASSISTANT</div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.9)', fontFamily: "'Oswald',sans-serif", letterSpacing: 0.5 }}>ai.madvet.in</div>
      </div>
    </div>
  )
}

function ShareFooter({ c }: { c: ReturnType<typeof getShareColors> }) {
  return (
    <div style={{ position: 'relative', overflow: 'hidden' }}>
      <div style={{ height: 4, background: `linear-gradient(90deg,${c.darkest},${c.bright},${c.darkest})` }} />
      <div style={{ background: 'linear-gradient(135deg, #FFE600 0%, #FFD000 50%, #FFE600 100%)', padding: '14px 20px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -30, right: -30, width: 130, height: 130, borderRadius: '50%', background: 'rgba(255,255,255,0.18)' }} />
        <div style={{ position: 'absolute', bottom: -20, left: -20, width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.10)' }} />
        <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Real logo icon in white bg box, exactly like physical flyers */}
            <div style={{ background: '#fff', borderRadius: 8, padding: '4px 6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img src="/madvet-icon.png" alt="Madvet" style={{ height: 44, width: 44, objectFit: 'contain' }} />
            </div>
            <div>
              <div style={{ fontFamily: "'Oswald','Arial Black',sans-serif", fontSize: 28, fontWeight: 900, color: '#1a2f8a', letterSpacing: 3, lineHeight: 1 }}>MADVET</div>
              <div style={{ fontFamily: "'Barlow Condensed','Arial Narrow',sans-serif", fontSize: 10, color: '#1a2f8a', letterSpacing: 1.5, marginTop: 1, fontWeight: 700 }}>ANIMAL HEALTH CARE</div>
              <div style={{ fontFamily: "'Barlow Condensed','Arial Narrow',sans-serif", fontSize: 8, color: '#555', letterSpacing: 0.8, marginTop: 1 }}>Ghaziabad (U.P.)</div>
            </div>
          </div>
          <div style={{ textAlign: 'right', fontFamily: "'Barlow Condensed',sans-serif", fontSize: 8.5, color: '#333', lineHeight: 1.75, letterSpacing: 0.3 }}>
            <div style={{ fontWeight: 700, color: '#111' }}>AN I.S.O. 9001:2013 COMPANY</div>
            <div>Email: madvet.animal@gmail.com</div>
            <div>web: www.madvet.in | support@madvet.in</div>
            <div style={{ fontWeight: 800, color: '#1a2f8a', fontSize: 10, marginTop: 1 }}>Toll Free No. 9935257750, 8400347331</div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Arrow slab (vitality template) ──────────────────────────────────────────
function ArrowSlab({ text, enText, c, big = true }: { text: string; enText: string; c: ReturnType<typeof getShareColors>; big?: boolean }) {
  return (
    <div style={{ position: 'relative', marginBottom: big ? 7 : 5, display: 'flex' }}>
      <div style={{ flex: 1, background: big ? `linear-gradient(90deg,${c.darkest},${c.primary})` : `linear-gradient(90deg,${c.primary},${c.mid})`, borderRadius: '6px 0 0 6px', padding: big ? '9px 40px 9px 14px' : '6px 36px 6px 12px', boxShadow: big ? `2px 3px 14px ${c.glow}` : 'none' }}>
        <div style={{ position: 'absolute', right: -15, top: 0, bottom: 0, width: 0, borderTop: `${big ? 22 : 17}px solid transparent`, borderBottom: `${big ? 22 : 17}px solid transparent`, borderLeft: `15px solid ${big ? c.primary : c.mid}` }} />
        <div style={{ marginTop: -3, fontSize: benefitFontSize(text, big ? 12.5 : 11), fontFamily: benefitFont(text), color: '#fff', fontWeight: big ? 800 : 600, lineHeight: 1.3 }}>{text}</div>
        {enText && <div style={{ margin: 0, paddingTop: 2, fontSize: 9, color: 'rgba(255,255,255,0.58)', fontFamily: "'Barlow Condensed',sans-serif", letterSpacing: 0.3 }}>{enText}</div>}
      </div>
    </div>
  )
}

// ── 5 share card templates ───────────────────────────────────────────────────
function ShareCardVitality({ p, c, logoSrc }: { p: Product; c: ReturnType<typeof getShareColors>; logoSrc?: string }) {
  const _hiRaw = splitBenefitsSafe(p.usp_benefits_hi || '', p.benefits)
  const _enRaw = splitBenefits(p.benefits)
  const { hi, en } = augmentBenefits(_hiRaw, _enRaw, p.indication || '', p.description || '')
  const nameFontSize = p.name.length > 12 ? 44 : p.name.length > 9 ? 54 : 66
  return (
    <div style={{ width: 480, background: '#fff', fontFamily: "'Barlow Condensed',sans-serif", boxShadow: '0 20px 70px rgba(0,0,0,0.28)' }}>
      <div style={{ position: 'relative', overflow: 'hidden', background: `linear-gradient(135deg,${c.darkest} 0%,${c.primary} 55%,${c.bright} 100%)`, padding: '18px 20px 60px' }}>

        <div style={{ position: 'absolute', right: -60, top: -60, width: 220, height: 220, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }} />
        <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <ShareMadvetLogoLight size={0.9} logoSrc={logoSrc} />
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.65)', letterSpacing: 1 }}>{p.packaging}</div>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)', letterSpacing: 0.5 }}>{p.formulation}</div>
          </div>
        </div>
        <div style={{ marginTop: 10, position: 'relative' }}>
          <div style={{ fontFamily: "'Oswald',sans-serif", fontWeight: 700, fontSize: nameFontSize, color: '#fff', letterSpacing: 3, lineHeight: 0.95, textShadow: '0 4px 20px rgba(0,0,0,0.4)' }}>{p.name}</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 5, letterSpacing: 0.5 }}>{p.salt}</div>
        </div>
      </div>
      <div style={{ position: 'relative', marginTop: -28, zIndex: 2 }}>
        <div style={{ background: '#FFE000', margin: '0 24px', borderRadius: 6, padding: '7px 16px', boxShadow: '0 4px 16px rgba(0,0,0,0.18)', display: 'inline-block' }}>
          <span style={{ fontFamily: "'Noto Sans Devanagari',sans-serif", fontWeight: 800, fontSize: 14, color: c.darkest }}>{hi[0] || p.name}</span>
        </div>
      </div>
      <ShareDescBar p={p} c={c} />
      <div style={{ display: 'flex', padding: '16px 16px 6px', gap: 14 }}>
        <div style={{ flex: 1 }}>
          {hi.slice(0, 7).map((b, i) => <ArrowSlab key={i} text={b} enText={en[i] || ''} c={c} big={i === 0 || i === 1 || i === 3 || i === 5} />)}
        </div>
        <div style={{ width: 118, display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
          <ShareImgBox url={p.image_url} w={114} h={160} c={c} emoji={p.formulation === 'Bolus' ? '💊' : '🧴'} />
          <ShareSpecies sp={p.species} c={c} />
        </div>
      </div>
      <ShareAllProductsTag c={c} />
      <ShareFooter c={c} />
    </div>
  )
}

function ShareCardDigest({ p, c, logoSrc }: { p: Product; c: ReturnType<typeof getShareColors>; logoSrc?: string }) {
  const _hiRaw = splitBenefitsSafe(p.usp_benefits_hi || '', p.benefits)
  const _enRaw = splitBenefits(p.benefits)
  const { hi, en } = augmentBenefits(_hiRaw, _enRaw, p.indication || '', p.description || '')
  return (
    <div style={{ width: 480, background: '#fff', fontFamily: "'Barlow Condensed',sans-serif", boxShadow: '0 20px 70px rgba(0,0,0,0.26)' }}>
      <div style={{ padding: '16px 20px 0', background: '#fff' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#c8220a', fontFamily: "'Noto Sans Devanagari',sans-serif", lineHeight: 1.3, marginBottom: 6 }}>{(p.indication || 'असरदार और तुरंत राहत').split(/[,،]/)[0].trim()}</div>
            <div style={{ fontFamily: "'Oswald',sans-serif", fontWeight: 700, fontSize: p.name.length > 12 ? 36 : p.name.length > 8 ? 46 : 56, color: c.primary, textShadow: `3px 3px 0 ${c.dark}55, 5px 5px 0 rgba(0,0,0,0.08)`, letterSpacing: 2, lineHeight: 1 }}>{p.name}</div>
            <div style={{ display: 'inline-block', marginTop: 6, background: c.pale, border: `1.5px solid ${c.primary}40`, borderRadius: 4, padding: '3px 10px' }}>
              <span style={{ fontSize: 11, color: c.primary, fontWeight: 700, letterSpacing: 2 }}>{p.formulation?.toUpperCase()}</span>
            </div>
            <div style={{ marginTop: 8, background: c.primary, borderRadius: 4, padding: '6px 14px', display: 'inline-block' }}>
              <span style={{ fontSize: 13, color: '#fff', fontFamily: "'Noto Sans Devanagari',sans-serif", fontWeight: 700 }}>{hi[0] || 'तुरंत असर, लंबे समय तक फायदा'}</span>
            </div>
          </div>
          <div style={{ flexShrink: 0, paddingTop: 4 }}>
            <ShareImgBox url={p.image_url} w={120} h={120} c={c} emoji="💊" />
          </div>
        </div>
      </div>
      <div style={{ height: 3, background: `linear-gradient(90deg,${c.darkest},${c.bright},${c.darkest}20)`, margin: '12px 0 0' }} />
      <ShareDescBar p={p} c={c} />
      <div style={{ padding: '12px 20px', display: 'flex', gap: 14 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <div style={{ fontFamily: "'Noto Sans Devanagari',sans-serif", fontSize: 13, fontWeight: 800, color: c.primary }}>प्रयोग एवं लक्षण :</div>
            <div style={{ flex: 1, height: 1.5, background: `${c.primary}30` }} />
          </div>
          {hi.slice(0, 7).map((b, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8, padding: '6px 10px', borderRadius: 6, background: i % 2 === 0 ? c.pale : 'transparent', borderLeft: `3px solid ${i % 2 === 0 ? c.primary : c.bright}` }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: c.primary, flexShrink: 0, marginTop: 5 }} />
              <div>
                <div style={{ marginTop: -3, fontSize: benefitFontSize(b, 12), fontFamily: benefitFont(b), color: '#1a1a1a', fontWeight: isHindi(b) ? 600 : 700, lineHeight: 1.35 }}>{b}</div>
                {en[i] && <div style={{ paddingTop: 1, fontSize: 9.5, color: '#888', fontFamily: "'Barlow Condensed',sans-serif" }}>{en[i]}</div>}
              </div>
            </div>
          ))}
        </div>
        <div style={{ width: 108, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center', paddingTop: 4 }}>
          <div style={{ background: `linear-gradient(160deg,${c.darkest},${c.primary})`, borderRadius: 10, padding: '14px 8px', textAlign: 'center', width: '100%', boxShadow: `0 4px 16px ${c.glow}` }}>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.6)', fontFamily: "'Barlow Condensed',sans-serif", letterSpacing: 1.5, marginBottom: 4 }}>{p.formulation?.toUpperCase()}</div>
            <div style={{ fontFamily: "'Oswald',sans-serif", fontSize: 15, fontWeight: 700, color: '#fff', lineHeight: 1.15, letterSpacing: 1 }}>{p.name}</div>
            <div style={{ fontSize: 8.5, color: 'rgba(255,255,255,0.65)', marginTop: 4 }}>{p.packaging}</div>
          </div>
          <div style={{ background: c.pale, borderRadius: 8, padding: '8px', textAlign: 'center', border: `1px solid ${c.primary}25`, width: '100%' }}>
            <div style={{ fontSize: 8.5, color: c.primary, fontWeight: 700, fontFamily: "'Barlow Condensed',sans-serif", letterSpacing: 1, marginBottom: 5 }}>SPECIES</div>
            <ShareSpecies sp={p.species} c={c} />
          </div>
        </div>
      </div>
      <div style={{ height: 5, background: `linear-gradient(90deg,${c.darkest},${c.bright},${c.darkest}60)`, marginBottom: 6 }} />
      <ShareAllProductsTag c={c} />
      <ShareFooter c={c} />
    </div>
  )
}

function ShareCardHerbal({ p, c, logoSrc }: { p: Product; c: ReturnType<typeof getShareColors>; logoSrc?: string }) {
  const _hiRaw = splitBenefitsSafe(p.usp_benefits_hi || '', p.benefits)
  const _enRaw = splitBenefits(p.benefits)
  const { hi, en } = augmentBenefits(_hiRaw, _enRaw, p.indication || '', p.description || '')
  const c2 = `hsl(${(c.h + 40) % 360},75%,36%)`
  return (
    <div style={{ width: 480, background: '#fff', fontFamily: "'Barlow Condensed',sans-serif", boxShadow: '0 20px 70px rgba(0,0,0,0.26)' }}>
      <div style={{ background: `linear-gradient(160deg,${c.darkest} 0%,${c.primary} 60%,${c2} 100%)`, padding: '16px 20px 18px', position: 'relative', overflow: 'hidden' }}>

        <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <ShareMadvetLogoLight size={0.88} logoSrc={logoSrc} />
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', letterSpacing: 1, fontStyle: 'italic' }}>{p.category}</div>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)' }}>{p.packaging}</div>
          </div>
        </div>
        <div style={{ marginTop: 10, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "'Oswald',sans-serif", fontWeight: 700, fontSize: p.name.length > 14 ? 32 : p.name.length > 10 ? 42 : 50, lineHeight: 1, letterSpacing: 2, color: '#fff', textShadow: '0 3px 14px rgba(0,0,0,0.35)' }}>
              {p.name.split(/[-\s]/).map((w, i) => <span key={i} style={{ color: i % 2 === 0 ? '#fff' : '#FFE000', marginRight: 4 }}>{w}{p.name.includes('-') && i < p.name.split(/[-\s]/).length - 1 ? '-' : ''}</span>)}
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.78)', marginTop: 5, letterSpacing: 0.5 }}>{p.salt?.split(',')[0]?.trim()}</div>
          </div>
          <ShareImgBox url={p.image_url} w={100} h={100} c={c} emoji="🌿" />
        </div>
        <div style={{ marginTop: 10, background: 'rgba(255,255,255,0.15)', borderRadius: 6, padding: '6px 14px', border: '1px solid rgba(255,255,255,0.25)', display: 'inline-flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 16, lineHeight: 1 }}>🌱</span>
          <span style={{ fontFamily: "'Noto Sans Devanagari',sans-serif", fontSize: 13, color: '#FFE000', fontWeight: 700 }}>{hi[0] || (p.indication || '').split(/[,،]/)[0].trim()}</span>
        </div>
      </div>
      <div style={{ padding: '14px 18px 8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <div style={{ width: 4, height: 16, background: c.primary, borderRadius: 2 }} />
          <span style={{ fontFamily: "'Noto Sans Devanagari',sans-serif", fontSize: 13, fontWeight: 800, color: c.primary }}>प्रमुख लाभ एवं उपयोग :</span>
          <div style={{ flex: 1, height: 1, background: `${c.primary}20` }} />
        </div>
        <ShareDescBar p={p} c={c} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7, marginTop: 8 }}>
          {hi.slice(0, 6).map((b, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, padding: '7px 10px', background: i < 2 ? c.pale : '#fafafa', borderRadius: 7, border: `1px solid ${i < 2 ? c.primary + '33' : '#eeeeee'}`, alignItems: 'flex-start' }}>
              <span style={{ color: c.primary, fontSize: 15, fontWeight: 900, flexShrink: 0, lineHeight: 1.2, marginTop: 2 }}>►</span>
              <div>
                <div style={{ marginTop: -3, fontSize: benefitFontSize(b, 11), fontFamily: benefitFont(b), color: '#222', lineHeight: 1.35, fontWeight: isHindi(b) ? 500 : 700 }}>{b}</div>
                {en[i] && <div style={{ paddingTop: 1, fontSize: 8.5, color: '#999', fontFamily: "'Barlow Condensed',sans-serif" }}>{en[i]}</div>}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ padding: '0 18px 6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <ShareSpecies sp={p.species} c={c} />
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 9, color: '#aaa', letterSpacing: 0.5 }}>FORMULATION</div>
          <div style={{ fontSize: 12, fontWeight: 700, color: c.primary }}>{p.formulation}</div>
        </div>
      </div>
      <ShareAllProductsTag c={c} />
      <ShareFooter c={c} />
    </div>
  )
}

function ShareCardShield({ p, c, logoSrc }: { p: Product; c: ReturnType<typeof getShareColors>; logoSrc?: string }) {
  const _hiRaw = splitBenefitsSafe(p.usp_benefits_hi || '', p.benefits)
  const _enRaw = splitBenefits(p.benefits)
  const { hi, en } = augmentBenefits(_hiRaw, _enRaw, p.indication || '', p.description || '')
  return (
    <div style={{ width: 480, background: '#fff', fontFamily: "'Barlow Condensed',sans-serif", boxShadow: '0 20px 70px rgba(0,0,0,0.28)' }}>
      <div style={{ background: `linear-gradient(125deg,${c.darkest} 0%,${c.primary} 100%)`, padding: '18px 20px 22px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: '45%', background: 'linear-gradient(135deg,transparent 40%,rgba(255,255,255,0.07) 100%)' }} />
        <div style={{ position: 'absolute', bottom: -30, right: -30, width: 150, height: 150, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.12)' }} />
        <div style={{ position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
            <ShareMadvetLogoLight size={0.88} logoSrc={logoSrc} />
            <div style={{ background: 'rgba(255,255,255,0.18)', borderRadius: 5, padding: '4px 12px', border: '1px solid rgba(255,255,255,0.3)' }}>
              <div style={{ fontSize: 11, color: '#FFE000', fontWeight: 700, letterSpacing: 2 }}>{p.formulation?.toUpperCase()}</div>
              <div style={{ fontSize: 8.5, color: 'rgba(255,255,255,0.65)', textAlign: 'center' }}>{p.packaging}</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: "'Oswald',sans-serif", fontWeight: 700, fontSize: p.name.length > 14 ? 34 : p.name.length > 10 ? 44 : 54, color: '#fff', letterSpacing: 2, lineHeight: 1, textShadow: '0 3px 20px rgba(0,0,0,0.4)' }}>{p.name}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.72)', marginTop: 6, letterSpacing: 0.5 }}>{p.salt}</div>
              <div style={{ marginTop: 10, background: '#FFE000', borderRadius: 5, padding: '5px 14px', display: 'inline-block' }}>
                <span style={{ fontFamily: "'Noto Sans Devanagari',sans-serif", fontSize: 13, fontWeight: 800, color: c.darkest }}>{hi[0] || (p.indication || '').split(/[,،]/)[0].trim()}</span>
              </div>
            </div>
            <ShareImgBox url={p.image_url} w={108} h={108} c={c} emoji={p.formulation === 'Spray' ? '🫧' : '🧼'} />
          </div>
        </div>
      </div>
      <div style={{ padding: '14px 18px 6px' }}>
        <ShareDescBar p={p} c={c} />
        <div style={{ fontSize: 13, fontWeight: 800, color: c.primary, fontFamily: "'Noto Sans Devanagari',sans-serif", marginBottom: 10, marginTop: 8 }}>लाभ एवं उपयोग :</div>
        {hi.slice(0, 5).map((b, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 7, padding: '8px 12px', borderRadius: 7, background: `linear-gradient(90deg,${c.pale},white)`, border: `1px solid ${c.primary}25`, borderLeft: `4px solid ${i === 0 ? c.primary : c.bright}`, boxShadow: i === 0 ? `2px 2px 12px ${c.glow}` : 'none' }}>
            <div style={{ width: 22, height: 22, borderRadius: '50%', background: c.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2, boxShadow: `0 2px 8px ${c.glow}` }}>
              <span style={{ fontSize: 13, color: '#fff', fontWeight: 900 }}>✓</span>
            </div>
            <div>
              <div style={{ marginTop: -3, fontSize: benefitFontSize(b, 12), fontFamily: benefitFont(b), color: '#111', fontWeight: isHindi(b) ? 600 : 700, lineHeight: 1.35 }}>{b}</div>
              {en[i] && <div style={{ paddingTop: 1, fontSize: 9.5, color: '#888', fontFamily: "'Barlow Condensed',sans-serif" }}>{en[i]}</div>}
            </div>
          </div>
        ))}
      </div>
      <div style={{ padding: '4px 18px 8px' }}>
        <ShareSpecies sp={p.species} c={c} />
      </div>
      <ShareAllProductsTag c={c} />
      <ShareFooter c={c} />
    </div>
  )
}

function ShareCardClinical({ p, c, logoSrc }: { p: Product; c: ReturnType<typeof getShareColors>; logoSrc?: string }) {
  const _hiRaw = splitBenefitsSafe(p.usp_benefits_hi || '', p.benefits)
  const _enRaw = splitBenefits(p.benefits)
  const { hi, en } = augmentBenefits(_hiRaw, _enRaw, p.indication || '', p.description || '')
  const isInj = p.formulation === 'Injection'
  return (
    <div style={{ width: 480, background: '#fff', fontFamily: "'Barlow Condensed',sans-serif", boxShadow: '0 20px 70px rgba(0,0,0,0.28)' }}>
      <div style={{ background: `linear-gradient(135deg,hsl(${c.h},${c.s}%,${c.l - 18}%) 0%,hsl(${c.h},${c.s}%,${c.l - 10}%) 50%,${c.primary} 100%)`, padding: '16px 20px 20px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, opacity: 0.04, backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 24px,rgba(255,255,255,1) 24px,rgba(255,255,255,1) 25px),repeating-linear-gradient(90deg,transparent,transparent 24px,rgba(255,255,255,1) 24px,rgba(255,255,255,1) 25px)' }} />
        <div style={{ position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <ShareMadvetLogoLight size={0.88} logoSrc={logoSrc} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5, alignItems: 'flex-end' }}>
              <div style={{ background: c.primary, borderRadius: 4, padding: '3px 10px' }}>
                <span style={{ fontSize: 10, color: '#fff', fontWeight: 700, letterSpacing: 1 }}>{p.category?.split('/')[0]?.trim()}</span>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: "'Oswald',sans-serif", fontWeight: 700, fontSize: p.name.length > 14 ? 32 : p.name.length > 10 ? 42 : 52, color: '#fff', letterSpacing: 1.5, lineHeight: 1, textShadow: '0 3px 16px rgba(0,0,0,0.35)' }}>{p.name}</div>
              <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.72)', marginTop: 5, letterSpacing: 0.3, fontStyle: 'italic' }}>{p.salt}</div>
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 4, padding: '3px 10px', border: '1px solid rgba(255,255,255,0.2)' }}>
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.85)', letterSpacing: 1 }}>{p.packaging}</span>
                </div>
              </div>
            </div>
            <ShareImgBox url={p.image_url} w={104} h={110} c={c} emoji={isInj ? '💉' : '💊'} />
          </div>
        </div>
      </div>
      <div style={{ height: 4, background: `linear-gradient(90deg,${c.darkest},${c.bright},hsl(${(c.h + 35) % 360},90%,52%))` }} />
      <ShareDescBar p={p} c={c} />
      <div style={{ padding: '14px 18px 6px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <div style={{ fontFamily: "'Noto Sans Devanagari',sans-serif", fontSize: 13, fontWeight: 800, color: c.primary }}>प्रमुख लाभ</div>
          <div style={{ flex: 1, height: 2, background: `linear-gradient(90deg,${c.primary}50,transparent)` }} />
          <div style={{ fontSize: 9.5, color: '#aaa', fontStyle: 'italic' }}>Key Benefits</div>
        </div>
        {hi.slice(0, 5).map((b, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 7, padding: '8px 12px', borderRadius: 8, background: i === 0 ? c.pale : i === 1 ? `${c.pale}88` : '#fafafa', border: `1px solid ${i < 2 ? c.primary + '30' : '#eeeeee'}`, boxShadow: i === 0 ? `2px 3px 12px ${c.glow}` : 'none' }}>
            <div style={{ width: 24, height: 24, borderRadius: '50%', background: i === 0 ? c.primary : i === 1 ? c.mid : c.bright, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#fff', fontWeight: 800, flexShrink: 0, marginTop: 2, boxShadow: `0 2px 6px ${c.glow}` }}>{i + 1}</div>
            <div style={{ flex: 1 }}>
              <div style={{ marginTop: -3, fontSize: benefitFontSize(b, 12), fontFamily: benefitFont(b), color: '#111', lineHeight: 1.35, fontWeight: isHindi(b) ? 600 : 700 }}>{b}</div>
              {en[i] && <div style={{ paddingTop: 1, fontSize: 9.5, color: '#888', fontFamily: "'Barlow Condensed',sans-serif" }}>{en[i]}</div>}
            </div>
          </div>
        ))}
      </div>
      <div style={{ padding: '4px 18px 8px' }}>
        <ShareSpecies sp={p.species} c={c} />
      </div>
      <ShareAllProductsTag c={c} />
      <ShareFooter c={c} />
    </div>
  )
}


// ── Template map (used by modal preview) ─────────────────────────────────────
const SHARE_CARD_TEMPLATES: Record<string, any> = {
  vitality: ShareCardVitality,
  digest: ShareCardDigest,
  herbal: ShareCardHerbal,
  shield: ShareCardShield,
  clinical: ShareCardClinical,
}

// ── Share card modal ───────────────────────────────────────────────────────────────────────────
// PNG generation is 100% client-side via html2canvas.
// A full-size (480px) card is rendered off-screen, captured, then saved/shared.
// No server route needed — eliminates all runtime/font/binary issues.

function ShareCardModal({ product, onClose }: { product: Product; onClose: () => void }) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [errMsg, setErrMsg] = useState('')
  const [previewW, setPreviewW] = useState(0)
  const previewContainerRef = useRef<HTMLDivElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)  // ref to the full-size card for capture
  const tmpl     = getTemplate(product.category)
  const c        = getShareColors(product.id, product.category)
  const CardComp = SHARE_CARD_TEMPLATES[tmpl]

  useEffect(() => {
    const measure = () => {
      const w = previewContainerRef.current?.offsetWidth || 0
      if (w > 0) setPreviewW(w)
    }
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(measure)
    if (previewContainerRef.current) ro.observe(previewContainerRef.current)
    return () => ro.disconnect()
  }, [])

  const scale = previewW > 0 ? Math.min(1, previewW / 480) : 0

  // Android-compatible save: Web Share API → anchor download → window.open
  const saveBlob = async (blob: Blob, filename: string, shareIntent: boolean) => {
    const isAndroid = /android/i.test(navigator.userAgent)

    if (shareIntent && typeof navigator.canShare === 'function') {
      const file = new File([blob], filename, { type: 'image/png' })
      if (navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({ title: product.name + ' — Madvet', files: [file] })
          return
        } catch (e: any) {
          if (e?.name === 'AbortError') return
        }
      }
    }

    if (!isAndroid) {
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(a.href), 10000)
      return
    }

    const url = URL.createObjectURL(blob)
    window.open(url, '_blank')
    setTimeout(() => URL.revokeObjectURL(url), 30000)
  }

  const handleSave = async (shareIntent: boolean) => {
    if (!cardRef.current) return
    setStatus('loading')
    setErrMsg('')
    try {
      const { toPng } = await import('html-to-image')

      const el = cardRef.current
      const prev = el.style.transform
      el.style.transform = 'none'

      // Pre-fetch all images as base64 so html-to-image can embed them in the SVG.
      // Relative paths (/madvet-icon.png) and cross-origin Supabase URLs both fail
      // inside SVG foreignObject without this step.
      const imgEls = Array.from(el.querySelectorAll<HTMLImageElement>('img'))
      const origSrcs = imgEls.map(i => i.src)
      await Promise.all(imgEls.map(async img => {
        try {
          let fetchUrl: string
          const src = img.src
          // For Supabase storage images — route through our proxy to avoid browser CORS
          const supabaseMatch = src.match(/supabase\.co\/storage\/v1\/object\/public\/(.+?)(?:\?|$)/)
          if (supabaseMatch) {
            fetchUrl = `/api/images/proxy?path=${encodeURIComponent(supabaseMatch[1])}`
          } else if (src.startsWith('http')) {
            fetchUrl = src.split('?')[0]
          } else {
            fetchUrl = window.location.origin + img.getAttribute('src')
          }
          const b64 = await fetch(fetchUrl).then(r => r.blob()).then(blob => new Promise<string>(r => { const fr = new FileReader(); fr.onload = () => r(fr.result as string); fr.readAsDataURL(blob) }))
          // Swap src AND wait for browser to finish loading the new base64 src
          await new Promise<void>(resolve => {
            img.onload = () => resolve()
            img.onerror = () => resolve() // don't block if it fails
            img.src = b64
          })
        } catch {}
      }))

      const dataUrl = await toPng(el, {
        width: 480,
        height: el.scrollHeight,
        pixelRatio: 3,
        style: { transform: 'none' },
      })

      // Restore original srcs
      imgEls.forEach((img, i) => { img.src = origSrcs[i] })
      el.style.transform = prev

      const blob = await (await fetch(dataUrl)).blob()
      if (blob.size < 500) throw new Error('Empty image — try again')
      await saveBlob(blob, `${product.name.replace(/\s+/g, '-')}-madvet.png`, shareIntent)
      setStatus('done')
    } catch (e: any) {
      setErrMsg(e?.message || 'Failed'); setStatus('error')
    } finally {
      setTimeout(() => { setStatus('idle'); setErrMsg('') }, 5000)
    }
  }

    const busy = status === 'loading'

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.92)', overflowY: 'auto' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{ minHeight: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '16px 12px 40px' }}>
        <div style={{ background: '#1a1e2a', borderRadius: 16, padding: '16px 14px', width: '100%', maxWidth: 540, boxShadow: '0 32px 80px rgba(0,0,0,0.7)' }}>

          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', letterSpacing: 1 }}>SHARE CARD</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{product.name} · {product.category}</div>
            </div>
            <button onClick={onClose} style={{ width: 34, height: 34, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.08)', color: '#fff', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
          </div>

          {/* Visible scaled preview */}
          <div
            ref={previewContainerRef}
            style={{ width: '100%', height: scale > 0 ? Math.round(700 * scale) : 340, position: 'relative', overflow: 'hidden', borderRadius: 8, background: '#0a0d14' }}
          >
            <div ref={cardRef} style={{ position: 'absolute', top: 0, left: 0, width: 480, transformOrigin: 'top left', transform: scale > 0 ? `scale(${scale})` : 'none', pointerEvents: 'none' }}>
              <CardComp p={product} c={c} />
            </div>
          </div>

          <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.22)', marginTop: 6, marginBottom: 0, textAlign: 'center' }}>
            Preview — tap Save to download as PNG
          </p>

          {busy && (
            <div style={{ textAlign: 'center', padding: '8px 0 0', color: '#FFE000', fontSize: 12 }}>
              ⏳ Generating image…
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
            <button
              onClick={() => handleSave(false)}
              disabled={busy}
              style={{ flex: 1, padding: '13px 0', borderRadius: 8, background: busy ? '#2a2a2a' : '#1d4ed8', color: busy ? '#555' : '#fff', border: 'none', cursor: busy ? 'not-allowed' : 'pointer', fontSize: 14, fontWeight: 700, letterSpacing: 0.8 }}
            >
              {busy ? '⏳ Working…' : '↓ SAVE IMAGE'}
            </button>
            <button
              onClick={() => handleSave(true)}
              disabled={busy}
              style={{ flex: 1, padding: '13px 0', borderRadius: 8, background: busy ? '#3a3a2a' : '#FFE000', color: busy ? '#777' : '#1a2f8a', border: 'none', cursor: busy ? 'not-allowed' : 'pointer', fontSize: 14, fontWeight: 700, letterSpacing: 0.8 }}
            >
              {busy ? '⏳ Working…' : '↗ SHARE / WHATSAPP'}
            </button>
          </div>

          <p style={{ textAlign: 'center', fontSize: 11, marginTop: 6, minHeight: 14, color: status === 'error' ? '#ff6b6b' : status === 'done' ? '#4ade80' : 'rgba(255,255,255,0.28)' }}>
            {status === 'done'  && '✅ Done! Image saved / shared.'}
            {status === 'error' && `❌ ${errMsg}`}
            {status === 'idle'  && 'Tap Save or Share to download the card as PNG'}
          </p>
        </div>
      </div>
    </div>
  )
}

// ── Lang toggle ──────────────────────────────────────────────────────────────
function LangToggle({ lang, setLang }: { lang: Lang; setLang: (l: Lang) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.07)', borderRadius: 8, border: '1px solid rgba(200,169,110,0.25)', padding: 3, gap: 2, flexShrink: 0 }}>
      {(['en', 'hi'] as Lang[]).map(l => (
        <button key={l} onClick={() => setLang(l)} style={{ padding: '5px 13px', borderRadius: 6, border: 'none', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 600, transition: 'all 0.15s', background: lang === l ? '#c8a96e' : 'transparent', color: lang === l ? '#1a3a2a' : 'rgba(245,240,232,0.5)' }}>
          {l === 'en' ? 'EN' : 'हिंदी'}
        </button>
      ))}
    </div>
  )
}

// ── Main component ───────────────────────────────────────────────────────────
export default function ProductDetailClient({ product }: { product: Product }) {
  const [lang, setLang] = useState<Lang>('en')
  const [showShare, setShowShare] = useState(false)

  const color      = getColor(product.category)
  const indChunks  = product.indication.split(',').map(s => s.trim()).filter(s => s.length > 3)
  const engInd     = indChunks.filter(s => /^[\x00-\x7F]+$/.test(s)).slice(0, 12)
  const hiInd      = indChunks.filter(s => /[^\x00-\x7F]/.test(s)).slice(0, 12)
  const displayInd = lang === 'hi' ? (hiInd.length > 0 ? hiInd : engInd) : engInd
  const speciesArr = product.species.split(/[,\/]/).map(s => s.trim()).filter(Boolean)

  const t = {
    allProducts: lang === 'hi' ? 'सभी उत्पाद' : 'All Products',
    about:       lang === 'hi' ? 'इस उत्पाद के बारे में' : 'About This Product',
    benefits:    lang === 'hi' ? 'मुख्य फायदे' : 'Key Benefits',
    indications: lang === 'hi' ? 'किसके लिए उपयोग' : 'Indications / Used For',
    composition: lang === 'hi' ? 'संरचना (Composition)' : 'Composition',
    forAnimals:  lang === 'hi' ? 'किस जानवर के लिए' : 'For Animals',
    quickFacts:  lang === 'hi' ? 'मुख्य जानकारी' : 'Quick Facts',
    category:    lang === 'hi' ? 'श्रेणी' : 'Category',
    form:        lang === 'hi' ? 'रूप' : 'Form',
    packaging:   lang === 'hi' ? 'पैकेजिंग' : 'Packaging',
    productId:   lang === 'hi' ? 'उत्पाद ID' : 'Product ID',
    vetOnly:     lang === 'hi' ? 'सिर्फ पशु चिकित्सा उपयोग के लिए। सही खुराक के लिए पंजीकृत पशु चिकित्सक से मिलें।' : 'For veterinary use only. Always consult a registered veterinarian for correct dosage and treatment plan.',
    backBtn:     lang === 'hi' ? '← सभी उत्पाद' : '← Back to All Products',
    footerNote:  lang === 'hi' ? 'सिर्फ पशु चिकित्सा में उपयोग के लिए' : 'All products for veterinary use only',
    assistant:   lang === 'hi' ? 'सहायक' : 'Assistant',
    products:    lang === 'hi' ? 'उत्पाद' : 'Products',
    training:    lang === 'hi' ? 'ट्रेनिंग' : 'Training',
    videoDemo:   lang === 'hi' ? 'उत्पाद का वीडियो' : 'Product Video Demo',
    watchYT:     lang === 'hi' ? 'YouTube पर देखें / शेयर करें' : 'Watch on YouTube / Share',
    shareCard:   lang === 'hi' ? '↗ शेयर कार्ड' : '↗ Share Card',
  }

  const displayCat  = lang === 'hi' ? (HI_CATS[product.category] || product.category) : product.category
  const displayForm = lang === 'hi' ? (HI_FORM[product.formulation] || product.formulation) : product.formulation

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { overflow-x: hidden; }
        :root {
          --forest: #1a3a2a; --forest-mid: #264d39; --cream: #f5f0e8;
          --cream-dark: #ede6d6; --gold: #c8a96e; --gold-light: #e8d5a8;
        }
        body { font-family: 'DM Sans', sans-serif; background: var(--cream); color: #1c2b22; }
        .chip { display: inline-flex; align-items: center; gap: 6px; padding: 6px 14px; border-radius: 20px; font-size: 13px; font-weight: 500; }
        .section-label { font-size: 10px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: var(--gold); margin-bottom: 8px; }
        .card { background: #fff; border: 1px solid #d4c9b0; border-radius: 16px; padding: 28px 32px; }
        @media (max-width: 640px) {
          .hero-inner { padding: 28px 16px 24px !important; }
          .hero-title { font-size: 28px !important; }
          .content-wrap { padding: 24px 16px !important; }
          .grid-2 { grid-template-columns: 1fr !important; }
          .card { padding: 20px 18px !important; }
          .top-nav { padding: 0 14px !important; height: 48px !important; }
        }
      `}</style>

      {/* NAV */}
      <nav style={{ background: '#0f2318', padding: '0 48px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 52, borderBottom: '1px solid rgba(200,169,110,0.15)' }} className="top-nav">
        <Link href="/" style={{ fontFamily: "'DM Serif Display', serif", color: 'var(--cream)', fontSize: 18, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src="/madvet-icon.png" alt="Madvet" style={{ height: 32, width: 32, borderRadius: 6, objectFit: 'cover', marginRight: 2 }} /> Madvet
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <LangToggle lang={lang} setLang={setLang} />
          <Link href="/products" style={{ padding: '6px 14px', borderRadius: 6, color: 'rgba(245,240,232,0.55)', fontSize: 13, fontWeight: 500, textDecoration: 'none' }}>
            ← {t.allProducts}
          </Link>
        </div>
      </nav>

      {/* HERO */}
      <header style={{ background: 'var(--forest)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 80% 60% at 70% 50%, rgba(200,169,110,0.10) 0%, transparent 70%)' }} />
        <div className="hero-inner" style={{ position: 'relative', zIndex: 1, maxWidth: 960, margin: '0 auto', padding: '48px 48px 40px' }}>
          <div style={{ fontSize: 12, color: 'rgba(245,240,232,0.4)', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Link href="/products" style={{ color: 'rgba(200,169,110,0.7)', textDecoration: 'none' }}>{t.products}</Link>
            <span>›</span>
            <span>{displayCat}</span>
          </div>
          <div style={{ marginBottom: 16 }}>
            <span className="chip" style={{ background: `${color}22`, color, border: `1px solid ${color}44`, fontSize: 12 }}>
              {displayCat}
              {lang === 'hi' && <span style={{ fontSize: 11, opacity: 0.6, marginLeft: 4 }}>({product.category})</span>}
            </span>
          </div>
          <h1 className="hero-title" style={{ fontFamily: "'DM Serif Display', serif", fontSize: 42, color: 'var(--cream)', lineHeight: 1.1, marginBottom: 16 }}>{product.name}</h1>
          {product.image_url && (
            <div style={{ position: 'relative', width: '100%', maxWidth: 320, marginBottom: product.video_url ? 12 : 20, display: 'inline-block' }}>
              <div style={{ borderRadius: 16, background: 'linear-gradient(135deg,#f9f6f1 0%,#ede8e0 100%)', border: '1px solid rgba(200,169,110,0.25)', height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img
                  src={product.image_url}
                  alt={product.name}
                  loading="eager"
                  decoding="async"
                  style={{ maxWidth: '100%', maxHeight: 260, objectFit: 'contain', padding: 12 }}
                  onError={(e) => {
                    const img = e.target as HTMLImageElement
                    if (!img.dataset.retried) {
                      // Retry once with cache-bust — handles transient CDN failures on mobile
                      img.dataset.retried = '1'
                      img.src = img.src.split('?')[0] + '?t=' + Date.now()
                    } else {
                      img.style.display = 'none'
                    }
                  }}
                />
              </div>
              {/* Floating share button on image */}
              <button onClick={() => setShowShare(true)}
                style={{ position: 'absolute', top: 10, right: 10, width: 44, height: 44, borderRadius: '50%', background: '#FFE000', border: '2px solid rgba(255,255,255,0.7)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, boxShadow: '0 4px 16px rgba(0,0,0,0.4)', zIndex: 2 }}>
                ↗
              </button>
            </div>
          )}
          {!product.image_url && (
            <div style={{ marginBottom: 16 }}>
              <button onClick={() => setShowShare(true)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 20px', borderRadius: 8, background: '#FFE000', color: '#1a2f8a', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
                ↗ {lang === 'hi' ? 'शेयर कार्ड' : 'Share Card'}
              </button>
            </div>
          )}
          {(() => {
            if (!product.video_url) return null
            const match = product.video_url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([A-Za-z0-9_-]{11})/)
            const videoId = match?.[1]
            if (!videoId) return null
            return (
              <div style={{ width: '100%', maxWidth: 480, marginBottom: 20 }}>
                <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(200,169,110,0.25)', background: '#000' }}>
                  <iframe src={`https://www.youtube.com/embed/${videoId}?rel=0`} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen loading="lazy" />
                </div>
                <div style={{ marginTop: 8, display: 'flex', gap: 10 }}>
                  <a href={product.video_url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 6, background: '#ff0000', color: '#fff', textDecoration: 'none', fontSize: 12, fontWeight: 600, fontFamily: "'DM Sans', sans-serif" }}>
                    ▶ {t.watchYT}
                  </a>
                </div>
              </div>
            )
          })()}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 8 }}>
            <span className="chip" style={{ background: 'rgba(200,169,110,0.12)', color: 'var(--gold-light)', border: '1px solid rgba(200,169,110,0.2)', fontSize: 12 }}>{product.packaging}</span>
            <span className="chip" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(245,240,232,0.55)', border: '1px solid rgba(255,255,255,0.08)', fontSize: 12 }}>{displayForm}</span>
          </div>
        </div>
      </header>

      <div style={{ height: 4, background: `linear-gradient(90deg, ${color}, ${color}44)` }} />

      {/* CONTENT */}
      <main className="content-wrap" style={{ maxWidth: 960, margin: '0 auto', padding: '40px 48px 80px' }}>
        <div className="grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {product.description && (
              <div className="card">
                <div className="section-label">{t.about}</div>
                <p style={{ fontSize: 15, lineHeight: 1.75, color: '#1c2b22' }}>{lang === 'hi' && product.description_hi ? product.description_hi : product.description}</p>
              </div>
            )}
            {product.benefits && product.benefits !== 'N/A' && (
              <div className="card">
                <div className="section-label">{t.benefits}</div>
                <p style={{ fontSize: 15, lineHeight: 1.75, color: '#1c2b22' }}>{lang === 'hi' && product.usp_benefits_hi ? product.usp_benefits_hi : product.benefits}</p>
              </div>
            )}
            {displayInd.length > 0 && (
              <div className="card">
                <div className="section-label">{t.indications}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                  {displayInd.map((ind, i) => (
                    <span key={i} style={{ padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 500, background: '#f0ebe0', color: '#5a7060', border: '1px solid #d4c9b0' }}>{ind}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {product.salt && (
              <div className="card">
                <div className="section-label">{t.composition}</div>
                <p style={{ fontSize: 14, lineHeight: 1.7, color: '#1c2b22', fontFamily: 'monospace', background: '#f5f0e8', padding: '12px 16px', borderRadius: 8, border: '1px solid #ede6d6', marginTop: 4 }}>{product.salt}</p>
              </div>
            )}
            {speciesArr.length > 0 && (
              <div className="card">
                <div className="section-label">{t.forAnimals}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 8 }}>
                  {speciesArr.map(sp => (
                    <span key={sp} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 12, fontSize: 13, fontWeight: 500, background: '#f0ebe0', color: '#1a3a2a', border: '1px solid #d4c9b0' }}>
                      <span>{SPECIES_EMOJI[sp] || '🐾'}</span>
                      {lang === 'hi' ? `${HI_SP[sp] || sp} (${sp})` : sp}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <div className="card" style={{ background: `${color}0d`, borderColor: `${color}33` }}>
              <div className="section-label" style={{ color }}>{t.quickFacts}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>
                {[{ label: t.category, value: displayCat }, { label: t.form, value: displayForm }, { label: t.packaging, value: product.packaging }, { label: t.productId, value: `#${product.id}` }].map(({ label, value }, i, arr) => (
                  <div key={label}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
                      <span style={{ color: '#5a7060' }}>{label}</span>
                      <span style={{ fontWeight: 600, color: '#1a3a2a' }}>{value}</span>
                    </div>
                    {i < arr.length - 1 && <div style={{ height: 1, background: '#d4c9b022', marginTop: 12 }} />}
                  </div>
                ))}
              </div>
            </div>
            <div style={{ padding: '16px 20px', borderRadius: 12, background: 'rgba(26,58,42,0.06)', border: '1px solid rgba(26,58,42,0.1)', fontSize: 12, color: '#5a7060', lineHeight: 1.6 }}>
              ⚕️ <strong>{lang === 'hi' ? 'केवल पशु चिकित्सा उपयोग।' : 'For veterinary use only.'}</strong> {t.vetOnly}
            </div>
          </div>
        </div>
        <div style={{ marginTop: 40, paddingTop: 32, borderTop: '1px solid #d4c9b0' }}>
          <Link href="/products" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 24px', borderRadius: 8, background: 'var(--forest)', color: 'var(--cream)', textDecoration: 'none', fontSize: 14, fontWeight: 600, fontFamily: "'DM Sans', sans-serif" }}>
            {t.backBtn}
          </Link>
        </div>
      </main>

      <footer style={{ background: '#0f2318', padding: '24px 48px', borderTop: '1px solid rgba(200,169,110,0.1)', textAlign: 'center' }}>
        <p style={{ fontSize: 13, color: 'rgba(245,240,232,0.35)', margin: 0 }}>
          <strong style={{ color: 'rgba(245,240,232,0.6)' }}>Madvet Animal Healthcare</strong>
          &nbsp;·&nbsp; {t.footerNote}
        </p>
      </footer>

      {/* Share Card Modal */}
      {showShare && <ShareCardModal product={product} onClose={() => setShowShare(false)} />}
    </>
  )
}
