import { Metadata } from 'next'
import { fetchFilms, fetchProducts } from '@/lib/catalog'
import { fetchSchemes } from '@/lib/schemes'
import SchemesClient, { type SchemeGroup } from './SchemesClient'

export const metadata: Metadata = {
  title: 'Trade Schemes | Madvet Animal Healthcare',
  description: "This month's MADVET trade schemes for retailers and stockists — buy the quantity, get the gift.",
}

export const dynamic = 'force-dynamic'

const squash = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')
// Spellings in the sheet that match no product name as typed
const ALIAS: Record<string, string> = { gumblote: 'gumbloat', alboi: 'albol' }

export default async function SchemesPage() {
  const [{ month, schemes }, products, films] = await Promise.all([fetchSchemes(), fetchProducts(), fetchFilms()])
  const filmOf = new Map<number, string>()
  for (const f of films) for (const id of f.ids) filmOf.set(id, f.youtubeId || f.slug)

  // A sheet line names a product loosely ("BUTACIN 100 ML", "LEVO FORCE BOLUS");
  // take the product sharing the longest start with it, and only if that
  // start is long enough to be a name rather than a coincidence.
  const match = (item: string) => {
    let key = squash(item)
    for (const [a, b] of Object.entries(ALIAS)) if (key.startsWith(a)) key = b + key.slice(a.length)
    let best = null as null | (typeof products)[number], bestLen = 0
    for (const p of products) {
      const n = squash(p.name)
      let k = 0
      while (k < n.length && k < key.length && n[k] === key[k]) k++
      if (k > bestLen) { best = p; bestLen = k }
    }
    return best && bestLen >= Math.min(6, key.length) ? best : null
  }

  const groups = new Map<string, SchemeGroup>()
  for (const s of schemes) {
    const p = match(s.item)
    const k = p ? `p${p.id}` : `i${squash(s.item)}`
    if (!groups.has(k)) groups.set(k, {
      key: k, name: p?.name || s.item, productId: p?.id ?? 0, image: p?.image_url || '',
      category: p?.category || '', film: p ? filmOf.get(p.id) || '' : '', offers: [],
    })
    groups.get(k)!.offers.push({ qty: s.qty, item: s.item, free: s.free })
  }
  return <SchemesClient month={month} groups={[...groups.values()]} />
}
