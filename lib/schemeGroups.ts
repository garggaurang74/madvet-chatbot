// This month's schemes, grouped one card per product — the one reading that
// /schemes, a single scheme's page (/schemes/<key>) and the share images all
// use, so what a retailer is sent is exactly what the page shows.
import { fetchFilms, fetchProducts } from './catalog'
import { fetchPackIds, packUrl } from './packs'
import { fetchSchemes, schemeMatch } from './schemes'

export interface SchemeGroup {
  key:       string
  name:      string
  productId: number
  image:     string
  /** Transparent cut-out (PNG) for the share images; '' when there is none. */
  pack:      string
  category:  string
  film:      string
  offers:    { qty: string; item: string; free: string }[]
}

const squash = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')
export const titleCase = (s: string) => s.toLowerCase().replace(/\b\w/g, c => c.toUpperCase()).replace(/(\d)(Ml|Gm|Ltr|Kg)\b/g, (_, d, u) => d + u.toLowerCase())

export async function schemeGroups(): Promise<{ month: string; groups: SchemeGroup[] }> {
  const [{ month, schemes }, products, films, packs] = await Promise.all([fetchSchemes(), fetchProducts(), fetchFilms(), fetchPackIds()])
  const filmOf = new Map<number, string>()
  for (const f of films) for (const id of f.ids) filmOf.set(id, f.youtubeId || f.slug)

  // A line whose exact product is not on the site (a pack we do not list —
  // CALCIFORCE 30ML — or a combo) keeps its own card, titled as the sheet
  // writes it, with NO photo or link: never another pack's carton (client,
  // 29 Sep: the 100 ml carton on the 30 ml line was "unacceptable").
  const groups = new Map<string, SchemeGroup>()
  for (const s of schemes) {
    const p = schemeMatch(s, products).product
    const k = p ? `p${p.id}` : `i${squash(s.item)}`
    if (!groups.has(k)) groups.set(k, {
      key: k, name: p?.name || titleCase(s.item), productId: p?.id ?? 0, image: p?.image_url || '',
      pack: p && packs.has(p.id) ? packUrl(p.id, 'png') : '',
      category: p?.category || '', film: p ? filmOf.get(p.id) || '' : '', offers: [],
    })
    groups.get(k)!.offers.push({ qty: s.qty, item: s.item, free: s.free })
  }
  return { month, groups: [...groups.values()] }
}
