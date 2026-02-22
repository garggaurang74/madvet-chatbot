'use client'

import { useState, useMemo, useCallback } from 'react'
import Link from 'next/link'
import type { Product } from './page'

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

// ── SEARCH SCORING ────────────────────────────────────────────────────────────

function scoreProduct(p: Product, q: string): number {
  let score = 0
  const n = p.name.toLowerCase()
  if (n === q)           score += 100
  if (n.startsWith(q))   score += 60
  if (n.includes(q))     score += 40
  if (p.aliases.toLowerCase().includes(q))      score += 30
  if (p.salt.toLowerCase().includes(q))         score += 25
  if (p.description.toLowerCase().includes(q))  score += 20
  if (p.benefits.toLowerCase().includes(q))     score += 15
  if (p.indication.toLowerCase().includes(q))   score += 8
  if (p.category.toLowerCase().includes(q))     score += 5
  if (p.species.toLowerCase().includes(q))      score += 5
  if (p.packaging.toLowerCase().includes(q))    score += 3
  return score
}

// ── HIGHLIGHT ─────────────────────────────────────────────────────────────────

function highlight(text: string, q: string): string {
  if (!q || !text) return text
  const esc = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return text.replace(
    new RegExp(`(${esc})`, 'gi'),
    '<mark style="background:#fef08a;color:#1a3a2a;border-radius:2px;padding:0 2px;">$1</mark>'
  )
}

// ── PRODUCT CARD ──────────────────────────────────────────────────────────────

