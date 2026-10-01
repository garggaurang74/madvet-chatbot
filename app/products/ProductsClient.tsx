'use client'

// The product list (29 Sep 2026 redesign). What changed and why:
//  • The pack is the hero of each card: the clean cut-out carton (93 of 94
//    products, film-downloads/packs/) on a tinted stage, not a small photo
//    floating in a white box.
//  • Every card has three actions at thumb reach: details, the film, and
//    WhatsApp — which sends the product's card IMAGE with a sales message on a
//    phone (the link alone on a desktop, which unfolds into the same card).
//  • Text shown is the customer text from lib/productCopy (no romanised Hindi
//    search words, no "Pigs" and "Pig" as two animals).
//  • Filters sit in one sticky bar; cards rise in as they load.
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import type { Product } from './types'
import SiteNav from '@/components/SiteNav'
import FolderButtons from '@/components/FolderButtons'
import ShareVideo from '@/components/ShareVideo'
import { cleanIndications, packLabel, speciesList, SP_ICON, purposeLine } from '@/lib/productCopy'
import { productShareText, productWaUrl, productCardUrl } from '@/lib/productShare'
import { search, companionsFor, type Concept } from '@/lib/recommend'

const PACKS = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/film-downloads/packs`

const CAT_COLORS: Record<string, string> = {
  'Antibiotic': '#2f6fd6', 'Anti-inflammatory / Analgesic': '#d98a12', 'Vitamin Supplement': '#139a6b',
  'Anthelmintic / Antiparasitic': '#7b4fd6', 'Ectoparasiticide': '#d6453d', 'Reproductive Hormone': '#d6508f',
  'Probiotic': '#129a93', 'Antidiarrheal': '#6c9a14', 'Antihistamine': '#8a6cd6', 'Dermatological': '#d65a70',
  'Udder Care / Herbal Antimicrobial': '#1f9e8c', 'Digestive / Antiflatulent': '#9a7614', 'Udder Care': '#1f9e8c',
}
export const getColor = (cat: string) => CAT_COLORS[cat] || '#6b7f73'

export const CAT_ORDER = [
  'Antibiotic', 'Anti-inflammatory / Analgesic', 'Vitamin Supplement', 'Anthelmintic / Antiparasitic',
  'Ectoparasiticide', 'Reproductive Hormone', 'Probiotic', 'Antidiarrheal', 'Antihistamine', 'Dermatological',
  'Udder Care / Herbal Antimicrobial', 'Digestive / Antiflatulent', 'Udder Care',
]

export const HI_CATS: Record<string, string> = {
  'Antibiotic': 'एंटीबायोटिक', 'Anti-inflammatory / Analgesic': 'दर्द व बुखार', 'Vitamin Supplement': 'विटामिन / पोषण',
  'Anthelmintic / Antiparasitic': 'पेट के कीड़े', 'Ectoparasiticide': 'चिचड़ी / जूँ', 'Reproductive Hormone': 'प्रजनन',
  'Probiotic': 'प्रोबायोटिक', 'Antidiarrheal': 'दस्त', 'Antihistamine': 'एलर्जी', 'Dermatological': 'त्वचा',
  'Udder Care / Herbal Antimicrobial': 'थन की देखभाल', 'Digestive / Antiflatulent': 'पाचन / अफारा', 'Udder Care': 'थन की देखभाल',
}
const HI_SP: Record<string, string> = { Cattle: 'गाय', Buffalo: 'भैंस', Sheep: 'भेड़', Goat: 'बकरी', Dog: 'कुत्ता', Cat: 'बिल्ली', Poultry: 'मुर्गी', Horse: 'घोड़ा', Calf: 'बछड़ा', Camel: 'ऊँट', Pig: 'सूअर' }
const FORMS = ['Injection', 'Bolus', 'Tablet', 'Liquid', 'Powder', 'Gel / Ointment', 'Spray', 'Soap', 'Pour-On', 'Suspension']
const HI_FORM: Record<string, string> = { Injection: 'इंजेक्शन', Bolus: 'बोलस', Tablet: 'टैबलेट', Liquid: 'लिक्विड', Powder: 'पाउडर', 'Gel / Ointment': 'जेल / मलहम', Spray: 'स्प्रे', Soap: 'साबुन', 'Pour-On': 'पोर-ऑन', Suspension: 'सस्पेंशन' }
export type Lang = 'en' | 'hi'

// Hindi words people type, and what the catalogue calls them.
const HI_Q: Record<string, string> = {
  'थनैला': 'mastitis', 'कीड़े': 'worm', 'कीड़ा': 'worm', 'बुखार': 'fever', 'दस्त': 'diarrh', 'चिचड़ी': 'tick', 'जूँ': 'lice',
  'दूध': 'milk', 'खुजली': 'itch', 'दर्द': 'pain', 'सूजन': 'swelling', 'घाव': 'wound', 'कमजोरी': 'weak', 'कमज़ोरी': 'weak',
  'भूख': 'appetite', 'अफारा': 'bloat', 'कैल्शियम': 'calcium', 'लीवर': 'liver', 'बच्चेदानी': 'uter', 'निमोनिया': 'pneumonia',
  thanaila: 'mastitis', bukhar: 'fever', dast: 'diarrh', keede: 'worm', khujli: 'itch', doodh: 'milk', kamzori: 'weak', afara: 'bloat',
}
const norm = (s: string) => s.toLowerCase().replace(/[.\-_/\s]+/g, '')

function score(p: Product, q: string): number {
  let total = 0
  for (let t of q.toLowerCase().split(/\s+/).filter(Boolean)) {
    t = HI_Q[t] || t
    const nt = norm(t), nn = norm(p.name)
    let s = 0
    if (nn === nt) s += 100
    else if (nn.startsWith(nt)) s += 60
    else if (nn.includes(nt)) s += 40
    for (const [v, pts] of [[p.aliases, 30], [p.salt, 25], [p.description, 15], [p.benefits, 10], [p.indication, 10], [p.category, 5], [p.species, 5], [p.packaging, 3]] as [string, number][])
      if (v && (v.toLowerCase().includes(t) || norm(v).includes(nt))) s += pts
    if (!s) return 0           // every word must match somewhere
    total += s
  }
  return total
}

function formOf(p: Product): string {
  const f = (p.formulation || '').toLowerCase()
  if (/inj/.test(f)) return 'Injection'
  if (/bolus/.test(f)) return 'Bolus'
  if (/tab/.test(f)) return 'Tablet'
  if (/gel|oint|cream/.test(f)) return 'Gel / Ointment'
  if (/powder/.test(f)) return 'Powder'
  if (/spray/.test(f)) return 'Spray'
  if (/soap/.test(f)) return 'Soap'
  if (/pour/.test(f)) return 'Pour-On'
  if (/susp/.test(f)) return 'Suspension'
  if (/liq|syrup/.test(f)) return 'Liquid'
  return p.formulation || 'Other'
}

export default function ProductsClient({ products, packIds = [], schemes = {} }: { products: Product[]; packIds?: number[]; schemes?: Record<number, string> }) {
  const [lang, setLang] = useState<Lang>('en')
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('')
  const [sp, setSp] = useState('')
  const [form, setForm] = useState('')
  const hi = lang === 'hi'
  const packs = useMemo(() => new Set(packIds), [packIds])

  // ?q= and ?cat= deep links (the chatbot and the home page use them)
  useEffect(() => {
    const u = new URLSearchParams(window.location.search)
    if (u.get('q')) setQ(u.get('q')!)
    if (u.get('cat')) setCat(u.get('cat')!)
  }, [])

  const cats = useMemo(() => {
    const present = new Set(products.map(p => p.category).filter(Boolean))
    return [...CAT_ORDER.filter(c => present.has(c)), ...[...present].filter(c => !CAT_ORDER.includes(c)).sort()]
  }, [products])
  const allSp = useMemo(() => {
    const order = ['Cattle', 'Buffalo', 'Sheep', 'Goat', 'Horse', 'Dog', 'Cat', 'Poultry', 'Calf', 'Camel', 'Pig']
    const present = new Set(products.flatMap(p => speciesList(p.species)))
    return order.filter(s => present.has(s))
  }, [products])
  const allForms = useMemo(() => FORMS.filter(f => products.some(p => formOf(p) === f)), [products])

  // Search understands complaints, not just words (lib/recommend.ts): "dudh
  // ghat gaya", "doodh kam" and "दूध कम" all find the milk products, ranked by
  // what the molecule does. A plain name or molecule search behaves as before.
  const { shown, concepts, partners } = useMemo(() => {
    const base = products.filter(p =>
      (!cat || p.category === cat) && (!sp || speciesList(p.species).includes(sp)) && (!form || formOf(p) === form))
    if (!q.trim()) return { shown: base, concepts: [] as Concept[], partners: [] as ReturnType<typeof companionsFor<Product>> }
    const r = search(base, q)
    let list = r.hits.map(h => h.item)
    // Nothing understood and no word found: fall back to the old word score,
    // so a search never comes back emptier than it used to.
    if (!list.length) list = base.map(p => ({ p, s: score(p, q) })).filter(x => x.s > 0).sort((a, b) => b.s - a.s).map(x => x.p)
    return { shown: list, concepts: r.concepts, partners: r.concepts.length ? companionsFor(r.hits, products, 2) : [] }
  }, [products, q, cat, sp, form])

  const grouped = !q.trim() && !cat
  const groups = useMemo(() => {
    if (!grouped) return [{ cat: '', items: shown }]
    return cats.map(c => ({ cat: c, items: shown.filter(p => p.category === c) })).filter(g => g.items.length)
  }, [grouped, shown, cats])
  const filtersOn = !!(q || cat || sp || form)

  return (
    <>
      <style>{CSS}</style>
      <div className="pl">
        <SiteNav active="products" hi={hi} />

        <header className="pl-hero">
          <div className="pl-hero-in">
            <div>
              <div className="pl-eyebrow">{hi ? 'मैडवेट एनिमल हेल्थकेयर' : 'Madvet Animal Healthcare'}</div>
              <h1>{hi ? <>मैडवेट की <em>पूरी रेंज</em></> : <>The Madvet <em>range</em></>}</h1>
              <p>{hi ? `${products.length} पशु दवाएँ और सप्लीमेंट — नाम, दवा, बीमारी या पशु से खोजें, और उसका फ़ोल्डर पेज एक टैप में ग्राहक को भेजें।` : `${products.length} veterinary medicines and supplements. Search by product, molecule, disease or animal — and send its folder page to a customer in one tap.`}</p>
              <div className="pl-hero-cta"><FolderButtons hi={hi} /></div>
            </div>
            <div className="pl-stats">
              <div><b>{products.length}</b><span>{hi ? 'उत्पाद' : 'Products'}</span></div>
              <div><b>{cats.length}</b><span>{hi ? 'श्रेणियाँ' : 'Categories'}</span></div>
              <div><b>{products.filter(p => p.film_key).length}</b><span>{hi ? 'फ़िल्म के साथ' : 'With a film'}</span></div>
            </div>
          </div>
        </header>

        <div className="pl-bar">
          <div className="pl-bar-in">
            <div className="pl-row">
              <div className="pl-search">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
                <input value={q} onChange={e => setQ(e.target.value)} placeholder={hi ? 'उत्पाद, दवा, बीमारी या जानवर खोजें — जैसे थनैला, बुखार…' : 'Search a product, molecule, disease or animal — e.g. mastitis, fever, Butacin…'} aria-label="Search products" />
                {q && <button className="pl-x" onClick={() => setQ('')} aria-label="Clear search">×</button>}
              </div>
              <select value={sp} onChange={e => setSp(e.target.value)} aria-label="Animal">
                <option value="">{hi ? 'सभी जानवर' : 'All animals'}</option>
                {allSp.map(s => <option key={s} value={s}>{SP_ICON[s]} {hi ? HI_SP[s] || s : s}</option>)}
              </select>
              <select value={form} onChange={e => setForm(e.target.value)} aria-label="Form">
                <option value="">{hi ? 'सभी रूप' : 'All forms'}</option>
                {allForms.map(f => <option key={f} value={f}>{hi ? HI_FORM[f] || f : f}</option>)}
              </select>
              <div className="pl-lang">
                {(['en', 'hi'] as Lang[]).map(l => <button key={l} className={lang === l ? 'on' : ''} onClick={() => setLang(l)}>{l === 'en' ? 'EN' : 'हिं'}</button>)}
              </div>
            </div>
            <div className="pl-cats">
              <button className={!cat ? 'on' : ''} onClick={() => setCat('')}>{hi ? 'सभी' : 'All'}</button>
              {cats.map(c => (
                <button key={c} className={cat === c ? 'on' : ''} onClick={() => setCat(cat === c ? '' : c)} style={{ '--c': getColor(c) } as React.CSSProperties}>
                  <i />{hi ? HI_CATS[c] || c : c}
                </button>
              ))}
            </div>
          </div>
        </div>

        <main className="pl-main">
          <div className="pl-count">
            {shown.length} {hi ? 'उत्पाद' : shown.length === 1 ? 'product' : 'products'}
            {filtersOn && <button onClick={() => { setQ(''); setCat(''); setSp(''); setForm('') }}>{hi ? 'फ़िल्टर हटाएँ' : 'Clear filters'}</button>}
          </div>
          {concepts.length > 0 && (
            <div className="pl-meaning">
              <span>{hi ? 'इनके लिए दवाएँ:' : 'Medicines for:'}</span>
              {concepts.map(c => <b key={c.id}>{hi ? c.hi : c.en}</b>)}
              {concepts.some(c => c.supportive) && (
                <p>{hi ? 'यह एक वायरस है — इसकी कोई सीधी दवा नहीं है। नीचे की दवाएँ साथ आने वाले बुखार, दर्द, घाव और बैक्टीरियल संक्रमण के लिए हैं।' : 'This is a virus — no medicine treats it directly. The products below treat what comes with it: fever, pain, wounds and secondary bacterial infection.'}</p>
              )}
              {partners.length > 0 && (
                <p className="pl-with">{hi ? 'अक्सर साथ में:' : 'Often given with it:'} {partners.map((x, i) => <span key={x.item.id}>{i ? ' · ' : ''}<Link href={`/products/${x.item.id}`}>{x.item.name}</Link> <i>({hi ? x.hi : x.en})</i></span>)}</p>
              )}
            </div>
          )}
          {shown.length === 0 && (
            <div className="pl-empty">
              <p>{hi ? 'कोई उत्पाद नहीं मिला।' : 'No product matches that.'}</p>
              <Link href={`/ask`} className="pl-btn">{hi ? 'AI से पूछें →' : 'Ask our assistant →'}</Link>
            </div>
          )}
          {groups.map(g => (
            <section key={g.cat || 'all'} className="pl-group">
              {g.cat && <h2 style={{ '--c': getColor(g.cat) } as React.CSSProperties}><i />{hi ? HI_CATS[g.cat] || g.cat : g.cat}<span>{g.items.length}</span></h2>}
              <div className="pl-grid">
                {g.items.map((p, i) => <Card key={p.id} p={p} i={i} hi={hi} pack={packs.has(p.id)} scheme={schemes[p.id] || ''} />)}
              </div>
            </section>
          ))}
        </main>
      </div>
    </>
  )
}

function Card({ p, i, hi, pack, scheme }: { p: Product; i: number; hi: boolean; pack: boolean; scheme: string }) {
  const c = getColor(p.category)
  const img = pack ? `${PACKS}/${p.id}.webp` : p.image_url
  const sps = speciesList(p.species)
  const text = productShareText(p, scheme, !!p.film_key)
  const uses = cleanIndications(p.indication, 3, p.id)
  return (
    <article className="pc" style={{ '--c': c, animationDelay: `${Math.min(i, 11) * 45}ms` } as React.CSSProperties}>
      <Link href={`/products/${p.id}`} className="pc-media" aria-label={p.name}>
        <span className="pc-form">{hi ? HI_FORM[formOf(p)] || formOf(p) : formOf(p)}</span>
        {scheme && <span className="pc-offer">🎁 {hi ? 'स्कीम' : 'Scheme'}</span>}
        {img ? <img src={img} alt={p.name} loading={i < 8 ? 'eager' : 'lazy'} className={pack ? 'cut' : 'photo'} /> : <span className="pc-initial">{p.name.slice(0, 1)}</span>}
      </Link>
      <div className="pc-body">
        <div className="pc-cat">{hi ? HI_CATS[p.category] || p.category : p.category}</div>
        <h3><Link href={`/products/${p.id}`}>{p.name}</Link></h3>
        <div className="pc-pack">{packLabel(p)}</div>
        <p className="pc-use">{uses.length ? uses.join(' · ') : purposeLine(p, 90)}</p>
        {scheme && <div className="pc-scheme">🎁 {scheme}</div>}
        <div className="pc-sp">{sps.slice(0, 6).map(s => <span key={s} title={hi ? HI_SP[s] || s : s}>{SP_ICON[s] || '•'}</span>)}</div>
      </div>
      <div className="pc-actions">
        <Link href={`/products/${p.id}`} className="pc-go"><span className="long">{hi ? 'पूरी जानकारी' : 'View details'}</span><span className="short">{hi ? 'जानकारी' : 'Details'}</span> <b>→</b></Link>
        {p.film_key && <Link href={`/videos?film=${encodeURIComponent(p.film_key)}`} className="pc-icon film" aria-label="Watch the film" title={hi ? 'फ़िल्म देखें' : 'Watch the film'}><svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.2-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z"/></svg></Link>}
        <ShareVideo name={p.name} src={productCardUrl(p.id)} mime="image/png" ext="png" text={text} waUrl={productWaUrl(text)}
          className="pc-icon wa" loadingLabel={<span className="spin" />} readyLabel={<span className="ready">↗</span>}>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-label="Share on WhatsApp"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm5.8 14.2c-.2.7-1.4 1.3-2 1.4-.5.1-1.2.1-1.9-.1-.4-.1-1-.3-1.7-.6-3-1.3-4.9-4.3-5.1-4.5-.1-.2-1.2-1.6-1.2-3.1s.8-2.2 1-2.5c.3-.3.6-.4.8-.4h.6c.2 0 .4 0 .6.5l.9 2.1c.1.1.1.3 0 .5l-.3.5-.4.4c-.1.1-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.4 2.4 1.5.3.1.5.1.6-.1l.9-1c.2-.3.4-.2.6-.1l2 .9c.3.2.5.2.5.4.1.1.1.8-.1 1.5Z" /></svg>
        </ShareVideo>
      </div>
    </article>
  )
}

const CSS = `
.pl-meaning { margin:0 0 18px; padding:14px 16px; border-radius:14px; background:#f4efe3; border:1px solid rgba(26,58,42,.1); font-size:14px; color:var(--ink, #1a2a20); }
.pl-meaning > span { color:var(--muted, #5b6b60); margin-right:8px; }
.pl-meaning > b { display:inline-block; margin:2px 6px 2px 0; padding:3px 10px; border-radius:999px; background:#1a3a2a; color:#f5f0e8; font-size:13px; }
.pl-meaning p { margin:10px 0 0; line-height:1.5; }
.pl-meaning .pl-with a { color:#1a3a2a; font-weight:700; }
.pl-meaning .pl-with i { font-style:normal; color:var(--muted, #5b6b60); }
*, *::before, *::after { box-sizing: border-box; }
html, body { margin: 0; padding: 0; overflow-x: clip; }
:root { --forest:#1a3a2a; --night:#0f2318; --cream:#f5f0e8; --cream-dark:#ede6d6; --gold:#c8a96e; --gold-light:#e8d5a8; --ink:#1c2b22; --muted:#5b6b60; }
.pl { font-family:'DM Sans','Noto Sans Devanagari',sans-serif; background:var(--cream); color:var(--ink); min-height:100vh; }
.pl button, .pl select, .pl input { font:inherit; }

.pl-hero { position:relative; overflow:hidden; background:radial-gradient(ellipse at 85% 0%, #2c5a41 0%, var(--forest) 45%, var(--night) 100%); color:var(--cream); }
.pl-hero-in { max-width:1360px; margin:0 auto; padding:48px 40px 40px; display:flex; justify-content:space-between; align-items:flex-end; gap:32px; flex-wrap:wrap; }
.pl-eyebrow { font-size:11px; letter-spacing:3px; text-transform:uppercase; color:var(--gold); font-weight:700; margin-bottom:12px; }
.pl-hero h1 { margin:0; font-family:'DM Serif Display','Noto Sans Devanagari',serif; font-weight:400; font-size:clamp(38px,5vw,62px); line-height:1.05; }
.pl-hero h1 em { color:var(--gold-light); }
.pl-hero p { margin:14px 0 0; max-width:560px; color:rgba(245,240,232,.7); font-size:15.5px; line-height:1.65; }
.pl-hero-cta { margin-top:22px; }
.pl-stats { display:flex; gap:36px; }
.pl-stats div { text-align:right; }
.pl-stats b { display:block; font-family:'DM Serif Display',serif; font-weight:400; font-size:42px; color:var(--gold-light); line-height:1; }
.pl-stats span { font-size:11px; letter-spacing:2px; text-transform:uppercase; color:rgba(245,240,232,.55); }

.pl-bar { position:sticky; top:0; z-index:40; background:rgba(245,240,232,.92); backdrop-filter:saturate(1.4) blur(12px); -webkit-backdrop-filter:saturate(1.4) blur(12px); border-bottom:1px solid rgba(26,58,42,.1); }
.pl-bar-in { max-width:1360px; margin:0 auto; padding:14px 40px 10px; }
.pl-row { display:flex; gap:10px; align-items:center; }
.pl-search { flex:1; position:relative; display:flex; align-items:center; gap:10px; padding:0 14px; height:46px; border-radius:14px; background:#fff; border:1px solid rgba(26,58,42,.14); color:var(--muted); transition:border-color .15s, box-shadow .15s; }
.pl-search:focus-within { border-color:var(--gold); box-shadow:0 0 0 4px rgba(200,169,110,.18); }
.pl-search input { flex:1; border:0; outline:0; background:none; font-size:15px; color:var(--ink); min-width:0; }
.pl-x { border:0; background:rgba(26,58,42,.08); width:26px; height:26px; border-radius:50%; cursor:pointer; color:var(--ink); }
.pl-row select { height:46px; border-radius:14px; border:1px solid rgba(26,58,42,.14); background:#fff; padding:0 12px; font-size:14px; color:var(--ink); cursor:pointer; }
.pl-lang { display:flex; background:#fff; border:1px solid rgba(26,58,42,.14); border-radius:14px; padding:4px; }
.pl-lang button { border:0; background:none; padding:8px 12px; border-radius:10px; cursor:pointer; font-weight:700; font-size:13px; color:var(--muted); }
.pl-lang .on { background:var(--forest); color:var(--cream); }
.pl-cats { display:flex; gap:8px; overflow-x:auto; padding:12px 0 4px; scrollbar-width:none; }
.pl-cats::-webkit-scrollbar { display:none; }
.pl-cats button { flex:none; display:flex; align-items:center; gap:7px; padding:8px 14px; border-radius:999px; border:1px solid rgba(26,58,42,.14); background:#fff; font-size:13px; font-weight:600; color:var(--ink); cursor:pointer; transition:all .15s; }
.pl-cats button i { width:8px; height:8px; border-radius:50%; background:var(--c, var(--gold)); }
.pl-cats button:hover { border-color:var(--c, var(--gold)); }
.pl-cats button.on { background:var(--forest); border-color:var(--forest); color:var(--cream); }

.pl-main { max-width:1360px; margin:0 auto; padding:18px 40px 64px; }
.pl-count { display:flex; align-items:center; gap:12px; font-size:13px; color:var(--muted); margin-bottom:8px; }
.pl-count button { border:0; background:none; color:#9a7a3e; font-weight:700; cursor:pointer; padding:0; }
.pl-empty { padding:60px 0; text-align:center; color:var(--muted); }
.pl-btn { display:inline-block; margin-top:10px; padding:12px 20px; border-radius:12px; background:var(--forest); color:var(--cream); text-decoration:none; font-weight:700; }
.pl-group { margin-top:26px; }
.pl-group h2 { display:flex; align-items:center; gap:10px; margin:0 0 14px; font-family:'DM Serif Display','Noto Sans Devanagari',serif; font-weight:400; font-size:26px; color:var(--forest); }
.pl-group h2 i { width:10px; height:10px; border-radius:50%; background:var(--c); box-shadow:0 0 0 5px color-mix(in srgb, var(--c) 18%, transparent); }
.pl-group h2 span { font-family:'DM Sans',sans-serif; font-size:12px; font-weight:700; color:var(--muted); background:rgba(26,58,42,.07); padding:3px 9px; border-radius:99px; }
.pl-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(260px, 1fr)); gap:18px; }

.pc { display:flex; flex-direction:column; background:#fff; border-radius:20px; overflow:hidden; border:1px solid rgba(26,58,42,.08); box-shadow:0 1px 2px rgba(26,58,42,.04); transition:transform .25s cubic-bezier(.2,.8,.2,1), box-shadow .25s; animation:pcRise .55s cubic-bezier(.2,.8,.2,1) both; }
.pc:hover { transform:translateY(-6px); box-shadow:0 24px 44px -20px rgba(26,58,42,.4); }
@keyframes pcRise { from { opacity:0; transform:translateY(18px) scale(.985); } to { opacity:1; transform:none; } }
.pc-media { position:relative; display:flex; align-items:center; justify-content:center; height:240px; padding:44px 16px 14px; background:radial-gradient(circle at 50% 38%, #fff 0%, color-mix(in srgb, var(--c) 10%, #f3efe6) 70%); overflow:hidden; }
.pc-media img { position:absolute; top:44px; left:16px; width:calc(100% - 32px); height:calc(100% - 58px); object-fit:contain; transition:transform .45s cubic-bezier(.2,.8,.2,1); }
.pc-media img.cut { filter:drop-shadow(0 16px 18px rgba(26,58,42,.28)); }
.pc-media img.photo { top:0; left:0; width:100%; height:100%; mix-blend-mode:multiply; }
.pc:hover .pc-media img { transform:scale(1.06) rotate(-1deg); }
.pc-initial { font-family:'DM Serif Display',serif; font-size:72px; color:var(--c); }
.pc-form { position:absolute; top:12px; left:12px; padding:5px 10px; border-radius:99px; background:rgba(255,255,255,.9); font-size:11px; font-weight:700; letter-spacing:.5px; color:var(--ink); border:1px solid rgba(26,58,42,.1); }
.pc-offer { position:absolute; top:12px; right:12px; padding:5px 10px; border-radius:99px; background:var(--gold); font-size:11px; font-weight:800; color:var(--night); }
.pc-body { padding:16px 18px 6px; flex:1; display:flex; flex-direction:column; gap:5px; }
.pc-cat { font-size:10.5px; letter-spacing:1.6px; text-transform:uppercase; font-weight:700; color:var(--c); }
.pc h3 { margin:0; font-family:'DM Serif Display','Noto Sans Devanagari',serif; font-weight:400; font-size:22px; line-height:1.15; }
.pc h3 a { color:var(--forest); text-decoration:none; }
.pc-pack { font-size:12.5px; color:var(--muted); font-weight:600; }
.pc-use { margin:4px 0 0; font-size:13.5px; line-height:1.5; color:#34443a; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
.pc-scheme { margin-top:6px; font-size:12px; font-weight:700; color:#7a5a1e; background:#fbf3e2; border:1px dashed rgba(200,169,110,.8); padding:6px 9px; border-radius:10px; }
.pc-sp { display:flex; gap:4px; margin-top:auto; padding-top:8px; font-size:17px; }
.pc-actions { display:flex; gap:8px; padding:12px 14px 14px; }
.pc-go { flex:1; display:flex; align-items:center; justify-content:center; gap:6px; height:42px; border-radius:12px; background:var(--forest); color:var(--cream); text-decoration:none; font-size:13.5px; font-weight:700; transition:background .15s; }
.pc-go:hover { background:#24503a; }
.pc-go { white-space:nowrap; }
.pc-go .short { display:none; }
.pc-go b { transition:transform .2s; }
.pc-go:hover b { transform:translateX(3px); }
.pc-icon { flex:none; display:flex; align-items:center; justify-content:center; width:42px; height:42px; border-radius:12px; text-decoration:none; font-size:14px; transition:transform .15s; }
.pc-icon:hover { transform:scale(1.07); }
.pc-icon.film { background:#fdecea; color:#d4302b; }
.pc-icon.wa { background:#25a244; color:#fff; }
.pc-icon .spin { width:16px; height:16px; border-radius:50%; border:2px solid rgba(255,255,255,.4); border-top-color:#fff; animation:spin .7s linear infinite; }
.pc-icon .ready { font-weight:800; }
@keyframes spin { to { transform:rotate(360deg) } }

@media (max-width:900px) {
  .pl-hero-in, .pl-bar-in, .pl-main { padding-left:16px; padding-right:16px; }
  .pl-hero-in { padding-top:32px; padding-bottom:28px; }
  .pl-stats { gap:22px; } .pl-stats b { font-size:32px; }
  .pl-bar-in { padding-top:10px; padding-bottom:6px; }
  .pl-row { flex-wrap:wrap; gap:8px; }
  .pl-search { flex-basis:100%; height:42px; border-radius:12px; }
  .pl-search input { font-size:16px; }
  .pl-row select { flex:1; min-width:0; height:38px; border-radius:11px; font-size:14px; padding:0 8px; }
  .pl-lang { border-radius:11px; padding:3px; } .pl-lang button { padding:6px 10px; }
  .pl-cats { padding:8px 0 2px; gap:6px; }
  .pl-cats button { padding:6px 11px; font-size:12.5px; }
}
@media (max-width:520px) {
  .pl-grid { grid-template-columns:1fr 1fr; gap:10px; }
  .pc { border-radius:16px; }
  .pc-media { height:160px; }
  .pc-media img { top:32px; left:8px; width:calc(100% - 16px); height:calc(100% - 40px); }
  .pc-body { padding:10px 11px 4px; }
  .pc h3 { font-size:17px; }
  .pc-use, .pc-sp, .pc-scheme { display:none; }
  .pc-actions { padding:8px 9px 10px; gap:6px; }
  .pc-go { height:38px; font-size:13px; } .pc-go b { display:none; } .pc-go .long { display:none; } .pc-go .short { display:inline; }
  .pc-icon { width:38px; height:38px; }
  .pc-form { top:8px; left:8px; font-size:10px; padding:3px 8px; }
  .pc-offer { top:8px; right:8px; font-size:10px; padding:3px 8px; }
}
@media (prefers-reduced-motion: reduce) { .pc, .pc-media img { animation:none !important; transition:none !important; } }
`
