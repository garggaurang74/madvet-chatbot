import { Metadata } from 'next'
import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import { headers } from 'next/headers'
import type { Product } from '../types'
import ProductDetailClient, { type ProductFilm, type RelatedProduct } from './ProductDetailClient'
import { fetchFilms, fetchFolder, filmFiles, fetchProducts } from '@/lib/catalog'
import { fetchPackIds, packUrl } from '@/lib/packs'
import { schemeMap } from '@/lib/productData'
import { purposeLine } from '@/lib/productCopy'

export const dynamic = 'force-dynamic'    // SSR on every request — no page cache
export const fetchCache = 'force-no-store' // bypass Next.js fetch cache

const CAT_NORMALIZE: Record<string, string> = {
  'Anti-inflammatory':                               'Anti-inflammatory / Analgesic',
  'Anti-inflammatory, Analgesic, Antipyretic':       'Anti-inflammatory / Analgesic',
  'Anti-inflammatory / Analgesic / Antipyretic':     'Anti-inflammatory / Analgesic',
  'Analgesic / Antipyretic':                         'Anti-inflammatory / Analgesic',
  'Analgesic, Antipyretic':                          'Anti-inflammatory / Analgesic',
  'Analgesic':                                       'Anti-inflammatory / Analgesic',
  'Anthelmintic':                                    'Anthelmintic / Antiparasitic',
  'Antiparasitic':                                   'Anthelmintic / Antiparasitic',
  'Antibiotic (Cephalosporin)':                      'Antibiotic',
  'Antibiotic (Fluoroquinolone)':                    'Antibiotic',
  'Antihistamine / Anti-allergic':                   'Antihistamine',
  'Dermatological / Topical':                        'Dermatological',
  'Probiotic / Immunomodulator / Vitamin Supplement':'Probiotic',
  'Antidiarrheal / Gastrointestinal':                'Antidiarrheal',
}

function getFormulationFallback(packaging: string): string {
  const p = packaging.toLowerCase()
  if (p.includes('bolus'))                                                  return 'Bolus'
  if (p.includes('inj') || p.includes('syringe'))                          return 'Injection'
  if (p.includes('tablet') || p.includes(' tab'))                          return 'Tablet'
  if (p.includes('spray'))                                                  return 'Spray'
  if (p.includes('gel') || p.includes('ointment') || p.includes('cream'))  return 'Gel / Ointment'
  if (p.includes('soap'))                                                   return 'Soap'
  if (p.includes('powder') || p.includes('sachet') || p.includes(' gm') || p.includes(' kg')) return 'Powder'
  if (p.includes('pour-on') || p.includes('pour on'))                      return 'Pour-On'
  if (p.includes('suspension'))                                             return 'Suspension'
  if (p.includes('syrup') || p.includes('liq') || p.includes('liquid') ||
      p.includes('solution') || p.includes(' ml'))                         return 'Liquid'
  return 'Other'
}

async function fetchProduct(id: number): Promise<Product | null> {
  const url   = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key   = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const table = process.env.NEXT_PUBLIC_SUPABASE_TABLE || 'products_enriched'
  if (!url || !key) return null

  // Pass cache: 'no-store' so Next.js doesn't cache the Supabase fetch response
  // separately from the page. Without this, even after revalidatePath() the fetch
  // result stays stale until Next.js's internal fetch cache also expires.
  const supabase = createClient(url, key, {
    global: {
      fetch: (input: RequestInfo | URL, init?: RequestInit) =>
        fetch(input, { ...init, cache: 'no-store' }),
    },
  })
  const { data, error } = await supabase
    .from(table)
    .select('id, product_name, salt_ingredient, packaging, formulation, category, species, indication, description, usp_benefits, description_hi, usp_benefits_hi, aliases, image_url, video_url')
    .eq('id', id)
    .single()

  if (error || !data) return null

  const rawPackaging = (data.packaging || '').trim()
  const formulation  = (data.formulation || '').trim() || getFormulationFallback(rawPackaging)

  return {
    id:          Number(data.id),
    name:        (data.product_name    || '').trim(),
    salt:        (data.salt_ingredient || '').trim(),
    packaging:   rawPackaging,
    formulation,
    category:    CAT_NORMALIZE[(data.category || '').trim()] || (data.category || '').trim(),
    species:     (data.species         || '').trim(),
    indication:  (data.indication      || '').trim(),
    description: (data.description     || '').trim(),
    benefits:    (data.usp_benefits    || '').trim(),
    description_hi:  (data.description_hi  || '').trim(),
    usp_benefits_hi: (data.usp_benefits_hi || '').trim(),
    aliases:     (data.aliases         || '').trim(),
    image_url:   (data.image_url       || '').trim(),
    video_url:   (data.video_url       || '').trim(),
  }
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const product = await fetchProduct(Number(id))
  if (!product) return { title: 'Product Not Found | Madvet' }
  const description = purposeLine(product, 200) || `${product.name} — ${product.category}`
  return {
    title: `${product.name} | Madvet Animal Healthcare`,
    description,
    openGraph: { title: `${product.name} — Madvet Animal Healthcare`, description, type: 'website' },
    twitter: { card: 'summary_large_image', title: product.name, description },
  }
}

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  // Explicitly set no-store headers so Vercel's CDN never caches this response.
  // force-dynamic alone isn't enough — Vercel's edge network can still serve
  // a stale cached HTML page unless these headers are present.
  const headersList = await headers()
  const { id } = await params
  const [product, films, folder, packs, all] = await Promise.all([fetchProduct(Number(id)), fetchFilms(), fetchFolder(), fetchPackIds(), fetchProducts()])
  if (!product) notFound()
  const scheme = (await schemeMap(all)).get(product.id) || ''
  const img = (x: { id: number; image_url: string }) => packs.has(x.id) ? packUrl(x.id) : x.image_url
  const related: RelatedProduct[] = all
    .filter(x => x.category === product.category && x.id !== product.id)
    .slice(0, 8)
    .map(x => ({ id: x.id, name: x.name, category: x.category, packaging: x.packaging, formulation: x.formulation, img: img(x), cut: packs.has(x.id) }))

  // The factory's film for this product, if there is one
  const f = films.find(x => x.ids.includes(product.id))
  const film: ProductFilm | null = f ? { key: f.youtubeId || f.slug, youtubeId: f.youtubeId, vertical: f.vertical, ...filmFiles(f) } : null
  const folderPage = folder.find(pg => pg.ids?.includes(product.id))?.p ?? 0
  return <ProductDetailClient product={product} film={film} folderPage={folderPage} pack={packs.has(product.id) ? packUrl(product.id) : ''} scheme={scheme} related={related} />
}
