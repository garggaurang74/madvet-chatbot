// @ts-nocheck
import React from 'react'
import { ImageResponse } from 'next/og'
import { createClient } from '@supabase/supabase-js'

// ─── CRITICAL: must be 'edge' — ImageResponse uses @resvg/resvg-js which
// fails to load in Node.js serverless (FUNCTION_INVOCATION_FAILED).
export const runtime = 'edge'
export const maxDuration = 30

// ─── FONTS ────────────────────────────────────────────────────────────────────
// Edge runtime has no 'fs'. Fonts are fetched from Google on first request
// and cached in module scope for the lifetime of the edge worker.
let _fontsCache: any[] | null = null

async function getFonts(): Promise<any[]> {
  if (_fontsCache) return _fontsCache
  try {
    const [oswald, barlow, noto] = await Promise.all([
      fetch('https://fonts.gstatic.com/s/oswald/v53/TK3_WkUHHAIjg75cFRf3bXL8LICs13NvgUFoZAaRliE.woff2').then(r => { if (!r.ok) throw new Error('oswald'); return r.arrayBuffer() }),
      fetch('https://fonts.gstatic.com/s/barlowcondensed/v12/HTxwL3I-JCGChYJ8VI-L6OO_au7B497y_3HcuKECcrs.woff2').then(r => { if (!r.ok) throw new Error('barlow'); return r.arrayBuffer() }),
      fetch('https://fonts.gstatic.com/s/notosansdevanagari/v25/TuGOUUFzXI5FBtUq5a8bh68BJxxEb2-e.woff2').then(r => { if (!r.ok) throw new Error('noto'); return r.arrayBuffer() }),
    ])
    _fontsCache = [
      { name: 'Oswald',               weight: 700, style: 'normal', data: oswald },
      { name: 'Barlow Condensed',     weight: 700, style: 'normal', data: barlow },
      { name: 'Noto Sans Devanagari', weight: 700, style: 'normal', data: noto },
    ]
  } catch (e) {
    console.warn('[share-card] font fetch failed:', String(e))
    _fontsCache = []
  }
  return _fontsCache
}

// ─── IMAGE → BASE64 DATA URI ──────────────────────────────────────────────────
async function imgURI(url?: string): Promise<string | null> {
  if (!url) return null
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(5000) })
    if (!r.ok) return null
    const ct = r.headers.get('content-type') || ''
    if (ct.includes('html') || ct.includes('text')) return null
    const buf = await r.arrayBuffer()
    const arr = new Uint8Array(buf)
    // detect mime from magic bytes
    let mime = 'image/webp'
    if (arr[0] === 0xFF && arr[1] === 0xD8) mime = 'image/jpeg'
    else if (arr[0] === 0x89 && arr[1] === 0x50) mime = 'image/png'
    // btoa for edge runtime (no Buffer)
    const b64 = btoa(arr.reduce((s, b) => s + String.fromCharCode(b), ''))
    return `data:${mime};base64,${b64}`
  } catch { return null }
}

// ─── COLORS ───────────────────────────────────────────────────────────────────
const CAT_PALETTES: Record<string, {h:number,s:number,l:number}> = {
  'Vitamin Supplement':                 { h:22,  s:85, l:32 },
  'Vitamin Supplement / Galactogogue':  { h:210, s:85, l:25 },
  'Antibiotic':                         { h:218, s:72, l:26 },
  'Anti-inflammatory / Analgesic':      { h:338, s:78, l:30 },
  'Anthelmintic / Antiparasitic':       { h:158, s:70, l:26 },
  'Probiotic':                          { h:128, s:65, l:28 },
  'Dermatological':                     { h:272, s:60, l:30 },
  'Ectoparasiticide':                   { h:42,  s:80, l:30 },
  'Reproductive Hormone':               { h:295, s:58, l:28 },
  'Antihistamine':                      { h:200, s:68, l:26 },
  'Antidiarrheal':                      { h:168, s:65, l:26 },
  'Udder Care / Herbal Antimicrobial':  { h:88,  s:68, l:26 },
  'Digestive / Antiflatulent':          { h:33,  s:82, l:28 },
}

