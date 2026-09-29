import { ImageResponse } from 'next/og'
import { ProductCard, CARD_SIZE, cardFonts } from '@/lib/productCard'
import { fetchPackIds, packUrl } from '@/lib/packs'
import { productWithScheme } from '@/lib/productData'

// What a shared product link unfolds into on WhatsApp, Facebook, etc.
export const size = CARD_SIZE.og
export const contentType = 'image/png'
export const alt = 'Madvet product'

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [{ product, scheme }, packs, fonts] = await Promise.all([productWithScheme(Number(id)), fetchPackIds(), cardFonts()])
  if (!product) return new ImageResponse(<div style={{ display: 'flex', width: '100%', height: '100%', background: '#1a3a2a', color: '#f5f0e8', fontSize: 64, alignItems: 'center', justifyContent: 'center' }}>Madvet Animal Healthcare</div>, size)
  return new ImageResponse(<ProductCard p={product} scheme={scheme} shape="og" pack={packs.has(product.id) ? packUrl(product.id, 'png') : ''} />, { ...size, fonts })
}
