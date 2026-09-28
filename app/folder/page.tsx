import { Metadata } from 'next'
import { fetchFilms, fetchFolder, fetchProducts } from '@/lib/catalog'
import FolderViewer, { type ViewerPage } from './FolderViewer'

export const metadata: Metadata = {
  title: 'Product Folder 2026 | Madvet Animal Healthcare',
  description: 'The complete MADVET veterinary product folder — 65 brands in seven sections, page by page.',
}

export const dynamic = 'force-dynamic'

export default async function FolderPage() {
  const [pages, products, films] = await Promise.all([fetchFolder(), fetchProducts(), fetchFilms()])
  const live = new Set(products.map(p => p.id))
  const filmOf = new Map<number, string>()
  for (const f of films) for (const id of f.ids) filmOf.set(id, f.youtubeId || f.slug)

  const view: ViewerPage[] = pages.map(pg => {
    const ids = (pg.ids || []).filter(id => live.has(id))
    const withFilm = ids.find(id => filmOf.has(id))
    return {
      p: pg.p, kind: pg.kind, title: pg.title, section: pg.section || '',
      productId: ids[0] ?? 0,
      film: withFilm ? filmOf.get(withFilm)! : '',
      // search should find a page by any product it covers, e.g. "30ml"
      names: ids.map(id => products.find(p => p.id === id)?.name || '').join(' '),
    }
  })
  return <FolderViewer pages={view} />
}