const CAT_NORMALIZE: Record<string,string> = {
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

function hsl(h:number, s:number, l:number): string { return `hsl(${h},${s}%,${l}%)` }

function getColors(id:number, cat:string) {
  const base  = CAT_PALETTES[cat] ?? { h:220, s:70, l:28 }
  const shift = ((id * 37 + 13) % 41) - 20
  const h     = (base.h + shift + 360) % 360
  const { s, l } = base
  return {
    primary: hsl(h, s, l),
    bright:  hsl(h, s, l+14),
    dark:    hsl(h, s, l-10),
    darkest: hsl(h, s, l-18),
    pale:    hsl(h, Math.max(s-30,20), 95),
    mid:     hsl(h, s, l+7),
    p12:     `hsla(${h},${s}%,${l}%,0.12)`,
    p15:     `hsla(${h},${s}%,${l}%,0.15)`,
  }
}

// ─── DATA HELPERS ─────────────────────────────────────────────────────────────
const SP: Record<string,string> = { Cattle:'🐄', Buffalo:'🐃', Sheep:'🐑', Goat:'🐐', Dog:'🐕', Cat:'🐈', Poultry:'🐓', Horse:'🐴' }

const splitB  = (t='') => t.split(/[•\n,;|।]+/).map(s=>s.trim()).filter(s=>s.length>6)
const splitBS = (hi='',en='') => { const p=splitB(hi); if(p.length>=2) return p; const e=splitB(en); return e.length>=2?e:(p.length?p:e) }
const getDesc = (d='',max=130) => { if(!d) return ''; const f=d.split(/\.\s+/)[0]; return (f.length<=max?f:f.slice(0,max).replace(/\s\S+$/,'')+'…').replace(/\.$/,'')+'.'}
const getTags = (ind='') => ind.split(/[,،]+/).map(s=>s.trim()).filter(s=>s.length>2&&s.length<28&&/^[a-zA-Z\s\/\-]+$/.test(s)).slice(0,4)
const spList  = (sp='') => sp.split(/[,\/]/).map(s=>s.trim()).filter(Boolean).slice(0,6)

function getTemplate(cat:string): string {
  if (['Vitamin Supplement','Vitamin Supplement / Galactogogue'].includes(cat)) return 'vitality'
  if (['Probiotic','Digestive / Antiflatulent','Antidiarrheal'].includes(cat))  return 'digest'
  if (['Reproductive Hormone','Udder Care / Herbal Antimicrobial'].includes(cat)) return 'herbal'
  if (['Dermatological','Ectoparasiticide','Antihistamine'].includes(cat))        return 'shield'
  return 'clinical'
}

// ─── SHARED UI ────────────────────────────────────────────────────────────────
const F = (hasFont:boolean) => hasFont ? 'Noto Sans Devanagari' : 'Barlow Condensed'

function TopBar({ p, c, logoImg, right }: any) {
  return (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
        {logoImg
          ? <img src={logoImg} width={28} height={28} style={{ width:28, height:28 }} />
          : <span style={{ fontSize:20 }}>🐾</span>}
        <div style={{ display:'flex', flexDirection:'column' }}>
          <span style={{ fontFamily:'Oswald', fontSize:16, fontWeight:700, color:'#fff', letterSpacing:3, lineHeight:1 }}>MADVET</span>
          <span style={{ fontFamily:'Barlow Condensed', fontSize:7, color:'rgba(255,255,255,0.6)', letterSpacing:1.5 }}>ANIMAL HEALTH CARE</span>
        </div>
      </div>
      {right}
    </div>
  )
}

function DescBar({ p, c }: any) {
  const desc = getDesc(p.description)
  const tags = getTags(p.indication)
  if (!desc && !tags.length) return null
  return (
    <div style={{ display:'flex', flexDirection:'column', padding:'8px 16px 6px', background:c.pale }}>
      {desc && <span style={{ fontFamily:'Barlow Condensed', fontSize:10, color:'#2a2a2a', lineHeight:'1.5' }}>{desc}</span>}
      {tags.length > 0 && (
        <div style={{ display:'flex', gap:5, alignItems:'center', marginTop:desc?4:0 }}>
          <span style={{ fontFamily:'Oswald', fontSize:8, color:c.primary, fontWeight:700, letterSpacing:1 }}>TREATS:</span>
          {tags.map((t,i) => (
            <div key={i} style={{ display:'flex', background:c.p12, borderRadius:20, padding:'2px 7px' }}>
              <span style={{ fontFamily:'Barlow Condensed', fontSize:8.5, color:c.dark }}>{t}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function SRow({ sp, c }: any) {
  return (
    <div style={{ display:'flex', gap:4 }}>
      {spList(sp).map((s,i) => (
        <div key={i} style={{ width:24, height:24, borderRadius:12, background:c.p15, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12 }}>
          <span>{SP[s]||'🐾'}</span>
        </div>
      ))}
    </div>
  )
}

function PImg({ src, w, h, emoji }: any) {
  const box: any = { width:w, height:h, borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(255,255,255,0.12)', flexShrink:0 }
  if (src) return <div style={box}><img src={src} width={w-8} height={h-8} style={{ width:w-8, height:h-8 }} /></div>
  return <div style={box}><span style={{ fontSize:Math.round(w*0.34) }}>{emoji}</span></div>
}

function FooterBar({ c, logoImg }: any) {
  return (
    <div style={{ display:'flex', flexDirection:'column' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', background:`linear-gradient(90deg,${c.darkest},${c.primary})`, padding:'7px 16px' }}>
        <div style={{ display:'flex', flexDirection:'column' }}>
          <span style={{ fontFamily:'Barlow Condensed', fontSize:7, color:'rgba(255,255,255,0.5)', letterSpacing:2 }}>VIEW ALL PRODUCTS</span>
          <span style={{ fontFamily:'Oswald', fontSize:12, color:'#fff', fontWeight:700, letterSpacing:0.5 }}>madvet.in/products</span>
        </div>
        <div style={{ display:'flex', flexDirection:'column', background:'rgba(255,255,255,0.12)', borderRadius:5, padding:'3px 10px', alignItems:'center' }}>
          <span style={{ fontFamily:'Barlow Condensed', fontSize:7, color:'rgba(255,255,255,0.5)' }}>AI ASSISTANT</span>
          <span style={{ fontFamily:'Oswald', fontSize:10, color:'#fff' }}>ai.madvet.in</span>
        </div>
      </div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', background:'#FFD700', padding:'10px 16px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:9 }}>
          {logoImg ? <img src={logoImg} width={30} height={30} style={{ width:30, height:30 }} /> : <span style={{ fontSize:22 }}>🐾</span>}
          <div style={{ display:'flex', flexDirection:'column' }}>
            <span style={{ fontFamily:'Oswald', fontSize:18, fontWeight:700, color:'#1a2f8a', letterSpacing:3, lineHeight:1 }}>MADVET</span>
            <span style={{ fontFamily:'Barlow Condensed', fontSize:8, color:'#1a2f8a', letterSpacing:1.5, fontWeight:700 }}>ANIMAL HEALTH CARE</span>
            <span style={{ fontFamily:'Barlow Condensed', fontSize:7, color:'#555' }}>Ghaziabad (U.P.)</span>
          </div>
        </div>
        <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end' }}>
          <span style={{ fontFamily:'Barlow Condensed', fontSize:8, color:'#111', fontWeight:700 }}>I.S.O. 9001:2013 COMPANY</span>
          <span style={{ fontFamily:'Barlow Condensed', fontSize:7.5, color:'#333' }}>madvet.animal@gmail.com</span>
          <span style={{ fontFamily:'Barlow Condensed', fontSize:9, color:'#1a2f8a', fontWeight:700 }}>📞 9935257750 · 8400347331</span>
        </div>
      </div>
    </div>
  )
}

// ─── TEMPLATE 1: VITALITY ─────────────────────────────────────────────────────
function CardVitality({ p, c, productImg, logoImg, hasFont }: any) {
  const B = splitBS(p.usp_benefits_hi, p.benefits)
  const sz = p.name.length>14?36:p.name.length>10?48:58
  return (
    <div style={{ display:'flex', flexDirection:'column', width:480, background:'#fff' }}>
      <div style={{ display:'flex', flexDirection:'column', background:`linear-gradient(140deg,${c.darkest},${c.primary} 55%,${c.mid})`, padding:'16px 18px 0' }}>
        <TopBar p={p} c={c} logoImg={logoImg} right={
          <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:3 }}>
            <span style={{ fontFamily:'Barlow Condensed', fontSize:8.5, color:'rgba(255,255,255,0.75)', background:'rgba(255,255,255,0.15)', borderRadius:4, padding:'2px 7px' }}>{p.formulation}</span>
            <span style={{ fontFamily:'Barlow Condensed', fontSize:7.5, color:'rgba(255,255,255,0.45)' }}>{p.packaging}</span>
          </div>
        } />
        <div style={{ display:'flex', flexDirection:'column', background:'rgba(0,0,0,0.25)', margin:'12px -18px 0', padding:'10px 18px', borderTop:`2px solid ${c.bright}` }}>
          <span style={{ fontFamily:'Oswald', fontSize:sz, fontWeight:700, color:'#fff', letterSpacing:2, lineHeight:1 }}>{p.name}</span>
          <span style={{ fontFamily:'Barlow Condensed', fontSize:9.5, color:'rgba(255,255,255,0.65)', marginTop:4 }}>{p.salt}</span>
        </div>
        {B[0] && (
          <div style={{ display:'flex', margin:'10px 0 14px' }}>
            <div style={{ background:'#FFE000', borderRadius:6, padding:'6px 12px', display:'flex' }}>
              <span style={{ fontFamily:F(hasFont), fontSize:12.5, fontWeight:700, color:c.darkest }}>{B[0]}</span>
            </div>
          </div>
        )}
      </div>
      {B[1] && (
        <div style={{ display:'flex', padding:'6px 16px', background:'linear-gradient(90deg,#FFE000,#FFD000)' }}>
          <span style={{ fontFamily:F(hasFont), fontSize:12.5, fontWeight:700, color:c.darkest }}>{B[1]}</span>
        </div>
      )}
      <DescBar p={p} c={c} />
      <div style={{ display:'flex', padding:'10px 0 6px' }}>
        <div style={{ display:'flex', flexDirection:'column', flex:1, paddingLeft:14, paddingRight:6 }}>
          {B.slice(2,7).map((b,i) => (
            <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:8, padding:'6px 9px', borderRadius:6, background:i===0?c.pale:i%2===0?'#f8f8f8':'#fff', marginBottom:4, borderLeft:`3px solid ${i===0?c.primary:c.bright}` }}>
              <div style={{ width:18, height:18, borderRadius:9, background:i===0?c.primary:c.mid, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <span style={{ fontFamily:'Oswald', fontSize:10, color:'#fff', fontWeight:700 }}>{i+1}</span>
              </div>
              <span style={{ fontFamily:F(hasFont), fontSize:11.5, color:'#111', fontWeight:600, lineHeight:'1.35' }}>{b}</span>
            </div>
          ))}
        </div>
        <div style={{ width:104, flexShrink:0, display:'flex', flexDirection:'column', alignItems:'center', gap:7, paddingRight:12, paddingTop:2 }}>
          <PImg src={productImg} w={90} h={114} emoji={p.formulation==='Bolus'?'💊':'🧴'} />
          <SRow sp={p.species} c={c} />
        </div>
      </div>
      <div style={{ height:2, background:`linear-gradient(90deg,${c.darkest},${c.bright})`, display:'flex' }} />
      <FooterBar c={c} logoImg={logoImg} />
    </div>
  )
}

// ─── TEMPLATE 2: DIGEST ───────────────────────────────────────────────────────
function CardDigest({ p, c, productImg, logoImg, hasFont }: any) {
  const B = splitBS(p.usp_benefits_hi, p.benefits)
  const sz = p.name.length>12?34:p.name.length>8?44:54
  return (
    <div style={{ display:'flex', flexDirection:'column', width:480, background:'#fff' }}>
      <div style={{ display:'flex', flexDirection:'column', padding:'14px 16px 12px', background:'#fff', borderBottom:`3px solid ${c.primary}` }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
          <div style={{ display:'flex', flexDirection:'column', flex:1, paddingRight:10 }}>
            <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:7 }}>
              {logoImg?<img src={logoImg} width={22} height={22} style={{ width:22, height:22 }}/>:<span style={{ fontSize:16 }}>🐾</span>}
              <span style={{ fontFamily:'Oswald', fontSize:14, fontWeight:700, color:c.primary, letterSpacing:2.5 }}>MADVET</span>
              <span style={{ fontFamily:'Barlow Condensed', fontSize:7, color:'#aaa', letterSpacing:1 }}>ANIMAL HEALTH CARE</span>
            </div>
            <span style={{ fontFamily:'Oswald', fontSize:sz, fontWeight:700, color:c.primary, letterSpacing:1.5, lineHeight:1 }}>{p.name}</span>
            <span style={{ fontFamily:'Barlow Condensed', fontSize:9, color:'#888', marginTop:4 }}>{p.salt}</span>
            <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:7 }}>
              <span style={{ fontFamily:'Barlow Condensed', fontSize:8.5, color:c.primary, fontWeight:700, background:c.pale, borderRadius:4, padding:'2px 7px' }}>{p.formulation?.toUpperCase()}</span>
              <span style={{ fontFamily:'Barlow Condensed', fontSize:8, color:'#aaa' }}>{p.packaging}</span>
            </div>
            {B[0] && (
              <div style={{ marginTop:9, background:c.primary, borderRadius:5, padding:'5px 12px', display:'flex' }}>
                <span style={{ fontFamily:F(hasFont), fontSize:12, color:'#fff', fontWeight:700 }}>{B[0]}</span>
              </div>
            )}
          </div>
          <div style={{ width:102, height:102, borderRadius:9, background:c.pale, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            {productImg?<img src={productImg} width={94} height={94} style={{ width:94, height:94 }}/>:<span style={{ fontSize:34 }}>{p.formulation==='Bolus'?'💊':'🧴'}</span>}
          </div>
        </div>
      </div>
      <DescBar p={p} c={c} />
      <div style={{ display:'flex', padding:'10px 16px 7px', gap:10 }}>
        <div style={{ display:'flex', flexDirection:'column', flex:1 }}>
          <span style={{ fontFamily:F(hasFont), fontSize:11.5, fontWeight:700, color:c.primary, marginBottom:7 }}>{hasFont?'प्रयोग एवं लक्षण :':'USES & INDICATIONS:'}</span>
          {B.slice(1,7).map((b,i) => (
            <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:8, marginBottom:5, padding:'6px 9px', borderRadius:6, background:i%2===0?c.pale:'transparent', borderLeft:`3px solid ${i%2===0?c.primary:c.bright}` }}>
              <div style={{ width:6, height:6, borderRadius:3, background:i%2===0?c.primary:c.bright, flexShrink:0, marginTop:5 }} />
              <span style={{ fontFamily:F(hasFont), fontSize:11.5, color:'#181818', fontWeight:600, lineHeight:'1.35' }}>{b}</span>
            </div>
          ))}
        </div>
        <div style={{ width:96, flexShrink:0, display:'flex', flexDirection:'column', gap:7, alignItems:'center' }}>
          <div style={{ display:'flex', flexDirection:'column', background:`linear-gradient(155deg,${c.darkest},${c.primary})`, borderRadius:9, padding:'10px 7px', alignItems:'center', width:'100%' }}>
            <span style={{ fontFamily:'Barlow Condensed', fontSize:7, color:'rgba(255,255,255,0.55)', letterSpacing:1.5, marginBottom:3 }}>{p.formulation?.toUpperCase()}</span>
            <span style={{ fontFamily:'Oswald', fontSize:12, fontWeight:700, color:'#fff', lineHeight:'1.2', letterSpacing:0.5 }}>{p.name}</span>
            <span style={{ fontFamily:'Barlow Condensed', fontSize:7, color:'rgba(255,255,255,0.6)', marginTop:3 }}>{p.packaging}</span>
          </div>
          <SRow sp={p.species} c={c} />
        </div>
      </div>
      <div style={{ height:2, background:`linear-gradient(90deg,${c.darkest},${c.bright})`, display:'flex' }} />
      <FooterBar c={c} logoImg={logoImg} />
    </div>
  )
}

// ─── TEMPLATE 3: HERBAL ───────────────────────────────────────────────────────
function CardHerbal({ p, c, productImg, logoImg, hasFont }: any) {
  const B = splitBS(p.usp_benefits_hi, p.benefits)
  const sz = p.name.length>14?32:p.name.length>10?42:52
  const words = p.name.split(' ').filter(Boolean)
  // 2-column layout: render as 3 pairs of rows (not CSS grid — Satori doesn't support it)
  const pairs = [[B[1],B[2]],[B[3],B[4]],[B[5],B[6]]].filter(pair => pair[0])
  return (
    <div style={{ display:'flex', flexDirection:'column', width:480, background:'#fff' }}>
      <div style={{ display:'flex', flexDirection:'column', background:`linear-gradient(155deg,${c.darkest},${c.primary} 55%,${c.bright})`, padding:'16px 18px 15px' }}>
        <TopBar p={p} c={c} logoImg={logoImg} right={
          <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end' }}>
            <span style={{ fontFamily:'Barlow Condensed', fontSize:8.5, color:'rgba(255,255,255,0.65)' }}>{p.category?.split('/')[0]?.trim()}</span>
            <span style={{ fontFamily:'Barlow Condensed', fontSize:7.5, color:'rgba(255,255,255,0.45)' }}>{p.packaging}</span>
          </div>
        } />
        <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', gap:10, marginTop:11 }}>
          <div style={{ display:'flex', flexDirection:'column', flex:1 }}>
            <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
              {words.map((w,i) => (
                <span key={i} style={{ fontFamily:'Oswald', fontSize:sz, fontWeight:700, color:i%2===0?'#fff':'#FFE000', lineHeight:1, letterSpacing:2 }}>{w}</span>
              ))}
            </div>
            <span style={{ fontFamily:'Barlow Condensed', fontSize:9.5, color:'rgba(255,255,255,0.72)', marginTop:5 }}>{p.salt?.split(',')[0]?.trim()}</span>
          </div>
          <PImg src={productImg} w={86} h={86} emoji="🌿" />
        </div>
        {B[0] && (
          <div style={{ display:'flex', marginTop:10, alignItems:'center', gap:7, background:'rgba(255,255,255,0.13)', borderRadius:6, padding:'6px 12px' }}>
            <span style={{ fontSize:14, lineHeight:1 }}>🌱</span>
            <span style={{ fontFamily:F(hasFont), fontSize:12.5, color:'#FFE000', fontWeight:700 }}>{B[0]}</span>
          </div>
        )}
      </div>
      <DescBar p={p} c={c} />
      <div style={{ display:'flex', flexDirection:'column', padding:'10px 14px 7px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:8 }}>
          <div style={{ width:4, height:14, background:c.primary, borderRadius:2 }} />
          <span style={{ fontFamily:F(hasFont), fontSize:12, fontWeight:700, color:c.primary }}>{hasFont?'प्रमुख लाभ एवं उपयोग :':'KEY BENEFITS & USES:'}</span>
        </div>
        {pairs.map((pair, ri) => (
          <div key={ri} style={{ display:'flex', gap:6, marginBottom:6 }}>
            {pair.filter(Boolean).map((b,ci) => (
              <div key={ci} style={{ display:'flex', gap:6, padding:'7px 9px', background:ri===0&&ci===0?c.pale:'#fafafa', borderRadius:7, alignItems:'flex-start', flex:1 }}>
                <span style={{ fontFamily:'Oswald', color:c.primary, fontSize:11, fontWeight:700, flexShrink:0 }}>►</span>
                <span style={{ fontFamily:F(hasFont), fontSize:10.5, color:'#1e1e1e', lineHeight:'1.35', fontWeight:600 }}>{b}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'5px 14px 9px' }}>
        <SRow sp={p.species} c={c} />
        <div style={{ background:c.pale, borderRadius:5, padding:'3px 10px' }}>
          <span style={{ fontFamily:'Barlow Condensed', fontSize:10.5, fontWeight:700, color:c.primary }}>{p.formulation}</span>
        </div>
      </div>
      <div style={{ height:2, background:`linear-gradient(90deg,${c.darkest},${c.bright})`, display:'flex' }} />
      <FooterBar c={c} logoImg={logoImg} />
    </div>
  )
}

// ─── TEMPLATE 4: SHIELD ───────────────────────────────────────────────────────
function CardShield({ p, c, productImg, logoImg, hasFont }: any) {
  const B = splitBS(p.usp_benefits_hi, p.benefits)
  const sz = p.name.length>14?32:p.name.length>10?44:54
  return (
    <div style={{ display:'flex', flexDirection:'column', width:480, background:'#fff' }}>
      <div style={{ display:'flex', flexDirection:'column', background:`linear-gradient(125deg,${c.darkest},${c.primary})`, padding:'16px 18px 17px' }}>
        <TopBar p={p} c={c} logoImg={logoImg} right={
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', background:'rgba(255,255,255,0.15)', borderRadius:5, padding:'3px 10px' }}>
            <span style={{ fontFamily:'Barlow Condensed', fontSize:9.5, color:'#FFE000', fontWeight:700, letterSpacing:1.5 }}>{p.formulation?.toUpperCase()}</span>
            <span style={{ fontFamily:'Barlow Condensed', fontSize:7.5, color:'rgba(255,255,255,0.55)' }}>{p.packaging}</span>
          </div>
        } />
        <div style={{ display:'flex', alignItems:'flex-end', gap:13, marginTop:11 }}>
          <div style={{ display:'flex', flexDirection:'column', flex:1 }}>
            <span style={{ fontFamily:'Oswald', fontSize:sz, fontWeight:700, color:'#fff', letterSpacing:2, lineHeight:1 }}>{p.name}</span>
            <span style={{ fontFamily:'Barlow Condensed', fontSize:10, color:'rgba(255,255,255,0.68)', marginTop:5 }}>{p.salt}</span>
            {B[0] && (
              <div style={{ display:'flex', marginTop:9 }}>
                <div style={{ background:'#FFE000', borderRadius:5, padding:'5px 12px', display:'flex' }}>
                  <span style={{ fontFamily:F(hasFont), fontSize:12, fontWeight:700, color:c.darkest }}>{B[0]}</span>
                </div>
              </div>
            )}
          </div>
          <PImg src={productImg} w={92} h={92} emoji={p.formulation==='Spray'?'🫧':'🧼'} />
        </div>
      </div>
      <DescBar p={p} c={c} />
      <div style={{ display:'flex', flexDirection:'column', padding:'10px 14px 5px' }}>
        <span style={{ fontFamily:F(hasFont), fontSize:12, fontWeight:700, color:c.primary, marginBottom:8 }}>{hasFont?'लाभ एवं उपयोग :':'BENEFITS & USES:'}</span>
        {B.slice(1,6).map((b,i) => (
          <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:9, marginBottom:6, padding:'8px 11px', borderRadius:6, background:i===0?c.pale:'#fafafa', borderLeft:`4px solid ${i===0?c.primary:c.bright}` }}>
            <div style={{ width:21, height:21, borderRadius:11, background:i===0?c.primary:c.mid, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <span style={{ fontFamily:'Oswald', fontSize:11, color:'#fff', fontWeight:700 }}>✓</span>
            </div>
            <span style={{ fontFamily:F(hasFont), fontSize:12, color:'#111', fontWeight:600, lineHeight:'1.35' }}>{b}</span>
          </div>
        ))}
      </div>
      <div style={{ display:'flex', padding:'3px 14px 9px' }}>
        <SRow sp={p.species} c={c} />
      </div>
      <div style={{ height:2, background:`linear-gradient(90deg,${c.darkest},${c.bright})`, display:'flex' }} />
      <FooterBar c={c} logoImg={logoImg} />
    </div>
  )
}

// ─── TEMPLATE 5: CLINICAL ─────────────────────────────────────────────────────
function CardClinical({ p, c, productImg, logoImg, hasFont }: any) {
  const B = splitBS(p.usp_benefits_hi, p.benefits)
  const sz = p.name.length>14?32:p.name.length>10?42:52
  return (
    <div style={{ display:'flex', flexDirection:'column', width:480, background:'#fff' }}>
      <div style={{ display:'flex', flexDirection:'column', background:`linear-gradient(135deg,${c.darkest},${c.dark} 45%,${c.primary})`, padding:'16px 18px 17px' }}>
        <TopBar p={p} c={c} logoImg={logoImg} right={
          <div style={{ display:'flex', flexDirection:'column', gap:4, alignItems:'flex-end' }}>
            <div style={{ background:c.bright, borderRadius:4, padding:'2px 9px' }}>
              <span style={{ fontFamily:'Barlow Condensed', fontSize:9, color:'#fff', fontWeight:700, letterSpacing:0.8 }}>{p.category?.split('/')[0]?.trim()}</span>
            </div>
            <span style={{ fontFamily:'Barlow Condensed', fontSize:7.5, color:'rgba(255,255,255,0.5)' }}>{p.packaging}</span>
          </div>
        } />
        <div style={{ display:'flex', flexDirection:'column', background:'rgba(0,0,0,0.2)', margin:'11px -18px 0', padding:'9px 18px', borderTop:`2px solid ${c.bright}` }}>
          <span style={{ fontFamily:'Oswald', fontSize:sz, fontWeight:700, color:'#fff', letterSpacing:1.5, lineHeight:1 }}>{p.name}</span>
          <span style={{ fontFamily:'Barlow Condensed', fontSize:9, color:'rgba(255,255,255,0.65)', marginTop:4 }}>{p.salt}</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:13, marginTop:11 }}>
          <div style={{ display:'flex', flexDirection:'column', flex:1 }}>
            <div style={{ display:'flex' }}>
              <span style={{ fontFamily:'Barlow Condensed', fontSize:8.5, color:'rgba(255,255,255,0.75)', background:'rgba(255,255,255,0.13)', borderRadius:4, padding:'3px 9px', letterSpacing:0.8 }}>{p.formulation} · {p.packaging}</span>
            </div>
            {B[0] && <span style={{ fontFamily:F(hasFont), fontSize:12, color:'#FFE000', fontWeight:700, marginTop:8 }}>{B[0]}</span>}
          </div>
          <PImg src={productImg} w={86} h={92} emoji={p.formulation==='Injection'?'💉':'💊'} />
        </div>
      </div>
      <div style={{ height:3, background:`linear-gradient(90deg,${c.darkest},${c.bright},${c.primary})`, display:'flex' }} />
      <DescBar p={p} c={c} />
      <div style={{ display:'flex', flexDirection:'column', padding:'10px 14px 5px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:9, marginBottom:8 }}>
          <span style={{ fontFamily:F(hasFont), fontSize:12, fontWeight:700, color:c.primary }}>{hasFont?'प्रमुख लाभ':'KEY BENEFITS'}</span>
          <span style={{ fontFamily:'Barlow Condensed', fontSize:9, color:'#bbb' }}>Key Benefits</span>
        </div>
        {B.slice(1,6).map((b,i) => (
          <div key={i} style={{ display:'flex', gap:9, marginBottom:6, padding:'8px 11px', borderRadius:6, background:i===0?c.pale:i===1?'#f3f3f3':'#fafafa' }}>
            <div style={{ width:22, height:22, borderRadius:11, background:i===0?c.primary:i===1?c.mid:c.bright, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <span style={{ fontFamily:'Oswald', fontSize:11, color:'#fff', fontWeight:700 }}>{i+1}</span>
            </div>
            <span style={{ fontFamily:F(hasFont), fontSize:12, color:'#111', lineHeight:'1.35', fontWeight:600 }}>{b}</span>
          </div>
        ))}
      </div>
      <div style={{ display:'flex', padding:'3px 14px 9px' }}>
        <SRow sp={p.species} c={c} />
      </div>
      <div style={{ height:2, background:`linear-gradient(90deg,${c.darkest},${c.bright})`, display:'flex' }} />
      <FooterBar c={c} logoImg={logoImg} />
    </div>
  )
}

const TEMPLATES: Record<string,any> = { vitality:CardVitality, digest:CardDigest, herbal:CardHerbal, shield:CardShield, clinical:CardClinical }

// ─── ROUTE HANDLER ────────────────────────────────────────────────────────────
export async function GET(_req: Request, { params }: { params: Promise<{id:string}> }) {
  const { id: rawId } = await params
  const id = parseInt(rawId, 10)
  if (isNaN(id)) return new Response('Bad ID', { status: 400 })

  const sb    = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
  const table = (process.env.NEXT_PUBLIC_SUPABASE_TABLE ?? 'products_enriched').trim()

  const [{ data, error }, logoImg, fonts] = await Promise.all([
    sb.from(table)
      .select('id,product_name,salt_ingredient,packaging,formulation,category,species,indication,description,usp_benefits,usp_benefits_hi,image_url')
      .eq('id', id)
      .single(),
    imgURI('https://ai.madvet.in/madvet-icon.png'),
    getFonts(),
  ])

  if (error || !data) return new Response('Product not found', { status: 404 })

  const rawCat   = (data.category || '').trim()
  const category = CAT_NORMALIZE[rawCat] || rawCat
  const hasFont  = fonts.length > 0

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

  const c          = getColors(id, category)
  const productImg = await imgURI(p.image_url)
  const tmpl       = getTemplate(category)
  const Card       = TEMPLATES[tmpl]
  const nb         = Math.min(splitBS(p.usp_benefits_hi, p.benefits).length, 6)
  const height     = Math.min(1400, Math.max(660, 260 + nb * 62 + 240))

  try {
    return new ImageResponse(
      <Card p={p} c={c} productImg={productImg} logoImg={logoImg} hasFont={hasFont} />,
      { width:480, height, fonts }
    )
  } catch (err: any) {
    const msg = String(err?.message || err)
    console.error('[share-card] RENDER FAILED:', { tmpl, name:p.name, hasFont, fontsCount:fonts.length, msg })
    return new Response(`Render error [${tmpl}/${p.name}]: ${msg.slice(0,300)}`, { status:500 })
  }
}
