import { ImageResponse } from 'next/og'
import { ProductCard, CARD_SIZE, cardFonts } from '@/lib/productCard'
import { fetchPackIds, packUrl } from '@/lib/packs'
import { productWithScheme, folderPageOf, folderJpg } from '@/lib/productData'

// What a phone sends into a WhatsApp chat: the product's FOLDER PAGE (JPEG),
// or, for a product not yet in the folder, the designed card (1080×1350 PNG).
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const page = await folderPageOf(Number(id))
  if (page) {
    const r = await fetch(folderJpg(page), { next: { revalidate: 3600 } })
    if (r.ok) return new Response(await r.arrayBuffer(), { headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'public, max-age=600, s-maxage=600, stale-while-revalidate=3600' } })
  }
  const [{ product, scheme }, packs, fonts] = await Promise.all([productWithScheme(Number(id)), fetchPackIds(), cardFonts()])
  if (!product) return new Response('Not found', { status: 404 })
  return new ImageResponse(<ProductCard p={product} scheme={scheme} shape="story" pack={packs.has(product.id) ? packUrl(product.id, 'png') : ''} />, {
    ...CARD_SIZE.story,
    fonts,
    headers: { 'Cache-Control': 'public, max-age=600, s-maxage=600, stale-while-revalidate=3600' },
  })
}
