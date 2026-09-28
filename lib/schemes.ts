// The monthly trade schemes, read live from the Google Sheet MADVET already
// publishes (it was an iframe on madvet.in/schemes). The sheet stays the one
// place schemes are edited; this page re-reads it every ten minutes.
//
// Sheet layout: row 1 is the month ("SEPTEMBER"), row 2 the headings
// (QUANTITY, ITEM, FREE), then one scheme per row.

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

export async function fetchSchemes(): Promise<{ month: string; schemes: Scheme[] }> {
  try {
    const res = await fetch(SCHEMES_CSV, { next: { revalidate: 600 } })
    if (!res.ok) return { month: '', schemes: [] }
    const rows = parseCsv(await res.text()).map(r => r.map(tidy))
    const month = rows[0]?.find(Boolean) || ''
    const schemes = rows.slice(2)
      .filter(r => r[1] && (r[0] || r[2]))
      .map(r => ({ qty: r[0], item: r[1], free: r[2] || '' }))
    return { month, schemes }
  } catch {
    return { month: '', schemes: [] }
  }
}
