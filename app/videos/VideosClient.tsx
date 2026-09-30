'use client'

import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { shareCaption, whatsappShareUrl } from '@/lib/share'
import ShareVideo from '@/components/ShareVideo'
import FolderButtons from '@/components/FolderButtons'
import SiteNav from '@/components/SiteNav'
import { CAT_ORDER, HI_CATS, getColor } from '../products/ProductsClient'
import { Pill, LangToggle, type Lang } from '@/components/Controls'

export interface VideoItem {
  key:        string   // youtubeId, or the film's slug while it is not on YouTube
  productId:  number   // 0 for a film with no product (the protocols)
  youtubeId:  string   // '' until the film is on YouTube
  src:        string   // our own MP4, played until there is a youtubeId
  poster:     string
  name:       string
  category:   string
  species:    string
  indication: string
  salt:       string   // composition, so a search for a molecule finds the film
  aliases:    string
  image:      string
  vertical:   boolean
  title:      string
  download:   string   // small MP4 for WhatsApp; '' when none is uploaded
  downloadMB: number
}

// Every word typed must appear somewhere: name (English or Hindi), composition,
// other names, disease, animal or category. Punctuation and spaces are ignored,
// so "vh5" finds V.H-5 and "3d sera" finds 3D-SERA.
const squash = (s: string) => s.toLowerCase().replace(/[.\-_/\s'’]+/g, '')
function matches(v: VideoItem, q: string): boolean {
  const words = q.toLowerCase().trim().split(/\s+/).filter(Boolean)
  if (!words.length) return true
  const sp = v.species.split(/[,/]/).map(s => HI_SP[s.trim()] || '').join(' ')
  const hay = [v.name, v.title, v.salt, v.aliases, v.indication, v.species, sp, v.category,
    HI_CATS[v.category] || '', HI_EXTRA[v.category] || ''].join(' ').toLowerCase()
  const flat = squash(hay)
  return words.every(w => hay.includes(w) || flat.includes(squash(w)) || (HI_TERMS[w] || []).some(t => hay.includes(t)))
}

// The product data names diseases in English and Hinglish, so a Hindi word is
// looked up as its English terms too ("थनैला" finds mastitis).
const HI_TERMS: Record<string, string[]> = {
  'थनैला': ['mastitis'], 'थन': ['udder', 'mastitis', 'teat'], 'कीड़े': ['worm', 'anthelmintic', 'deworm', 'keede'], 'कीड़ा': ['worm', 'anthelmintic', 'deworm'],
  'कृमि': ['worm', 'anthelmintic'], 'बुखार': ['fever', 'antipyretic', 'bukhar'], 'ज्वर': ['fever'], 'दस्त': ['diarrh', 'dast', 'scour'],
  'चिचड़ी': ['tick', 'ectopar'], 'किलनी': ['tick'], 'जूँ': ['lice', 'louse'], 'दूध': ['milk', 'lactation', 'galactog', 'doodh'],
  'खुजली': ['itch', 'mange', 'khujli', 'dermat'], 'दर्द': ['pain', 'analges', 'dard'], 'सूजन': ['swelling', 'inflamm'],
  'घाव': ['wound', 'maggot'], 'कीड़े पड़ना': ['maggot'], 'बच्चेदानी': ['uter', 'prolapse', 'metritis'], 'जेर': ['placenta', 'retained'],
  'निमोनिया': ['pneumonia'], 'खांसी': ['cough', 'respirat'], 'लीवर': ['liver', 'hepat'], 'कमजोरी': ['weak', 'kamzori', 'debility', 'tonic'],
  'भूख': ['appetite', 'anorexia'], 'अफारा': ['bloat', 'tympan'], 'गैस': ['bloat', 'gas'], 'हीट': ['heat', 'estrus', 'oestrus', 'anestrus'],
  'गर्मी': ['heat', 'estrus', 'anestrus'], 'एलर्जी': ['allerg'], 'संक्रमण': ['infection', 'antibiotic'], 'कैल्शियम': ['calcium'],
  'फ्लूक': ['fluke'], 'त्वचा': ['skin', 'dermat'], 'खुर': ['foot', 'hoof'], 'विटामिन': ['vitamin'], 'बछड़ा': ['calf'],
  'कुत्ता': ['dog'], 'बिल्ली': ['cat'], 'गाय': ['cattle', 'cow'], 'भैंस': ['buffalo'], 'बकरी': ['goat'], 'भेड़': ['sheep'], 'घोड़ा': ['horse'], 'मुर्गी': ['poultry'],
}

// Categories that exist only on films, not in the products table
const HI_EXTRA: Record<string, string> = {
  'Treatment Protocol': 'इलाज का पूरा तरीका',
}

const HI_SP: Record<string, string> = {
  Cattle: 'गाय', Buffalo: 'भैंस', Sheep: 'भेड़', Goat: 'बकरी',
  Dog: 'कुत्ता', Cat: 'बिल्ली', Poultry: 'मुर्गी', Horse: 'घोड़ा',
}

// A landscape film's hqdefault is letterboxed; maxres is clean but not every
// upload has one, so fall back to the (small, clean) mqdefault.
function thumb(v: VideoItem) {
  return `https://i.ytimg.com/vi/${v.youtubeId}/${v.vertical ? 'hqdefault' : 'maxresdefault'}.jpg`
}
function onThumbError(e: React.SyntheticEvent<HTMLImageElement>) {
  const img = e.currentTarget
  if (!img.src.includes('mqdefault')) img.src = img.src.replace(/[a-z]+default\.jpg$/, 'mqdefault.jpg')
}

export default function VideosClient({ videos, channelUrl }: { videos: VideoItem[]; channelUrl: string }) {
  const [lang, setLang]           = useState<Lang>('en')
  const [searchText, setSearch]   = useState('')
  const [activeCat, setActiveCat] = useState('all')
  const [open, setOpen]           = useState<VideoItem | null>(null)

  const hi = lang === 'hi'
  const catLabel = (c: string) => hi ? (HI_CATS[c] || HI_EXTRA[c] || c) : c.replace(' / Analgesic', '').replace(' / Antiparasitic', '')

  // The player lives in the address bar, so the phone's back button behaves.
  // A link from another page (?film=<key> from schemes, a product, the folder,
  // WhatsApp) opens straight into the player, and closing it goes BACK to that
  // page — client, 30 Sep: from a scheme to its film and back "came back to
  // video starting page". A film opened from this page's own grid pushes
  // ?film=<key>, so back closes the player instead of leaving the site.
  const [cameFrom, setCameFrom] = useState<'link' | 'grid' | null>(null)
  useEffect(() => {
    const key = new URLSearchParams(window.location.search).get('film')
    const hit = key && videos.find(v => v.key === key)
    if (hit) { setOpen(hit); setCameFrom('link') }
    const sync = () => {
      const k = new URLSearchParams(window.location.search).get('film')
      const v = k ? videos.find(x => x.key === k) || null : null
      setOpen(v)
      if (!v) setCameFrom(null)
    }
    window.addEventListener('popstate', sync)
    return () => window.removeEventListener('popstate', sync)
  }, [videos])

  const play = useCallback((v: VideoItem) => {
    window.history.pushState(window.history.state, '', `/videos?film=${encodeURIComponent(v.key)}`)
    setOpen(v); setCameFrom('grid')
  }, [])

  // One close per open: the × sits inside the backdrop, and a close that ran
  // twice stepped back two pages (schemes → film → × landed on the page
  // BEFORE schemes).
  const closing = useRef(false)
  useEffect(() => { closing.current = false }, [open])
  const close = useCallback(() => {
    if (closing.current) return
    closing.current = true
    // Grid: pop the entry play() pushed. Link: go back to the page that sent
    // us, when it was a page of this site (SiteFooter records it); a film
    // opened cold from WhatsApp has nowhere to go back to, so it stays here.
    let prev = ''
    try { prev = sessionStorage.getItem('madvet:prev') || '' } catch {}
    if (cameFrom === 'grid' || (cameFrom === 'link' && prev && !prev.startsWith('/videos'))) {
      window.history.back()
      return
    }
    window.history.replaceState(window.history.state, '', '/videos')
    setOpen(null); setCameFrom(null)
  }, [cameFrom])

  const cats = useMemo(() => {
    const used = [...new Set(videos.map(v => v.category))].filter(Boolean)
    return [...CAT_ORDER.filter(c => used.includes(c)), ...used.filter(c => !CAT_ORDER.includes(c))]
  }, [videos])

  // One section per category once the range is big enough to fill them;
  // until then nine one-card sections read as empty, so show one grid.
  const grouped = useMemo(() => {
    const shown = videos.filter(v => (activeCat === 'all' || v.category === activeCat) && matches(v, searchText))
    const order = (v: VideoItem) => cats.indexOf(v.category)
    if (shown.length < 12 || activeCat !== 'all') {
      return shown.length ? [{ cat: '', items: [...shown].sort((a, b) => order(a) - order(b)) }] : []
    }
    return cats.map(cat => ({ cat, items: shown.filter(v => v.category === cat) })).filter(g => g.items.length)
  }, [videos, cats, searchText, activeCat])

  // The fan is built for tall cards; the factory's films are Shorts.
  const featured = [...videos.filter(v => v.vertical), ...videos.filter(v => !v.vertical)].slice(0, 3)
  const subscribe = `${channelUrl}?sub_confirmation=1`

  return (
    <>
      <style>{CSS}</style>
      <div className="vp">

        <SiteNav active="videos" hi={hi} />

        {/* ── HERO ── */}
        <header className="vp-hero">
          <div className="vp-hero-in">
            <div className="vp-hero-copy">
              <div className="vp-eyebrow"><span />Madvet Animal Healthcare</div>
              <h1>
                {hi ? <>दवा कैसे काम करती है,<br /><em>डेढ़ मिनट में</em></> : <>See how it works,<br /><em>in a minute and a half</em></>}
              </h1>
              <p>
                {hi ? 'किस बीमारी में काम आती है, शरीर में कैसे काम करती है, और कब देनी है — साफ़ हिंदी में, काउंटर पर दिखाने या WhatsApp पर भेजने के लिए।'
                    : 'What it treats, how it works in the animal and when to reach for it — in plain Hindi, to play at the counter or send on WhatsApp.'}
              </p>
              <div className="vp-stats">
                <div><b>{videos.length}</b><span lang={hi ? 'hi' : 'en'}>{hi ? 'फ़िल्में' : 'Films'}</span></div>
                <div><b>{cats.length}</b><span lang={hi ? 'hi' : 'en'}>{hi ? 'श्रेणियाँ' : 'Categories'}</span></div>
              </div>
              <div className="vp-cta">
                <a className="vp-sub" href={subscribe} target="_blank" rel="noopener">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8zM9.6 15.6V8.4l6.2 3.6-6.2 3.6z"/></svg>
                  {hi ? 'सब्सक्राइब करें' : 'Subscribe'}
                </a>
                <a className="vp-ghost" href="#films">{hi ? 'सभी फ़िल्में देखें' : 'Browse all films'} ↓</a>
              </div>
              <div style={{ marginTop: 14 }}><FolderButtons hi={hi} /></div>
            </div>

            {featured.length > 0 && (
              <div className="vp-fan" aria-hidden={false}>
                {featured.map((v, i) => (
                  <button key={v.key} className={`vp-fan-card f${i} ${v.vertical ? 'tall' : 'wide'}`} onClick={() => play(v)} aria-label={`${hi ? 'चलाएँ' : 'Play'}: ${v.name}`}>
                    <Thumb v={v} />
                    <span className="vp-fan-name">{v.name}</span>
                    <PlayDot />
                  </button>
                ))}
              </div>
            )}
          </div>
        </header>

        {/* ── CONTROLS ── */}
        <div className="vp-bar">
          <div className="vp-bar-in">
            <LangToggle lang={lang} setLang={setLang} />
            <label className="vp-search">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
              <input type="text" value={searchText} onChange={e => setSearch(e.target.value)} autoComplete="off"
                placeholder={hi ? 'दवा या बीमारी खोजें — जैसे थनैला, कीड़े, बुखार…' : 'Search a product or disease — mastitis, worms, fever…'} />
            </label>
            <div className="vp-pills">
              <Pill label={hi ? 'सब' : 'All'} active={activeCat === 'all'} onClick={() => setActiveCat('all')} />
              {cats.map(c => <Pill key={c} label={catLabel(c)} active={activeCat === c} onClick={() => setActiveCat(c)} />)}
            </div>
          </div>
        </div>

        {/* ── FILMS ── */}
        <main id="films" className="vp-main">
          {grouped.length === 0 && (
            <div className="vp-empty">
              {videos.length === 0 ? (hi ? 'फ़िल्में जल्द आ रही हैं।' : 'Films are coming soon.') : (hi ? 'इस खोज से कोई फ़िल्म नहीं मिली।' : 'No film matches that search.')}
            </div>
          )}
          {grouped.map(({ cat, items }) => (
            <section key={cat || 'all'} className="vp-sec">
              {cat && <h2>
                <span className="vp-dot" style={{ background: getColor(cat) }} />
                {catLabel(cat)}
                <small>{hi ? cat.replace(' / Analgesic', '').replace(' / Antiparasitic', '') : HI_CATS[cat] || ''}</small>
                <i>{items.length}</i>
              </h2>}
              {/* Shorts and landscape films in their own grids: mixed, the wide
                  cards strand an empty column beside them. */}
              {[true, false].map(tall => items.some(v => v.vertical === tall) && (
                <div key={String(tall)} className={`vp-grid${tall ? '' : ' wide'}`}>
                  {items.filter(v => v.vertical === tall).map(v =>
                    <Card key={v.key} v={v} hi={hi} catLabel={catLabel} onPlay={() => play(v)} />)}
                </div>
              ))}
            </section>
          ))}
        </main>

        {/* ── SUBSCRIBE BAND ── */}
        <section className="vp-band">
          <div>
            <h3>{hi ? 'नई फ़िल्में लगातार आ रही हैं' : 'New films are on the way'}</h3>
            <p>{hi ? 'डॉक्टर, रिटेलर और स्टॉकिस्ट के लिए — हर Madvet प्रोडक्ट की पूरी जानकारी, सबसे पहले।' : 'For vets, retailers and stockists — every Madvet product explained, first.'}</p>
          </div>
          <a className="vp-sub" href={subscribe} target="_blank" rel="noopener">{hi ? 'YouTube पर सब्सक्राइब करें' : 'Subscribe on YouTube'}</a>
        </section>

        {open && <Player v={open} hi={hi} catLabel={catLabel} channelUrl={subscribe} onClose={close} />}
      </div>
    </>
  )
}

function Card({ v, hi, catLabel, onPlay }: { v: VideoItem; hi: boolean; catLabel: (c: string) => string; onPlay: () => void }) {
  const species = v.species.split(/[,/]/).map(x => x.trim()).filter(Boolean).slice(0, 3).map(x => hi ? (HI_SP[x] || x) : x)
  return (
    <div className={`vp-card ${v.vertical ? 'tall' : 'wide'}`}>
      <button className="vp-card-hit" onClick={onPlay} aria-label={`${hi ? 'चलाएँ' : 'Play'}: ${v.name}`}>
        <Thumb v={v} />
        {v.category && <span className="vp-chip" style={{ background: getColor(v.category) }}>{catLabel(v.category)}</span>}
        <PlayDot />
        <span className="vp-card-txt">
          <b>{v.name}</b>
          {species.length > 0 && <em>{species.join(' · ')}</em>}
        </span>
      </button>
      <div className="vp-card-acts">
        <ShareWA v={v} hi={hi} />
        {v.download && (
          <a className="vp-dl" href={v.download} download aria-label={`${hi ? 'डाउनलोड करें' : 'Download'}: ${v.name}`}
            title={`${hi ? 'डाउनलोड करें' : 'Download'}${v.downloadMB ? ` · ${v.downloadMB} MB` : ''}`}>
            <DlIcon />
          </a>
        )}
      </div>
    </div>
  )
}

function shareProps(v: VideoItem) {
  return {
    name: v.name, src: v.src,
    text: shareCaption({ name: v.name, productId: v.productId, youtubeId: v.youtubeId }),
    waUrl: whatsappShareUrl({ name: v.name, youtubeId: v.youtubeId, filmKey: v.key, productId: v.productId }),
  }
}

function ShareWA({ v, hi }: { v: VideoItem; hi: boolean }) {
  return (
    <span title={hi ? 'WhatsApp पर वीडियो भेजें' : 'Send the video on WhatsApp'} aria-label={`${hi ? 'WhatsApp पर भेजें' : 'Share on WhatsApp'}: ${v.name}`}>
      <ShareVideo {...shareProps(v)} className="vp-wa" loadingLabel={<span className="vp-spin" />} readyLabel={<SendIcon />}>
        <WaIcon />
      </ShareVideo>
    </span>
  )
}

function SendIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M3 20.5 21 12 3 3.5v6.9l12 1.6-12 1.6z" /></svg>
}

function DlIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 4v11M7 10l5 5 5-5M5 20h14" />
    </svg>
  )
}

function WaIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.5 14.4c-.3-.1-1.8-.9-2-1-.3-.1-.5-.1-.7.1-.2.3-.8 1-.9 1.2-.2.2-.3.2-.6.1-.3-.1-1.3-.5-2.4-1.5-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.6l.4-.5c.2-.2.2-.3.3-.5.1-.2 0-.4 0-.5l-.9-2.2c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.1.2 2.1 3.2 5.1 4.5.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.8-.7 2-1.4.2-.7.2-1.3.2-1.4-.1-.1-.3-.2-.6-.3zM12 21.8c-1.8 0-3.5-.5-5-1.4l-.4-.2-3.7 1 1-3.6-.2-.4A9.8 9.8 0 0 1 12 2.2a9.8 9.8 0 0 1 0 19.6zM12 .2a11.8 11.8 0 0 0-10.2 17.7L.1 24l6.3-1.6A11.8 11.8 0 1 0 12 .2z"/>
    </svg>
  )
}

function Thumb({ v }: { v: VideoItem }) {
  if (v.poster && !v.youtubeId) {
    return <span className="vp-thumb tall"><img className="fg" src={v.poster} alt="" loading="lazy" /></span>
  }
  return (
    <span className={`vp-thumb ${v.vertical ? 'tall' : 'wide'}`}>
      {!v.vertical && <img className="bg" src={`https://i.ytimg.com/vi/${v.youtubeId}/mqdefault.jpg`} alt="" loading="lazy" />}
      <img className="fg" src={thumb(v)} alt="" loading="lazy" onError={onThumbError} />
    </span>
  )
}

