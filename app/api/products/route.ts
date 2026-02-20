import { NextResponse } from 'next/server'
import { getCachedProducts } from '@/lib/productCache'

// FIX: Use getCachedProducts — not fetchAllProducts directly
// fetchAllProducts bypasses cache layer
export async function GET() {
  try {
    const products = await getCachedProducts()
    return NextResponse.json({ products })
  } catch (err) {
    console.error('[Products API]', err)
    return NextResponse.json({ products: [] }, { status: 200 })
  }
}
