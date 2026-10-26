'use client'

import { useMemo, useState } from 'react'
import { SITE } from '@/lib/share'
import type { SchemeGroup } from '@/lib/schemeGroups'
import { offerKey, piecesFor, type SwapData } from '@/lib/swap'

const title = (s: string) => s.toLowerCase().replace(/\b\w/g, c => c.toUpperCase()).replace(/(\d)(Ml|Gm|Ltr|Kg)\b/g, (_, d, u) => d + u.toLowerCase())
const squash = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')
const rs = (n: number) => '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 0 })

// Below the scheme cards: tick the schemes you are buying, pick ONE overstock
// product, see how many you get instead of the gifts (owner, 26 Oct 2026).
export default function SchemeSwap({ groups, swap }: { groups: SchemeGroup[]; swap: SwapData | null }) {
  const lines = useMemo(() => {
    if (!swap) return []
    const val = new Map(swap.offers.filter(o => o.value).map(o => [o.key, o.value as number]))
    return groups.flatMap(g => g.offers.map((o, k) => ({
      id: `${g.key}:${k}`, name: g.productId ? g.name : title(g.name), qty: o.qty, free: title(o.free), value: val.get(offerKey(o)) || 0,
    }))).filter(l => l.value > 0)
  }, [groups, swap])
  const [times, setTimes] = useState<Record<string, number>>({})
  const [code, setCode] = useState('')
  const [q, setQ] = useState('')
  if (!swap || !lines.length || !swap.products.length) return null

  const picked = lines.filter(l => times[l.id])
  const total = picked.reduce((a, l) => a + l.value * times[l.id], 0)
  const prod = swap.products.find(p => p.code === code)
  const pcs = prod ? piecesFor(total, prod.price, prod.available) : 0
  const worth = prod && prod.mrp > 0 ? pcs * prod.mrp : 0
  const worthPtr = prod && (prod.ptr || 0) > 0 ? pcs * (prod.ptr || 0) : 0
  const worthText = [worthPtr && `${rs(worthPtr)} at PTR`, worth && `${rs(worth)} at MRP`].filter(Boolean).join(' · ')
  const capped = prod ? Math.floor(total / prod.price + 1e-9) > prod.available : false
  const shown = q ? lines.filter(l => squash(l.name + l.free).includes(squash(q))) : lines
  // every product with what the ticked gifts buy of it; the ones that qualify
  // first, the rest marked NOT ENOUGH in red (owner, 26 Oct 2026)
  const opts = swap.products.map(p => ({ ...p, n: piecesFor(total, p.price, p.available) }))
    .sort((a, b) => total > 0 ? (Number(b.n > 0) - Number(a.n > 0)) || a.name.localeCompare(b.name) : a.name.localeCompare(b.name))
  const anyFits = opts.some(o => o.n > 0)
  const set = (id: string, n: number) => setTimes(t => { const c = { ...t }; if (n > 0) c[id] = Math.min(n, 99); else delete c[id]; return c })

  const msg = prod && pcs > 0 ? [
    '*MADVET scheme swap*', '',
    'Schemes I am buying:',
    ...picked.map(l => `• ${times[l.id] > 1 ? `${times[l.id]} × ` : ''}Buy ${l.qty} ${l.name} (gift: ${l.free})`),
    '', `Instead of the gifts I want: *${pcs} ${prod.unit} ${prod.name}*${worthText ? ` (free goods worth ${worthText})` : ''}`, '', `${SITE}/schemes#swap`,
  ].join('\n') : ''

  return (
    <section id="swap" className="sw">
      <style>{CSS}</style>
      <div className="sw-in">
        <div className="sc-eyebrow"><span />Swap your gifts</div>
        <h2>Take MADVET stock <em>instead of the gift.</em></h2>
        <p className="sw-lead">Tick the schemes you are buying. Then choose one product and we show how many you get in place of the gifts.</p>

        <div className="sw-cols">
          <div className="sw-box">
            <div className="sw-step"><b>1</b> Schemes you are buying{picked.length > 0 && <span className="sw-count">{picked.length} ticked</span>}</div>
            <input className="sw-q" value={q} onChange={e => setQ(e.target.value)} placeholder="Search — Stop Stop, sugar…" aria-label="Search schemes to swap" />
            <ul className="sw-list">
              {shown.map(l => {
                const n = times[l.id] || 0
                return (
                  <li key={l.id} className={n ? 'on' : ''}>
                    <label>
                      <input type="checkbox" checked={n > 0} onChange={e => set(l.id, e.target.checked ? 1 : 0)} />
                      <span className="sw-ln"><b>{l.name}</b><i>Buy {l.qty} → {l.free}</i></span>
                    </label>
                    {n > 0 && <span className="sw-x">
                      <button type="button" onClick={() => set(l.id, n - 1)} aria-label="One less">−</button>
                      <span title="How many times you buy this scheme">{n}×</span>
                      <button type="button" onClick={() => set(l.id, n + 1)} aria-label="One more">+</button>
                    </span>}
                  </li>
                )
              })}
              {!shown.length && <li className="sw-none">No scheme matches.</li>}
            </ul>
          </div>

          <div className="sw-box sw-res">
            <div className="sw-step"><b>2</b> Choose the product you want</div>
            {picked.length > 0 && !anyFits && <p className="sw-bad">Nothing qualifies yet — the ticked schemes are not enough for one piece of any product. Tick more schemes or press + to buy a scheme more times.</p>}
            <ul className="sw-list sw-prods" role="radiogroup" aria-label="Product instead of the gifts">
              {opts.map(o => {
                const fits = o.n > 0
                return (
                  <li key={o.code} className={`${code === o.code ? 'on' : ''}${picked.length && !fits ? ' no' : ''}`}>
                    <label>
                      <input type="radio" name="sw-prod" checked={code === o.code} onChange={() => setCode(o.code)} />
                      <span className="sw-ln"><b>{o.name}</b></span>
                    </label>
                    {picked.length > 0 && (fits
                      ? <span className="sw-tag ok">{o.n} {o.n === 1 ? o.unit.replace(/s$/, '') : o.unit}</span>
                      : <span className="sw-tag bad">Not enough</span>)}
                  </li>
                )
              })}
            </ul>
            <div className={`sw-get${picked.length && prod && pcs === 0 ? ' bad' : ''}`}>
              {!picked.length ? <p>Tick at least one scheme on the left.</p>
                : !prod ? <p>{anyFits ? 'Now choose a product above.' : 'Nothing qualifies yet. Tick more schemes.'}</p>
                : pcs > 0 ? <><span>You get</span><strong>{pcs} {prod.unit}</strong><em>{prod.name}</em>{worthText && <b className="sw-worth">Free goods worth{worthPtr > 0 && <> {rs(worthPtr)}<i> at PTR</i></>}{worthPtr > 0 && worth > 0 && <i> · </i>}{worth > 0 && <> {rs(worth)}<i> at MRP</i></>}</b>}{capped && <small>That is all we have in stock.</small>}</>
                : <><span>Not enough</span><p>The ticked schemes are not enough for one {prod.unit === 'strips' ? 'strip' : 'piece'} of {prod.name}. Tick more schemes or choose a product marked in green.</p></>}
            </div>
            {msg && <a className="sc-btn wa sw-wa" href={`https://wa.me/?text=${encodeURIComponent(msg)}`} target="_blank" rel="noopener">Send this swap to your MADVET representative</a>}
          </div>
        </div>
        <p className="sw-note">Quantities are rounded down. The office confirms the final quantity with your order. Schemes not listed here can't be swapped yet.</p>
      </div>
    </section>
  )
}