function PlayDot() {
  return <span className="vp-play"><svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg></span>
}

function Player({ v, hi, catLabel, channelUrl, onClose }: {
  v: VideoItem; hi: boolean; catLabel: (c: string) => string; channelUrl: string; onClose: () => void
}) {
  const esc = useCallback((e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }, [onClose])
  useEffect(() => {
    document.addEventListener('keydown', esc)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', esc); document.body.style.overflow = prev }
  }, [esc])

  const indication = v.indication.split(/[,;]/).map(s => s.trim()).filter(Boolean).slice(0, 6)

  return (
    <div className="vp-modal" role="dialog" aria-modal="true" aria-label={v.name} onClick={onClose}>
      <button className="vp-x" onClick={e => { e.stopPropagation(); onClose() }} aria-label={hi ? 'बंद करें' : 'Close'}>×</button>
      <div className={`vp-modal-in ${v.vertical ? 'tall' : 'wide'}`} onClick={e => e.stopPropagation()}>
        <div className="vp-frame">
          {v.youtubeId ? <iframe src={`https://www.youtube.com/embed/${v.youtubeId}?autoplay=1&rel=0&playsinline=1&modestbranding=1`}
            title={v.name} allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen />
            : <video src={v.src} poster={v.poster} controls autoPlay playsInline preload="metadata" />}
        </div>
        <aside className="vp-info">
          <div className="vp-info-top">
            {v.image && <img src={v.image} alt="" />}
            <div>
              <span className="vp-cat" lang={hi ? 'hi' : 'en'} style={{ color: getColor(v.category) }}>{catLabel(v.category)}</span>
              <h3>{v.name}</h3>
            </div>
          </div>
          {v.title && v.title.toLowerCase() !== v.name.toLowerCase() && <p className="vp-yt">{v.title}</p>}
          {indication.length > 0 && (
            <>
              <div className="vp-lbl" lang={hi ? 'hi' : 'en'}>{hi ? 'किसमें काम आती है' : 'Used for'}</div>
              <div className="vp-tags">{indication.map(t => <span key={t}>{t}</span>)}</div>
            </>
          )}
          <div className="vp-actions">
            {v.productId > 0 && <Link className="vp-btn gold" href={`/products/${v.productId}`}>{hi ? 'प्रोडक्ट की पूरी जानकारी' : 'Full product details'} →</Link>}
            {v.download && (
              <a className="vp-btn dl" href={v.download} download>
                <DlIcon size={17} />&nbsp;{hi ? 'डाउनलोड करें' : 'Download'}{v.downloadMB ? ` · ${v.downloadMB} MB` : ''}
              </a>
            )}
            <ShareVideo {...shareProps(v)} className="vp-btn wa"
              loadingLabel={<>{hi ? 'वीडियो तैयार हो रहा है…' : 'Preparing video…'}</>}
              readyLabel={<><SendIcon />&nbsp;{hi ? 'भेजने के लिए फिर दबाएँ' : 'Tap again to send'}</>}>
              <WaIcon size={17} />&nbsp;{hi ? 'WhatsApp पर वीडियो भेजें' : 'Send video on WhatsApp'}
            </ShareVideo>
            <a className="vp-btn yt" href={channelUrl} target="_blank" rel="noopener">{hi ? 'सब्सक्राइब करें' : 'Subscribe'}</a>
          </div>
        </aside>
      </div>
    </div>
  )
}

