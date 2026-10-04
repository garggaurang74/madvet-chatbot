// The monthly trade schemes, read live from the Google Sheet the office staff
// keep (it was an iframe on the old madvet.in/schemes). The sheet stays the one
// place schemes are edited; the site re-reads it every five minutes.
//
// The layout is found, not assumed: the heading row is whichever row names an
// ITEM column (QUANTITY / ITEM / FREE, in any order, with or without extra
// columns), and the month is the text above it. So a row inserted at the top,
// a new column, or blank lines between schemes do not break the page. If the
// sheet holds more than one month block, the block for the current month wins,
// else the first.

export const SCHEMES_CSV = process.env.SCHEMES_SHEET_CSV ||
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vRE5xwaL2_w_w1Gt5F1QbU4nvVgtkusANzAEEVmfsJKzPuR3sV_A4UIdnkp_zkcZA/pub?output=csv'

export interface Scheme {
  qty: string; item: string; free: string
  /** Optional: the office's own pin to a website product, from a column
   *  headed WEBSITE / SITE NAME / MATCH. Wins over reading `item`. */
  site?: string
}

// Minimal RFC 4180 reader: quoted fields may hold commas ("1 KG SURF EXCEL, 2 KG SUGAR").
function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = [], field = '', q = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (q) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++ }
      else if (c === '"') q = false
      else field += c
    } else if (c === '"') q = true
    else if (c === ',') { row.push(field); field = '' }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++
      row.push(field); rows.push(row); row = []; field = ''
    } else field += c
  }
  if (field || row.length) { row.push(field); rows.push(row) }
  return rows
}

const tidy = (s: string) => s.replace(/\s+/g, ' ').trim()
const MONTHS = ['january','february','march','april','may','june','july','august','september','october','november','december']

const isItemHead = (c: string) => /^(items?|products?|product name|item name|brand)$/i.test(c)
const isQtyHead  = (c: string) => /^(qty|quantity|quantities|buy|purchase)$/i.test(c)
const isFreeHead = (c: string) => /^(free|gift|free gift|scheme|offer|free item)$/i.test(c)
const isSiteHead = (c: string) => /^(website|website name|site|site name|site product|match|product on site|on website)$/i.test(c)

export function readSchemes(text: string): { month: string; schemes: Scheme[] } {
  const rows = parseCsv(text).map(r => r.map(tidy))
  const heads = rows.map((r, i) => (r.some(isItemHead) ? i : -1)).filter(i => i >= 0)

  // No recognisable heading: the original layout (month, headings, rows).
  if (!heads.length) {
    const month = rows[0]?.find(Boolean) || ''
    const schemes = rows.slice(2).filter(r => r[1] && (r[0] || r[2])).map(r => ({ qty: r[0], item: r[1], free: r[2] || '' }))
    return { month, schemes }
  }

  const blocks = heads.map((h, b) => {
    const head = rows[h]
    const iItem = head.findIndex(isItemHead)
    let iQty = head.findIndex(isQtyHead)
    let iFree = head.findIndex(isFreeHead)
    if (iQty < 0) iQty = iItem > 0 ? iItem - 1 : -1
    if (iFree < 0) iFree = iItem + 1
    const iSite = head.findIndex(isSiteHead)
    // The month is the last non-empty text above the heading (and below the previous block).
    let month = ''
    for (let i = h - 1; i >= (b ? heads[b - 1] + 1 : 0) && !month; i--) {
      const t = rows[i].filter(Boolean)
      if (t.length === 1 && !/\d{2,}\s*(pcs|box)/i.test(t[0])) month = t[0]
    }
    const end = heads[b + 1] ?? rows.length
    const schemes = rows.slice(h + 1, end)
      .map(r => ({ qty: iQty >= 0 ? r[iQty] || '' : '', item: r[iItem] || '', free: r[iFree] || '', ...(iSite >= 0 && r[iSite] ? { site: r[iSite] } : {}) }))
      .filter(s => s.item && (s.qty || s.free) && !isItemHead(s.item))
    return { month, schemes }
  }).filter(b => b.schemes.length)

  if (!blocks.length) return { month: '', schemes: [] }
  const now = MONTHS[new Date().getMonth()]
  return blocks.find(b => b.month.toLowerCase().includes(now)) || blocks[0]
}

