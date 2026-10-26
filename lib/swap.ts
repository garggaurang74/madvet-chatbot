// "Take stock instead of the gift" on /schemes. The office app (madvet-extracted
// app/scheme_swap.py) values every scheme's gift at MADVET's own cost and prices
// the Focus overstock at purchase + GST + freight + 25%, then drops one JSON in
// the public bucket every 10 minutes. The page only matches sheet lines to it
// by text; a line the office adds in between has no swap until the next drop.
// The gift's own value is never shown: the retailer sees pieces and
// "free goods worth" pieces x MRP (owner, 26 Oct 2026).

export interface SwapOffer { key: string; item: string; qty: string; free: string; value: number | null }
export interface SwapProduct { code: string; name: string; unit: string; price: number; mrp: number; available: number }
export interface SwapData { generated_at: string; markup: number; offers: SwapOffer[]; products: SwapProduct[] }

const squash = (s: string) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '')
export const offerKey = (o: { item: string; qty: string; free: string }) => [o.item, o.qty, o.free].map(squash).join('|')

const URL_ = () => process.env.SWAP_JSON_URL || `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/film-downloads/swap/swap.json`

export async function fetchSwap(): Promise<SwapData | null> {
  try {
    // local testing only: read a file the office app wrote, never on Vercel
    if (process.env.SWAP_JSON_FILE) {
      const { readFile } = await import('fs/promises')
      return JSON.parse(await readFile(process.env.SWAP_JSON_FILE, 'utf8'))
    }
    const res = await fetch(URL_(), { next: { revalidate: 120 } })
    if (!res.ok) return null
    const d = await res.json()
    return Array.isArray(d?.offers) && Array.isArray(d?.products) ? d : null
  } catch { return null }
}

/** Owner's rule: round DOWN, never past what is on the shelf. */
export const piecesFor = (value: number, price: number, available: number) =>
  value > 0 && price > 0 ? Math.max(0, Math.min(Math.floor(value / price + 1e-9), Math.floor(available))) : 0