const CSS = `
*, *::before, *::after { box-sizing: border-box; }
html, body { margin: 0; padding: 0; overflow-x: clip; }  /* hidden would make body a scroll box and unstick the bar */
:root { --forest:#1a3a2a; --forest-mid:#264d39; --night:#0f2318; --cream:#f5f0e8; --cream-dark:#ede6d6; --gold:#c8a96e; --gold-light:#e8d5a8; --ink:#1c2b22; }
.vp { font-family:'DM Sans','Noto Sans Devanagari',sans-serif; background:var(--cream); color:var(--ink); min-height:100vh; }
.vp button { font:inherit; }

.vp-nav { background:var(--night); height:56px; padding:0 48px; display:flex; align-items:center; justify-content:space-between; border-bottom:1px solid rgba(200,169,110,.15); }
.vp-brand { display:flex; align-items:center; gap:10px; color:var(--cream); text-decoration:none; font-family:'DM Serif Display',serif; font-size:19px; }
.vp-brand img { width:32px; height:32px; border-radius:7px; object-fit:cover; }
.vp-navlinks { display:flex; gap:4px; }
.vp-navlinks a, .vp-navlinks span { padding:7px 14px; border-radius:7px; font-size:13px; font-weight:500; color:rgba(245,240,232,.6); text-decoration:none; }
.vp-navlinks a:hover { color:var(--cream); }
.vp-navlinks .on { color:var(--gold-light); background:rgba(200,169,110,.12); }

.vp-hero { position:relative; overflow:hidden; background:var(--forest); }
.vp-hero::before { content:''; position:absolute; inset:0; background:
  radial-gradient(ellipse 60% 70% at 78% 45%, rgba(200,169,110,.20), transparent 70%),
  radial-gradient(ellipse 45% 80% at 5% 10%, rgba(61,122,87,.45), transparent 60%); }
.vp-hero::after { content:''; position:absolute; left:0; right:0; bottom:0; height:1px; background:linear-gradient(90deg,transparent,rgba(200,169,110,.5),transparent); }
.vp-hero-in { position:relative; max-width:1320px; margin:0 auto; padding:72px 48px 80px; display:grid; grid-template-columns:1.1fr 1fr; gap:48px; align-items:center; }
.vp-eyebrow { display:flex; align-items:center; gap:12px; font-size:11px; font-weight:700; letter-spacing:3px; text-transform:uppercase; color:var(--gold); margin-bottom:22px; }
.vp-eyebrow span { width:30px; height:1px; background:var(--gold); }
.vp-hero h1 { margin:0; font-family:'DM Serif Display','Noto Sans Devanagari',serif; font-weight:400; font-size:clamp(40px,5.4vw,72px); line-height:1.08; letter-spacing:-.5px; color:var(--cream); }
.vp-hero h1 em { color:var(--gold-light); }
.vp-hero p { margin:22px 0 0; max-width:480px; font-size:16px; line-height:1.75; color:rgba(245,240,232,.66); }
.vp-stats { display:flex; gap:40px; margin-top:34px; }
.vp-stats b { display:block; font-family:'DM Serif Display',serif; font-weight:400; font-size:42px; line-height:1; color:var(--gold-light); }
.vp-stats span { display:block; margin-top:6px; font-size:11px; letter-spacing:2px; text-transform:uppercase; color:rgba(245,240,232,.5); }
.vp-stats span:lang(hi), .vp-lbl:lang(hi), .vp-cat:lang(hi) { letter-spacing:0; font-size:13px; }
.vp-cta { display:flex; flex-wrap:wrap; gap:12px; margin-top:34px; }
.vp-sub { display:inline-flex; align-items:center; gap:9px; padding:13px 22px; border-radius:10px; background:#d4302b; color:#fff; font-weight:700; font-size:14px; text-decoration:none; box-shadow:0 8px 24px rgba(212,48,43,.3); transition:transform .18s, box-shadow .18s; }
.vp-sub:hover { transform:translateY(-2px); box-shadow:0 12px 30px rgba(212,48,43,.4); }
.vp-ghost { display:inline-flex; align-items:center; padding:13px 20px; border-radius:10px; border:1px solid rgba(200,169,110,.4); color:var(--gold-light); font-weight:600; font-size:14px; text-decoration:none; transition:background .18s; }
.vp-ghost:hover { background:rgba(200,169,110,.1); }

.vp-fan { position:relative; height:440px; }
.vp-fan-card { position:absolute; top:50%; left:50%; width:218px; aspect-ratio:9/16; padding:0; border:0; border-radius:20px; overflow:hidden; cursor:pointer; background:var(--night);
  box-shadow:0 30px 60px rgba(0,0,0,.45), 0 0 0 1px rgba(232,213,168,.18); transition:transform .35s cubic-bezier(.2,.8,.2,1), box-shadow .35s; }
.vp-fan-card.f0 { transform:translate(-50%,-50%); z-index:3; }
.vp-fan-card.f1 { transform:translate(-118%,-46%) rotate(-8deg) scale(.88); z-index:2; filter:brightness(.8); }
.vp-fan-card.f2 { transform:translate(18%,-46%) rotate(8deg) scale(.88); z-index:1; filter:brightness(.8); }
.vp-fan-card.wide { width:360px; aspect-ratio:16/10; }
.vp-fan-card.wide .fg { object-fit:cover; }
.vp-fan-card.wide.f1 { transform:translate(-92%,-22%) rotate(-6deg) scale(.82); }
.vp-fan-card.wide.f2 { transform:translate(-8%,-78%) rotate(5deg) scale(.82); }
.vp-fan-card.wide.f1:hover { transform:translate(-92%,-26%) rotate(-4deg) scale(.86); }
.vp-fan-card.wide.f2:hover { transform:translate(-8%,-82%) rotate(3deg) scale(.86); }
.vp-fan-card:hover { z-index:4; filter:none; box-shadow:0 36px 70px rgba(0,0,0,.55), 0 0 0 2px var(--gold); }
.vp-fan-card.f0:hover { transform:translate(-50%,-52%) scale(1.03); }
.vp-fan-card.f1:hover { transform:translate(-118%,-50%) rotate(-6deg) scale(.92); }
.vp-fan-card.f2:hover { transform:translate(18%,-50%) rotate(6deg) scale(.92); }
.vp-fan-name { position:absolute; left:0; right:0; bottom:0; padding:44px 16px 16px; text-align:left; color:#fff; font-weight:700; font-size:15px; background:linear-gradient(to top, rgba(10,24,16,.92), transparent); }

.vp-thumb { position:absolute; inset:0; display:block; overflow:hidden; background:var(--night); }
.vp-thumb img { position:absolute; inset:0; width:100%; height:100%; transition:transform .5s cubic-bezier(.2,.8,.2,1); }
.vp-thumb.tall .fg { object-fit:cover; transform:scale(1.02); }
.vp-thumb.wide .bg { object-fit:cover; filter:blur(18px) brightness(.55) saturate(1.2); transform:scale(1.3); }
.vp-thumb.wide .fg { object-fit:contain; }

.vp-play { position:absolute; top:50%; left:50%; width:58px; height:58px; margin:-29px 0 0 -29px; border-radius:50%; display:flex; align-items:center; justify-content:center;
  color:var(--forest); background:rgba(232,213,168,.92); box-shadow:0 8px 24px rgba(0,0,0,.35); backdrop-filter:blur(4px); transition:transform .25s, background .25s; }
.vp-play svg { margin-left:3px; }

.vp-bar { position:sticky; top:0; z-index:50; background:rgba(38,77,57,.94); backdrop-filter:blur(10px); border-bottom:1px solid rgba(200,169,110,.2); box-shadow:0 4px 24px rgba(0,0,0,.12); }
.vp-bar-in { max-width:1320px; margin:0 auto; padding:14px 48px; display:flex; align-items:center; gap:14px; flex-wrap:wrap; }
.vp-search { position:relative; flex:1; min-width:240px; color:var(--gold); }
.vp-search svg { position:absolute; left:14px; top:50%; transform:translateY(-50%); opacity:.75; }
.vp-search input { width:100%; padding:11px 16px 11px 42px; border-radius:9px; border:1px solid rgba(200,169,110,.28); background:rgba(255,255,255,.08); color:var(--cream); font:inherit; font-size:14px; outline:none; transition:border-color .2s, background .2s; }
.vp-search input::placeholder { color:rgba(245,240,232,.45); }
.vp-search input:focus { border-color:var(--gold); background:rgba(255,255,255,.12); }
.vp-pills { display:flex; gap:8px; flex-wrap:wrap; }

.vp-main { max-width:1320px; margin:0 auto; padding:48px 48px 24px; }
.vp-sec { margin-bottom:56px; }
.vp-sec h2 { display:flex; align-items:baseline; gap:12px; flex-wrap:wrap; margin:0 0 22px; padding-bottom:14px; border-bottom:1px solid rgba(28,43,34,.1);
  font-family:'DM Serif Display','Noto Sans Devanagari',serif; font-weight:400; font-size:30px; line-height:1.2; }
.vp-dot { width:11px; height:11px; border-radius:3px; align-self:center; }
.vp-sec h2 small { font-family:'DM Sans','Noto Sans Devanagari',sans-serif; font-size:14px; color:#7d8a82; }
.vp-sec h2 i { margin-left:auto; font-style:normal; font-family:'DM Sans',sans-serif; font-size:12px; font-weight:700; color:var(--forest); background:var(--cream-dark); padding:4px 10px; border-radius:20px; }

.vp-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(210px,1fr)); gap:22px; }
.vp-card-hit { position:absolute; inset:0; width:100%; height:100%; padding:0; border:0; margin:0; cursor:pointer; text-align:left; background:none; color:inherit; }
.vp-card-hit:focus-visible { outline:3px solid var(--gold); outline-offset:-3px; border-radius:inherit; }
.vp-card-acts { position:absolute; top:10px; right:10px; z-index:2; display:flex; flex-direction:column; gap:8px; }
.vp-dl { width:40px; height:40px; border-radius:50%; display:flex; align-items:center; justify-content:center; background:rgba(245,240,232,.94); color:var(--forest);
  box-shadow:0 4px 14px rgba(0,0,0,.3); transition:transform .18s; }
.vp-dl:hover, .vp-dl:focus-visible { transform:scale(1.1); outline:none; }
.vp-btn.dl { background:var(--cream-dark); color:var(--forest); border:1px solid rgba(26,58,42,.15); }
.vp-wa { width:40px; height:40px; border-radius:50%; display:flex; align-items:center; justify-content:center;
  background:#25d366; color:#fff; box-shadow:0 4px 14px rgba(0,0,0,.3); transition:transform .18s, box-shadow .18s; }
.vp-spin { width:16px; height:16px; border-radius:50%; border:2px solid rgba(255,255,255,.4); border-top-color:#fff; animation:vpSpin .8s linear infinite; }
@keyframes vpSpin { to { transform:rotate(360deg) } }
.vp-wa:hover, .vp-wa:focus-visible { transform:scale(1.1); box-shadow:0 6px 20px rgba(37,211,102,.5); outline:none; }
.vp-card { position:relative; aspect-ratio:9/16; border-radius:18px; overflow:hidden; background:var(--night);
  box-shadow:0 2px 6px rgba(15,35,24,.08), 0 12px 28px rgba(15,35,24,.1); transition:transform .3s cubic-bezier(.2,.8,.2,1), box-shadow .3s; }
.vp-grid.wide { grid-template-columns:repeat(auto-fill,minmax(340px,1fr)); }
.vp-grid + .vp-grid { margin-top:22px; }
.vp-card.wide { aspect-ratio:16/10; }
.vp-card.wide .vp-thumb.wide .fg { object-fit:cover; }
.vp-card::after { content:''; position:absolute; inset:0; border-radius:18px; box-shadow:inset 0 0 0 1px rgba(255,255,255,.08); pointer-events:none; }
.vp-card:hover, .vp-card:focus-within { transform:translateY(-6px); box-shadow:0 4px 10px rgba(15,35,24,.1), 0 24px 48px rgba(15,35,24,.22); outline:none; }
.vp-card:hover .fg, .vp-fan-card:hover .fg { transform:scale(1.06); }
.vp-card:hover .vp-play { transform:scale(1.12); background:var(--gold-light); }
.vp-chip { position:absolute; top:12px; left:12px; max-width:calc(100% - 72px); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; padding:4px 9px; border-radius:6px; color:#fff; font-size:10px; font-weight:700; letter-spacing:1px; text-transform:uppercase; box-shadow:0 2px 8px rgba(0,0,0,.25); }
.vp-card-txt { position:absolute; left:0; right:0; bottom:0; padding:56px 16px 16px; background:linear-gradient(to top, rgba(10,24,16,.95) 10%, rgba(10,24,16,.6) 55%, transparent); color:#fff; }
.vp-card-txt b { display:block; font-size:16px; font-weight:700; line-height:1.3; }
.vp-card-txt em { display:block; margin-top:5px; font-style:normal; font-size:12px; color:var(--gold-light); opacity:.9; }

.vp-empty { text-align:center; padding:80px 20px; color:#7d8a82; font-size:16px; }

.vp-band { max-width:1224px; margin:8px auto 72px; padding:36px 44px; border-radius:22px; display:flex; align-items:center; justify-content:space-between; gap:24px; flex-wrap:wrap;
  background:radial-gradient(ellipse 70% 120% at 100% 0%, rgba(200,169,110,.22), transparent 60%), var(--forest); color:var(--cream); box-shadow:0 20px 50px rgba(15,35,24,.25); }
.vp-band h3 { margin:0; font-family:'DM Serif Display','Noto Sans Devanagari',serif; font-weight:400; font-size:30px; }
.vp-band p { margin:8px 0 0; color:rgba(245,240,232,.65); max-width:560px; line-height:1.6; }

.vp-modal { position:fixed; inset:0; z-index:200; display:flex; align-items:center; justify-content:center; padding:24px; background:rgba(8,18,12,.82); backdrop-filter:blur(8px); animation:vpFade .2s ease; }
.vp-modal-in { position:relative; display:flex; background:var(--cream); border-radius:22px; overflow:hidden; box-shadow:0 40px 100px rgba(0,0,0,.5); animation:vpRise .3s cubic-bezier(.2,.8,.2,1); max-height:calc(100vh - 48px); }
.vp-modal-in.tall .vp-frame { height:min(82vh, 760px); aspect-ratio:9/16; }
.vp-modal-in.wide { flex-direction:column; width:min(960px, 100%); }
.vp-modal-in.wide .vp-frame { width:100%; aspect-ratio:16/9; }
.vp-frame { position:relative; background:#000; flex:none; }
.vp-frame video { position:absolute; inset:0; width:100%; height:100%; background:#000; object-fit:contain; }
.vp-frame iframe { position:absolute; inset:0; width:100%; height:100%; border:0; }
.vp-info { width:340px; padding:28px 26px; overflow-y:auto; display:flex; flex-direction:column; gap:14px; }
.vp-modal-in.wide .vp-info { width:auto; padding:22px 26px 24px; }
.vp-info-top { display:flex; gap:14px; align-items:center; }
.vp-info-top img { width:64px; height:64px; object-fit:contain; background:#fff; border-radius:12px; padding:6px; box-shadow:0 2px 8px rgba(0,0,0,.08); }
.vp-cat { font-size:11px; font-weight:700; letter-spacing:1.5px; text-transform:uppercase; }
.vp-info h3 { margin:4px 0 0; font-family:'DM Serif Display','Noto Sans Devanagari',serif; font-weight:400; font-size:26px; line-height:1.15; }
.vp-yt { margin:0; color:#5e6b63; font-size:14px; line-height:1.5; }
.vp-lbl { font-size:11px; font-weight:700; letter-spacing:1.5px; text-transform:uppercase; color:#8a968e; }
.vp-tags { display:flex; flex-wrap:wrap; gap:6px; }
.vp-tags span { padding:5px 10px; border-radius:20px; background:var(--cream-dark); font-size:12.5px; }
.vp-actions { display:flex; flex-direction:column; gap:9px; margin-top:auto; padding-top:8px; }
.vp-modal-in.wide .vp-actions { flex-direction:row; flex-wrap:wrap; }
.vp-btn { display:flex; align-items:center; justify-content:center; padding:12px 16px; border-radius:10px; font-weight:700; font-size:14px; text-decoration:none; transition:filter .15s, transform .15s; }
.vp-btn:hover { filter:brightness(1.08); transform:translateY(-1px); }
.vp-btn.gold { background:var(--forest); color:var(--gold-light); }
.vp-btn.wa { background:#25a244; color:#fff; }
.vp-btn.yt { background:#d4302b; color:#fff; }
.vp-x { position:fixed; top:18px; right:18px; z-index:201; width:44px; height:44px; border:1px solid rgba(232,213,168,.35); border-radius:50%; background:rgba(15,35,24,.8); color:#fff; font-size:24px; line-height:1; cursor:pointer; }
.vp-x:hover { background:var(--forest); }
@keyframes vpFade { from { opacity:0 } }
@keyframes vpRise { from { opacity:0; transform:translateY(24px) scale(.98) } }

@media (max-width: 960px) {
  .vp-hero-in { grid-template-columns:1fr; padding:48px 24px 56px; gap:24px; }
  .vp-fan { height:360px; }
  .vp-fan-card { width:180px; }
  .vp-fan-card.wide { width:300px; }
  .vp-modal-in.tall { flex-direction:column; width:min(420px,100%); }
  .vp-modal-in.tall .vp-frame { height:auto; width:100%; max-height:62vh; }
  .vp-info { width:auto !important; }
}
@media (max-width: 640px) {
  .vp-nav { padding:0 16px; }
  .vp-hero-in { padding:36px 16px 44px; }
  .vp-hero p { font-size:15px; }
  .vp-stats b { font-size:34px; }
  .vp-fan { height:300px; }
  .vp-fan-card { width:150px; border-radius:16px; }
  .vp-fan-card.wide { width:240px; }
  .vp-grid.wide { grid-template-columns:1fr; }
  .vp-fan-name { font-size:13px; padding:32px 12px 12px; }
  .vp-bar-in { padding:10px 16px; gap:8px; }
  .vp-search { min-width:0; flex:1 1 100%; order:2; }
  .vp-pills { order:3; flex-wrap:nowrap; overflow-x:auto; scrollbar-width:none; width:100%; }
  .vp-pills::-webkit-scrollbar { display:none; }
  .vp-main { padding:28px 16px 8px; }
  .vp-sec { margin-bottom:40px; }
  .vp-sec h2 { font-size:23px; }
  .vp-grid { grid-template-columns:1fr 1fr; gap:12px; }
  .vp-card, .vp-card::after { border-radius:14px; }
  .vp-card-txt { padding:40px 12px 12px; }
  .vp-card-txt b { font-size:14px; }
  .vp-card-acts { top:8px; right:8px; gap:6px; }
  .vp-wa, .vp-dl { width:36px; height:36px; }
  .vp-play { width:46px; height:46px; margin:-23px 0 0 -23px; }
  .vp-band { margin:0 16px 48px; padding:28px 22px; }
  .vp-band h3 { font-size:24px; }
  .vp-modal { padding:0; align-items:flex-end; }
  .vp-modal-in { border-radius:22px 22px 0 0; width:100% !important; max-height:calc(100vh - 76px); overflow-y:auto; }
  .vp-x { top:16px; right:16px; }
  .vp-modal-in.wide .vp-actions { flex-direction:column; }
}
@media (prefers-reduced-motion: reduce) { .vp * { transition:none !important; animation:none !important; } }
`
