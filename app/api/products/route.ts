import { NextResponse } from 'next/server'
import { fetchAllProducts } from '@/lib/supabase'

export async function GET() {
  try {
    const products = await fetchAllProducts()
    return NextResponse.json({ products })
  } catch (err) {
    console.error('[Madvet] Products API error:', err)
    return NextResponse.json({ products: [] }, { status: 200 })
  }
}
