import { Metadata } from 'next'
import { downloadUrl, fetchDownloads, fetchProducts, youtubeId } from '@/lib/catalog'
import VideosClient, { type VideoItem } from './VideosClient'

export const metadata: Metadata = {
  title: 'Product Videos | Madvet Animal Healthcare',
  description: 'Short Hindi videos on every Madvet veterinary product — what it treats, how it works and how to use it.',
}

// Same list as /products: a video appears here the moment its product has a
// video_url, and disappears when the product is deleted.
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
  const [products, downloads] = await Promise.all([fetchProducts(), fetchDownloads()])

  // Pack sizes of one product share one film (Butacin 30ml and 100ml): show it
  // once, naming both sizes, linked to the first.
  const byId = new Map<string, Omit<VideoItem, 'vertical' | 'title' | 'download' | 'downloadMB'>>()
  for (const p of products) {
    const id = p.video_url ? youtubeId(p.video_url) : null
    if (!id) continue
    const seen = byId.get(id)
    if (seen) seen.name += ` / ${p.name}`
    else byId.set(id, {
      productId: p.id, youtubeId: id, name: p.name, category: p.category,
      species: p.species, indication: p.indication, image: p.image_url,
    })
  }
  const videos: VideoItem[] = await Promise.all(
    [...byId.values()].map(async v => {
      const size = downloads.get(v.youtubeId)
      return {
        ...v, ...(await oembed(v.youtubeId)),
        download:   size !== undefined ? downloadUrl(v.youtubeId, v.name) : '',
        downloadMB: size ? Math.max(1, Math.round(size / 1e6)) : 0,
      }
    }))

  return <VideosClient videos={videos} channelUrl={CHANNEL_URL} />
}
