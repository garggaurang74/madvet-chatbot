import { Metadata } from 'next'
import { fetchProducts, youtubeId } from '@/lib/catalog'
import VideosClient, { type VideoItem } from './VideosClient'

export const metadata: Metadata = {
  title: 'Product Videos | Madvet Animal Healthcare',
  description: 'Short Hindi videos on every Madvet veterinary product — what it treats, how it works and how to use it.',
}

// Same list as /products: a video appears here the moment its product has a
// video_url, and disappears when the product is deleted.
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

export default async function VideosPage() {
  const products = await fetchProducts()
  // Pack sizes of one product share one film (Butacin 30ml and 100ml): show it
  // once, naming both sizes, linked to the first.
  const byId = new Map<string, VideoItem>()
  for (const p of products) {
    const id = p.video_url ? youtubeId(p.video_url) : null
    if (!id) continue
    const seen = byId.get(id)
    if (seen) seen.name += ` / ${p.name}`
    else byId.set(id, { productId: p.id, youtubeId: id, name: p.name, category: p.category, species: p.species, indication: p.indication })
  }
  const videos = [...byId.values()]
  return <VideosClient videos={videos} channelUrl={process.env.NEXT_PUBLIC_YOUTUBE_CHANNEL_URL || ''} />
}
