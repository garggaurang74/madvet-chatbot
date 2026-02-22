import { Metadata } from 'next'
import { createClient } from '@supabase/supabase-js'
import ProductsClient from './ProductsClient'

export const metadata: Metadata = {
  title: 'Products | Madvet Animal Healthcare',
  description: 'Complete range of Madvet veterinary products — antibiotics, supplements, dewormers and more.',
}

// Revalidate every 60 seconds so SQL edits show up quickly
export const revalidate = 60

export interface Product {
  id: number
  name: string
  salt: string
  packaging: string
  formulation: string
  category: string
  species: string
  indication: string
  description: string
  benefits: string
  aliases: string
}

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

function normalizeCategory(c: string): string {
  return CAT_NORMALIZE[c] || c
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
      p.includes('solution') || p.includes(' ml') || p.includes(' litre') ||
      p.includes(' liter'))                                                 return 'Liquid'
  return 'Other'
}

async function fetchProducts(): Promise<Product[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const table = process.env.NEXT_PUBLIC_SUPABASE_TABLE || 'products_enriched'

  if (!url || !key) return []

  const supabase = createClient(url, key)

  const { data, error } = await supabase
    .from(table)
    .select('id, product_name, salt_ingredient, packaging, formulation, category, species, indication, description, usp_benefits, aliases')
    .order('id', { ascending: true })
    .limit(500)

  if (error || !data) {
    console.error('[Products] Supabase error:', error?.message)
    return []
  }

  return data.map((row: any): Product => {
    const rawPackaging = (row.packaging || '').trim()
    // ✅ FIX: Use formulation column directly from DB — fallback to auto-detect only if blank
    const formulation = (row.formulation || '').trim() || getFormulationFallback(rawPackaging)

    return {
      id:          Number(row.id),
      name:        (row.product_name    || '').trim(),
      salt:        (row.salt_ingredient || '').trim(),
      packaging:   rawPackaging,
      formulation,
      category:    normalizeCategory((row.category || '').trim()),
      species:     (row.species         || '').trim(),
      indication:  (row.indication      || '').trim(),
      description: (row.description     || '').trim(),
      benefits:    (row.usp_benefits    || '').trim(),
      aliases:     (row.aliases         || '').trim(),
    }
  })
}

export default async function ProductsPage() {
  const products = await fetchProducts()
  return <ProductsClient products={products} />
}
