'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { FOLDER_DOWNLOAD, SITE } from '@/lib/share'
import SiteNav from '@/components/SiteNav'

export interface ViewerPage {
  p:         number
  kind:      'cover' | 'section' | 'product' | 'back'
  title:     string
  section:   string
  productId: number   // 0 when the page is not a product, or its product was removed
  film:      string   // /videos?film=<key>, '' when the product has no film
  names:     string   // every site product this page covers, for search
  ids:       number[] // those products' ids — ?id=<product> opens this page
}

// Page images keep fixed names (pages/63.webp), and browsers and the storage
// CDN hold them for a day — so when the folder changes (a page inserted,
// 29 Sep: Nuroforce Pro at 63) the old picture would show under the new title.
// The version is a hash of the manifest, so it changes exactly when the folder does.
let VER = ''
const IMG = (p: number, size: 'pages' | 'thumbs' = 'pages') =>
  `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/film-downloads/folder/${size}/${String(p).padStart(2, '0')}.webp${VER ? `?v=${VER}` : ''}`
function hashPages(pages: ViewerPage[]): string {
  let h = 5381
  for (const ch of pages.map(p => `${p.p}${p.kind}${p.title}`).join('|')) h = ((h * 33) ^ ch.charCodeAt(0)) >>> 0
  return h.toString(36)
}

const squash = (s: string) => s.toLowerCase().replace(/[^a-z0-9ऀ-ॿ]/g, '')

