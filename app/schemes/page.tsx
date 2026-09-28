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

export default async function SchemesPage() {
  const [{ month, schemes }, products, films] = await Promise.all([fetchSchemes(), fetchProducts(), fetchFilms()])
  const filmOf = new Map<number, string>()
  for (const f of films) for (const id of f.ids) filmOf.set(id, f.youtubeId || f.slug)

  // How a sheet line finds its product lives in lib/schemes.ts (matchScheme),
  // shared with /schemes/check, where the office can see every line's match.
  const match = (item: string) => matchScheme(item, products).product

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
