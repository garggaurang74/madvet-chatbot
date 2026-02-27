'use client'

import Link from 'next/link'
import { useState } from 'react'
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

export default function ProductDetailClient({ product }: { product: Product }) {
  const [lang, setLang] = useState<Lang>('en')

  const color      = getColor(product.category)
  const indChunks  = product.indication.split(',').map(s => s.trim()).filter(s => s.length > 3)
  const engInd     = indChunks.filter(s => /^[\x00-\x7F]+$/.test(s)).slice(0, 12)
  const hiInd      = indChunks.filter(s => /[^\x00-\x7F]/.test(s)).slice(0, 12)
  const displayInd = lang === 'hi' ? (hiInd.length > 0 ? hiInd : engInd) : engInd
  const speciesArr = product.species.split(/[,\/]/).map(s => s.trim()).filter(Boolean)

  const t = {
    allProducts:  lang === 'hi' ? 'सभी उत्पाद' : 'All Products',
    about:        lang === 'hi' ? 'इस उत्पाद के बारे में' : 'About This Product',
    benefits:     lang === 'hi' ? 'मुख्य फायदे' : 'Key Benefits',
    indications:  lang === 'hi' ? 'किसके लिए उपयोग' : 'Indications / Used For',
    composition:  lang === 'hi' ? 'संरचना (Composition)' : 'Composition',
    forAnimals:   lang === 'hi' ? 'किस जानवर के लिए' : 'For Animals',
    quickFacts:   lang === 'hi' ? 'मुख्य जानकारी' : 'Quick Facts',
    category:     lang === 'hi' ? 'श्रेणी' : 'Category',
    form:         lang === 'hi' ? 'रूप' : 'Form',
    packaging:    lang === 'hi' ? 'पैकेजिंग' : 'Packaging',
    productId:    lang === 'hi' ? 'उत्पाद ID' : 'Product ID',
    vetOnly:      lang === 'hi' ? 'सिर्फ पशु चिकित्सा उपयोग के लिए। सही खुराक के लिए पंजीकृत पशु चिकित्सक से मिलें।' : 'For veterinary use only. Always consult a registered veterinarian for correct dosage and treatment plan.',
    backBtn:      lang === 'hi' ? '← सभी उत्पाद' : '← Back to All Products',
    footerNote:   lang === 'hi' ? 'सिर्फ पशु चिकित्सा में उपयोग के लिए' : 'All products for veterinary use only',
    assistant:    lang === 'hi' ? 'सहायक' : 'Assistant',
    products:     lang === 'hi' ? 'उत्पाद' : 'Products',
    training:     lang === 'hi' ? 'ट्रेनिंग' : 'Training',
    videoDemo:    lang === 'hi' ? 'उत्पाद का वीडियो' : 'Product Video Demo',
    watchYT:      lang === 'hi' ? 'YouTube पर देखें / शेयर करें' : 'Watch on YouTube / Share',
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
      <nav style={{
        background: '#0f2318', padding: '0 48px', display: 'flex',
        alignItems: 'center', justifyContent: 'space-between',
        height: 52, borderBottom: '1px solid rgba(200,169,110,0.15)',
      }} className="top-nav">
        <Link href="/" style={{
          fontFamily: "'DM Serif Display', serif", color: 'var(--cream)',
          fontSize: 18, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <img src="/madvet-icon.png" alt="Madvet" style={{height:32,width:32,borderRadius:6,objectFit:"cover",marginRight:2}} /> Madvet
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <LangToggle lang={lang} setLang={setLang} />
          <Link href="/products" style={{
            padding: '6px 14px', borderRadius: 6, color: 'rgba(245,240,232,0.55)',
            fontSize: 13, fontWeight: 500, textDecoration: 'none',
          }}>← {t.allProducts}</Link>
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
          <div style={{ fontSize: 12, color: 'rgba(245,240,232,0.4)', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Link href="/products" style={{ color: 'rgba(200,169,110,0.7)', textDecoration: 'none' }}>{t.products}</Link>
            <span>›</span>
            <span>{displayCat}</span>
          </div>
          <div style={{ marginBottom: 16 }}>
            <span className="chip" style={{ background: `${color}22`, color, border: `1px solid ${color}44`, fontSize: 12 }}>
              {displayCat}
              {lang === 'hi' && (
                <span style={{ fontSize: 11, opacity: 0.6, marginLeft: 4 }}>({product.category})</span>
              )}
            </span>
          </div>
          <h1 className="hero-title" style={{
            fontFamily: "'DM Serif Display', serif", fontSize: 42,
            color: 'var(--cream)', lineHeight: 1.1, marginBottom: 16,
          }}>{product.name}</h1>
          {product.image_url && (
            <div style={{
              width: '100%', maxWidth: 320, borderRadius: 16, overflow: 'hidden',
              background: 'linear-gradient(135deg,#f9f6f1 0%,#ede8e0 100%)',
              border: '1px solid rgba(200,169,110,0.25)',
              aspectRatio: '1/1', display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: product.video_url ? 12 : 20,
            }}>
              <img src={product.image_url} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 12 }} onError={(e) => { (e.target as HTMLImageElement).parentElement!.style.display = 'none' }} />
            </div>
          )}
          {(() => {
            if (!product.video_url) return null
            const match = product.video_url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([A-Za-z0-9_-]{11})/)
            const videoId = match?.[1]
            if (!videoId) return null
            return (
              <div style={{ width: '100%', maxWidth: 480, marginBottom: 20 }}>
                <div style={{
                  position: 'relative', paddingBottom: '56.25%', height: 0,
                  borderRadius: 12, overflow: 'hidden',
                  border: '1px solid rgba(200,169,110,0.25)',
                  background: '#000',
                }}>
                  <iframe
                    src={`https://www.youtube.com/embed/${videoId}?rel=0`}
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    loading="lazy"
                  />
                </div>
                <div style={{ marginTop: 8, display: 'flex', gap: 10 }}>
                  <a
                    href={product.video_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      padding: '6px 14px', borderRadius: 6,
                      background: '#ff0000', color: '#fff',
                      textDecoration: 'none', fontSize: 12, fontWeight: 600,
                      fontFamily: "'DM Sans', sans-serif",
                    }}
                  >
                    ▶ {t.watchYT}
                  </a>
                  <button
                    onClick={async () => {
                      const shareUrl = typeof window !== 'undefined' ? window.location.href : ''
                      if (navigator.share) {
                        await navigator.share({ title: product.name, text: product.description, url: shareUrl })
                      } else {
                        await navigator.clipboard.writeText(shareUrl)
                        alert('Link copied!')
                      }
                    }}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      padding: '6px 14px', borderRadius: 6,
                      background: 'rgba(255,255,255,0.1)', color: 'var(--cream)',
                      border: '1px solid rgba(200,169,110,0.3)', cursor: 'pointer',
                      fontSize: 12, fontWeight: 600,
                      fontFamily: "'DM Sans', sans-serif",
                    }}
                  >
                    🔗 {lang === 'hi' ? 'शेयर करें' : 'Share'}
                  </button>
                </div>
              </div>
            )
          })()}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 8 }}>
            <span className="chip" style={{ background: 'rgba(200,169,110,0.12)', color: 'var(--gold-light)', border: '1px solid rgba(200,169,110,0.2)', fontSize: 12 }}>
              {product.packaging}
            </span>
            <span className="chip" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(245,240,232,0.55)', border: '1px solid rgba(255,255,255,0.08)', fontSize: 12 }}>
              {displayForm}
            </span>
          </div>
        </div>
      </header>

      <div style={{ height: 4, background: `linear-gradient(90deg, ${color}, ${color}44)` }} />

      {/* CONTENT */}
      <main className="content-wrap" style={{ maxWidth: 960, margin: '0 auto', padding: '40px 48px 80px' }}>
        <div className="grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

          {/* LEFT */}
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
                    <span key={i} style={{
                      padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 500,
                      background: '#f0ebe0', color: '#5a7060', border: '1px solid #d4c9b0',
                    }}>{ind}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {product.salt && (
              <div className="card">
                <div className="section-label">{t.composition}</div>
                <p style={{ fontSize: 14, lineHeight: 1.7, color: '#1c2b22', fontFamily: 'monospace', background: '#f5f0e8', padding: '12px 16px', borderRadius: 8, border: '1px solid #ede6d6', marginTop: 4 }}>
                  {product.salt}
                </p>
              </div>
            )}
            {speciesArr.length > 0 && (
              <div className="card">
                <div className="section-label">{t.forAnimals}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 8 }}>
                  {speciesArr.map(sp => (
                    <span key={sp} style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '7px 14px', borderRadius: 12, fontSize: 13, fontWeight: 500,
                      background: '#f0ebe0', color: '#1a3a2a', border: '1px solid #d4c9b0',
                    }}>
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
                {[
                  { label: t.category, value: displayCat },
                  { label: t.form,     value: displayForm },
                  { label: t.packaging,value: product.packaging },
                  { label: t.productId,value: `#${product.id}` },
                ].map(({ label, value }, i, arr) => (
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
            <div style={{
              padding: '16px 20px', borderRadius: 12, background: 'rgba(26,58,42,0.06)',
              border: '1px solid rgba(26,58,42,0.1)', fontSize: 12, color: '#5a7060', lineHeight: 1.6,
            }}>
              ⚕️ <strong>{lang === 'hi' ? 'केवल पशु चिकित्सा उपयोग।' : 'For veterinary use only.'}</strong> {t.vetOnly}
            </div>
          </div>
        </div>

        <div style={{ marginTop: 40, paddingTop: 32, borderTop: '1px solid #d4c9b0' }}>
          <Link href="/products" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '10px 24px', borderRadius: 8, background: 'var(--forest)',
            color: 'var(--cream)', textDecoration: 'none', fontSize: 14, fontWeight: 600,
            fontFamily: "'DM Sans', sans-serif",
          }}>
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
    </>
  )
}