// The last sheet that read cleanly. Google's published CSV does fail now and
// then (a 5xx, a timeout, a sign-in page while a sheet is being re-shared);
// on any of those the page keeps showing the schemes it last had rather than
// "no schemes this month". Per server instance, on top of Next's data cache.
let lastGood: { month: string; schemes: Scheme[] } | null = null

export async function fetchSchemes(): Promise<{ month: string; schemes: Scheme[] }> {
  try {
    const res = await fetch(SCHEMES_CSV, { next: { revalidate: 60 } })
    const text = res.ok ? await res.text() : ''
    // An HTML page is Google asking for a sign-in, not the sheet.
    const got = text && !/^\s*</.test(text) ? readSchemes(text) : { month: '', schemes: [] }
    if (got.schemes.length) { lastGood = got; return got }
    return lastGood ?? got
  } catch {
    return lastGood ?? { month: '', schemes: [] }
  }
}

/** Which product a sheet line is for: the office's pin if the line has one, else its ITEM text. */
export function schemeMatch<P extends { id: number; name: string; packaging?: string }>(s: Scheme, products: P[]): MatchResult<P> {
  if (s.site) {
    const m = matchScheme(s.site, products)
    if (m.product) return { ...m, why: `pinned in the sheet: "${s.site}"` }
    return { ...matchScheme(s.item, products), why: `the sheet pins "${s.site}", which is not a website product name — read the item instead` }
  }
  return matchScheme(s.item, products)
}

// ── Matching a sheet line to a product ──────────────────────────────────────
// Staff type names loosely ("BUTACIN 100 ML", "LEVO FORCE BOLUS", "GUM BLOTE").
// A line belongs to a product only when (1) the product's whole name, minus
// its pack size and container words, starts the line, and (2) any pack size
// written on the line is the product's size. The longest such name wins, so
// "MEGLUFORCE SP BOLUS" goes to Megluforce SP, not Megluforce. A line naming
// two products ("A + B MIX") or a size we do not list (CALCIFORCE 30ML) is
// never filed under the wrong pack: it keeps its own card, titled as the
// sheet writes it, and borrows only the photo and links of its `family` —
// the same formulation in the pack we do list.

const squash = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')
const SIZE = /(\d+(?:\.\d+)?)\s*(ml|ltr|litre|liter|l|gms?|g|kg)\b/gi
// Words that name the container, not the product ("SYP" on the sheet, "Liquid" in the catalogue).
const FORM = /\b(syp|syrup|liquid|liq|suspension|susp|inj|injection|oint|ointment|tab|tabs|tablet|tablets|soap|vet)\b/gi
// Spellings the office uses that are not the catalogue's. Add here when /schemes/check shows one.
const ALIAS: Record<string, string> = { gumblote: 'gumbloat', alboi: 'albol' }

// Edit distance, for spelling slips in the sheet.
function dist(a: string, b: string): number {
  const m = a.length, n = b.length
  let prev = Array.from({ length: n + 1 }, (_, j) => j)
  for (let i = 1; i <= m; i++) {
    const cur = [i]
    for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
    prev = cur
  }
  return prev[n]
}

function sizeOf(s: string): number | null {
  const m = [...s.matchAll(SIZE)][0]
  if (!m) return null
  const n = parseFloat(m[1]), u = m[2].toLowerCase()
  return /^(ltr|litre|liter|l|kg)$/.test(u) ? n * 1000 : n
}
// Shorthand the office types for a dose form that IS part of a product's name
// (Bhuk OK Powder vs Bhuk OK Bolus), so it is expanded rather than dropped.
const SHORT: [RegExp, string][] = [[/\b(pwd|pwdr|powd|pow)\b\.?/gi, 'powder'], [/\b(bls|bol|blus)\b\.?/gi, 'bolus']]
const expand = (s: string) => SHORT.reduce((t, [re, w]) => t.replace(re, w), s)
const core = (s: string) => {
  let k = squash(expand(s).replace(SIZE, ' ').replace(FORM, ' ').replace(/%/g, ''))
  for (const [a, b] of Object.entries(ALIAS)) if (k.startsWith(a)) k = b + k.slice(a.length)
  return k
}

