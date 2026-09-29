'use client'

// One product (29 Sep 2026 redesign). This is the page a vet or retailer
// lands on from a shared link, so it answers, in order: what is it and what
// does it treat (first screen), can I trust it (composition, species, the
// film), and how do I get it (order on WhatsApp, this month's scheme). Every
// piece of text comes from lib/productCopy so it matches the list, the card
// and the share message.
import { useState } from 'react'
import Link from 'next/link'
import type { Product } from '../types'
import SiteNav from '@/components/SiteNav'
import ShareVideo from '@/components/ShareVideo'
import { COMPANY } from '@/lib/company'
import { SITE } from '@/lib/share'
import { cleanIndications, compList, hindiIndications, packLabel, speciesList, SP_ICON, purposeLine } from '@/lib/productCopy'
import { productShareText, productWaUrl, productCardUrl } from '@/lib/productShare'
import { getColor, HI_CATS } from '../ProductsClient'

export interface ProductFilm {
  key:        string
  youtubeId:  string
  vertical:   boolean
  mp4:        string
  poster:     string
  download:   string
  downloadMB: number
}
export interface RelatedProduct { id: number; name: string; category: string; packaging: string; formulation: string; img: string; cut: boolean }

type Lang = 'en' | 'hi'
const HI_SP: Record<string, string> = { Cattle: 'गाय', Buffalo: 'भैंस', Sheep: 'भेड़', Goat: 'बकरी', Dog: 'कुत्ता', Cat: 'बिल्ली', Poultry: 'मुर्गी', Horse: 'घोड़ा', Calf: 'बछड़ा', Camel: 'ऊँट', Pig: 'सूअर' }

