import { Metadata } from 'next'
import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Product } from '../types'

export const revalidate = 60

const CAT_NORMALIZE: Record<string, string> = {
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

function getFormulationFallback(packaging: string): string {
  const p = packaging.toLowerCase()
  if (p.includes('bolus'))                                                  return 'Bolus'
  if (p.includes('inj') || p.includes('syringe'))                          return 'Injection'
  if (p.includes('tablet') || p.includes(' tab'))                          return 'Tablet'
  if (p.includes('spray'))                                                  return 'Spray'
  if (p.includes('gel') || p.includes('ointment') || p.includes('cream'))  return 'Gel / Ointment'
  if (p.includes('soap'))                                                   return 'Soap'
  if (p.includes('powder') || p.includes('sachet') || p.includes(' gm') || p.includes(' kg')) return 'Powder'
  if (p.includes('pour-on') || p.includes('pour on'))                      return 'Pour-On'
  if (p.includes('suspension'))                                             return 'Suspension'
  if (p.includes('syrup') || p.includes('liq') || p.includes('liquid') ||
      p.includes('solution') || p.includes(' ml'))                         return 'Liquid'
  return 'Other'
}

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

async function fetchProduct(id: number): Promise<Product | null> {
  const url   = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key   = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const table = process.env.NEXT_PUBLIC_SUPABASE_TABLE || 'products_enriched'
  if (!url || !key) return null

  const supabase = createClient(url, key)
  const { data, error } = await supabase
    .from(table)
    .select('id, product_name, salt_ingredient, packaging, formulation, category, species, indication, description, usp_benefits, aliases')
    .eq('id', id)
    .single()

  if (error || !data) return null

  const rawPackaging = (data.packaging || '').trim()
  const formulation  = (data.formulation || '').trim() || getFormulationFallback(rawPackaging)

  return {
    id:          Number(data.id),
    name:        (data.product_name    || '').trim(),
    salt:        (data.salt_ingredient || '').trim(),
    packaging:   rawPackaging,
    formulation,
    category:    CAT_NORMALIZE[(data.category || '').trim()] || (data.category || '').trim(),
    species:     (data.species         || '').trim(),
    indication:  (data.indication      || '').trim(),
    description: (data.description     || '').trim(),
    benefits:    (data.usp_benefits    || '').trim(),
    aliases:     (data.aliases         || '').trim(),
  }
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const product = await fetchProduct(Number(id))
  if (!product) return { title: 'Product Not Found | Madvet' }
  return {
    title: `${product.name} | Madvet Animal Healthcare`,
    description: product.description || `${product.name} — ${product.category} for ${product.species}`,
  }
}

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const product = await fetchProduct(Number(id))
  if (!product) notFound()

  const color       = getColor(product.category)
  const indChunks   = product.indication.split(',').map(s => s.trim()).filter(s => s.length > 3)
  // Filter to show only clean English indication terms (not raw Hindi blob)
  const engInd      = indChunks.filter(s => /^[\x00-\x7F]+$/.test(s)).slice(0, 12)
  const speciesArr  = product.species.split(/[,\/]/).map(s => s.trim()).filter(Boolean)

  const SPECIES_EMOJI: Record<string, string> = {
    Cattle: '🐄', Buffalo: '🐃', Sheep: '🐑', Goat: '🐐',
    Dog: '🐕', Cat: '🐈', Poultry: '🐓', Horse: '🐴',
  }

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
          .top-nav { padding: 0 14px !important; }
        }
      `}</style>

      {/* NAV */}
      <nav style={{
        background: '#0f2318', padding: '0 48px', display: 'flex',
        alignItems: 'center', justifyContent: 'space-between',
        height: 52, borderBottom: '1px solid rgba(200,169,110,0.15)',
      }} className="top-nav">
        <Link href="/" style={{
          fontFamily: "'DM Serif Display', serif", color: 'var(--cream)',
          fontSize: 18, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{ fontSize: 22 }}>🐄</span> Madvet
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <Link href="/products" style={{
            padding: '6px 14px', borderRadius: 6, color: 'rgba(245,240,232,0.55)',
            fontSize: 13, fontWeight: 500, textDecoration: 'none',
          }}>← All Products</Link>
        </div>
      </nav>

      {/* HERO */}
      <header style={{ background: 'var(--forest)', position: 'relative', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse 80% 60% at 70% 50%, rgba(200,169,110,0.10) 0%, transparent 70%)',
        }} />
        <div className="hero-inner" style={{
          position: 'relative', zIndex: 1, maxWidth: 960, margin: '0 auto',
          padding: '48px 48px 40px',
        }}>
          {/* breadcrumb */}
          <div style={{ fontSize: 12, color: 'rgba(245,240,232,0.4)', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Link href="/products" style={{ color: 'rgba(200,169,110,0.7)', textDecoration: 'none' }}>Products</Link>
            <span>›</span>
            <span>{product.category}</span>
          </div>

          {/* category badge */}
          <div style={{ marginBottom: 16 }}>
            <span className="chip" style={{ background: `${color}22`, color, border: `1px solid ${color}44`, fontSize: 12 }}>
              {product.category}
            </span>
          </div>

          {/* title */}
          <h1 className="hero-title" style={{
            fontFamily: "'DM Serif Display', serif", fontSize: 42,
            color: 'var(--cream)', lineHeight: 1.1, marginBottom: 16,
          }}>{product.name}</h1>

          {/* packaging + formulation */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span className="chip" style={{ background: 'rgba(200,169,110,0.12)', color: 'var(--gold-light)', border: '1px solid rgba(200,169,110,0.2)', fontSize: 12 }}>
              {product.packaging}
            </span>
            <span className="chip" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(245,240,232,0.55)', border: '1px solid rgba(255,255,255,0.08)', fontSize: 12 }}>
              {product.formulation}
            </span>
          </div>
        </div>
      </header>

      {/* ACCENT LINE */}
      <div style={{ height: 4, background: `linear-gradient(90deg, ${color}, ${color}44)` }} />

      {/* CONTENT */}
      <main className="content-wrap" style={{ maxWidth: 960, margin: '0 auto', padding: '40px 48px 80px' }}>
        <div className="grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

          {/* LEFT COLUMN */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {product.description && (
              <div className="card">
                <div className="section-label">About This Product</div>
                <p style={{ fontSize: 15, lineHeight: 1.75, color: '#1c2b22' }}>{product.description}</p>
              </div>
            )}

            {product.benefits && product.benefits !== 'N/A' && (
              <div className="card">
                <div className="section-label">Key Benefits</div>
                <p style={{ fontSize: 15, lineHeight: 1.75, color: '#1c2b22' }}>{product.benefits}</p>
              </div>
            )}

            {engInd.length > 0 && (
              <div className="card">
                <div className="section-label">Indications / Used For</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                  {engInd.map((ind, i) => (
                    <span key={i} style={{
                      padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 500,
                      background: '#f0ebe0', color: '#5a7060', border: '1px solid #d4c9b0',
                    }}>{ind}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {product.salt && (
              <div className="card">
                <div className="section-label">Composition</div>
                <p style={{ fontSize: 14, lineHeight: 1.7, color: '#1c2b22', fontFamily: 'monospace', background: '#f5f0e8', padding: '12px 16px', borderRadius: 8, border: '1px solid #ede6d6', marginTop: 4 }}>
                  {product.salt}
                </p>
              </div>
            )}

            {speciesArr.length > 0 && (
              <div className="card">
                <div className="section-label">For Animals</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 8 }}>
                  {speciesArr.map(sp => (
                    <span key={sp} style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '7px 14px', borderRadius: 12, fontSize: 13, fontWeight: 500,
                      background: '#f0ebe0', color: '#1a3a2a', border: '1px solid #d4c9b0',
                    }}>
                      <span>{SPECIES_EMOJI[sp] || '🐾'}</span> {sp}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Quick facts */}
            <div className="card" style={{ background: `${color}0d`, borderColor: `${color}33` }}>
              <div className="section-label" style={{ color }}>Quick Facts</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
                  <span style={{ color: '#5a7060' }}>Category</span>
                  <span style={{ fontWeight: 600, color: '#1a3a2a' }}>{product.category}</span>
                </div>
                <div style={{ height: 1, background: '#d4c9b022' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
                  <span style={{ color: '#5a7060' }}>Form</span>
                  <span style={{ fontWeight: 600, color: '#1a3a2a' }}>{product.formulation}</span>
                </div>
                <div style={{ height: 1, background: '#d4c9b022' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
                  <span style={{ color: '#5a7060' }}>Packaging</span>
                  <span style={{ fontWeight: 600, color: '#1a3a2a' }}>{product.packaging}</span>
                </div>
                <div style={{ height: 1, background: '#d4c9b022' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
                  <span style={{ color: '#5a7060' }}>Product ID</span>
                  <span style={{ fontWeight: 600, color: '#1a3a2a' }}>#{product.id}</span>
                </div>
              </div>
            </div>

            <div style={{
              padding: '16px 20px', borderRadius: 12, background: 'rgba(26,58,42,0.06)',
              border: '1px solid rgba(26,58,42,0.1)', fontSize: 12, color: '#5a7060', lineHeight: 1.6,
            }}>
              ⚕️ <strong>For veterinary use only.</strong> Always consult a registered veterinarian for correct dosage and treatment plan.
            </div>
          </div>
        </div>

        {/* Back button */}
        <div style={{ marginTop: 40, paddingTop: 32, borderTop: '1px solid #d4c9b0' }}>
          <Link href="/products" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '10px 24px', borderRadius: 8, background: 'var(--forest)',
            color: 'var(--cream)', textDecoration: 'none', fontSize: 14, fontWeight: 600,
            fontFamily: "'DM Sans', sans-serif",
          }}>
            ← Back to All Products
          </Link>
        </div>
      </main>

      <footer style={{ background: '#0f2318', padding: '24px 48px', borderTop: '1px solid rgba(200,169,110,0.1)', textAlign: 'center' }}>
        <p style={{ fontSize: 13, color: 'rgba(245,240,232,0.35)', margin: 0 }}>
          <strong style={{ color: 'rgba(245,240,232,0.6)' }}>Madvet Animal Healthcare</strong>
          &nbsp;·&nbsp; All products for veterinary use only
        </p>
      </footer>
    </>
  )
}
