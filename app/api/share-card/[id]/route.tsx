// @ts-nocheck
// app/api/share-card/[id]/route.tsx  — Satori-safe server PNG
// Rules: NO position, NO overflow, NO borderLeft shorthand, NO hsl+hex-alpha,
//        NO transparent in gradients, pure flex only.

import React from 'react'
import { ImageResponse } from 'next/og'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

// ── Font loader ───────────────────────────────────────────────────────────────
let _fonts = null
async function loadFonts() {
  if (_fonts) return _fonts
  try {
    const css = await fetch(
      'https://fonts.googleapis.com/css2?family=Oswald:wght@700&family=Noto+Sans+Devanagari:wght@600;700;800&family=Barlow+Condensed:wght@600;700;800&display=swap',
      { headers:{ 'User-Agent':'Mozilla/5.0 (compatible; Googlebot/2.1)' }, signal:AbortSignal.timeout(8000) }
    ).then(r => r.text())
    const seen = new Set(), jobs = []
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

// ── Color system — returns ONLY valid Satori colors (no hsl+hex-alpha) ────────
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
  'Anti-inflammatory':                                'Anti-inflammatory / Analgesic',
  'Anti-inflammatory, Analgesic, Antipyretic':        'Anti-inflammatory / Analgesic',
  'Anti-inflammatory / Analgesic / Antipyretic':      'Anti-inflammatory / Analgesic',
  'Analgesic / Antipyretic':                          'Anti-inflammatory / Analgesic',
  'Analgesic, Antipyretic':                           'Anti-inflammatory / Analgesic',
  'Analgesic':                                        'Anti-inflammatory / Analgesic',
  'Anthelmintic':                                     'Anthelmintic / Antiparasitic',
  'Antiparasitic':                                    'Anthelmintic / Antiparasitic',
  'Antibiotic (Cephalosporin)':                       'Antibiotic',
  'Antibiotic (Fluoroquinolone)':                     'Antibiotic',
  'Antihistamine / Anti-allergic':                    'Antihistamine',
  'Dermatological / Topical':                         'Dermatological',
  'Probiotic / Immunomodulator / Vitamin Supplement': 'Probiotic',
  'Antidiarrheal / Gastrointestinal':                 'Antidiarrheal',
}

// Convert HSL to RGB for rgba() alpha usage
function hslToRgb(h, s, l) {
  s /= 100; l /= 100
  const k = n => (n + h/30) % 12
  const a = s * Math.min(l, 1-l)
  const f = n => l - a * Math.max(-1, Math.min(k(n)-3, Math.min(9-k(n), 1)))
  return [Math.round(f(0)*255), Math.round(f(8)*255), Math.round(f(4)*255)]
}

function getColors(id, category) {
  const base = CAT_PALETTES[category] ?? { h:220, s:70, l:28 }
  const shift = ((id * 37 + 13) % 41) - 20
  const h = (base.h + shift + 360) % 360
  const { s, l } = base
  const [r,g,b] = hslToRgb(h,s,l)
  const [rb,gb,bb] = hslToRgb(h,s,l+14)
  const [rd,gd,bd] = hslToRgb(h,s,l-10)
  const [rdk,gdk,bdk] = hslToRgb(h,s,l-18)
  const [rm,gm,bm] = hslToRgb(h,s,l+7)
  return {
    h, s, l,
    primary: `rgb(${r},${g},${b})`,
    bright:  `rgb(${rb},${gb},${bb})`,
    dark:    `rgb(${rd},${gd},${bd})`,
    darkest: `rgb(${rdk},${gdk},${bdk})`,
    pale:    `hsl(${h},${s-20}%,95%)`,
    mid:     `rgb(${rm},${gm},${bm})`,
    // Pre-built rgba variants — valid CSS, Satori-safe
    p08:  `rgba(${r},${g},${b},0.08)`,
    p12:  `rgba(${r},${g},${b},0.12)`,
    p15:  `rgba(${r},${g},${b},0.15)`,
    p20:  `rgba(${r},${g},${b},0.20)`,
    p25:  `rgba(${r},${g},${b},0.25)`,
    p30:  `rgba(${r},${g},${b},0.30)`,
    p40:  `rgba(${r},${g},${b},0.40)`,
    p50:  `rgba(${r},${g},${b},0.50)`,
    dk20: `rgba(${rdk},${gdk},${bdk},0.20)`,
    dk30: `rgba(${rdk},${gdk},${bdk},0.30)`,
  }
}

function getTemplate(category) {
  if (['Vitamin Supplement','Vitamin Supplement / Galactogogue'].includes(category)) return 'vitality'
  if (['Probiotic','Digestive / Antiflatulent','Antidiarrheal'].includes(category)) return 'digest'
  if (['Reproductive Hormone','Udder Care / Herbal Antimicrobial'].includes(category)) return 'herbal'
  if (['Dermatological','Ectoparasiticide','Antihistamine'].includes(category)) return 'shield'
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
  return e.length >= 2 ? e : (p.length ? p : e)
}
const HI_IND = {
  fever:'बुखार में असरदार', pain:'दर्द से जल्दी राहत', inflammation:'सूजन कम करे',
  arthritis:'गठिया में असरदार', infection:'संक्रमण से लड़े', mastitis:'थनिका में कारगर',
  lameness:'लंगड़ेपन में राहत', colic:'पेट दर्द में असरदार', diarrhea:'दस्त रोकने में कारगर',
  respiratory:'श्वसन रोग में राहत', skin:'त्वचा रोग में लाभकारी', milk:'दूध उत्पादन बढ़ाए',
  vitamin:'विटामिन की कमी दूर करे', worm:'कृमि खत्म करे',
}
function augmentBenefits(hiList, enList, indication='', description='', minCount=4) {
  if (hiList.length >= minCount) return { hi:hiList, en:enList }
  const needed = minCount - hiList.length
  const newHi=[], newEn=[]
  const indTerms = indication.split(',').map(s=>s.trim().toLowerCase()).filter(s=>s.length>2 && !isHindi(s))
  for (const term of indTerms) {
    if (newHi.length >= needed) break
    const covered = [...hiList,...newHi].some(b=>b.toLowerCase().includes(term))
    if (covered) continue
    const hiPhrase = Object.entries(HI_IND).find(([k])=>term.includes(k))?.[1]
    if (hiPhrase && !hiList.includes(hiPhrase)) { newHi.push(hiPhrase); newEn.push(term[0].toUpperCase()+term.slice(1)) }
  }
  return { hi:[...hiList,...newHi].slice(0,5), en:[...enList,...newEn].slice(0,5) }
}
function getDescExcerpt(desc='', maxLen=140) {
  if (!desc) return ''
  const first = desc.split(/\.\s+/)[0]
  const t = first.length<=maxLen ? first : first.slice(0,maxLen).replace(/\s\S+$/,'')+'…'
  return t.endsWith('.')?t:t+'.'
}
function getIndicationTags(indication='') {
  return indication.split(/[,،]+/).map(s=>s.trim())
    .filter(s=>s.length>2 && s.length<28 && /^[a-zA-Z\s\/\-]+$/.test(s)).slice(0,4)
}
const SPECIES_EMOJI = { Cattle:'🐄',Buffalo:'🐃',Sheep:'🐑',Goat:'🐐',Dog:'🐕',Cat:'🐈',Poultry:'🐓',Horse:'🐴',Calf:'🐮' }

// ── Sub-components — ALL Satori-safe ─────────────────────────────────────────

function Logo({ size=1 }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8*size, flexShrink:0 }}>
      <span style={{ fontSize:28*size, lineHeight:1 }}>🐾</span>
      <div style={{ display:'flex', flexDirection:'column' }}>
        <span style={{ fontFamily:'Oswald', fontSize:20*size, fontWeight:700, color:'#fff', letterSpacing:2, lineHeight:1 }}>MADVET</span>
        <span style={{ fontFamily:'Barlow Condensed', fontSize:8*size, color:'rgba(255,255,255,0.70)', letterSpacing:1.5, marginTop:1, fontWeight:600 }}>ANIMAL HEALTH CARE</span>
        <span style={{ fontFamily:'Barlow Condensed', fontSize:7*size, color:'rgba(255,255,255,0.45)', letterSpacing:0.8, marginTop:1 }}>ISO 9001:2013 COMPANY</span>
      </div>
    </div>
  )
}