export default function FolderViewer({ pages }: { pages: ViewerPage[] }) {
  VER = hashPages(pages)
  const [i, setI]           = useState(0)
  const [zoom, setZoom]     = useState(false)
  const [query, setQuery]   = useState('')
  const [loaded, setLoaded] = useState<Record<number, boolean>>({})
  const strip = useRef<HTMLDivElement>(null)
  const touch = useRef<{ x: number; y: number } | null>(null)
  const n = pages.length
  const cur = pages[i]

  // ?p=12 opens page 12, and the address follows the page so it can be shared.
  // ?id=45 opens the page of product 45 (4 Oct): a page NUMBER moves every
  // time a product page is added before it, which broke the "page N" links in
  // YouTube descriptions; a product id never moves. id wins over p.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search)
    const id = Number(q.get('id'))
    const byId = id > 0 ? pages.findIndex(pg => (pg.ids ?? []).includes(id)) : -1
    if (byId >= 0) { setI(byId); return }
    const p = Number(q.get('p'))
    if (p >= 1 && p <= n) setI(p - 1)
  }, [n, pages])
  useEffect(() => {
    if (!cur) return
    const url = new URL(window.location.href)
    url.searchParams.set('p', String(cur.p))
    // Keep the router's own history state: replacing it with null made the
    // next page change a full reload (30 Sep).
    window.history.replaceState(window.history.state, '', url)
    // keep the next and previous pages ready so a swipe never shows a blank
    for (const k of [i + 1, i - 1, i + 2]) if (pages[k]) { const im = new Image(); im.src = IMG(pages[k].p) }
    // scroll the strip only — scrollIntoView would also scroll the page
    const box = strip.current, el = box?.querySelector<HTMLElement>(`[data-p="${cur.p}"]`)
    if (box && el) box.scrollTo({ left: el.offsetLeft - box.clientWidth / 2 + el.clientWidth / 2, behavior: 'smooth' })
  }, [i, cur, pages])

  const go = useCallback((k: number) => { setZoom(false); setI(Math.max(0, Math.min(n - 1, k))) }, [n])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return
      if (e.key === 'ArrowRight' || e.key === 'PageDown') go(i + 1)
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') go(i - 1)
      if (e.key === 'Escape') setZoom(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [i, go])

  // A phone turned sideways shows the page alone, edge to edge (the CSS under
  // "landscape phone"). There the first tap asks for real fullscreen, which
  // hides the browser bar on Android; iPhone Safari has no page fullscreen, so
  // it keeps the bar and the tap zooms as usual.
  const onSheetTap = useCallback(() => {
    const land = window.matchMedia(LANDSCAPE_PHONE).matches
    const el = document.documentElement as HTMLElement & { webkitRequestFullscreen?: () => void }
    if (land && !document.fullscreenElement && !zoom && el.requestFullscreen) {
      el.requestFullscreen().catch(() => setZoom(true))
      return
    }
    setZoom(z => !z)
  }, [zoom])

  const sections = useMemo(() => pages.filter(p => p.kind === 'section'), [pages])
  const results = useMemo(() => {
    const q = squash(query)
    if (!q) return []
    return pages.filter(p => p.kind === 'product' && (squash(p.title).includes(q) || squash(p.names).includes(q))).slice(0, 8)
  }, [pages, query])

  if (!n) return <div className="fv-empty">The folder is being prepared.</div>

  const share = `https://wa.me/?text=${encodeURIComponent(`*MADVET Product Folder* — ${cur.kind === 'product' ? cur.title : cur.section || cur.title}\n${SITE}/folder?p=${cur.p}`)}`

  return (
    <>
      <style>{CSS}</style>
      <div className="fv">
        <SiteNav active="folder" hi={false} />

        <header className="fv-head">
          <div className="fv-title">
            <div className="fv-eyebrow">Product Folder 2026</div>
            <h1>{cur.kind === 'product' ? cur.title : cur.kind === 'section' ? cur.title : cur.kind === 'cover' ? 'Veterinary Product Folder' : 'Contact'}</h1>
            {cur.kind === 'product' && cur.section && <div className="fv-sub">{cur.section}</div>}
          </div>
          <div className="fv-find">
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Find a product in the folder…" aria-label="Find a product" />
            {results.length > 0 && (
              <div className="fv-results">
                {results.map(r => (
                  <button key={r.p} onClick={() => { go(r.p - 1); setQuery('') }}>
                    <img src={IMG(r.p, 'thumbs')} alt="" /> <span><b>{r.title}</b><small>{r.section} · page {r.p}</small></span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </header>

        <div className="fv-sections">
          <button className={i === 0 ? 'on' : ''} onClick={() => go(0)}>Cover</button>
          {sections.map(s => {
            const active = cur.section === s.title || cur.p === s.p
            return <button key={s.p} className={active ? 'on' : ''} onClick={() => go(s.p - 1)}>{s.title}</button>
          })}
        </div>

        <main className="fv-stage"
          onTouchStart={e => { if (!zoom) touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY } }}
          onTouchEnd={e => {
            const t = touch.current; touch.current = null
            if (!t || zoom) return
            const dx = e.changedTouches[0].clientX - t.x, dy = e.changedTouches[0].clientY - t.y
            if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) go(i + (dx < 0 ? 1 : -1))
          }}>
          <button className="fv-arrow prev" onClick={() => go(i - 1)} disabled={i === 0} aria-label="Previous page">‹</button>
          <div className={`fv-sheet ${zoom ? 'zoom' : ''}`} onClick={onSheetTap} title={zoom ? 'Tap to fit' : 'Tap to zoom'}>
            {!loaded[cur.p] && <div className="fv-spin" />}
            <img key={cur.p} src={IMG(cur.p)} alt={`Page ${cur.p}: ${cur.title}`}
              onLoad={() => setLoaded(l => ({ ...l, [cur.p]: true }))} draggable={false} />
          </div>
          <button className="fv-arrow next" onClick={() => go(i + 1)} disabled={i === n - 1} aria-label="Next page">›</button>
          <span className="fv-land-count">{cur.p} / {n}</span>
        </main>

        <div className="fv-bar">
          <span className="fv-count">{cur.p} / {n}</span>
          <div className="fv-actions">
            {cur.productId > 0 && <Link className="fv-btn gold" href={`/products/${cur.productId}`}>Product details</Link>}
            {cur.film && <Link className="fv-btn red" href={`/videos?film=${encodeURIComponent(cur.film)}`}>▶ Watch film</Link>}
            <a className="fv-btn wa" href={share} target="_blank" rel="noopener">Share this page</a>
            <a className="fv-btn ghost" href={FOLDER_DOWNLOAD} download>Download PDF</a>
          </div>
        </div>

        <div className="fv-strip" ref={strip}>
          {pages.map((pg, k) => (
            <button key={pg.p} data-p={pg.p} className={k === i ? 'on' : ''} onClick={() => go(k)} aria-label={`Page ${pg.p}: ${pg.title}`}>
              <img src={IMG(pg.p, 'thumbs')} alt="" loading="lazy" />
              <span>{pg.p}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  )
}

const LANDSCAPE_PHONE = '(orientation: landscape) and (max-height: 540px)'

const CSS = `
*, *::before, *::after { box-sizing: border-box; }
html, body { margin: 0; padding: 0; overflow-x: clip; background: #0c1d14; }
.fv { --forest:#1a3a2a; --night:#0c1d14; --cream:#f5f0e8; --gold:#c8a96e; --gold-light:#e8d5a8;
  min-height: 100vh; display: flex; flex-direction: column; background: radial-gradient(ellipse 80% 60% at 50% 40%, #183626 0%, var(--night) 70%);
  color: var(--cream); font-family: 'DM Sans', 'Noto Sans Devanagari', sans-serif; }
.fv button { font: inherit; cursor: pointer; }
.fv-empty { padding: 80px 20px; text-align: center; color: #9aa; }

.fv-nav { height: 56px; padding: 0 32px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(200,169,110,.15); }
.fv-brand { display: flex; align-items: center; gap: 10px; color: var(--cream); text-decoration: none; font-family: 'DM Serif Display', serif; font-size: 19px; }
.fv-brand img { width: 32px; height: 32px; border-radius: 7px; }
.fv-links { display: flex; gap: 4px; }
.fv-links a, .fv-links span { padding: 7px 14px; border-radius: 7px; font-size: 13px; font-weight: 500; color: rgba(245,240,232,.6); text-decoration: none; }
.fv-links a:hover { color: var(--cream); }
.fv-links .on { color: var(--gold-light); background: rgba(200,169,110,.12); }

.fv-head { max-width: 1280px; width: 100%; margin: 0 auto; padding: 20px 32px 8px; display: flex; align-items: flex-end; justify-content: space-between; gap: 20px; flex-wrap: wrap; }
.fv-eyebrow { font-size: 11px; letter-spacing: 3px; text-transform: uppercase; color: var(--gold); font-weight: 700; }
.fv-title h1 { margin: 6px 0 0; font-family: 'DM Serif Display', serif; font-weight: 400; font-size: clamp(24px, 3vw, 34px); line-height: 1.15; }
.fv-sub { margin-top: 4px; font-size: 13px; color: rgba(245,240,232,.55); }
.fv-find { position: relative; width: min(340px, 100%); }
.fv-find input { width: 100%; padding: 11px 14px; border-radius: 10px; border: 1px solid rgba(200,169,110,.3); background: rgba(255,255,255,.07); color: var(--cream); font: inherit; font-size: 14px; outline: none; }
.fv-find input:focus { border-color: var(--gold); }
.fv-results { position: absolute; top: calc(100% + 6px); left: 0; right: 0; z-index: 20; background: #132a1e; border: 1px solid rgba(200,169,110,.25); border-radius: 12px; overflow: hidden; box-shadow: 0 20px 50px rgba(0,0,0,.5); }
.fv-results button { width: 100%; display: flex; align-items: center; gap: 12px; padding: 8px 10px; border: 0; background: none; color: var(--cream); text-align: left; }
.fv-results button:hover { background: rgba(200,169,110,.12); }
.fv-results img { width: 64px; border-radius: 4px; }
.fv-results b { display: block; font-size: 14px; }
.fv-results small { color: rgba(245,240,232,.5); font-size: 12px; }

.fv-sections { max-width: 1280px; width: 100%; margin: 0 auto; padding: 10px 32px; display: flex; gap: 8px; overflow-x: auto; scrollbar-width: none; }
.fv-sections::-webkit-scrollbar { display: none; }
.fv-sections button { flex: none; padding: 7px 14px; border-radius: 20px; border: 1px solid rgba(200,169,110,.28); background: transparent; color: rgba(245,240,232,.7); font-size: 12.5px; white-space: nowrap; transition: all .18s; }
.fv-sections button:hover { border-color: var(--gold); color: var(--cream); }
.fv-sections button.on { background: var(--gold); border-color: var(--gold); color: var(--forest); font-weight: 700; }

.fv-stage { position: relative; flex: 1; display: flex; align-items: center; justify-content: center; gap: 14px; padding: 8px 32px; min-height: 0; }
.fv-sheet { position: relative; width: min(1200px, calc((100vh - 330px) * 1.414), 100%); aspect-ratio: 1.414; border-radius: 6px; overflow: hidden; background: #fff;
  box-shadow: 0 30px 80px rgba(0,0,0,.55), 0 0 0 1px rgba(232,213,168,.15); cursor: zoom-in; }
.fv-sheet img { width: 100%; height: 100%; object-fit: contain; display: block; user-select: none; animation: fvIn .25s ease; }
.fv-sheet.zoom { position: fixed; inset: 0; z-index: 100; width: 100vw; height: 100vh; aspect-ratio: auto; border-radius: 0; overflow: auto; cursor: zoom-out; background: #0c1d14; }
.fv-sheet.zoom img { width: 200%; max-width: none; height: auto; object-fit: initial; }
@media (max-width: 700px) { .fv-sheet.zoom img { width: 300%; } }
.fv-spin { position: absolute; top: 50%; left: 50%; width: 34px; height: 34px; margin: -17px 0 0 -17px; border-radius: 50%; border: 3px solid rgba(26,58,42,.2); border-top-color: #1a3a2a; animation: fvSpin .8s linear infinite; }
@keyframes fvSpin { to { transform: rotate(360deg) } }
@keyframes fvIn { from { opacity: .3 } }
.fv-arrow { flex: none; width: 52px; height: 52px; border-radius: 50%; border: 1px solid rgba(200,169,110,.35); background: rgba(255,255,255,.06); color: var(--gold-light); font-size: 30px; line-height: 1; display: flex; align-items: center; justify-content: center; transition: background .15s; }
.fv-arrow:hover:not(:disabled) { background: rgba(200,169,110,.2); }
.fv-arrow:disabled { opacity: .25; cursor: default; }

.fv-bar { max-width: 1280px; width: 100%; margin: 0 auto; padding: 10px 32px; display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.fv-count { font-family: 'DM Serif Display', serif; font-size: 20px; color: var(--gold-light); }
.fv-actions { display: flex; gap: 8px; flex-wrap: wrap; }
.fv-btn { padding: 9px 15px; border-radius: 9px; font-size: 13px; font-weight: 700; text-decoration: none; white-space: nowrap; transition: filter .15s, transform .15s; }
.fv-btn:hover { filter: brightness(1.08); transform: translateY(-1px); }
.fv-btn.gold { background: var(--gold); color: var(--forest); }
.fv-btn.red { background: #d4302b; color: #fff; }
.fv-btn.wa { background: #25a244; color: #fff; }
.fv-btn.ghost { border: 1px solid rgba(200,169,110,.35); color: var(--gold-light); }

.fv-strip { display: flex; gap: 8px; overflow-x: auto; padding: 8px 32px 18px; scrollbar-width: thin; }
.fv-strip button { position: relative; flex: none; width: 108px; padding: 0; border: 2px solid transparent; border-radius: 5px; background: none; overflow: hidden; opacity: .55; transition: opacity .15s, border-color .15s; }
.fv-strip button:hover { opacity: .9; }
.fv-strip button.on { border-color: var(--gold); opacity: 1; }
.fv-strip img { display: block; width: 100%; aspect-ratio: 1.414; object-fit: cover; background: #223; }
.fv-strip span { position: absolute; right: 4px; bottom: 3px; font-size: 10px; font-weight: 700; color: #fff; background: rgba(0,0,0,.55); padding: 1px 5px; border-radius: 4px; }

@media (max-width: 700px) {
  .fv-nav { padding: 0 14px; }
  .fv-brand span { display: none; }
  .fv-head, .fv-sections, .fv-bar { padding-left: 14px; padding-right: 14px; }
  .fv-stage { padding: 6px 8px; gap: 0; }
  .fv-arrow { position: absolute; top: 50%; z-index: 5; width: 38px; height: 38px; margin-top: -19px; font-size: 24px; background: rgba(12,29,20,.7); }
  .fv-arrow.prev { left: 4px; } .fv-arrow.next { right: 4px; }
  .fv-sheet { width: 100%; }
  .fv-strip { padding: 6px 14px 14px; }
  .fv-strip button { width: 84px; }
  .fv-btn { padding: 8px 12px; font-size: 12.5px; }
}
/* landscape phone: the page alone, filling the screen */
.fv-land-count { display: none; }
@media (orientation: landscape) and (max-height: 540px) {
  .sn, .sf, .fv-head, .fv-sections, .fv-bar, .fv-strip { display: none !important; }
  .fv { min-height: 100dvh; background: #000; }
  .fv-stage { position: fixed; inset: 0; z-index: 50; padding: 0; gap: 0; background: #000; }
  .fv-sheet { width: min(100vw, calc(100dvh * 1.414)); height: auto; max-height: 100dvh; border-radius: 0; box-shadow: none; }
  .fv-arrow { position: absolute; top: 50%; z-index: 5; width: 40px; height: 40px; margin-top: -20px; font-size: 24px; background: rgba(0,0,0,.45); border-color: rgba(232,213,168,.35); }
  .fv-arrow.prev { left: 6px; } .fv-arrow.next { right: 6px; }
  .fv-land-count { display: block; position: absolute; right: 10px; bottom: 8px; z-index: 6; padding: 3px 9px; border-radius: 10px; background: rgba(0,0,0,.55); color: #e8d5a8; font-size: 12px; font-weight: 700; pointer-events: none; }
}
@media (prefers-reduced-motion: reduce) { .fv * { animation: none !important; transition: none !important; } }
`
