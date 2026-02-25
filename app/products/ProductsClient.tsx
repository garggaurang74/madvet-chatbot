'use client'

import { useState, useMemo, useCallback } from 'react'
import Link from 'next/link'
import type { Product } from './types'

// ── CONSTANTS ────────────────────────────────────────────────────────────────

const CAT_COLORS: Record<string, string> = {
  'Antibiotic':                      '#3b82f6',
  'Anti-inflammatory / Analgesic':   '#f59e0b',
  'Vitamin Supplement':              '#10b981',
  'Anthelmintic / Antiparasitic':    '#8b5cf6',
  'Ectoparasiticide':                '#ef4444',
  'Reproductive Hormone':            '#f472b6',
  'Probiotic':                       '#14b8a6',
  'Antidiarrheal':                   '#84cc16',
  'Antihistamine':                   '#a78bfa',
  'Dermatological':                  '#fb7185',
  'Udder Care':                      '#2dd4bf',
}
const getColor = (cat: string) => CAT_COLORS[cat] || '#94a3b8'

const CAT_ORDER = [
  'Antibiotic', 'Anti-inflammatory / Analgesic', 'Vitamin Supplement',
  'Anthelmintic / Antiparasitic', 'Ectoparasiticide', 'Reproductive Hormone',
  'Probiotic', 'Antidiarrheal', 'Antihistamine', 'Dermatological', 'Udder Care',
]

const FORM_ORDER = [
  'Bolus', 'Injection', 'Liquid', 'Tablet', 'Powder',
  'Spray', 'Gel / Ointment', 'Soap', 'Suspension', 'Pour-On', 'Other',
]

const SP_ORDER = ['Cattle', 'Buffalo', 'Sheep', 'Goat', 'Dog', 'Cat', 'Poultry', 'Horse']

// ── HINDI TRANSLATIONS ───────────────────────────────────────────────────────