const CSS = `
.sw { background:var(--forest); color:var(--cream); margin-top:28px; }
.sw-in { max-width:1280px; margin:0 auto; padding:48px 40px; }
.sw h2 { margin:0; font-family:'DM Serif Display',serif; font-weight:400; font-size:clamp(28px,3.6vw,44px); line-height:1.1; }
.sw h2 em { color:var(--gold-light); }
.sw-lead { margin:12px 0 26px; max-width:620px; line-height:1.65; color:rgba(245,240,232,.7); }
.sw-cols { display:grid; grid-template-columns:minmax(0,1.25fr) minmax(0,1fr); gap:18px; align-items:start; }
.sw-box { background:#fff; color:#1c2b22; border-radius:16px; padding:18px; box-shadow:0 18px 50px rgba(0,0,0,.25); }
.sw-res { position:sticky; top:72px; }
.sw-step { display:flex; align-items:center; gap:10px; font-weight:700; font-size:14px; margin-bottom:12px; }
.sw-count { margin-left:auto; font-size:12px; font-weight:700; padding:4px 10px; border-radius:20px; background:var(--forest); color:var(--gold-light); }
.sw-step b { width:24px; height:24px; border-radius:50%; background:var(--gold); color:var(--forest); display:inline-flex; align-items:center; justify-content:center; font-size:13px; }
.sw-q, .sw select { width:100%; padding:11px 13px; border-radius:9px; border:1px solid var(--cream-dark); font:inherit; font-size:14px; background:var(--cream); color:inherit; }
.sw-list { list-style:none; margin:10px 0 0; padding:0; max-height:420px; overflow:auto; display:flex; flex-direction:column; gap:6px; }
.sw-list li { display:flex; align-items:center; gap:8px; padding:8px 10px; border-radius:9px; background:var(--cream); border:1px solid transparent; }
.sw-list li.on { border-color:var(--gold); background:#fbf4e4; }
.sw-list label { flex:1; min-width:0; display:flex; align-items:center; gap:10px; cursor:pointer; }
.sw-list input[type=checkbox] { width:18px; height:18px; accent-color:#1a3a2a; flex:none; }
.sw-ln { display:flex; flex-direction:column; min-width:0; }
.sw-ln b { font-size:13.5px; }
.sw-ln i { font-style:normal; font-size:12.5px; color:#8a5a12; }
.sw-x { display:flex; align-items:center; gap:4px; flex:none; font-size:13px; font-weight:700; }
.sw-x button { width:26px; height:26px; border-radius:7px; border:1px solid var(--cream-dark); background:#fff; font:inherit; font-size:15px; cursor:pointer; }
.sw-none { color:#7d8a82; justify-content:center; }
.sw-prods { max-height:300px; margin:0 0 14px; }
.sw-prods input[type=radio] { width:18px; height:18px; accent-color:#1a3a2a; flex:none; }
.sw-prods li.no { background:#fdf0ef; }
.sw-prods li.no b { color:#8f2f26; }
.sw-tag { flex:none; font-size:12px; font-weight:700; padding:4px 9px; border-radius:20px; white-space:nowrap; }
.sw-tag.ok { background:#e3f3e7; color:#1d6b35; }
.sw-tag.bad { background:#fbe0dd; color:#b3261e; }
.sw-bad { margin:0 0 10px; padding:10px 12px; border-radius:9px; background:#fbe0dd; color:#b3261e; font-weight:700; font-size:13.5px; line-height:1.45; }
.sw-get.bad { background:linear-gradient(160deg,#8f2f26,#5c1a14); }
.sw-get.bad span { color:#ffd6d1; }
.sw-get { min-height:112px; border-radius:12px; padding:16px; background:linear-gradient(160deg,#1a3a2a,#0f2318); color:var(--cream); display:flex; flex-direction:column; justify-content:center; }
.sw-get p { margin:0; color:rgba(245,240,232,.75); line-height:1.5; }
.sw-get span { font-size:11px; letter-spacing:2px; text-transform:uppercase; color:var(--gold); }
.sw-get strong { font-family:'DM Serif Display',serif; font-weight:400; font-size:44px; line-height:1.05; color:var(--gold-light); }
.sw-get em { font-style:normal; font-weight:700; }
.sw-worth { margin-top:10px; padding-top:10px; border-top:1px solid rgba(200,169,110,.3); font-size:17px; color:#fff; }
.sw-worth i { font-style:normal; font-weight:400; font-size:12px; color:rgba(245,240,232,.6); }
.sw-get small { margin-top:6px; color:rgba(245,240,232,.7); }
.sw-wa { display:block; margin-top:12px; }
.sw-note { margin:18px 0 0; font-size:12px; color:rgba(245,240,232,.55); }
@media (max-width:860px) {
  .sw-in { padding:36px 16px; }
  .sw-cols { grid-template-columns:1fr; }
  .sw-res { position:static; }
  .sw-list { max-height:360px; }
}
`