export interface MatchResult<P> {
  product: P | null   // the exact product (name, and size if the line gives one)
  family:  P | null   // when there is no exact product: the same formulation in another pack,
                      // or the first product of a combo — used for the photo and links only
  why: string
}

export function matchScheme<P extends { id: number; name: string; packaging?: string }>(item: string, products: P[]): MatchResult<P> {
  if (/\+|\bmix\b/i.test(item)) {
    const first = item.split(/\+|\bmix\b/i)[0]
    const part = first.trim() ? matchScheme(first, products) : null
    return { product: null, family: part?.product || part?.family || null, why: 'names more than one product' }
  }
  const want = sizeOf(item)
  const exact = matchKey(core(item), want, products)
  if (exact) return exact
  // A spelling slip ("BHUK OKK", "MEGLUFORSE SP"): correct the line's start to
  // the nearest product name — within one letter, two for long names — and
  // read it again. If two different products are equally near it does not
  // guess; a name that merely extends another (Megluforce → Megluforce SP)
  // is the same guess made more precisely, so the longer one wins.
  const key = core(item)
  let best: { c: string; len: number; d: number } | null = null
  let tie = false
  for (const p of products) {
    const c = core(p.name)
    if (c.length < 5) continue
    const lim = c.length >= 9 ? 2 : 1
    for (const len of [c.length - 1, c.length, c.length + 1]) {
      if (len > key.length || len < 1) continue
      const d = dist(key.slice(0, len), c)
      if (d > lim) continue
      if (!best || d < best.d || (d === best.d && c.length > best.c.length && c.startsWith(best.c))) { tie = !!best && d === best.d && !c.startsWith(best.c) && !best.c.startsWith(c); best = { c, len, d } }
      else if (d === best.d && best.c !== c && !best.c.startsWith(c) && !c.startsWith(best.c)) tie = true
    }
  }
  if (best && !tie) {
    const again = matchKey(best.c + key.slice(best.len), want, products)
    if (again) return { ...again, why: `spelling read as "${best.c}" — ${again.why}` }
  }
  return { product: null, family: null, why: 'no product name found in this line' }
}

function matchKey<P extends { id: number; name: string; packaging?: string }>(key: string, want: number | null, products: P[]): MatchResult<P> | null {
  const cands = products
    .map(p => ({ p, c: core(p.name), size: sizeOf(p.name) ?? sizeOf(p.packaging || '') }))
    .filter(x => x.c.length >= 4 && key.startsWith(x.c))
    .sort((a, b) => b.c.length - a.c.length)
  if (!cands.length) {
    // The line leaves off a dose form the website's name carries ("PASHUMIN
    // DS" for "Pashumin Ds powder"). Only when exactly one product fits —
    // "BHUK OK" alone is the powder or the bolus, and stays unmatched.
    const tail = /^(powder|bolus|syrup|syp|liquid|liq|gel|tablet|tab|spray|soap|injection|inj|ointment|oint|shampoo)$/
    const loose = products.filter(p => { const c = core(p.name); return c.startsWith(key) && key.length >= 5 && tail.test(c.slice(key.length)) })
    const one = [...new Set(loose.map(p => core(p.name)))]
    if (one.length === 1) return matchKey(one[0], want, products)
    return null
  }
  const best = cands.filter(x => x.c.length === cands[0].c.length)
  // Several packs of this name and no size on the line: which one the scheme
  // is for is not written down, so no carton is shown rather than a guessed
  // one (29 Sep: another size's carton is "unacceptable"). /schemes/check
  // lists these so the office can add the size.
  if (want == null) return best.length > 1
    ? { product: null, family: null, why: `${best.length} pack sizes of this name — add the size to the sheet line (e.g. ${best.map(x => x.p.name).join(' / ')})` }
    : { product: best[0].p, family: null, why: 'name' }
  const sized = best.find(x => x.size === want)
  if (sized) return { product: sized.p, family: null, why: 'name + size' }
  return { product: null, family: best[0].p, why: `size ${want >= 1000 && want % 1000 === 0 ? want / 1000 + ' L/kg' : want} is not a pack we list — shown with ${best[0].p.name}` }
}
