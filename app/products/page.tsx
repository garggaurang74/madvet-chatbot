import { Metadata } from 'next'
import { Suspense } from 'react'
import ProductsClient from './ProductsClient'
import type { Product } from './types'
import { fetchProducts } from '@/lib/catalog'

export type { Product }

export const metadata: Metadata = {
  title: 'Products | Madvet Animal Healthcare',
  description: 'Complete range of Madvet veterinary products — antibiotics, supplements, dewormers and more.',
}

// Always fetch fresh from Supabase — admin image updates must reflect immediately.
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

// ProductsFetcher is the async server component that does the Supabase call.
// Wrapping it in Suspense means Next.js streams the outer shell (nav, header)
// to the browser immediately, and slots in the product grid once ready.
async function ProductsFetcher() {
  const products = await fetchProducts()
  return <ProductsClient products={products} />
}

function ProductsSkeleton() {
  return (
    <div style={{
      maxWidth: 1400, margin: '48px auto', padding: '0 48px',
      display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20,
    }}>
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} style={{
          background: '#ede6d6', borderRadius: 14, height: 260,
          animation: 'pulse 1.5s ease-in-out infinite',
          opacity: 0.5 + (i % 3) * 0.1,
        }} />
      ))}
      <style>{`@keyframes pulse { 0%,100%{opacity:.4} 50%{opacity:.7} }`}</style>
    </div>
  )
}

export default function ProductsPage() {
  return (
    <Suspense fallback={<ProductsSkeleton />}>
      <ProductsFetcher />
    </Suspense>
  )
}