const HI_CATS: Record<string, string> = {
  'Antibiotic':                    'एंटीबायोटिक (संक्रमण)',
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

const HI_SP: Record<string, string> = {
  Cattle: 'गाय', Buffalo: 'भैंस', Sheep: 'भेड़', Goat: 'बकरी',
  Dog: 'कुत्ता', Cat: 'बिल्ली', Poultry: 'मुर्गी', Horse: 'घोड़ा',
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

type Lang = 'en' | 'hi'

// ── SEARCH SCORING ────────────────────────────────────────────────────────────

// Normalize: strip punctuation so "vh5" matches "V.H-5", "500ml" matches "500 ml"
function norm(s: string): string {
  return s.toLowerCase().replace(/[.\-_/\s]+/g, '')
}

function scoreToken(p: Product, t: string): number {
  const nt  = norm(t)
  const nn  = norm(p.name)
  const raw = p.name.toLowerCase()
  let score = 0

  // Name match — try both raw and normalized
  if (nn === nt || raw === t)              score += 100
  else if (nn.startsWith(nt) || raw.startsWith(t)) score += 60
  else if (nn.includes(nt) || raw.includes(t))     score += 40

  // Other fields — check both raw and normalized versions
  const fields: [string, number][] = [
    [p.aliases,     30],
    [p.salt,        25],
    [p.description, 20],
    [p.benefits,    15],
    [p.indication,   8],
    [p.category,     5],
    [p.species,      5],
    [p.packaging,    3],
    [p.formulation,  3],
  ]
  for (const [val, pts] of fields) {
    if (!val) continue
    if (val.toLowerCase().includes(t) || norm(val).includes(nt)) score += pts
  }
  return score
}

// Multi-token AND scoring: "vh5 100" matches V.H-5 in name AND 100ml in packaging
function scoreProduct(p: Product, q: string): number {
  const tokens = q.trim().split(/\s+/).filter(Boolean)
  if (tokens.length === 0) return 0
  let total = 0
  for (const t of tokens) {
    const s = scoreToken(p, t)
    if (s === 0) return 0   // ALL tokens must match (AND logic)
    total += s
  }
  return total
}

// ── HIGHLIGHT ─────────────────────────────────────────────────────────────────

function highlight(text: string, q: string): string {
  if (!q || !text) return text
  const tokens = q.split(/\s+/).filter(Boolean)
  if (tokens.length === 0) return text
  // Single combined regex so inserted <mark> HTML is never scanned again,
  // preventing CSS style strings from getting corrupted by subsequent token replacements
  const combined = tokens
    .map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|')
  return text.replace(
    new RegExp(`(${combined})`, 'gi'),
    '<mark style="background:#fef08a;color:#1a3a2a;border-radius:2px;padding:0 2px;">$1</mark>'
  )
}

// ── PRODUCT CARD ──────────────────────────────────────────────────────────────

function ProductCard({ p, q, lang }: { p: Product; q: string; lang: Lang }) {
  const [open, setOpen] = useState(false)
  const color = getColor(p.category)

  const shortDesc = p.description.length > 5
    ? (p.description.length > 160 ? p.description.slice(0, 157) + '…' : p.description)
    : p.indication.split(',').map(s => s.trim()).filter(s => s.length > 10 && /^[\x00-\x7F]+$/.test(s))[0] || ''

  const indChunks = p.indication.split(',').map(s => s.trim()).filter(s => s.length > 6)
  // Hindi mode: prefer Hindi indication terms; English mode: prefer English terms
  const displayInd = lang === 'hi'
    ? (indChunks.filter(s => /[^\x00-\x7F]/.test(s)).slice(0, 6).join(', ')
        || indChunks.filter(s => /^[\x00-\x7F]+$/.test(s)).slice(0, 6).join(', '))
    : (indChunks.filter(s => /^[\x00-\x7F]+$/.test(s)).slice(0, 8).join(', ')
        + (indChunks.length > 8 ? '…' : ''))

  const speciesArr = p.species.split(/[,/]/).map(s => s.trim()).filter(Boolean)

  const copyComposition = (e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(p.salt).catch(() => {
      const ta = document.createElement('textarea')
      ta.value = p.salt
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    })
    const btn = e.currentTarget as HTMLButtonElement
    btn.textContent = lang === 'hi' ? 'हो गया!' : 'Copied!'
    setTimeout(() => { btn.textContent = lang === 'hi' ? 'कॉपी' : 'Copy' }, 1800)
  }

  return (
    <div style={{
      background: '#fff', border: '1px solid #d4c9b0', borderRadius: 14,
      overflow: 'hidden', display: 'flex', flexDirection: 'column',
      transition: 'transform 0.2s, box-shadow 0.2s, border-color 0.2s', alignSelf: 'start',
    }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLDivElement
        el.style.transform = 'translateY(-3px)'
        el.style.boxShadow = '0 12px 36px rgba(26,58,42,0.12)'
        el.style.borderColor = '#c8a96e'
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLDivElement
        el.style.transform = ''
        el.style.boxShadow = ''
        el.style.borderColor = '#d4c9b0'
      }}
    >
      <div style={{ height: 3, background: color }} />

      {/* Product Image */}
      {p.image_url && (
        <div style={{ width: '100%', height: 140, overflow: 'hidden', background: '#f5f0e8', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
          <img
            src={p.image_url}
            alt={p.name}
            style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }}
            loading="lazy"
            decoding="async"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
        </div>
      )}

      <div style={{ padding: '20px 22px 18px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Top row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 10 }}>
          <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 18, color: '#1a3a2a', lineHeight: 1.2 }}
            dangerouslySetInnerHTML={{ __html: q ? highlight(p.name, q) : p.name }}
          />
          <span style={{
            fontSize: 10, fontWeight: 600, letterSpacing: '0.8px', color: '#5a7060',
            background: '#ede6d6', borderRadius: 6, padding: '4px 9px',
            whiteSpace: 'nowrap', flexShrink: 0, textTransform: 'uppercase',
            maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis',
          }} title={p.packaging}>{p.packaging}</span>
        </div>

        {/* Composition */}
        {p.salt && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: 10 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#5a7060" strokeWidth="2" style={{ flexShrink: 0, marginTop: 2 }}>
              <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18" />
            </svg>
            <span style={{ fontSize: 12, color: '#5a7060', lineHeight: 1.5 }}
              dangerouslySetInnerHTML={{ __html: q ? highlight(p.salt, q) : p.salt }}
            />
          </div>
        )}

        {/* Short desc */}
        {shortDesc && (
          <p style={{ fontSize: 13, color: '#5a7060', lineHeight: 1.65, marginBottom: 14, flex: 1 }}
            dangerouslySetInnerHTML={{ __html: q ? highlight(shortDesc, q) : shortDesc }}
          />
        )}

        {/* Footer row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 14, borderTop: '1px solid #ede6d6', gap: 6 }}>
          <button
            onClick={() => setOpen(o => !o)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer', color: '#5a7060',
              fontSize: 13, fontFamily: "'DM Sans', sans-serif", fontWeight: 500,
              padding: '2px 6px', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 4,
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              {open ? <path d="M18 15l-6-6-6 6" /> : <path d="M6 9l6 6 6-6" />}
            </svg>
            {open ? (lang === 'hi' ? 'कम' : 'Less') : (lang === 'hi' ? 'जानकारी' : 'Details')}
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}>
            {/* Video link */}
            {p.video_url && (
              <a
                href={p.video_url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                style={{
                  fontSize: 11, color: '#fff', fontWeight: 600, textDecoration: 'none',
                  padding: '3px 8px', borderRadius: 4, background: '#e00000',
                  display: 'flex', alignItems: 'center', gap: 4,
                }}
              >
                ▶ {lang === 'hi' ? 'वीडियो' : 'Video'}
              </a>
            )}

            {/* Link to full product page */}
            <Link href={`/products/${p.id}`} style={{
              fontSize: 11, color: '#c8a96e', fontWeight: 600, textDecoration: 'none',
              padding: '3px 8px', borderRadius: 4, border: '1px solid rgba(200,169,110,0.3)',
            }}>
              {lang === 'hi' ? 'पूरा देखें →' : 'View →'}
            </Link>
          </div>
        </div>
      </div>

      {/* Expanded panel */}
      {open && (
        <div style={{ borderTop: '1px solid #ede6d6', background: '#f5f0e8', padding: '16px 22px 20px' }}>
          {p.description && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase', color: '#c8a96e', marginBottom: 3 }}>
                {lang === 'hi' ? 'विवरण' : 'Description'}
              </div>
              <div style={{ fontSize: 13, color: '#1c2b22', lineHeight: 1.6 }}>{p.description}</div>
            </div>
          )}
          {p.salt && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase', color: '#c8a96e', marginBottom: 3 }}>
                {lang === 'hi' ? 'संरचना' : 'Composition'}
              </div>
              <div style={{ fontSize: 13, color: '#1c2b22', lineHeight: 1.6, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <span>{p.salt}</span>
                <button onClick={copyComposition} style={{
                  padding: '2px 8px', fontSize: 11, fontWeight: 600, borderRadius: 4,
                  border: '1px solid #d4c9b0', background: '#fff', cursor: 'pointer',
                  color: '#5a7060', flexShrink: 0, fontFamily: "'DM Sans', sans-serif",
                }}>{lang === 'hi' ? 'कॉपी' : 'Copy'}</button>
              </div>
            </div>
          )}
          {p.benefits && p.benefits !== 'N/A' && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase', color: '#c8a96e', marginBottom: 3 }}>
                {lang === 'hi' ? 'मुख्य फायदे' : 'Key Benefits'}
              </div>
              <div style={{ fontSize: 13, color: '#1c2b22', lineHeight: 1.6 }}>{p.benefits}</div>
            </div>
          )}
          {displayInd && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase', color: '#c8a96e', marginBottom: 3 }}>
                {lang === 'hi' ? 'किसके लिए' : 'Used For'}
              </div>
              <div style={{ fontSize: 13, color: '#1c2b22', lineHeight: 1.6 }}>{displayInd}</div>
            </div>
          )}
          {speciesArr.length > 0 && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase', color: '#c8a96e', marginBottom: 3 }}>
                {lang === 'hi' ? 'जानवर' : 'Species'}
              </div>
              <div style={{ fontSize: 13, color: '#1c2b22', lineHeight: 1.6 }}>
                {lang === 'hi'
                  ? speciesArr.map(s => `${HI_SP[s] || s} (${s})`).join(', ')
                  : speciesArr.join(', ')
                }
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── PILL BUTTON ───────────────────────────────────────────────────────────────

function Pill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      padding: '6px 14px', borderRadius: 20,
      border: `1px solid ${active ? '#c8a96e' : 'rgba(200,169,110,0.25)'}`,
      background: active ? '#c8a96e' : 'transparent',
      color: active ? '#1a3a2a' : 'rgba(245,240,232,0.6)',
      fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: active ? 600 : 500,
      cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.18s',
    }}>{label}</button>
  )
}

