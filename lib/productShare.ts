// The message a product is shared with, to a vet or a retailer on WhatsApp.
// Written to be read on a phone in five seconds and acted on: what it is,
// what it treats, what is in it, the pack, this month's scheme if there is
// one, and two ways to act (see the full page and film / order on WhatsApp).
// The link unfolds into the product's card image (app/products/[id]/
// opengraph-image.tsx), so even a plain-text share arrives with a picture.
import { COMPANY } from './company'
import { SITE } from './share'
import { cleanIndications, compShort, packLabel, speciesList, type CopyProduct } from './productCopy'

export function productShareText(p: CopyProduct, scheme = '', hasFilm = false): string {
  const uses = cleanIndications(p.indication, 4, p.id).join(', ')
  const sp = speciesList(p.species).join(', ')
  const lines = [
    `*${p.name}* — ${p.category || p.formulation}`,
    uses && `✅ ${uses}`,
    p.salt && `🧪 ${compShort(p.salt, 140)}`,
    `📦 ${packLabel(p)}${sp ? ` · ${sp}` : ''}`,
    scheme && `🎁 *This month:* ${scheme}`,
    ' ',
    `👉 Details${hasFilm ? ' + 1-min video' : ''}: ${SITE}/products/${p.id}`,
    `— ${COMPANY.name}`,
  ]
  return lines.filter((l): l is string => typeof l === 'string' && l !== '').join('\n').replace('\n \n', '\n\n')
}

export const productWaUrl = (text: string) => `https://wa.me/?text=${encodeURIComponent(text)}`
export const productCardUrl = (id: number) => `/api/card/${id}`

// "Buy 2 BOX → free 1 KG SUGAR" — the best-looking line for a product this
// month (the first on the sheet), for the card and the message.
export function schemeLine(s: { qty: string; free: string }): string {
  const t = (x: string) => x.toLowerCase().replace(/\b\w/g, c => c.toUpperCase()).replace(/\s+/g, ' ').trim()
  return `Buy ${t(s.qty)} → ${t(s.free)} free`.replace(/ Free free$/i, ' free')
}
