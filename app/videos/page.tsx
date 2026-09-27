import { Metadata } from 'next'
import { downloadUrl, fetchDownloads, fetchFilms, fetchProducts, filmFiles, youtubeId } from '@/lib/catalog'
import VideosClient, { type VideoItem } from './VideosClient'

export const metadata: Metadata = {
  title: 'Product Videos | Madvet Animal Healthcare',
  description: 'Short Hindi videos on every Madvet veterinary product — what it treats, how it works and how to use it.',
}

// Same list as /products: a film appears here when its product is on the site
// and disappears when the product is deleted.
export const dynamic = 'force-dynamic'

const CHANNEL_URL = process.env.NEXT_PUBLIC_YOUTUBE_CHANNEL_URL || 'https://www.youtube.com/@madvetanimal9695'

// YouTube's oEmbed says whether a film is vertical (a Short) and gives its
// title. Cached a day per video; a failure just means a landscape card.
async function oembed(id: string): Promise<{ vertical: boolean; title: string }> {
  try {
    const res = await fetch(`https://www.youtube.com/oembed?format=json&url=https://www.youtube.com/watch?v=${id}`,
      { next: { revalidate: 86400 } })
    if (!res.ok) return { vertical: false, title: '' }
    const d = await res.json()
    return { vertical: Number(d.height) > Number(d.width), title: String(d.title || '') }
  } catch {
    return { vertical: false, title: '' }
  }
}

export default async function VideosPage() {
  const [products, downloads, films] = await Promise.all([fetchProducts(), fetchDownloads(), fetchFilms()])
  const byProduct = new Map(products.map(p => [p.id, p]))

  // 1. The factory's films. A film for products that are all deleted is retired.
  const videos: VideoItem[] = []
  const filmYt = new Set<string>()
  for (const f of films) {
    const live = f.ids.map(id => byProduct.get(id)).filter(Boolean)
    if (f.ids.length && !live.length) continue
    const p = live[0]
    const files = filmFiles(f)
    if (f.youtubeId) filmYt.add(f.youtubeId)
    videos.push({
      key: f.youtubeId || f.slug, productId: p?.id ?? 0, youtubeId: f.youtubeId, src: files.mp4, poster: files.poster,
      name: f.name, category: f.category || p?.category || '', species: p?.species ?? '', indication: p?.indication ?? '',
      salt: p?.salt ?? '', aliases: p?.aliases ?? '',
      image: p?.image_url ?? '', vertical: f.vertical, title: f.nameHi,
      download: files.download, downloadMB: files.downloadMB,
    })
  }

  // 2. Older films linked by hand in /admin (video_url), for products the
  // factory has not filmed yet — a product with a new film shows only that one.
  // Pack sizes sharing one film (Butacin 30ml and 100ml) show once.
  const filmed = new Set(films.flatMap(f => f.ids))
  const byYt = new Map<string, VideoItem>()
  for (const p of products) {
    const id = p.video_url ? youtubeId(p.video_url) : null
    if (!id || filmYt.has(id) || filmed.has(p.id)) continue
    const seen = byYt.get(id)
    if (seen) { seen.name += ` / ${p.name}`; continue }
    const size = downloads.get(id)
    byYt.set(id, {
      key: id, productId: p.id, youtubeId: id, src: '', poster: '',
      name: p.name, category: p.category, species: p.species, indication: p.indication, image: p.image_url,
      salt: p.salt, aliases: p.aliases,
      vertical: false, title: '',
      download: size !== undefined ? downloadUrl(id, p.name) : '',
      downloadMB: size ? Math.max(1, Math.round(size / 1e6)) : 0,
    })
  }
  const older = await Promise.all([...byYt.values()].map(async v => ({ ...v, ...(await oembed(v.youtubeId)) })))

  return <VideosClient videos={[...videos, ...older]} channelUrl={CHANNEL_URL} />
}