function Species({ sp, c }) {
  const arr = (sp||'').split(/[,/]/).map(s=>s.trim()).filter(Boolean).slice(0,5)
  return (
    <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
      {arr.map((s,i)=>(
        <div key={i} style={{ width:28, height:28, borderRadius:14, background:c.p15, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14 }}>
          <span>{SPECIES_EMOJI[s]||'🐾'}</span>
        </div>
      ))}
    </div>
  )
}

function ImgBox({ uri, w, h, c, emoji='🧴' }) {
  return (
    <div style={{ width:w, height:h, flexShrink:0, borderRadius:12, background:c.pale, display:'flex', alignItems:'center', justifyContent:'center' }}>
      {uri
        ? <img src={uri} width={w-4} height={h-4} style={{ objectFit:'contain', width:w-4, height:h-4 }} />
        : <div style={{ display:'flex', flexDirection:'column', alignItems:'center' }}>
            <span style={{ fontSize:w*0.3 }}>{emoji}</span>
          </div>
      }
    </div>
  )
}

function ImgBoxRound({ uri, w, c, emoji='💊' }) {
  return (
    <div style={{ width:w, height:w, flexShrink:0, borderRadius:w/2, background:c.pale, display:'flex', alignItems:'center', justifyContent:'center' }}>
      {uri
        ? <img src={uri} width={w-4} height={w-4} style={{ objectFit:'cover', width:w-4, height:w-4, borderRadius:(w-4)/2 }} />
        : <span style={{ fontSize:w*0.38 }}>{emoji}</span>
      }
    </div>
  )
}

