// "Take stock instead of the gift" on /schemes. The office app (madvet-extracted
// app/scheme_swap.py) values every scheme's gift at MADVET's own cost and prices
// the Focus overstock at PTS less 10% (owner, 26 Oct 2026), then drops one JSON in
// the public bucket every 10 minutes. The page only matches sheet lines to it
// by text; a line the office adds in between has no swap until the next drop.
// The gift's own value is never shown: the retailer sees pieces and
// "free goods worth" pieces x PTR and x MRP (owner, 26 Oct 2026). PTR is 0
// when the office Price List has no confirmed row for the product.

/** in_stock: false = the scheme's own product is short on the shelf (hidden on
 *  the page); null = not linked to PKS yet (shown). */
export interface SwapOffer { key: string; item: string; qty: string; free: string; value: number | null; in_stock?: boolean | null }
export interface SwapProduct { code: string; name: string; unit: string; price: number; ptr?: number; mrp: number; available: number }
export interface SwapData { generated_at: string; next_change?: string; offers: SwapOffer[]; products: SwapProduct[] }

const squash = (s: string) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '')
export const offerKey = (o: { item: string; qty: string; free: string }) => [o.item, o.qty, o.free].map(squash).join('|')

/** Owner's rule: round DOWN, never past what is on the shelf. */
export const piecesFor = (value: number, price: number, available: number) =>
  value > 0 && price > 0 ? Math.max(0, Math.min(Math.floor(value / price + 1e-9), Math.floor(available))) : 0
