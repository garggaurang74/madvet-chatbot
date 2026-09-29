import { Metadata } from 'next'
import { fetchFilms, fetchProducts } from '@/lib/catalog'
import { fetchSchemes, schemeMatch } from '@/lib/schemes'
import SchemesClient, { type SchemeGroup } from './SchemesClient'

export const metadata: Metadata = {
  title: 'Trade Schemes | Madvet Animal Healthcare',
  description: "This month's MADVET trade schemes for retailers and stockists — buy the quantity, get the gift.",
}

// Pre-built, refreshed every 5 minutes (was rendered per visit until 30 Sep).
export const revalidate = 300

const squash = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')
const title = (s: string) => s.toLowerCase().replace(/\b\w/g, c => c.toUpperCase()).replace(/(\d)(Ml|Gm|Ltr|Kg)\b/g, (_, d, u) => d + u.toLowerCase())

export default async function SchemesPage() {
  const [{ month, schemes }, products, films] = await Promise.all([fetchSchemes(), fetchProducts(), fetchFilms()])
  const filmOf = new Map<number, string>()
  for (const f of films) for (const id of f.ids) filmOf.set(id, f.youtubeId || f.slug)

  // How a sheet line finds its product lives in lib/schemes.ts (schemeMatch),
  // shared with /schemes/check, where the office can see every line's match.
  // A line whose exact product is not on the site (a pack we do not list —
  // CALCIFORCE 30ML — or a combo) keeps its own card, titled as the sheet
  // writes it, with NO photo or link: never another pack's carton (client,
  // 29 Sep: the 100 ml carton on the 30 ml line was "unacceptable").
  const groups = new Map<string, SchemeGroup>()
  for (const s of schemes) {
    const p = schemeMatch(s, products).product
    const k = p ? `p${p.id}` : `i${squash(s.item)}`
    if (!groups.has(k)) groups.set(k, {
      key: k, name: p?.name || title(s.item), productId: p?.id ?? 0, image: p?.image_url || '',
      category: p?.category || '', film: p ? filmOf.get(p.id) || '' : '', offers: [],
    })
    groups.get(k)!.offers.push({ qty: s.qty, item: s.item, free: s.free })
  }
  return <SchemesClient month={month} groups={[...groups.values()]} />
}
