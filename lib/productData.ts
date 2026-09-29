// Server-side: a product with this month's scheme line, for its page, its
// share message and its card. The scheme comes from the office's sheet via the
// same matcher /schemes uses, so all three always agree.
import { fetchProducts, fetchFolder } from './catalog'
import type { Product } from '@/app/products/types'
import { fetchSchemes, matchScheme } from './schemes'
import { schemeLine } from './productShare'

export async function schemeMap(products?: Product[]): Promise<Map<number, string>> {
  const [ps, { schemes }] = await Promise.all([products ? Promise.resolve(products) : fetchProducts(), fetchSchemes()])
  const out = new Map<number, string>()
  for (const s of schemes) {
    const p = matchScheme(s.item, ps).product
    if (p && !out.has(p.id)) out.set(p.id, schemeLine(s))
  }
  return out
}

export async function productWithScheme(id: number): Promise<{ product: Product | null; scheme: string }> {
  const ps = await fetchProducts()
  const product = ps.find(p => p.id === id) || null
  if (!product) return { product: null, scheme: '' }
  return { product, scheme: (await schemeMap(ps)).get(id) || '' }
}

// The product's page in the printed folder, as the JPEG a customer is sent
// (client, 29 Sep: "give full folder page atleast" — the folder page is the
// designed, checked sales sheet). Published by the video repo's
// small_films.mjs --folder-web into film-downloads/folder/jpg/NN.jpg.
export async function folderPageOf(id: number): Promise<number> {
  return (await fetchFolder()).find(pg => pg.ids?.includes(id))?.p ?? 0
}
export const folderJpg = (p: number) =>
  `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/film-downloads/folder/jpg/${String(p).padStart(2, '0')}.jpg`