// ── LANGUAGE TOGGLE ───────────────────────────────────────────────────────────

function LangToggle({ lang, setLang }: { lang: Lang; setLang: (l: Lang) => void }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center',
      background: 'rgba(255,255,255,0.07)', borderRadius: 8,
      border: '1px solid rgba(200,169,110,0.25)', padding: 3, gap: 2, flexShrink: 0,
    }}>
      {(['en', 'hi'] as Lang[]).map(l => (
        <button key={l} onClick={() => setLang(l)} style={{
          padding: '5px 13px', borderRadius: 6, border: 'none', cursor: 'pointer',
          fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 600,
          transition: 'all 0.15s',
          background: lang === l ? '#c8a96e' : 'transparent',
          color: lang === l ? '#1a3a2a' : 'rgba(245,240,232,0.5)',
        }}>
          {l === 'en' ? 'EN' : 'हिंदी'}
        </button>
      ))}
    </div>
  )
}

// ── MAIN CLIENT COMPONENT ─────────────────────────────────────────────────────

export default function ProductsClient({ products }: { products: Product[] }) {
  const [lang, setLang]             = useState<Lang>('en')
  const [searchText, setSearchText] = useState('')
  const [activeCat, setActiveCat]   = useState('all')
  const [activeSp, setActiveSp]     = useState('all')
  const [activeForm, setActiveForm] = useState('all')

  const { cats, species, forms } = useMemo(() => {
    const usedCats = [...new Set(products.map(p => p.category))].filter(Boolean)
    const cats     = [...CAT_ORDER.filter(c => usedCats.includes(c)), ...usedCats.filter(c => !CAT_ORDER.includes(c))]
    const allSp    = new Set<string>()
    products.forEach(p => p.species.split(/[,/]/).map(s => s.trim()).filter(Boolean).forEach(s => allSp.add(s)))
    const species  = [...SP_ORDER.filter(s => allSp.has(s)), ...[...allSp].filter(s => !SP_ORDER.includes(s))]
    const usedForms = [...new Set(products.map(p => p.formulation))].filter(Boolean)
    const forms    = [...FORM_ORDER.filter(f => usedForms.includes(f)), ...usedForms.filter(f => !FORM_ORDER.includes(f))]
    return { cats, species, forms }
  }, [products])

  const filtered = useMemo(() => {
    const q = searchText.toLowerCase().trim()
    let base = products
    // All filters apply regardless of whether search is active
    if (activeCat  !== 'all') base = base.filter(p => p.category === activeCat)
    if (activeSp   !== 'all') base = base.filter(p => p.species.toLowerCase().includes(activeSp.toLowerCase()))
    if (activeForm !== 'all') base = base.filter(p => p.formulation === activeForm)
    if (q) {
      return base.map(p => ({ p, score: scoreProduct(p, q) }))
        .filter(({ score }) => score > 0)
        .sort((a, b) => b.score - a.score)
        .map(({ p }) => p)
    }
    return base
  }, [products, searchText, activeCat, activeSp, activeForm])

  const handleSearch = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchText(e.target.value)
    // Removed: do NOT reset activeCat when typing — category filter should persist during search
  }, [])

  const grouped = useMemo(() => {
    if (searchText.trim()) return null
    const g: Record<string, Product[]> = {}
    filtered.forEach(p => { if (!g[p.category]) g[p.category] = []; g[p.category].push(p) })
    const ordered = [...CAT_ORDER.filter(c => g[c]), ...Object.keys(g).filter(c => !CAT_ORDER.includes(c))]
    return ordered.map(cat => ({ cat, prods: g[cat] }))
  }, [filtered, searchText])

  const q = searchText.toLowerCase().trim()

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; }
        html, body { margin: 0; padding: 0; overflow-x: hidden; max-width: 100%; }
        :root {
          --forest: #1a3a2a; --forest-mid: #264d39; --cream: #f5f0e8;
          --cream-dark: #ede6d6; --gold: #c8a96e; --gold-light: #e8d5a8;
        }
        .products-page { font-family: 'DM Sans', sans-serif; background: var(--cream); min-height: 100vh; color: #1c2b22; width: 100%; overflow-x: hidden; }
        .filter-scroll { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .product-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; }
        @media (max-width: 900px) {
          .header-inner { padding: 32px 20px 28px !important; flex-direction: column !important; align-items: flex-start !important; }
          .header-stats { align-self: stretch; justify-content: flex-start !important; flex-wrap: wrap; gap: 20px !important; }
          .controls-inner { padding: 12px 16px !important; flex-wrap: wrap !important; }
          .main-content { padding: 24px 16px 60px !important; }
          .product-grid { grid-template-columns: 1fr 1fr !important; }
        }
        @media (max-width: 640px) {
          .top-nav { padding: 0 14px !important; height: 48px !important; }
          .header-inner { padding: 16px 14px 14px !important; }
          .header-subtitle { display: none; }
          .header-stats { gap: 16px !important; }
          .stat-number { font-size: 22px !important; }
          .header-title { font-size: 20px !important; }
          .controls-inner { flex-direction: column !important; align-items: stretch !important; padding: 8px 12px !important; gap: 6px !important; width: 100% !important; }
          .search-wrap { width: 100% !important; min-width: unset !important; flex: unset !important; }
          .filter-scroll { flex-wrap: nowrap !important; overflow-x: auto !important; -webkit-overflow-scrolling: touch; scrollbar-width: none; gap: 6px !important; width: 100%; padding-bottom: 2px; }
          .filter-scroll::-webkit-scrollbar { display: none; }
          .filter-label { display: none !important; }
          .main-content { padding: 12px 10px 60px !important; }
          .product-grid { grid-template-columns: 1fr !important; gap: 10px !important; }
          .nav-link-item { padding: 4px 8px !important; font-size: 11px !important; }
          .training-btn { margin-left: 4px !important; padding: 5px 10px !important; font-size: 11px !important; }
          .results-count { display: none !important; }
        }
      `}</style>

      <div className="products-page">

        {/* ── TOP NAV ── */}
        <nav className="top-nav" style={{
          background: '#0f2318', padding: '0 48px', display: 'flex',
          alignItems: 'center', justifyContent: 'space-between',
          height: 52, borderBottom: '1px solid rgba(200,169,110,0.15)',
        }}>
          <Link href="/" style={{
            fontFamily: "'DM Serif Display', serif", color: 'var(--cream)',
            fontSize: 18, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <img src="/madvet-icon.png" alt="Madvet" style={{height:32,width:32,borderRadius:6,objectFit:"cover",marginRight:2}} /> Madvet
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Link href="/" className="nav-link-item" style={{
              padding: '6px 14px', borderRadius: 6, color: 'rgba(245,240,232,0.55)',
              fontSize: 13, fontWeight: 500, textDecoration: 'none',
            }}>{lang === 'hi' ? 'सहायक' : 'Assistant'}</Link>
            <span className="nav-link-item" style={{
              padding: '6px 14px', borderRadius: 6, color: 'var(--gold-light)',
              background: 'rgba(200,169,110,0.1)', fontSize: 13, fontWeight: 500,
            }}>{lang === 'hi' ? 'उत्पाद' : 'Products'}</span>
            <Link href="/madvet-training.html" className="training-btn" style={{
              marginLeft: 12, padding: '7px 16px', background: 'var(--gold)',
              color: 'var(--forest)', borderRadius: 6, fontFamily: "'DM Sans', sans-serif",
              fontSize: 13, fontWeight: 700, textDecoration: 'none',
            }}>🎓 {lang === 'hi' ? 'ट्रेनिंग' : 'Training'}</Link>
          </div>
        </nav>

        {/* ── HEADER ── */}
        <header style={{ background: 'var(--forest)', padding: 0, position: 'relative', overflow: 'hidden' }}>
          <div style={{
            position: 'absolute', inset: 0,
            background: 'radial-gradient(ellipse 80% 60% at 70% 50%, rgba(200,169,110,0.12) 0%, transparent 70%), radial-gradient(ellipse 40% 80% at 10% 20%, rgba(61,122,87,0.3) 0%, transparent 60%)',
          }} />
          <div className="header-inner" style={{
            position: 'relative', zIndex: 1, maxWidth: 1400, margin: '0 auto',
            padding: '56px 48px 48px', display: 'flex', alignItems: 'flex-end',
            justifyContent: 'space-between', gap: 32,
          }}>
            <div>
              <div style={{
                fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 600,
                letterSpacing: 3, textTransform: 'uppercase', color: 'var(--gold)',
                display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16,
              }}>
                <span style={{ width: 28, height: 1, background: 'var(--gold)', display: 'inline-block' }} />
                Madvet Animal Healthcare
              </div>
              <h1 className="header-title" style={{
                fontFamily: "'DM Serif Display', serif", fontSize: 'clamp(42px, 5vw, 68px)',
                lineHeight: 1.05, color: 'var(--cream)', letterSpacing: -1, margin: 0,
              }}>
                {lang === 'hi' ? 'हमारे' : 'Our'}<br />
                <em style={{ fontStyle: 'italic', color: 'var(--gold-light)' }}>
                  {lang === 'hi' ? 'उत्पाद' : 'Products'}
                </em>
              </h1>
              <p className="header-subtitle" style={{ marginTop: 16, fontSize: 15, color: 'rgba(245,240,232,0.55)', fontWeight: 300, letterSpacing: '0.3px', maxWidth: 420, lineHeight: 1.7 }}>
                {lang === 'hi'
                  ? 'Madvet की पूरी दवाओं की सूची — एंटीबायोटिक, विटामिन, कीड़े मारने की दवा और बहुत कुछ।'
                  : 'Complete range of Madvet veterinary medicines — antibiotics, supplements, dewormers and more.'
                }
              </p>
            </div>
            <div className="header-stats" style={{ display: 'flex', gap: 40, flexShrink: 0 }}>
              <div style={{ textAlign: 'right' }}>
                <div className="stat-number" style={{ fontFamily: "'DM Serif Display', serif", fontSize: 38, color: 'var(--gold-light)', lineHeight: 1 }}>{products.length}</div>
                <div style={{ fontSize: 11, color: 'rgba(245,240,232,0.45)', letterSpacing: 2, textTransform: 'uppercase', marginTop: 4 }}>
                  {lang === 'hi' ? 'उत्पाद' : 'Products'}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="stat-number" style={{ fontFamily: "'DM Serif Display', serif", fontSize: 38, color: 'var(--gold-light)', lineHeight: 1 }}>{cats.length}</div>
                <div style={{ fontSize: 11, color: 'rgba(245,240,232,0.45)', letterSpacing: 2, textTransform: 'uppercase', marginTop: 4 }}>
                  {lang === 'hi' ? 'श्रेणियाँ' : 'Categories'}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* ── STICKY CONTROLS ── */}
        <div style={{
          background: 'var(--forest-mid)', borderBottom: '1px solid rgba(200,169,110,0.2)',
          position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 2px 20px rgba(0,0,0,0.15)',
        }}>
          <div className="controls-inner" style={{
            maxWidth: 1400, margin: '0 auto', padding: '16px 48px',
            display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
          }}>

            {/* ── LANGUAGE TOGGLE ── */}
            <LangToggle lang={lang} setLang={setLang} />

            {/* Search */}
            <div className="search-wrap" style={{ position: 'relative', flex: 1, minWidth: 220 }}>
              <svg style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--gold)', opacity: 0.7, pointerEvents: 'none' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
              </svg>
              <input
                type="text"
                placeholder={lang === 'hi' ? 'उत्पाद, संरचना, बीमारी, जानवर खोजें…' : 'Search products, composition, indications, species…'}
                value={searchText}
                onChange={handleSearch}
                autoComplete="off"
                style={{
                  width: '100%', padding: '10px 16px 10px 42px',
                  background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(200,169,110,0.25)',
                  borderRadius: 8, color: 'var(--cream)', fontFamily: "'DM Sans', sans-serif",
                  fontSize: 14, outline: 'none',
                }}
              />
            </div>

            {/* Category filter */}
            <div className="filter-scroll">
              <span className="filter-label" style={{ fontSize: 11, fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'rgba(200,169,110,0.6)', whiteSpace: 'nowrap' }}>
                {lang === 'hi' ? 'श्रेणी' : 'Category'}
              </span>
              <Pill label={lang === 'hi' ? 'सब' : 'All'} active={activeCat === 'all'} onClick={() => setActiveCat('all')} />
              {cats.map(c => (
                <Pill
                  key={c}
                  label={lang === 'hi' ? (HI_CATS[c] || c) : c.replace(' / Analgesic', '').replace(' / Antiparasitic', '')}
                  active={activeCat === c}
                  onClick={() => setActiveCat(c)}
                />
              ))}
            </div>

            {/* Species filter */}
            <div className="filter-scroll">
              <Pill label={lang === 'hi' ? 'सभी जानवर' : 'All Species'} active={activeSp === 'all'} onClick={() => setActiveSp('all')} />
              {species.map(s => (
                <Pill
                  key={s}
                  label={lang === 'hi' ? (HI_SP[s] || s) : s}
                  active={activeSp === s}
                  onClick={() => setActiveSp(s)}
                />
              ))}
            </div>

            {/* Formulation filter */}
            <div className="filter-scroll">
              <span className="filter-label" style={{ fontSize: 11, fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'rgba(200,169,110,0.6)', whiteSpace: 'nowrap' }}>
                {lang === 'hi' ? 'रूप' : 'Form'}
              </span>
              <Pill label={lang === 'hi' ? 'सब' : 'All'} active={activeForm === 'all'} onClick={() => setActiveForm('all')} />
              {forms.map(f => (
                <Pill
                  key={f}
                  label={lang === 'hi' ? (HI_FORM[f] || f) : f}
                  active={activeForm === f}
                  onClick={() => setActiveForm(f)}
                />
              ))}
            </div>

            {/* Count */}
            <div className="results-count" style={{ marginLeft: 'auto', fontSize: 12, color: 'rgba(245,240,232,0.4)', whiteSpace: 'nowrap' }}>
              <span style={{ color: 'var(--gold-light)', fontWeight: 600 }}>{filtered.length}</span> {lang === 'hi' ? 'उत्पाद' : 'products'}
            </div>
          </div>
        </div>

        {/* ── MAIN CONTENT ── */}
        <main className="main-content" style={{ maxWidth: 1400, margin: '0 auto', padding: '48px 48px 80px' }}>
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '80px 20px', color: '#5a7060' }}>
              <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.4 }}>🔍</div>
              <h3 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 24, color: '#1a3a2a', marginBottom: 8 }}>
                {lang === 'hi' ? 'कोई उत्पाद नहीं मिला' : 'No products found'}
              </h3>
              <p style={{ fontSize: 14 }}>{lang === 'hi' ? 'दूसरे शब्द या फ़िल्टर से खोजें।' : 'Try a different search or filter.'}</p>
            </div>
          ) : q ? (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid #d4c9b0' }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#c8a96e', flexShrink: 0 }} />
                <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, color: '#1a3a2a', margin: 0 }}>
                  {lang === 'hi' ? 'खोज परिणाम' : 'Search Results'}
                </h2>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#5a7060', background: '#ede6d6', padding: '3px 10px', borderRadius: 12 }}>
                  {filtered.length} {lang === 'hi' ? 'मिले' : `match${filtered.length !== 1 ? 'es' : ''}`}
                </span>
              </div>
              <div className="product-grid">
                {filtered.map(p => <ProductCard key={p.id} p={p} q={q} lang={lang} />)}
              </div>
            </div>
          ) : grouped ? (
            grouped.map(({ cat, prods }) => (
              <div key={cat} style={{ marginBottom: 56 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid #d4c9b0' }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: getColor(cat), flexShrink: 0 }} />
                  <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, color: '#1a3a2a', margin: 0 }}>
                    {lang === 'hi' ? (HI_CATS[cat] || cat) : cat}
                    {lang === 'hi' && (
                      <span style={{ fontSize: 13, fontFamily: "'DM Sans', sans-serif", color: '#5a7060', fontWeight: 400, marginLeft: 10 }}>({cat})</span>
                    )}
                  </h2>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#5a7060', background: '#ede6d6', padding: '3px 10px', borderRadius: 12 }}>
                    {prods.length} {lang === 'hi' ? 'उत्पाद' : `product${prods.length !== 1 ? 's' : ''}`}
                  </span>
                </div>
                <div className="product-grid">
                  {prods.map(p => <ProductCard key={p.id} p={p} q="" lang={lang} />)}
                </div>
              </div>
            ))
          ) : null}
        </main>

        <footer style={{ background: '#0f2318', padding: '24px 48px', borderTop: '1px solid rgba(200,169,110,0.1)', textAlign: 'center' }}>
          <p style={{ fontSize: 13, color: 'rgba(245,240,232,0.35)', margin: 0 }}>
            <strong style={{ color: 'rgba(245,240,232,0.6)' }}>Madvet Animal Healthcare</strong>
            &nbsp;·&nbsp; {lang === 'hi' ? 'सिर्फ पशु चिकित्सा में उपयोग के लिए' : 'All products for veterinary use only'}
          </p>
        </footer>
      </div>
    </>
  )
}