export default function ProductDetailClient({ product: p, film, folderPage = 0, pack = '', scheme = '', related = [] }: {
  product: Product; film?: ProductFilm | null; folderPage?: number; pack?: string; scheme?: string; related?: RelatedProduct[]
}) {
  const [lang, setLang] = useState<Lang>('en')
  const [playing, setPlaying] = useState(false)
  const hi = lang === 'hi'
  const c = getColor(p.category)

  const uses = cleanIndications(p.indication, 12, p.id)
  const usesHi = hindiIndications(p.indication, 12)
  const comp = compList(p.salt)
  const sps = speciesList(p.species)
  const benefits = (hi && p.usp_benefits_hi ? p.usp_benefits_hi : p.benefits).split(/\n|•|;|(?<=\.)\s+(?=[A-Z])/).map(s => s.replace(/^[-–•\s]+/, '').trim()).filter(s => s.length > 8).slice(0, 6)
  const about = hi && p.description_hi ? p.description_hi : p.description
  const linkedYt = p.video_url?.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([A-Za-z0-9_-]{11})/)?.[1] || ''
  const ytId = film ? film.youtubeId : linkedYt
  const hasFilm = !!(film || ytId)
  const shareText = productShareText(p, scheme, hasFilm)
  const orderText = `नमस्ते Madvet, मुझे *${p.name}* (${packLabel(p)}) चाहिए / Hello Madvet, I would like to order *${p.name}* (${packLabel(p)}).\n${SITE}/products/${p.id}`
  const img = pack || p.image_url

  const T = (en: string, h: string) => (hi ? h : en)

  return (
    <>
      <style>{CSS}</style>
      <div className="pd" style={{ '--c': c } as React.CSSProperties}>
        <SiteNav active="products" hi={hi} />

        <header className="pd-hero">
          <div className="pd-hero-in">
            <div className="pd-crumbs">
              <Link href="/products">{T('Products', 'उत्पाद')}</Link><span>›</span>
              <Link href={`/products?cat=${encodeURIComponent(p.category)}`}>{hi ? HI_CATS[p.category] || p.category : p.category}</Link>
              <div className="pd-lang">{(['en', 'hi'] as Lang[]).map(l => <button key={l} className={lang === l ? 'on' : ''} onClick={() => setLang(l)}>{l === 'en' ? 'EN' : 'हिं'}</button>)}</div>
            </div>
            <div className="pd-top">
              <div className={`pd-stage ${scheme ? 'has-offer' : ''}`}>
                <div className="pd-glow" />
                {img ? <img src={img} alt={p.name} className={pack ? 'cut' : 'photo'} /> : <span className="pd-initial">{p.name.slice(0, 1)}</span>}
                {scheme && <div className="pd-offer"><b>🎁 {T('Scheme this month', 'इस महीने की स्कीम')}</b>{scheme}</div>}
              </div>
              <div className="pd-info">
                <div className="pd-cat"><i />{hi ? HI_CATS[p.category] || p.category : p.category}</div>
                <h1>{p.name}</h1>
                <div className="pd-meta">
                  <span>{packLabel(p)}</span>
                  {p.formulation && <span>{p.formulation}</span>}
                </div>
                <p className="pd-lead">{purposeLine(p, 180)}</p>
                {sps.length > 0 && (
                  <div className="pd-sp">{sps.map(s => <span key={s}>{SP_ICON[s]} {hi ? HI_SP[s] || s : s}</span>)}</div>
                )}
                <div className="pd-cta">
                  {hasFilm && <button className="pd-btn film" onClick={() => setPlaying(true)}>▶ {T('Watch the 1-minute film', '1 मिनट की फ़िल्म देखें')}</button>}
                  <ShareVideo name={p.name} src={productCardUrl(p.id)} mime="image/png" ext="png" text={shareText} waUrl={productWaUrl(shareText)} className="pd-btn wa"
                    loadingLabel={<>{T('Preparing card…', 'कार्ड तैयार हो रहा है…')}</>} readyLabel={<>{T('Tap again to send', 'भेजने के लिए फिर दबाएँ')}</>}>
                    {T('Send to a customer on WhatsApp', 'WhatsApp पर ग्राहक को भेजें')}
                  </ShareVideo>
                  <a className="pd-btn order" href={`https://wa.me/${COMPANY.phoneRaw}?text=${encodeURIComponent(orderText)}`} target="_blank" rel="noopener">{T('Order / enquire', 'ऑर्डर / पूछताछ')}</a>
                </div>
                <div className="pd-links">
                  {folderPage > 0 && <Link href={`/folder?p=${folderPage}`}>📖 {T('Product folder', 'प्रोडक्ट फ़ोल्डर')} · {T('page', 'पेज')} {folderPage}</Link>}
                  {film && <a href={film.download} download>⬇ {T('Download film', 'फ़िल्म डाउनलोड')} · {film.downloadMB} MB</a>}
                  <a href={`tel:+${COMPANY.phoneRaw}`}>📞 {COMPANY.phone}</a>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="pd-main">
          <div className="pd-grid">
            <div className="pd-col">
              {(uses.length > 0 || usesHi.length > 0) && (
                <section className="pd-card">
                  <h2>{T('What it treats', 'किसमें काम आता है')}</h2>
                  <div className="pd-chips">{(hi && usesHi.length ? usesHi : uses).map(u => <span key={u}>{u}</span>)}</div>
                </section>
              )}
              {benefits.length > 0 && (
                <section className="pd-card">
                  <h2>{T('Why it works', 'क्यों असरदार है')}</h2>
                  <ul className="pd-ticks">{benefits.map(b => <li key={b}>{b}</li>)}</ul>
                </section>
              )}
              {about && (
                <section className="pd-card">
                  <h2>{T('About this product', 'इस उत्पाद के बारे में')}</h2>
                  <p className="pd-about">{about}</p>
                </section>
              )}
            </div>
            <div className="pd-col">
              {comp.length > 0 && (
                <section className="pd-card">
                  <h2>{T('Composition', 'संरचना')}</h2>
                  <ul className="pd-comp">{comp.map(x => { const m = x.match(/^(.*?)\s*((?:\d[\d.,]*\s*(?:mg|mcg|g|gm|iu|i\.u\.|%|ml|m\.s\.|million|cfu)[^,]*))$/i); return <li key={x}><span>{m ? m[1] : x}</span>{m && <b>{m[2]}</b>}</li> })}</ul>
                </section>
              )}
              <section className="pd-card facts">
                <h2>{T('Quick facts', 'मुख्य जानकारी')}</h2>
                <dl>
                  <dt>{T('Category', 'श्रेणी')}</dt><dd>{hi ? HI_CATS[p.category] || p.category : p.category}</dd>
                  <dt>{T('Form', 'रूप')}</dt><dd>{p.formulation || '—'}</dd>
                  <dt>{T('Pack', 'पैक')}</dt><dd>{packLabel(p)}</dd>
                  {sps.length > 0 && <><dt>{T('For', 'किसके लिए')}</dt><dd>{sps.map(s => hi ? HI_SP[s] || s : s).join(', ')}</dd></>}
                </dl>
                <p className="pd-rx">{T('For veterinary use only. Dose as directed by a registered veterinarian.', 'केवल पशु चिकित्सा उपयोग के लिए। खुराक पंजीकृत पशु चिकित्सक की सलाह से।')}</p>
              </section>
              <section className="pd-card share">
                <h2>{T('The card your customer receives', 'ग्राहक को यह कार्ड जाता है')}</h2>
                <img src={productCardUrl(p.id)} alt={`${p.name} share card`} loading="lazy" />
                <ShareVideo name={p.name} src={productCardUrl(p.id)} mime="image/png" ext="png" text={shareText} waUrl={productWaUrl(shareText)} className="pd-btn wa full"
                  loadingLabel={<>{T('Preparing card…', 'कार्ड तैयार हो रहा है…')}</>} readyLabel={<>{T('Tap again to send', 'भेजने के लिए फिर दबाएँ')}</>}>
                  {T('Send this card on WhatsApp', 'यह कार्ड WhatsApp पर भेजें')}
                </ShareVideo>
              </section>
            </div>
          </div>

          {related.length > 0 && (
            <section className="pd-related">
              <h2>{T('More in', 'और भी')} {hi ? HI_CATS[p.category] || p.category : p.category}</h2>
              <div className="pd-rel-grid">
                {related.map(r => (
                  <Link key={r.id} href={`/products/${r.id}`} className="pd-rel">
                    <div className="pd-rel-img">{r.img ? <img src={r.img} alt="" className={r.cut ? 'cut' : 'photo'} loading="lazy" /> : null}</div>
                    <b>{r.name}</b><span>{r.packaging || r.formulation}</span>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </main>

        {playing && (
          <div className="pd-modal" onClick={() => setPlaying(false)} role="dialog" aria-label={`${p.name} film`}>
            <div className={`pd-player ${film?.vertical !== false ? 'tall' : ''}`} onClick={e => e.stopPropagation()}>
              <button className="pd-close" onClick={() => setPlaying(false)} aria-label="Close">×</button>
              {ytId
                ? <iframe src={`https://www.youtube.com/embed/${ytId}?rel=0&playsinline=1&autoplay=1`} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen />
                : film && <video src={film.mp4} poster={film.poster} controls autoPlay playsInline />}
            </div>
          </div>
        )}
      </div>
    </>
  )
}

const CSS = `
*, *::before, *::after { box-sizing: border-box; }
html, body { margin:0; padding:0; overflow-x:clip; }
:root { --forest:#1a3a2a; --night:#0f2318; --cream:#f5f0e8; --gold:#c8a96e; --gold-light:#e8d5a8; --ink:#1c2b22; --muted:#5b6b60; }
.pd { font-family:'DM Sans','Noto Sans Devanagari',sans-serif; background:var(--cream); color:var(--ink); min-height:100vh; }
.pd button { font:inherit; }

.pd-hero { background:radial-gradient(ellipse at 20% 30%, #2c5a41 0%, var(--forest) 45%, var(--night) 100%); color:var(--cream); }
.pd-hero-in { max-width:1240px; margin:0 auto; padding:20px 40px 48px; }
.pd-crumbs { display:flex; align-items:center; gap:8px; font-size:13px; color:rgba(245,240,232,.55); }
.pd-crumbs a { color:rgba(245,240,232,.75); text-decoration:none; }
.pd-crumbs a:hover { color:var(--gold-light); }
.pd-lang { margin-left:auto; display:flex; background:rgba(255,255,255,.07); border:1px solid rgba(200,169,110,.3); border-radius:10px; padding:3px; }
.pd-lang button { border:0; background:none; color:rgba(245,240,232,.6); padding:5px 11px; border-radius:7px; cursor:pointer; font-weight:700; font-size:12px; }
.pd-lang .on { background:var(--gold); color:var(--night); }
.pd-top { display:grid; grid-template-columns:1fr 1.1fr; gap:48px; align-items:center; margin-top:22px; }
.pd-stage { position:relative; display:flex; align-items:center; justify-content:center; height:460px; border-radius:28px; background:radial-gradient(circle at 50% 42%, #fff 0%, #efe9dc 62%, #e2d9c5 100%); box-shadow:0 40px 80px -30px rgba(0,0,0,.6); overflow:hidden; }
.pd-glow { position:absolute; width:70%; height:26px; bottom:50px; border-radius:50%; background:radial-gradient(rgba(26,58,42,.35), transparent 70%); filter:blur(6px); animation:pdShadow 6s ease-in-out infinite; }
.pd-stage img { position:relative; max-width:78%; max-height:78%; object-fit:contain; animation:pdFloat 6s ease-in-out infinite; }
.pd-stage img.cut { filter:drop-shadow(0 26px 24px rgba(26,58,42,.3)); }
.pd-stage.has-offer { padding-bottom:88px; }
.pd-stage.has-offer img { max-height:72%; }
.pd-stage.has-offer .pd-glow { bottom:112px; }
.pd-stage img.photo { max-width:100%; max-height:100%; mix-blend-mode:multiply; animation:none; }
@keyframes pdFloat { 0%,100% { transform:translateY(0) rotate(-.6deg); } 50% { transform:translateY(-12px) rotate(.6deg); } }
@keyframes pdShadow { 0%,100% { transform:scaleX(1); opacity:.9; } 50% { transform:scaleX(.86); opacity:.6; } }
.pd-initial { font-family:'DM Serif Display',serif; font-size:120px; color:var(--c); }
.pd-offer { position:absolute; left:16px; right:16px; bottom:16px; display:flex; flex-direction:column; gap:2px; padding:12px 16px; border-radius:16px; background:linear-gradient(90deg,var(--gold),#e2c98f); color:var(--night); font-size:15px; font-weight:700; }
.pd-offer b { font-size:11px; letter-spacing:2px; text-transform:uppercase; }
.pd-cat { display:inline-flex; align-items:center; gap:8px; font-size:12px; letter-spacing:2px; text-transform:uppercase; font-weight:700; color:var(--gold-light); }
.pd-cat i { width:9px; height:9px; border-radius:50%; background:var(--c); box-shadow:0 0 0 4px color-mix(in srgb, var(--c) 30%, transparent); }
.pd-info h1 { margin:10px 0 0; font-family:'DM Serif Display','Noto Sans Devanagari',serif; font-weight:400; font-size:clamp(38px,4.6vw,60px); line-height:1.02; }
.pd-meta { display:flex; flex-wrap:wrap; gap:8px; margin-top:14px; }
.pd-meta span { padding:6px 12px; border-radius:99px; background:rgba(245,240,232,.09); border:1px solid rgba(245,240,232,.16); font-size:13px; font-weight:600; }
.pd-lead { margin:18px 0 0; font-size:17px; line-height:1.65; color:rgba(245,240,232,.82); max-width:560px; }
.pd-sp { display:flex; flex-wrap:wrap; gap:8px; margin-top:16px; }
.pd-sp span { padding:7px 12px; border-radius:12px; background:rgba(200,169,110,.14); color:var(--gold-light); font-size:13.5px; font-weight:600; }
.pd-cta { display:flex; flex-wrap:wrap; gap:10px; margin-top:24px; }
.pd-btn { display:inline-flex; align-items:center; justify-content:center; gap:8px; padding:14px 20px; border-radius:14px; font-weight:700; font-size:15px; text-decoration:none; cursor:pointer; border:0; transition:transform .15s, filter .15s; }
.pd-btn:hover { transform:translateY(-2px); filter:brightness(1.06); }
.pd-btn.film { background:#fff; color:var(--forest); }
.pd-btn.wa { background:#25a244; color:#fff; }
.pd-btn.order { background:transparent; color:var(--cream); border:1.5px solid rgba(245,240,232,.4); }
.pd-btn.full { width:100%; margin-top:14px; }
.pd-links { display:flex; flex-wrap:wrap; gap:18px; margin-top:18px; font-size:14px; }
.pd-links a { color:var(--gold-light); text-decoration:none; font-weight:600; }
.pd-links a:hover { text-decoration:underline; }

.pd-main { max-width:1240px; margin:0 auto; padding:40px 40px 64px; }
.pd-grid { display:grid; grid-template-columns:1.15fr 1fr; gap:22px; align-items:start; }
.pd-col { display:flex; flex-direction:column; gap:22px; }
.pd-card { background:#fff; border-radius:22px; padding:24px 26px; border:1px solid rgba(26,58,42,.08); animation:pdIn .5s cubic-bezier(.2,.8,.2,1) both; }
@keyframes pdIn { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:none; } }
.pd-card h2 { margin:0 0 14px; font-family:'DM Serif Display','Noto Sans Devanagari',serif; font-weight:400; font-size:24px; color:var(--forest); }
.pd-chips { display:flex; flex-wrap:wrap; gap:8px; }
.pd-chips span { padding:8px 14px; border-radius:99px; background:color-mix(in srgb, var(--c) 10%, #fff); border:1px solid color-mix(in srgb, var(--c) 30%, transparent); font-size:14px; font-weight:600; }
.pd-ticks { margin:0; padding:0; list-style:none; display:grid; gap:10px; }
.pd-ticks li { position:relative; padding-left:30px; font-size:15px; line-height:1.55; }
.pd-ticks li::before { content:'✓'; position:absolute; left:0; top:1px; width:20px; height:20px; border-radius:50%; background:var(--forest); color:var(--gold-light); font-size:12px; display:grid; place-items:center; font-weight:800; }
.pd-about { margin:0; font-size:15.5px; line-height:1.75; color:#34443a; }
.pd-comp { margin:0; padding:0; list-style:none; }
.pd-comp li { display:flex; justify-content:space-between; gap:14px; padding:11px 0; border-bottom:1px dashed rgba(26,58,42,.14); font-size:15px; }
.pd-comp li:last-child { border-bottom:0; }
.pd-comp b { flex:none; color:var(--forest); font-weight:700; }
.facts dl { margin:0; display:grid; grid-template-columns:auto 1fr; gap:10px 18px; font-size:14.5px; }
.facts dt { color:var(--muted); }
.facts dd { margin:0; font-weight:700; text-align:right; }
.pd-rx { margin:16px 0 0; padding:12px 14px; border-radius:12px; background:#f6f1e6; font-size:13px; color:var(--muted); }
.share img { width:100%; border-radius:16px; display:block; box-shadow:0 18px 40px -20px rgba(15,35,24,.6); }

.pd-related { margin-top:44px; }
.pd-related h2 { font-family:'DM Serif Display','Noto Sans Devanagari',serif; font-weight:400; font-size:28px; color:var(--forest); margin:0 0 16px; }
.pd-rel-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(200px,1fr)); gap:14px; }
.pd-rel { display:flex; flex-direction:column; gap:4px; padding:14px; border-radius:18px; background:#fff; border:1px solid rgba(26,58,42,.08); text-decoration:none; color:var(--ink); transition:transform .2s, box-shadow .2s; }
.pd-rel:hover { transform:translateY(-4px); box-shadow:0 18px 34px -18px rgba(26,58,42,.4); }
.pd-rel-img { height:140px; display:flex; align-items:center; justify-content:center; border-radius:12px; background:radial-gradient(circle,#fff,#f0ebdf); margin-bottom:8px; padding:10px; }
.pd-rel-img img { max-width:100%; max-height:100%; object-fit:contain; }
.pd-rel-img img.photo { mix-blend-mode:multiply; }
.pd-rel b { font-size:15px; color:var(--forest); }
.pd-rel span { font-size:12.5px; color:var(--muted); }

.pd-modal { position:fixed; inset:0; z-index:100; background:rgba(8,20,13,.86); display:flex; align-items:center; justify-content:center; padding:20px; animation:pdFade .2s both; }
@keyframes pdFade { from { opacity:0; } }
.pd-player { position:relative; width:min(960px,100%); aspect-ratio:16/9; background:#000; border-radius:18px; overflow:hidden; }
.pd-player.tall { width:auto; height:min(86vh, 900px); aspect-ratio:9/16; }
.pd-player iframe, .pd-player video { width:100%; height:100%; border:0; display:block; background:#000; }
.pd-close { position:absolute; top:10px; right:10px; z-index:2; width:40px; height:40px; border-radius:50%; border:0; background:rgba(0,0,0,.6); color:#fff; font-size:24px; cursor:pointer; }

@media (max-width:900px) {
  .pd-hero-in, .pd-main { padding-left:16px; padding-right:16px; }
  .pd-top { grid-template-columns:1fr; gap:24px; margin-top:14px; }
  .pd-stage { height:320px; border-radius:22px; }
  .pd-grid { grid-template-columns:1fr; }
  .pd-btn { flex:1 1 100%; }
  .pd-card { padding:20px; border-radius:18px; }
  .pd-player.tall { height:auto; width:min(92vw, 480px); }
}
@media (prefers-reduced-motion: reduce) { .pd-stage img, .pd-glow, .pd-card { animation:none !important; } }
`
