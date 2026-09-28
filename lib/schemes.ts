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

export interface Scheme { qty: string; item: string; free: string }

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
    // The month is the last non-empty text above the heading (and below the previous block).
    let month = ''
    for (let i = h - 1; i >= (b ? heads[b - 1] + 1 : 0) && !month; i--) {
      const t = rows[i].filter(Boolean)
      if (t.length === 1 && !/\d{2,}\s*(pcs|box)/i.test(t[0])) month = t[0]
    }
    const end = heads[b + 1] ?? rows.length
    const schemes = rows.slice(h + 1, end)
      .map(r => ({ qty: iQty >= 0 ? r[iQty] || '' : '', item: r[iItem] || '', free: r[iFree] || '' }))
      .filter(s => s.item && (s.qty || s.free) && !isItemHead(s.item))
    return { month, schemes }
  }).filter(b => b.schemes.length)

  if (!blocks.length) return { month: '', schemes: [] }
  const now = MONTHS[new Date().getMonth()]
  return blocks.find(b => b.month.toLowerCase().includes(now)) || blocks[0]
}

export async function fetchSchemes(): Promise<{ month: string; schemes: Scheme[] }> {
  try {
    const res = await fetch(SCHEMES_CSV, { next: { revalidate: 300 } })
    if (!res.ok) return { month: '', schemes: [] }
    return readSchemes(await res.text())
  } catch {
    return { month: '', schemes: [] }
  }
}

// ── Matching a sheet line to a product ──────────────────────────────────────
// Staff type names loosely ("BUTACIN 100 ML", "LEVO FORCE BOLUS", "GUM BLOTE").
// A line belongs to a product only when (1) the product's whole name, minus
// its pack size and container words, starts the line, and (2) any pack size
// written on the line is the product's size. The longest such name wins, so
// "MEGLUFORCE SP BOLUS" goes to Megluforce SP, not Megluforce. A line naming
// two products ("A + B MIX") or a size we do not list (MADCOMIN 200ML) shows
// as plain text with no product attached — never under the wrong pack.

const squash = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')
const SIZE = /(\d+(?:\.\d+)?)\s*(ml|ltr|litre|liter|l|gms?|g|kg)\b/gi
// Words that name the container, not the product ("SYP" on the sheet, "Liquid" in the catalogue).
const FORM = /\b(syp|syrup|liquid|liq|suspension|susp|inj|injection|oint|ointment|tab|tabs|tablet|tablets|soap|vet)\b/gi
// Spellings the office uses that are not the catalogue's. Add here when /schemes/check shows one.
const ALIAS: Record<string, string> = { gumblote: 'gumbloat', alboi: 'albol' }

function sizeOf(s: string): number | null {
  const m = [...s.matchAll(SIZE)][0]
  if (!m) return null
  const n = parseFloat(m[1]), u = m[2].toLowerCase()
  return /^(ltr|litre|liter|l|kg)$/.test(u) ? n * 1000 : n
}
const core = (s: string) => {
  let k = squash(s.replace(SIZE, ' ').replace(FORM, ' ').replace(/%/g, ''))
  for (const [a, b] of Object.entries(ALIAS)) if (k.startsWith(a)) k = b + k.slice(a.length)
  return k
}

export interface MatchResult<P> { product: P | null; why: string }

export function matchScheme<P extends { id: number; name: string; packaging?: string }>(item: string, products: P[]): MatchResult<P> {
  if (/\+|\bmix\b/i.test(item)) return { product: null, why: 'names more than one product' }
  const key = core(item)
  const want = sizeOf(item)
  const cands = products
    .map(p => ({ p, c: core(p.name), size: sizeOf(p.name) ?? sizeOf(p.packaging || '') }))
    .filter(x => x.c.length >= 4 && key.startsWith(x.c))
    .sort((a, b) => b.c.length - a.c.length)
  if (!cands.length) return { product: null, why: 'no product name found in this line' }
  const best = cands.filter(x => x.c.length === cands[0].c.length)
  if (want == null) return { product: best[0].p, why: best.length > 1 ? 'no size on the line — took the first pack' : 'name' }
  const sized = best.find(x => x.size === want)
  if (sized) return { product: sized.p, why: 'name + size' }
  return { product: null, why: `size ${want >= 1000 && want % 1000 === 0 ? want / 1000 + ' L/kg' : want} is not a pack we list` }
}