function DescBar({ desc, tags, c }) {
  if (!desc && !tags.length) return null
  return (
    <div style={{ display:'flex', flexDirection:'column', padding:'10px 18px 8px 18px', background:c.pale }}>
      {desc && <span style={{ fontSize:10.5, color:'#2a2a2a', lineHeight:1.5, fontFamily:'Barlow Condensed', fontWeight:500, marginBottom:tags.length?6:0 }}>{desc}</span>}
      {tags.length>0 && (
        <div style={{ display:'flex', gap:5, flexWrap:'wrap', alignItems:'center' }}>
          <span style={{ fontSize:8.5, color:c.primary, fontWeight:800, letterSpacing:1, fontFamily:'Oswald' }}>TREATS:</span>
          {tags.map((t,i)=>(
            <div key={i} style={{ display:'flex', fontSize:9, color:c.dark, background:c.p12, borderRadius:20, padding:'2px 8px', fontFamily:'Barlow Condensed', fontWeight:600 }}>
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
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', background:`linear-gradient(90deg,${c.darkest},${c.primary})`, padding:'9px 20px', marginTop:8 }}>
      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
        <div style={{ width:28, height:28, borderRadius:14, background:'rgba(255,255,255,0.15)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14 }}>
          <span>🔗</span>
        </div>
        <div style={{ display:'flex', flexDirection:'column' }}>
          <span style={{ fontSize:8, color:'rgba(255,255,255,0.55)', fontFamily:'Barlow Condensed', letterSpacing:2 }}>VIEW ALL PRODUCTS</span>
          <span style={{ fontSize:14, color:'#fff', fontWeight:700, fontFamily:'Oswald', letterSpacing:1 }}>madvet.in/products</span>
        </div>
      </div>
      <div style={{ display:'flex', flexDirection:'column', background:'rgba(255,255,255,0.12)', borderRadius:6, padding:'4px 12px', alignItems:'center' }}>
        <span style={{ fontSize:8, color:'rgba(255,255,255,0.55)', fontFamily:'Barlow Condensed' }}>AI ASSISTANT</span>
        <span style={{ fontSize:11, color:'rgba(255,255,255,0.9)', fontFamily:'Oswald' }}>ai.madvet.in</span>
      </div>
    </div>
  )
}

function Footer({ c }) {
  return (
    <div style={{ display:'flex', flexDirection:'column' }}>
      <div style={{ height:4, background:`linear-gradient(90deg,${c.darkest},${c.bright},${c.darkest})`, display:'flex' }} />
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', background:'#FFD700', padding:'14px 20px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ background:'#fff', borderRadius:8, padding:'4px 6px', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <span style={{ fontSize:30, lineHeight:1 }}>🐾</span>
          </div>
          <div style={{ display:'flex', flexDirection:'column' }}>
            <span style={{ fontFamily:'Oswald', fontSize:24, fontWeight:700, color:'#1a2f8a', letterSpacing:3, lineHeight:1 }}>MADVET</span>
            <span style={{ fontFamily:'Barlow Condensed', fontSize:9, color:'#1a2f8a', letterSpacing:1.5, fontWeight:700, marginTop:1 }}>ANIMAL HEALTH CARE</span>
            <span style={{ fontFamily:'Barlow Condensed', fontSize:8, color:'#555', marginTop:1 }}>Ghaziabad (U.P.)</span>
          </div>
        </div>
        <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end' }}>
          <span style={{ fontFamily:'Barlow Condensed', fontSize:9, color:'#111', fontWeight:800 }}>ISO 9001:2013 COMPANY</span>
          <span style={{ fontFamily:'Barlow Condensed', fontSize:8, color:'#333', marginTop:2 }}>madvet.animal@gmail.com</span>
          <span style={{ fontFamily:'Barlow Condensed', fontSize:8, color:'#333' }}>www.madvet.in</span>
          <span style={{ fontFamily:'Barlow Condensed', fontSize:10, color:'#1a2f8a', fontWeight:800, marginTop:2 }}>📞 9935257750 · 8400347331</span>
        </div>
      </div>
    </div>
  )
}

// ── TEMPLATE 1: VITALITY ──────────────────────────────────────────────────────
function CardVitality({ p, c, productImg }) {
  const { hi, en } = augmentBenefits(splitBenefitsSafe(p.usp_benefits_hi,p.benefits), splitBenefits(p.benefits), p.indication, p.description)
  const nameSz = p.name.length>12?44:p.name.length>9?54:66
  return (
    <div style={{ display:'flex', flexDirection:'column', width:480, background:'#fff', fontFamily:'Barlow Condensed' }}>
      <div style={{ display:'flex', flexDirection:'column', background:`linear-gradient(135deg,${c.darkest} 0%,${c.primary} 55%,${c.bright} 100%)`, padding:'18px 20px 18px 20px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
          <Logo size={0.9} />
          <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end' }}>
            <span style={{ fontSize:10, color:'rgba(255,255,255,0.65)', fontFamily:'Barlow Condensed' }}>{p.packaging}</span>
            <span style={{ fontSize:9, color:'rgba(255,255,255,0.5)', fontFamily:'Barlow Condensed' }}>{p.formulation}</span>
          </div>
        </div>
        <div style={{ display:'flex', flexDirection:'column', marginTop:10 }}>
          <span style={{ fontFamily:'Oswald', fontWeight:700, fontSize:nameSz, color:'#fff', letterSpacing:3, lineHeight:1 }}>{p.name}</span>
          <span style={{ fontSize:12, color:'rgba(255,255,255,0.75)', marginTop:5, fontFamily:'Barlow Condensed' }}>{p.salt}</span>
        </div>
      </div>
      {/* Gold tagline */}
      <div style={{ display:'flex', padding:'8px 24px', background:c.dk20 }}>
        <div style={{ display:'flex', background:'#FFE000', borderRadius:6, padding:'7px 16px' }}>
          <span style={{ fontFamily:'Noto Sans Devanagari', fontWeight:800, fontSize:14, color:c.darkest }}>{hi[0]||p.name}</span>
        </div>
      </div>
      <DescBar desc={getDescExcerpt(p.description)} tags={getIndicationTags(p.indication)} c={c} />
      <div style={{ display:'flex', padding:'14px 16px 6px 16px', gap:14 }}>
        <div style={{ display:'flex', flexDirection:'column', flexGrow:1, flexShrink:1, flexBasis:0 }}>
          {hi.slice(0,6).map((b,i) => {
            const big = i===0||i===1||i===3||i===5
            return (
              <div key={i} style={{ display:'flex', marginBottom:big?7:5 }}>
                <div style={{ flexGrow:1, flexShrink:1, flexBasis:0, background:big?`linear-gradient(90deg,${c.darkest},${c.primary})`:`linear-gradient(90deg,${c.primary},${c.mid})`, borderRadius:6, padding:big?'9px 14px':'6px 12px' }}>
                  <span style={{ fontFamily:isHindi(b)?'Noto Sans Devanagari':'Barlow Condensed', fontSize:big?12.5:11, color:'#fff', fontWeight:big?800:600, lineHeight:1.3, display:'block' }}>{b}</span>
                  {en[i] && <span style={{ fontSize:8.5, color:'rgba(255,255,255,0.6)', fontFamily:'Barlow Condensed', marginTop:2, display:'block' }}>{en[i]}</span>}
                </div>
              </div>
            )
          })}
        </div>
        <div style={{ width:118, display:'flex', flexDirection:'column', gap:10, alignItems:'center' }}>
          <ImgBox uri={productImg} w={114} h={150} c={c} emoji={p.formulation==='Bolus'?'💊':'🧴'} />
          <Species sp={p.species} c={c} />
        </div>
      </div>
      <div style={{ height:3, background:`linear-gradient(90deg,${c.darkest},${c.bright})`, display:'flex' }} />
      <AllProductsTag c={c} />
      <Footer c={c} />
    </div>
  )
}

// ── TEMPLATE 2: DIGEST ────────────────────────────────────────────────────────
function CardDigest({ p, c, productImg }) {
  const { hi, en } = augmentBenefits(splitBenefitsSafe(p.usp_benefits_hi,p.benefits), splitBenefits(p.benefits), p.indication, p.description)
  const nameSz = p.name.length>12?36:p.name.length>8?46:56
  return (
    <div style={{ display:'flex', flexDirection:'column', width:480, background:'#fff', fontFamily:'Barlow Condensed' }}>
      <div style={{ display:'flex', flexDirection:'row', padding:'16px 20px 0', background:'#fff', gap:14, alignItems:'flex-start' }}>
        <div style={{ display:'flex', flexDirection:'column', flexGrow:1, flexShrink:1, flexBasis:0 }}>
          <span style={{ fontSize:13, fontWeight:700, color:'#c8220a', fontFamily:'Noto Sans Devanagari', lineHeight:1.3, marginBottom:6 }}>{p.indication?.split(',')[0]?.trim()||'असरदार और तुरंत राहत'}</span>
          <span style={{ fontFamily:'Oswald', fontWeight:700, fontSize:nameSz, color:c.primary, letterSpacing:2, lineHeight:1 }}>{p.name}</span>
          <div style={{ display:'flex', marginTop:6 }}>
            <div style={{ background:c.pale, borderRadius:4, padding:'3px 10px', display:'flex' }}>
              <span style={{ fontSize:11, color:c.primary, fontWeight:700, letterSpacing:2 }}>{(p.formulation||'').toUpperCase()}</span>
            </div>
          </div>
          <div style={{ display:'flex', marginTop:8 }}>
            <div style={{ background:c.primary, borderRadius:4, padding:'6px 14px', display:'flex' }}>
              <span style={{ fontSize:13, color:'#fff', fontFamily:'Noto Sans Devanagari', fontWeight:700 }}>{hi[0]||'तुरंत असर, लंबे समय तक फायदा'}</span>
            </div>
          </div>
        </div>
        <ImgBoxRound uri={productImg} w={120} c={c} emoji="💊" />
      </div>
      <div style={{ height:3, background:`linear-gradient(90deg,${c.darkest},${c.bright})`, marginTop:12, display:'flex' }} />
      <DescBar desc={getDescExcerpt(p.description)} tags={getIndicationTags(p.indication)} c={c} />
      <div style={{ display:'flex', padding:'12px 20px', gap:14 }}>
        <div style={{ display:'flex', flexDirection:'column', flexGrow:1, flexShrink:1, flexBasis:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
            <span style={{ fontFamily:'Noto Sans Devanagari', fontSize:13, fontWeight:800, color:c.primary }}>प्रयोग एवं लक्षण :</span>
            <div style={{ flexGrow:1, flexShrink:1, flexBasis:0, height:1.5, background:c.p25, display:'flex' }} />
          </div>
          {hi.slice(0,6).map((b,i) => (
            <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:10, marginBottom:7, padding:'6px 10px', borderRadius:6, background:i%2===0?c.pale:'#fff', borderLeftWidth:3, borderLeftStyle:'solid', borderLeftColor:i%2===0?c.primary:c.bright, borderTopWidth:0, borderRightWidth:0, borderBottomWidth:0 }}>
              <div style={{ width:7, height:7, borderRadius:4, background:c.primary, flexShrink:0, marginTop:5, display:'flex' }} />
              <div style={{ display:'flex', flexDirection:'column' }}>
                <span style={{ fontFamily:isHindi(b)?'Noto Sans Devanagari':'Barlow Condensed', fontSize:12, color:'#1a1a1a', fontWeight:isHindi(b)?600:700, lineHeight:1.35 }}>{b}</span>
                {en[i] && <span style={{ fontSize:9.5, color:'#888', fontFamily:'Barlow Condensed', marginTop:1 }}>{en[i]}</span>}
              </div>
            </div>
          ))}
        </div>
        <div style={{ width:108, flexShrink:0, display:'flex', flexDirection:'column', gap:8, alignItems:'center', paddingTop:4 }}>
          <div style={{ display:'flex', flexDirection:'column', background:`linear-gradient(160deg,${c.darkest},${c.primary})`, borderRadius:10, padding:'14px 8px', alignItems:'center', width:'100%' }}>
            <span style={{ fontSize:9, color:'rgba(255,255,255,0.6)', fontFamily:'Barlow Condensed', letterSpacing:1.5, marginBottom:4 }}>{(p.formulation||'').toUpperCase()}</span>
            <span style={{ fontFamily:'Oswald', fontSize:15, fontWeight:700, color:'#fff', lineHeight:1.15, letterSpacing:1 }}>{p.name}</span>
            <span style={{ fontSize:8.5, color:'rgba(255,255,255,0.65)', marginTop:4, fontFamily:'Barlow Condensed' }}>{p.packaging}</span>
          </div>
          <div style={{ display:'flex', flexDirection:'column', background:c.pale, borderRadius:8, padding:'8px', alignItems:'center', width:'100%' }}>
            <span style={{ fontSize:8.5, color:c.primary, fontWeight:700, fontFamily:'Barlow Condensed', letterSpacing:1, marginBottom:5 }}>SPECIES</span>
            <Species sp={p.species} c={c} />
          </div>
        </div>
      </div>
      <div style={{ height:5, background:`linear-gradient(90deg,${c.darkest},${c.bright})`, marginBottom:6, display:'flex' }} />
      <AllProductsTag c={c} />
      <Footer c={c} />
    </div>
  )
}

// ── TEMPLATE 3: HERBAL ────────────────────────────────────────────────────────
function CardHerbal({ p, c, productImg }) {
  const { hi, en } = augmentBenefits(splitBenefitsSafe(p.usp_benefits_hi,p.benefits), splitBenefits(p.benefits), p.indication, p.description)
  const c2 = `hsl(${(c.h+40)%360},75%,36%)`
  const nameSz = p.name.length>14?32:p.name.length>10?42:50
  return (
    <div style={{ display:'flex', flexDirection:'column', width:480, background:'#fff', fontFamily:'Barlow Condensed' }}>
      <div style={{ display:'flex', flexDirection:'column', background:`linear-gradient(160deg,${c.darkest} 0%,${c.primary} 60%,${c2} 100%)`, padding:'16px 20px 18px 20px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
          <Logo size={0.88} />
          <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end' }}>
            <span style={{ fontSize:9, color:'rgba(255,255,255,0.5)', fontFamily:'Barlow Condensed' }}>{p.packaging}</span>
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', gap:12 }}>
          <div style={{ display:'flex', flexDirection:'column', flexGrow:1, flexShrink:1, flexBasis:0 }}>
            <span style={{ fontFamily:'Oswald', fontWeight:700, fontSize:nameSz, lineHeight:1, letterSpacing:2, color:'#fff' }}>{p.name}</span>
            <span style={{ fontSize:11, color:'rgba(255,255,255,0.78)', marginTop:5, fontFamily:'Barlow Condensed' }}>{(p.salt||'').split(',')[0]?.trim()}</span>
          </div>
          <ImgBox uri={productImg} w={100} h={100} c={c} emoji="🌿" />
        </div>
        <div style={{ display:'flex', marginTop:10, background:'rgba(255,255,255,0.15)', borderRadius:6, padding:'6px 14px', alignItems:'center', gap:8, alignSelf:'flex-start' }}>
          <span style={{ fontSize:14, lineHeight:1 }}>🌱</span>
          <span style={{ fontFamily:'Noto Sans Devanagari', fontSize:13, color:'#FFE000', fontWeight:700 }}>{hi[0]||p.indication}</span>
        </div>
      </div>
      <div style={{ display:'flex', flexDirection:'column', padding:'14px 18px 8px 18px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
          <div style={{ width:4, height:16, background:c.primary, borderRadius:2, display:'flex' }} />
          <span style={{ fontFamily:'Noto Sans Devanagari', fontSize:13, fontWeight:800, color:c.primary }}>प्रमुख लाभ एवं उपयोग :</span>
          <div style={{ flexGrow:1, flexShrink:1, flexBasis:0, height:1, background:c.p20, display:'flex' }} />
        </div>
        <DescBar desc={getDescExcerpt(p.description)} tags={getIndicationTags(p.indication)} c={c} />
        {[0,2,4].map(rowStart=>(
          <div key={rowStart} style={{ display:'flex', gap:7, marginTop:7 }}>
            {[rowStart,rowStart+1].map(i=>{
              const b=hi[i]
              if (!b) return <div key={i} style={{ display:'flex', flexGrow:1, flexShrink:1, flexBasis:0 }} />
              return (
                <div key={i} style={{ display:'flex', gap:8, padding:'7px 10px', background:i<2?c.pale:'#fafafa', borderRadius:7, alignItems:'flex-start', flexGrow:1, flexShrink:1, flexBasis:0 }}>
                  <span style={{ color:c.primary, fontSize:13, fontWeight:900, flexShrink:0, lineHeight:1.2 }}>►</span>
                  <div style={{ display:'flex', flexDirection:'column' }}>
                    <span style={{ fontFamily:isHindi(b)?'Noto Sans Devanagari':'Barlow Condensed', fontSize:11, color:'#222', lineHeight:1.35, fontWeight:isHindi(b)?500:700 }}>{b}</span>
                    {en[i] && <span style={{ fontSize:8, color:'#999', fontFamily:'Barlow Condensed', marginTop:1 }}>{en[i]}</span>}
                  </div>
                </div>
              )
            })}
          </div>
        ))}
      </div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'0 18px 8px' }}>
        <Species sp={p.species} c={c} />
        <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end' }}>
          <span style={{ fontSize:9, color:'#aaa', fontFamily:'Barlow Condensed' }}>FORMULATION</span>
          <span style={{ fontSize:12, fontWeight:700, color:c.primary, fontFamily:'Barlow Condensed' }}>{p.formulation}</span>
        </div>
      </div>
      <AllProductsTag c={c} />
      <Footer c={c} />
    </div>
  )
}

// ── TEMPLATE 4: SHIELD ────────────────────────────────────────────────────────
function CardShield({ p, c, productImg }) {
  const { hi, en } = augmentBenefits(splitBenefitsSafe(p.usp_benefits_hi,p.benefits), splitBenefits(p.benefits), p.indication, p.description)
  const nameSz = p.name.length>14?34:p.name.length>10?44:54
  return (
    <div style={{ display:'flex', flexDirection:'column', width:480, background:'#fff', fontFamily:'Barlow Condensed' }}>
      <div style={{ display:'flex', flexDirection:'column', background:`linear-gradient(125deg,${c.darkest} 0%,${c.primary} 100%)`, padding:'18px 20px 22px 20px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:14 }}>
          <Logo size={0.88} />
          <div style={{ display:'flex', flexDirection:'column', background:'rgba(255,255,255,0.18)', borderRadius:5, padding:'4px 12px', alignItems:'center' }}>
            <span style={{ fontSize:11, color:'#FFE000', fontWeight:700, letterSpacing:2, fontFamily:'Oswald' }}>{(p.formulation||'').toUpperCase()}</span>
            <span style={{ fontSize:8.5, color:'rgba(255,255,255,0.65)', fontFamily:'Barlow Condensed' }}>{p.packaging}</span>
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'flex-end', gap:16 }}>
          <div style={{ display:'flex', flexDirection:'column', flexGrow:1, flexShrink:1, flexBasis:0 }}>
            <span style={{ fontFamily:'Oswald', fontWeight:700, fontSize:nameSz, color:'#fff', letterSpacing:2, lineHeight:1 }}>{p.name}</span>
            <span style={{ fontSize:11, color:'rgba(255,255,255,0.72)', marginTop:6, fontFamily:'Barlow Condensed' }}>{p.salt}</span>
            <div style={{ display:'flex', marginTop:10 }}>
              <div style={{ background:'#FFE000', borderRadius:5, padding:'5px 14px', display:'flex' }}>
                <span style={{ fontFamily:'Noto Sans Devanagari', fontSize:13, fontWeight:800, color:c.darkest }}>{hi[0]||p.indication}</span>
              </div>
            </div>
          </div>
          <ImgBox uri={productImg} w={108} h={108} c={c} emoji={p.formulation==='Spray'?'🫧':'🧼'} />
        </div>
      </div>
      <div style={{ display:'flex', flexDirection:'column', padding:'14px 18px 6px 18px' }}>
        <DescBar desc={getDescExcerpt(p.description)} tags={getIndicationTags(p.indication)} c={c} />
        <span style={{ fontFamily:'Noto Sans Devanagari', fontSize:13, fontWeight:800, color:c.primary, marginBottom:10, marginTop:8 }}>लाभ एवं उपयोग :</span>
        {hi.slice(0,5).map((b,i)=>(
          <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:10, marginBottom:7, padding:'8px 12px', borderRadius:7, background:c.pale, borderLeftWidth:4, borderLeftStyle:'solid', borderLeftColor:i===0?c.primary:c.bright, borderTopWidth:0, borderRightWidth:0, borderBottomWidth:0 }}>
            <div style={{ width:22, height:22, borderRadius:11, background:c.primary, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <span style={{ fontSize:13, color:'#fff', fontWeight:900 }}>✓</span>
            </div>
            <div style={{ display:'flex', flexDirection:'column' }}>
              <span style={{ fontFamily:isHindi(b)?'Noto Sans Devanagari':'Barlow Condensed', fontSize:12, color:'#111', fontWeight:isHindi(b)?600:700, lineHeight:1.35 }}>{b}</span>
              {en[i] && <span style={{ fontSize:9.5, color:'#888', fontFamily:'Barlow Condensed', marginTop:1 }}>{en[i]}</span>}
            </div>
          </div>
        ))}
      </div>
      <div style={{ display:'flex', padding:'4px 18px 8px 18px' }}>
        <Species sp={p.species} c={c} />
      </div>
      <AllProductsTag c={c} />
      <Footer c={c} />
    </div>
  )
}

// ── TEMPLATE 5: CLINICAL ──────────────────────────────────────────────────────
function CardClinical({ p, c, productImg }) {
  const { hi, en } = augmentBenefits(splitBenefitsSafe(p.usp_benefits_hi,p.benefits), splitBenefits(p.benefits), p.indication, p.description)
  const isInj = p.formulation==='Injection'
  const nameSz = p.name.length>14?32:p.name.length>10?42:52
  return (
    <div style={{ display:'flex', flexDirection:'column', width:480, background:'#fff', fontFamily:'Barlow Condensed' }}>
      <div style={{ display:'flex', flexDirection:'column', background:`linear-gradient(135deg,${c.darkest} 0%,${c.dark} 50%,${c.primary} 100%)`, padding:'16px 20px 20px 20px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
          <Logo size={0.88} />
          <div style={{ display:'flex' }}>
            <div style={{ background:c.p30, borderRadius:4, padding:'3px 10px', display:'flex' }}>
              <span style={{ fontSize:10, color:'#fff', fontWeight:700, letterSpacing:1, fontFamily:'Barlow Condensed' }}>{(p.category||'').split('/')[0]?.trim()}</span>
            </div>
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'flex-end', gap:14 }}>
          <div style={{ display:'flex', flexDirection:'column', flexGrow:1, flexShrink:1, flexBasis:0 }}>
            <span style={{ fontFamily:'Oswald', fontWeight:700, fontSize:nameSz, color:'#fff', letterSpacing:1.5, lineHeight:1 }}>{p.name}</span>
            <span style={{ fontSize:10.5, color:'rgba(255,255,255,0.72)', marginTop:5, fontFamily:'Barlow Condensed' }}>{p.salt}</span>
            <div style={{ display:'flex', gap:8, marginTop:8 }}>
              <div style={{ background:'rgba(255,255,255,0.15)', borderRadius:4, padding:'3px 10px', display:'flex' }}>
                <span style={{ fontSize:10, color:'rgba(255,255,255,0.85)', fontFamily:'Barlow Condensed' }}>{p.formulation} · {p.packaging}</span>
              </div>
            </div>
          </div>
          <ImgBox uri={productImg} w={104} h={110} c={c} emoji={isInj?'💉':'💊'} />
        </div>
      </div>
      <div style={{ height:4, background:`linear-gradient(90deg,${c.darkest},${c.bright})`, display:'flex' }} />
      <DescBar desc={getDescExcerpt(p.description)} tags={getIndicationTags(p.indication)} c={c} />
      <div style={{ display:'flex', flexDirection:'column', padding:'14px 18px 6px 18px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
          <span style={{ fontFamily:'Noto Sans Devanagari', fontSize:13, fontWeight:800, color:c.primary }}>प्रमुख लाभ</span>
          <div style={{ flexGrow:1, flexShrink:1, flexBasis:0, height:2, background:c.p40, display:'flex' }} />
          <span style={{ fontSize:9.5, color:'#aaa', fontFamily:'Barlow Condensed' }}>Key Benefits</span>
        </div>
        {hi.slice(0,5).map((b,i)=>(
          <div key={i} style={{ display:'flex', gap:10, marginBottom:7, padding:'8px 12px', borderRadius:8, background:i===0?c.pale:i===1?'#f5f5f5':'#fafafa' }}>
            <div style={{ width:24, height:24, borderRadius:12, background:i===0?c.primary:i===1?c.mid:c.bright, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, color:'#fff', fontWeight:800, flexShrink:0 }}>
              <span style={{ fontFamily:'Barlow Condensed' }}>{i+1}</span>
            </div>
            <div style={{ display:'flex', flexDirection:'column', flexGrow:1, flexShrink:1, flexBasis:0 }}>
              <span style={{ fontFamily:isHindi(b)?'Noto Sans Devanagari':'Barlow Condensed', fontSize:12, color:'#111', lineHeight:1.35, fontWeight:isHindi(b)?600:700 }}>{b}</span>
              {en[i] && <span style={{ fontSize:9.5, color:'#888', fontFamily:'Barlow Condensed', marginTop:1 }}>{en[i]}</span>}
            </div>
          </div>
        ))}
      </div>
      <div style={{ display:'flex', padding:'4px 18px 8px 18px' }}>
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
  if (isNaN(id)) return new Response('Bad ID', { status:400 })

  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  const table = (process.env.NEXT_PUBLIC_SUPABASE_TABLE ?? 'products_enriched').trim()

  const [fonts, { data, error }] = await Promise.all([
    loadFonts(),
    sb.from(table).select('id,product_name,salt_ingredient,packaging,formulation,category,species,indication,description,usp_benefits,usp_benefits_hi,image_url').eq('id',id).single()
  ])

  if (error||!data) return new Response('Not found', { status:404 })

  const rawCat = (data.category||'').trim()
  const category = CAT_NORMALIZE[rawCat]||rawCat

  const p = {
    id,
    name:            (data.product_name   ||'').trim(),
    salt:            (data.salt_ingredient||'').trim(),
    packaging:       (data.packaging      ||'').trim(),
    formulation:     (data.formulation    ||'').trim(),
    category,
    species:         (data.species        ||'').trim(),
    indication:      (data.indication     ||'').trim(),
    description:     (data.description    ||'').trim(),
    benefits:        (data.usp_benefits   ||'').trim(),
    usp_benefits_hi: (data.usp_benefits_hi||'').trim(),
    image_url:       (data.image_url      ||'').trim(),
  }

  const c          = getColors(id, category)
  const productImg = await imgURI(p.image_url)
  const tmpl       = getTemplate(category)
  const CardMap    = { vitality:CardVitality, digest:CardDigest, herbal:CardHerbal, shield:CardShield, clinical:CardClinical }
  const CardComp   = CardMap[tmpl]||CardClinical

  const numBenefits = Math.min(splitBenefitsSafe(p.usp_benefits_hi,p.benefits).length+1, 7)
  const height      = Math.min(900, Math.max(640, 220 + numBenefits*46 + 280))

  try {
    return new ImageResponse(
      <CardComp p={p} c={c} productImg={productImg} />,
      { width:480, height, fonts, headers:{ 'Cache-Control':'public,max-age=300,stale-while-revalidate=3600' } }
    )
  } catch(err) {
    console.error('[share-card] render error:', String(err?.message||err))
    return new Response('Render error: '+String(err?.message||err).slice(0,200), { status:500 })
  }
}