function ProductCard({ p, q }: { p: Product; q: string }) {
  const [open, setOpen] = useState(false)
  const color = getColor(p.category)

  const shortDesc = p.description.length > 5
    ? (p.description.length > 160 ? p.description.slice(0, 157) + '…' : p.description)
    : p.indication.split(',').map(s => s.trim()).filter(s => s.length > 10)[0] || ''

  const indChunks = p.indication.split(',').map(s => s.trim()).filter(s => s.length > 6)
  const cleanInd  = indChunks.slice(0, 8).join(', ') + (indChunks.length > 8 ? '…' : '')

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
    btn.textContent = 'Copied!'
    setTimeout(() => { btn.textContent = 'Copy' }, 1800)
  }

  return (
    <div style={{
      background: '#fff',
      border: '1px solid #d4c9b0',
      borderRadius: 14,
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      transition: 'transform 0.2s, box-shadow 0.2s, border-color 0.2s',
      alignSelf: 'start',
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
      {/* Accent bar */}
      <div style={{ height: 3, background: color }} />

      {/* Body */}
      <div style={{ padding: '20px 22px 18px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Top row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 10 }}>
          <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 18, color: '#1a3a2a', lineHeight: 1.2 }}
            dangerouslySetInnerHTML={{ __html: q ? highlight(p.name, q) : p.name }}
          />
          <span style={{
            fontSize: 10, fontWeight: 600, letterSpacing: '0.8px', color: '#5a7060',
            background: '#ede6d6', borderRadius: 6, padding: '4px 9px', whiteSpace: 'nowrap',
            flexShrink: 0, textTransform: 'uppercase',
          }}>{p.packaging}</span>
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

        {/* Short description */}
        {shortDesc && (
          <p style={{ fontSize: 13, color: '#5a7060', lineHeight: 1.65, marginBottom: 14, flex: 1 }}
            dangerouslySetInnerHTML={{ __html: q ? highlight(shortDesc, q) : shortDesc }}
          />
        )}

        {/* Footer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 14, borderTop: '1px solid #ede6d6' }}>
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
            {open ? 'Less' : 'Details'}
          </button>
        </div>
      </div>

      {/* Expanded detail panel */}
      {open && (
        <div style={{ borderTop: '1px solid #ede6d6', background: '#f5f0e8', padding: '16px 22px 20px' }}>
          {p.description && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase', color: '#c8a96e', marginBottom: 3 }}>Description</div>
              <div style={{ fontSize: 13, color: '#1c2b22', lineHeight: 1.6 }}>{p.description}</div>
            </div>
          )}
          {p.salt && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase', color: '#c8a96e', marginBottom: 3 }}>Composition</div>
              <div style={{ fontSize: 13, color: '#1c2b22', lineHeight: 1.6, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <span>{p.salt}</span>
                <button onClick={copyComposition} style={{
                  padding: '2px 8px', fontSize: 11, fontWeight: 600, borderRadius: 4,
                  border: '1px solid #d4c9b0', background: '#fff', cursor: 'pointer',
                  color: '#5a7060', flexShrink: 0, fontFamily: "'DM Sans', sans-serif",
                }}>Copy</button>
              </div>
            </div>
          )}
          {p.benefits && p.benefits !== 'N/A' && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase', color: '#c8a96e', marginBottom: 3 }}>Key Benefits</div>
              <div style={{ fontSize: 13, color: '#1c2b22', lineHeight: 1.6 }}>{p.benefits}</div>
            </div>
          )}
          {cleanInd && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase', color: '#c8a96e', marginBottom: 3 }}>Used For</div>
              <div style={{ fontSize: 13, color: '#1c2b22', lineHeight: 1.6 }}>{cleanInd}</div>
            </div>
          )}
          {p.species && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase', color: '#c8a96e', marginBottom: 3 }}>Species</div>
              <div style={{ fontSize: 13, color: '#1c2b22', lineHeight: 1.6 }}>{p.species}</div>
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
    <button
      onClick={onClick}
      style={{
        padding: '6px 14px', borderRadius: 20,
        border: `1px solid ${active ? '#c8a96e' : 'rgba(200,169,110,0.25)'}`,
        background: active ? '#c8a96e' : 'transparent',
        color: active ? '#1a3a2a' : 'rgba(245,240,232,0.6)',
        fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: active ? 600 : 500,
        cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.18s',
      }}
    >{label}</button>
  )
}

// ── MAIN CLIENT COMPONENT ─────────────────────────────────────────────────────

export default function ProductsClient({ products }: { products: Product[] }) {
  const [searchText, setSearchText]   = useState('')
  const [activeCat, setActiveCat]     = useState('all')
  const [activeSp, setActiveSp]       = useState('all')
  const [activeForm, setActiveForm]   = useState('all')

  // Build filter options dynamically from DB data
  const { cats, species, forms } = useMemo(() => {
    const usedCats  = [...new Set(products.map(p => p.category))].filter(Boolean)
    const cats      = [...CAT_ORDER.filter(c => usedCats.includes(c)), ...usedCats.filter(c => !CAT_ORDER.includes(c))]

    const allSp = new Set<string>()
    products.forEach(p => p.species.split(/[,\/]/).map(s => s.trim()).filter(Boolean).forEach(s => allSp.add(s)))
    const species = [...SP_ORDER.filter(s => allSp.has(s)), ...[...allSp].filter(s => !SP_ORDER.includes(s))]

    const usedForms = [...new Set(products.map(p => p.formulation))].filter(Boolean)
    const forms     = [...FORM_ORDER.filter(f => usedForms.includes(f)), ...usedForms.filter(f => !FORM_ORDER.includes(f))]

    return { cats, species, forms }
  }, [products])

  const filtered = useMemo(() => {
    const q = searchText.toLowerCase().trim()
    let base = products

    if (activeSp   !== 'all') base = base.filter(p => p.species.toLowerCase().includes(activeSp.toLowerCase()))
    if (activeForm !== 'all') base = base.filter(p => p.formulation === activeForm)

    if (q) {
      return base
        .map(p => ({ p, score: scoreProduct(p, q) }))
        .filter(({ score }) => score > 0)
        .sort((a, b) => b.score - a.score)
        .map(({ p }) => p)
    }

    if (activeCat !== 'all') base = base.filter(p => p.category === activeCat)
    return base
  }, [products, searchText, activeCat, activeSp, activeForm])

  const handleSearch = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchText(e.target.value)
    if (e.target.value) setActiveCat('all')
  }, [])

  // Group by category for browsing view
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
        * { box-sizing: border-box; }
        body { margin: 0; }
        :root {
          --forest: #1a3a2a;
          --forest-mid: #264d39;
          --forest-light: #3d7a57;
          --cream: #f5f0e8;
          --cream-dark: #ede6d6;
          --gold: #c8a96e;
          --gold-light: #e8d5a8;
        }
        .products-page { font-family: 'DM Sans', sans-serif; background: var(--cream); min-height: 100vh; color: #1c2b22; }
        .filter-scroll { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .product-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 20px; }
        @media (max-width: 900px) {
          .header-inner { padding: 32px 20px 28px !important; flex-direction: column !important; align-items: flex-start !important; }
          .header-stats { align-self: stretch; justify-content: flex-start !important; flex-wrap: wrap; gap: 20px !important; }
          .controls-inner { padding: 12px 16px !important; }
          .main-content { padding: 24px 16px 60px !important; }
          .product-grid { grid-template-columns: 1fr 1fr !important; }
        }
        @media (max-width: 640px) {
          .top-nav { padding: 0 16px !important; }
          .header-inner { padding: 18px 16px 16px !important; }
          .controls-inner { flex-direction: column !important; align-items: stretch !important; padding: 8px 12px !important; }
          .filter-scroll { flex-wrap: nowrap !important; overflow-x: auto; -webkit-overflow-scrolling: touch; scrollbar-width: none; }
          .filter-scroll::-webkit-scrollbar { display: none; }
          .main-content { padding: 14px 12px 60px !important; }
          .product-grid { grid-template-columns: 1fr !important; }
          .header-title { font-size: 22px !important; }
          .stat-number { font-size: 24px !important; }
          .nav-links { gap: 2px !important; }
          .nav-link-item { padding: 5px 10px !important; font-size: 12px !important; }
          .training-btn { padding: 6px 12px !important; font-size: 12px !important; margin-left: 6px !important; }
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
            <span style={{ fontSize: 22 }}>🐄</span> Madvet
          </Link>
          <div className="nav-links" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Link href="/" className="nav-link-item" style={{
              padding: '6px 14px', borderRadius: 6, color: 'rgba(245,240,232,0.55)',
              fontSize: 13, fontWeight: 500, textDecoration: 'none',
            }}>Assistant</Link>
            <span className="nav-link-item" style={{
              padding: '6px 14px', borderRadius: 6, color: 'var(--gold-light)',
              background: 'rgba(200,169,110,0.1)', fontSize: 13, fontWeight: 500,
            }}>Products</span>
            <Link href="/madvet-training.html" className="training-btn" style={{
              marginLeft: 12, padding: '7px 16px', background: 'var(--gold)',
              color: 'var(--forest)', borderRadius: 6, fontFamily: "'DM Sans', sans-serif",
              fontSize: 13, fontWeight: 700, textDecoration: 'none',
            }}>🎓 Training</Link>
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
                Our<br /><em style={{ fontStyle: 'italic', color: 'var(--gold-light)' }}>Products</em>
              </h1>
              <p style={{ marginTop: 16, fontSize: 15, color: 'rgba(245,240,232,0.55)', fontWeight: 300, letterSpacing: '0.3px', maxWidth: 420, lineHeight: 1.7 }}>
                Complete range of Madvet veterinary medicines — antibiotics, supplements, dewormers and more.
              </p>
            </div>
            <div className="header-stats" style={{ display: 'flex', gap: 40, flexShrink: 0 }}>
              <div style={{ textAlign: 'right' }}>
                <div className="stat-number" style={{ fontFamily: "'DM Serif Display', serif", fontSize: 38, color: 'var(--gold-light)', lineHeight: 1 }}>{products.length}</div>
                <div style={{ fontSize: 11, color: 'rgba(245,240,232,0.45)', letterSpacing: 2, textTransform: 'uppercase', marginTop: 4 }}>Products</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="stat-number" style={{ fontFamily: "'DM Serif Display', serif", fontSize: 38, color: 'var(--gold-light)', lineHeight: 1 }}>{cats.length}</div>
                <div style={{ fontSize: 11, color: 'rgba(245,240,232,0.45)', letterSpacing: 2, textTransform: 'uppercase', marginTop: 4 }}>Categories</div>
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
            {/* Search */}
            <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
              <svg style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--gold)', opacity: 0.7, pointerEvents: 'none' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
              </svg>
              <input
                type="text"
                placeholder="Search products, composition, indications, species…"
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
              <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'rgba(200,169,110,0.6)', whiteSpace: 'nowrap' }}>Category</span>
              <Pill label="All" active={activeCat === 'all'} onClick={() => setActiveCat('all')} />
              {cats.map(c => (
                <Pill key={c} label={c.replace(' / Analgesic', '').replace(' / Antiparasitic', '')} active={activeCat === c} onClick={() => setActiveCat(c)} />
              ))}
            </div>

            {/* Species filter */}
            <div className="filter-scroll">
              <Pill label="All Species" active={activeSp === 'all'} onClick={() => setActiveSp('all')} />
              {species.map(s => (
                <Pill key={s} label={s} active={activeSp === s} onClick={() => setActiveSp(s)} />
              ))}
            </div>

            {/* Formulation filter */}
            <div className="filter-scroll">
              <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'rgba(200,169,110,0.6)', whiteSpace: 'nowrap' }}>Form</span>
              <Pill label="All" active={activeForm === 'all'} onClick={() => setActiveForm('all')} />
              {forms.map(f => (
                <Pill key={f} label={f} active={activeForm === f} onClick={() => setActiveForm(f)} />
              ))}
            </div>

            {/* Count */}
            <div style={{ marginLeft: 'auto', fontSize: 12, color: 'rgba(245,240,232,0.4)', whiteSpace: 'nowrap' }}>
              <span style={{ color: 'var(--gold-light)', fontWeight: 600 }}>{filtered.length}</span> products
            </div>
          </div>
        </div>

        {/* ── MAIN CONTENT ── */}
        <main className="main-content" style={{ maxWidth: 1400, margin: '0 auto', padding: '48px 48px 80px' }}>
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '80px 20px', color: '#5a7060' }}>
              <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.4 }}>🔍</div>
              <h3 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 24, color: '#1a3a2a', marginBottom: 8 }}>No products found</h3>
              <p style={{ fontSize: 14 }}>Try a different search or filter.</p>
            </div>
          ) : q ? (
            // Search results — flat ranked list
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid #d4c9b0' }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#c8a96e', flexShrink: 0 }} />
                <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, color: '#1a3a2a', margin: 0 }}>Search Results</h2>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#5a7060', background: '#ede6d6', padding: '3px 10px', borderRadius: 12 }}>{filtered.length} match{filtered.length !== 1 ? 'es' : ''}</span>
              </div>
              <div className="product-grid">
                {filtered.map(p => <ProductCard key={p.id} p={p} q={q} />)}
              </div>
            </div>
          ) : grouped ? (
            // Grouped by category
            grouped.map(({ cat, prods }) => (
              <div key={cat} style={{ marginBottom: 56 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid #d4c9b0' }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: getColor(cat), flexShrink: 0 }} />
                  <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, color: '#1a3a2a', margin: 0 }}>{cat}</h2>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#5a7060', background: '#ede6d6', padding: '3px 10px', borderRadius: 12 }}>{prods.length} product{prods.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="product-grid">
                  {prods.map(p => <ProductCard key={p.id} p={p} q="" />)}
                </div>
              </div>
            ))
          ) : null}
        </main>

        <footer style={{ background: '#0f2318', padding: '24px 48px', borderTop: '1px solid rgba(200,169,110,0.1)', textAlign: 'center' }}>
          <p style={{ fontSize: 13, color: 'rgba(245,240,232,0.35)', margin: 0 }}>
            <strong style={{ color: 'rgba(245,240,232,0.6)' }}>Madvet Animal Healthcare</strong>
            &nbsp;·&nbsp; All products for veterinary use only
          </p>
        </footer>
      </div>
    </>
  )
}
