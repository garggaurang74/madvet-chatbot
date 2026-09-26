'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { CAT_ORDER, HI_CATS, getColor, Pill, LangToggle, type Lang } from '../products/ProductsClient'

export interface VideoItem {
  productId:  number
  youtubeId:  string
  name:       string
  category:   string
  species:    string
  indication: string
}

export default function VideosClient({ videos, channelUrl }: { videos: VideoItem[]; channelUrl: string }) {
  const [lang, setLang]           = useState<Lang>('hi')
  const [searchText, setSearch]   = useState('')
  const [activeCat, setActiveCat] = useState('all')
  const [playing, setPlaying]     = useState<string | null>(null)

  const cats = useMemo(() => {
    const used = [...new Set(videos.map(v => v.category))].filter(Boolean)
    return [...CAT_ORDER.filter(c => used.includes(c)), ...used.filter(c => !CAT_ORDER.includes(c))]
  }, [videos])

  const grouped = useMemo(() => {
    const q = searchText.toLowerCase().trim()
    const shown = videos.filter(v =>
      (activeCat === 'all' || v.category === activeCat) &&
      (!q || `${v.name} ${v.indication} ${v.species} ${v.category}`.toLowerCase().includes(q)))
    return cats
      .map(cat => ({ cat, items: shown.filter(v => v.category === cat) }))
      .filter(g => g.items.length)
  }, [videos, cats, searchText, activeCat])

  const hi = lang === 'hi'
  const catLabel = (c: string) => hi ? (HI_CATS[c] || c) : c

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; }
        html, body { margin: 0; padding: 0; overflow-x: hidden; }
        :root { --forest: #1a3a2a; --forest-mid: #264d39; --cream: #f5f0e8; --cream-dark: #ede6d6; --gold: #c8a96e; --gold-light: #e8d5a8; }
        .videos-page { font-family: 'DM Sans', 'Noto Sans Devanagari', sans-serif; background: var(--cream); min-height: 100vh; color: #1c2b22; }
        .video-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 20px; }
        .video-card { background: #fff; border-radius: 14px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.06); display: flex; flex-direction: column; }
        .video-frame { position: relative; aspect-ratio: 9 / 16; background: #0f2318; }
        .video-frame img, .video-frame iframe { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; }
        .video-frame img { object-fit: cover; }
        .play-btn { position: absolute; inset: 0; border: 0; background: linear-gradient(to top, rgba(15,35,24,0.55), transparent 45%); cursor: pointer; display: flex; align-items: center; justify-content: center; }
        .play-btn span { width: 62px; height: 62px; border-radius: 50%; background: rgba(200,169,110,0.95); display: flex; align-items: center; justify-content: center; }
        .filter-scroll { display: flex; gap: 8px; flex-wrap: wrap; }
        @media (max-width: 640px) {
          .top-nav { padding: 0 14px !important; }
          .header-inner, .controls-inner, .main-content { padding-left: 16px !important; padding-right: 16px !important; }
          .video-grid { grid-template-columns: 1fr 1fr; gap: 10px; }
          .filter-scroll { flex-wrap: nowrap; overflow-x: auto; scrollbar-width: none; }
          .nav-link-item { padding: 4px 8px !important; font-size: 12px !important; }
        }
      `}</style>

      <div className="videos-page">
        <nav className="top-nav" style={{ background: '#0f2318', padding: '0 48px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 52, borderBottom: '1px solid rgba(200,169,110,0.15)' }}>
          <Link href="/" style={{ fontFamily: "'DM Serif Display', serif", color: 'var(--cream)', fontSize: 18, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src="/madvet-icon.png" alt="Madvet" style={{ height: 32, width: 32, borderRadius: 6, objectFit: 'cover' }} /> Madvet
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Link href="/products" className="nav-link-item" style={{ padding: '6px 14px', borderRadius: 6, color: 'rgba(245,240,232,0.55)', fontSize: 13, fontWeight: 500, textDecoration: 'none' }}>{hi ? 'उत्पाद' : 'Products'}</Link>
            <span className="nav-link-item" style={{ padding: '6px 14px', borderRadius: 6, color: 'var(--gold-light)', background: 'rgba(200,169,110,0.1)', fontSize: 13, fontWeight: 500 }}>{hi ? 'वीडियो' : 'Videos'}</span>
          </div>
        </nav>

        <header style={{ background: 'var(--forest)' }}>
          <div className="header-inner" style={{ maxWidth: 1400, margin: '0 auto', padding: '48px 48px 40px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 3, textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 14 }}>Madvet Animal Healthcare</div>
              <h1 style={{ fontFamily: "'DM Serif Display', 'Noto Sans Devanagari', serif", fontSize: 'clamp(34px, 5vw, 60px)', lineHeight: 1.1, color: 'var(--cream)', margin: 0 }}>
                {hi ? 'उत्पाद ' : 'Product '}<em style={{ color: 'var(--gold-light)' }}>{hi ? 'वीडियो' : 'Videos'}</em>
              </h1>
              <p style={{ marginTop: 14, fontSize: 15, color: 'rgba(245,240,232,0.6)', maxWidth: 460, lineHeight: 1.7 }}>
                {hi ? 'हर दवा का छोटा वीडियो — किस बीमारी में, कैसे काम करती है, और कैसे देनी है।'
                    : 'A short Hindi film on each product — what it treats, how it works and how to give it.'}
              </p>
            </div>
            {channelUrl && (
              <a href={`${channelUrl}?sub_confirmation=1`} target="_blank" rel="noopener" style={{ padding: '11px 20px', background: '#c4302b', color: '#fff', borderRadius: 8, fontWeight: 700, fontSize: 14, textDecoration: 'none' }}>
                ▶ {hi ? 'YouTube पर सब्सक्राइब करें' : 'Subscribe on YouTube'}
              </a>
            )}
          </div>
        </header>

        <div style={{ background: 'var(--forest-mid)', position: 'sticky', top: 0, zIndex: 100 }}>
          <div className="controls-inner" style={{ maxWidth: 1400, margin: '0 auto', padding: '14px 48px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <LangToggle lang={lang} setLang={setLang} />
            <input type="text" value={searchText} onChange={e => setSearch(e.target.value)} autoComplete="off"
              placeholder={hi ? 'दवा या बीमारी खोजें…' : 'Search a product or disease…'}
              style={{ flex: 1, minWidth: 200, padding: '10px 16px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(200,169,110,0.25)', borderRadius: 8, color: 'var(--cream)', fontSize: 14, outline: 'none' }} />
            <div className="filter-scroll">
              <Pill label={hi ? 'सब' : 'All'} active={activeCat === 'all'} onClick={() => setActiveCat('all')} />
              {cats.map(c => <Pill key={c} label={catLabel(c)} active={activeCat === c} onClick={() => setActiveCat(c)} />)}
            </div>
          </div>
        </div>

        <main className="main-content" style={{ maxWidth: 1400, margin: '0 auto', padding: '36px 48px 72px' }}>
          {grouped.length === 0 && (
            <p style={{ textAlign: 'center', color: '#6b7a70', padding: 48 }}>
              {videos.length === 0 ? (hi ? 'वीडियो जल्द आ रहे हैं।' : 'Videos are coming soon.') : (hi ? 'कोई वीडियो नहीं मिला।' : 'No video matches that search.')}
            </p>
          )}
          {grouped.map(({ cat, items }) => (
            <section key={cat} style={{ marginBottom: 44 }}>
              <h2 style={{ fontFamily: "'DM Serif Display', 'Noto Sans Devanagari', serif", fontSize: 26, margin: '0 0 18px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: getColor(cat) }} />
                {catLabel(cat)}
                <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#8a968e', fontWeight: 500 }}>{items.length}</span>
              </h2>
              <div className="video-grid">
                {items.map(v => (
                  <article key={v.youtubeId} className="video-card">
                    <div className="video-frame">
                      {playing === v.youtubeId ? (
                        <iframe src={`https://www.youtube.com/embed/${v.youtubeId}?autoplay=1&rel=0&playsinline=1`}
                          title={v.name} allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen />
                      ) : (
                        <>
                          <img src={`https://i.ytimg.com/vi/${v.youtubeId}/hqdefault.jpg`} alt={v.name} loading="lazy" />
                          <button className="play-btn" aria-label={`${hi ? 'चलाएँ' : 'Play'}: ${v.name}`} onClick={() => setPlaying(v.youtubeId)}>
                            <span><svg width="22" height="22" viewBox="0 0 24 24" fill="#1a3a2a"><path d="M8 5v14l11-7z" /></svg></span>
                          </button>
                        </>
                      )}
                    </div>
                    <div style={{ padding: '12px 14px 14px', display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 15, lineHeight: 1.3 }}>{v.name}</div>
                      <div style={{ display: 'flex', gap: 8, marginTop: 'auto', flexWrap: 'wrap' }}>
                        <Link href={`/products/${v.productId}`} style={{ fontSize: 12, fontWeight: 600, color: 'var(--forest)', textDecoration: 'none', padding: '6px 10px', border: '1px solid var(--cream-dark)', borderRadius: 6 }}>
                          {hi ? 'उत्पाद देखें' : 'Product'} →
                        </Link>
                        <a href={`https://wa.me/?text=${encodeURIComponent(`${v.name} — MADVET\nhttps://youtu.be/${v.youtubeId}`)}`} target="_blank" rel="noopener"
                          style={{ fontSize: 12, fontWeight: 600, color: '#fff', background: '#25a244', textDecoration: 'none', padding: '6px 10px', borderRadius: 6 }}>
                          WhatsApp
                        </a>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </main>
      </div>
    </>
  )
}
