import { ImageResponse } from 'next/og'
import { ProductCard, CARD_SIZE, cardFonts } from '@/lib/productCard'
import { fetchPackIds, packUrl } from '@/lib/packs'
import { productWithScheme } from '@/lib/productData'

// The portrait card a phone sends into a WhatsApp chat (1080×1350 PNG).
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [{ product, scheme }, packs, fonts] = await Promise.all([productWithScheme(Number(id)), fetchPackIds(), cardFonts()])
  if (!product) return new Response('Not found', { status: 404 })
  return new ImageResponse(<ProductCard p={product} scheme={scheme} shape="story" pack={packs.has(product.id) ? packUrl(product.id, 'png') : ''} />, {
    ...CARD_SIZE.story,
    fonts,
    headers: { 'Cache-Control': 'public, max-age=600, s-maxage=600, stale-while-revalidate=3600' },
  })
}
