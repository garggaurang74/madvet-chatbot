import { Metadata } from 'next'
import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import type { Product } from '../types'
import ProductDetailClient from './ProductDetailClient'

export const revalidate = 3600

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
  return {
    title: `${product.name} | Madvet Animal Healthcare`,
    description: product.description || `${product.name} — ${product.category} for ${product.species}`,
  }
}

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const product = await fetchProduct(Number(id))
  if (!product) notFound()
  return <ProductDetailClient product={product} />
}
