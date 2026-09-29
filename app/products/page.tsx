import { Metadata } from 'next'
import { Suspense } from 'react'
import ProductsClient from './ProductsClient'
import type { Product } from './types'
import { fetchFilms, fetchProducts } from '@/lib/catalog'
import { fetchPackIds } from '@/lib/packs'
import { schemeMap } from '@/lib/productData'

export type { Product }

export const metadata: Metadata = {
  title: 'Products | Madvet Animal Healthcare',
  description: 'Complete range of Madvet veterinary products — antibiotics, supplements, dewormers and more.',
}

// Served pre-built, refreshed every 5 minutes; admin saves clear it at once
// (app/api/revalidate). Rendered per request until 30 Sep, ~2.5 s a visit.
export const revalidate = 300

// ProductsFetcher is the async server component that does the Supabase call.
// Wrapping it in Suspense means Next.js streams the outer shell (nav, header)
// to the browser immediately, and slots in the product grid once ready.
async function ProductsFetcher() {
  const [products, films, packs] = await Promise.all([fetchProducts(), fetchFilms(), fetchPackIds()])
  const schemes = Object.fromEntries(await schemeMap(products))
  // Each product with a factory film gets a Video button that opens it
  const filmOf = new Map<number, string>()
  for (const f of films) for (const id of f.ids) filmOf.set(id, f.youtubeId || f.slug)
  // Only what the grid shows or searches travels to the phone — the Hindi
  // copy and the old video links belong to the product page.
  const lean = products.map(p => ({ ...p, description_hi: '', usp_benefits_hi: '', video_url: '', ...(filmOf.has(p.id) ? { film_key: filmOf.get(p.id) } : {}) }))
  return <ProductsClient products={lean} packIds={[...packs]} schemes={schemes} />
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
