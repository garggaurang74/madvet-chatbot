'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import SiteNav from '@/components/SiteNav'
import { SITE } from '@/lib/share'

export interface SchemeGroup {
  key:       string
  name:      string
  productId: number
  image:     string
  category:  string
  film:      string
  offers:    { qty: string; item: string; free: string }[]
}

const title = (s: string) => s.toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
const squash = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')

export default function SchemesClient({ month, groups }: { month: string; groups: SchemeGroup[] }) {
  const [q, setQ] = useState('')
  const shown = useMemo(() => {
    const k = squash(q)
    return k ? groups.filter(g => squash(g.name + g.offers.map(o => o.item + o.free).join(' ')).includes(k)) : groups
  }, [groups, q])
  const offers = groups.reduce((a, g) => a + g.offers.length, 0)
  const monthName = month ? title(month) : ''

  const shareAll = `https://wa.me/?text=${encodeURIComponent(
    [`*MADVET schemes — ${monthName}*`, '', ...groups.flatMap(g => g.offers.map(o => `• ${o.qty} ${title(o.item)} → FREE ${o.free}`)), '', `${SITE}/schemes`].join('\n'))}`

  return (
    <>
      <style>{CSS}</style>
      <div className="sc">
        <SiteNav active="schemes" />
        <header className="sc-hero">
          <div className="sc-hero-in">
            <div>
              <div className="sc-eyebrow"><span />Trade schemes{monthName && ` · ${monthName}`}</div>
              <h1>Buy the range,<br /><em>take home more.</em></h1>
              <p>This month&apos;s schemes for retailers and stockists. Buy the quantity shown and the gift comes free with the order.</p>
              <div className="sc-stats">
                <div><b>{offers}</b><span>Offers</span></div>
                <div><b>{groups.length}</b><span>Products</span></div>
              </div>
            </div>
            <div className="sc-cta">
              <a className="sc-btn wa" href={shareAll} target="_blank" rel="noopener">Send all schemes on WhatsApp</a>
              <Link className="sc-btn ghost" href="/folder">View product folder</Link>
            </div>
          </div>
        </header>

        <div className="sc-bar">
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search a product or gift — Butacin, sugar, Surf…" aria-label="Search schemes" />
          <span>{shown.length} of {groups.length}</span>
        </div>

        <main className="sc-grid">
          {shown.length === 0 && <p className="sc-empty">{groups.length ? 'No scheme matches that search.' : 'This month’s schemes are being updated.'}</p>}
          {shown.map(g => {
            const share = `https://wa.me/?text=${encodeURIComponent([`*${title(g.name)}* — MADVET scheme ${monthName}`, ...g.offers.map(o => `• Buy ${o.qty} → FREE ${o.free}`), g.productId ? `${SITE}/products/${g.productId}` : `${SITE}/schemes`].join('\n'))}`
            return (
              <article key={g.key} className="sc-card">
                <div className="sc-img">{g.image ? <img src={g.image} alt="" loading="lazy" /> : <span>{g.name.slice(0, 1)}</span>}</div>
                <div className="sc-body">
                  <h2>{g.productId ? g.name : title(g.name)}</h2>
                  {g.category && <div className="sc-cat">{g.category}</div>}
                  <ul>
                    {g.offers.map((o, k) => (
                      <li key={k}>
                        <span className="sc-buy">Buy <b>{o.qty}</b>{g.offers.length > 1 && squash(o.item) !== squash(g.offers[0].item) ? ` ${title(o.item)}` : ''}</span>
                        <span className="sc-free">🎁 {o.free ? title(o.free) : '—'}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="sc-acts">
                    {g.productId > 0 && <Link href={`/products/${g.productId}`}>Product</Link>}
                    {g.film && <Link href={`/videos?film=${encodeURIComponent(g.film)}`}>▶ Film</Link>}
                    <a className="wa" href={share} target="_blank" rel="noopener">WhatsApp</a>
                  </div>
                </div>
              </article>
            )
          })}
        </main>
        <p className="sc-note">Schemes apply to orders placed this month and may change without notice. Ask your MADVET representative to confirm before ordering.</p>
      </div>
    </>
  )
}

const CSS = `
*, *::before, *::after { box-sizing: border-box; }
html, body { margin: 0; padding: 0; overflow-x: clip; }
.sc { --forest:#1a3a2a; --cream:#f5f0e8; --cream-dark:#ede6d6; --gold:#c8a96e; --gold-light:#e8d5a8; min-height:100vh; background:var(--cream); color:#1c2b22; font-family:'DM Sans','Noto Sans Devanagari',sans-serif; }
.sc-hero { position:relative; overflow:hidden; background:var(--forest); color:var(--cream); }
.sc-hero::before { content:''; position:absolute; inset:0; background:radial-gradient(ellipse 55% 80% at 85% 30%, rgba(200,169,110,.25), transparent 70%), radial-gradient(ellipse 40% 80% at 5% 10%, rgba(61,122,87,.45), transparent 60%); }
.sc-hero-in { position:relative; max-width:1280px; margin:0 auto; padding:56px 40px 52px; display:flex; align-items:flex-end; justify-content:space-between; gap:32px; flex-wrap:wrap; }
.sc-eyebrow { display:flex; align-items:center; gap:12px; font-size:11px; font-weight:700; letter-spacing:3px; text-transform:uppercase; color:var(--gold); margin-bottom:18px; }
.sc-eyebrow span { width:30px; height:1px; background:var(--gold); }
.sc-hero h1 { margin:0; font-family:'DM Serif Display',serif; font-weight:400; font-size:clamp(38px,5vw,64px); line-height:1.06; }
.sc-hero h1 em { color:var(--gold-light); }
.sc-hero p { margin:18px 0 0; max-width:480px; line-height:1.7; color:rgba(245,240,232,.66); }
.sc-stats { display:flex; gap:40px; margin-top:28px; }
.sc-stats b { display:block; font-family:'DM Serif Display',serif; font-weight:400; font-size:40px; line-height:1; color:var(--gold-light); }
.sc-stats span { display:block; margin-top:6px; font-size:11px; letter-spacing:2px; text-transform:uppercase; color:rgba(245,240,232,.5); }
.sc-cta { display:flex; flex-direction:column; gap:10px; }
.sc-btn { padding:13px 20px; border-radius:10px; font-weight:700; font-size:14px; text-decoration:none; text-align:center; transition:transform .15s, filter .15s; }
.sc-btn:hover { transform:translateY(-2px); filter:brightness(1.06); }
.sc-btn.wa { background:#25a244; color:#fff; box-shadow:0 8px 24px rgba(37,162,68,.3); }
.sc-btn.ghost { border:1px solid rgba(200,169,110,.4); color:var(--gold-light); }
.sc-bar { position:sticky; top:0; z-index:40; background:rgba(38,77,57,.95); backdrop-filter:blur(10px); padding:12px 40px; display:flex; align-items:center; gap:14px; }
.sc-bar input { flex:1; max-width:560px; padding:11px 16px; border-radius:9px; border:1px solid rgba(200,169,110,.3); background:rgba(255,255,255,.08); color:var(--cream); font:inherit; font-size:14px; outline:none; }
.sc-bar input::placeholder { color:rgba(245,240,232,.45); }
.sc-bar input:focus { border-color:var(--gold); }
.sc-bar span { color:rgba(245,240,232,.6); font-size:13px; }
.sc-grid { max-width:1280px; margin:0 auto; padding:32px 40px 20px; display:grid; grid-template-columns:repeat(auto-fill,minmax(330px,1fr)); gap:18px; }
.sc-empty { grid-column:1/-1; text-align:center; color:#7d8a82; padding:60px 0; }
.sc-card { display:flex; gap:16px; padding:16px; background:#fff; border-radius:16px; box-shadow:0 2px 6px rgba(15,35,24,.06), 0 10px 26px rgba(15,35,24,.07); transition:transform .2s, box-shadow .2s; }
.sc-card:hover { transform:translateY(-3px); box-shadow:0 4px 10px rgba(15,35,24,.08), 0 18px 40px rgba(15,35,24,.12); }
.sc-img { flex:none; width:92px; height:92px; border-radius:12px; background:var(--cream); display:flex; align-items:center; justify-content:center; overflow:hidden; }
.sc-img img { width:100%; height:100%; object-fit:contain; padding:6px; }
.sc-img span { font-family:'DM Serif Display',serif; font-size:36px; color:var(--gold); }
.sc-body { flex:1; min-width:0; display:flex; flex-direction:column; }
.sc-body h2 { margin:0; font-size:16.5px; line-height:1.25; }
.sc-cat { margin-top:3px; font-size:11.5px; color:#8a968e; }
.sc-body ul { list-style:none; margin:10px 0 0; padding:0; display:flex; flex-direction:column; gap:6px; }
.sc-body li { display:flex; flex-wrap:wrap; align-items:center; gap:6px 10px; padding:8px 10px; border-radius:9px; background:var(--cream); font-size:13px; }
.sc-buy b { color:var(--forest); }
.sc-free { margin-left:auto; font-weight:700; color:#8a5a12; }
.sc-acts { display:flex; gap:8px; margin-top:12px; flex-wrap:wrap; }
.sc-acts a { font-size:12px; font-weight:700; padding:6px 11px; border-radius:7px; text-decoration:none; color:var(--forest); border:1px solid var(--cream-dark); }
.sc-acts a.wa { background:#25a244; border-color:#25a244; color:#fff; }
.sc-note { max-width:1280px; margin:0 auto; padding:8px 40px 56px; font-size:12px; color:#8a968e; }
@media (max-width:700px) {
  .sc-hero-in { padding:36px 16px 36px; }
  .sc-cta { width:100%; }
  .sc-bar { padding:10px 12px; }
  .sc-bar span { display:none; }
  .sc-grid { padding:18px 12px; grid-template-columns:1fr; gap:12px; }
  .sc-card { padding:12px; gap:12px; }
  .sc-img { width:72px; height:72px; }
  .sc-note { padding:4px 16px 40px; }
}
`
