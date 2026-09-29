import { Metadata } from 'next'
import { fetchFilms, fetchProducts } from '@/lib/catalog'
import { fetchSchemes, matchScheme } from '@/lib/schemes'
import SchemesClient, { type SchemeGroup } from './SchemesClient'

export const metadata: Metadata = {
  title: 'Trade Schemes | Madvet Animal Healthcare',
  description: "This month's MADVET trade schemes for retailers and stockists — buy the quantity, get the gift.",
}

export const dynamic = 'force-dynamic'

const squash = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')
const title = (s: string) => s.toLowerCase().replace(/\b\w/g, c => c.toUpperCase()).replace(/(\d)(Ml|Gm|Ltr|Kg)\b/g, (_, d, u) => d + u.toLowerCase())

export default async function SchemesPage() {
  const [{ month, schemes }, products, films] = await Promise.all([fetchSchemes(), fetchProducts(), fetchFilms()])
  const filmOf = new Map<number, string>()
  for (const f of films) for (const id of f.ids) filmOf.set(id, f.youtubeId || f.slug)

  // How a sheet line finds its product lives in lib/schemes.ts (matchScheme),
  // shared with /schemes/check, where the office can see every line's match.
  // A line with a pack we do not list (CALCIFORCE 30ML) or a combo keeps its
  // own card, titled as the sheet writes it, with the photo and links of its
  // family — never filed under the other pack's name.
  const groups = new Map<string, SchemeGroup>()
  for (const s of schemes) {
    const m = matchScheme(s.item, products)
    const p = m.product, show = p || m.family
    const k = p ? `p${p.id}` : `i${squash(s.item)}`
    if (!groups.has(k)) groups.set(k, {
      key: k, name: p?.name || title(s.item), productId: show?.id ?? 0, image: show?.image_url || '',
      category: show?.category || '', film: show ? filmOf.get(show.id) || '' : '', offers: [],
    })
    groups.get(k)!.offers.push({ qty: s.qty, item: s.item, free: s.free })
  }
  return <SchemesClient month={month} groups={[...groups.values()]} />
}
