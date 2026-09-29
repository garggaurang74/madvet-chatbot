import { createClient } from '@supabase/supabase-js'
import type { Product } from '@/app/products/types'

// The one product list. /products and /videos both read it, so a product
// added, edited or deleted in Supabase changes both pages at once.

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
  'Vitamin Supplement / Galactogogue':               'Vitamin Supplement',
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

export async function fetchProducts(): Promise<Product[]> {
  const url   = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key   = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const table = process.env.NEXT_PUBLIC_SUPABASE_TABLE || 'products_enriched'

  if (!url || !key) return []

  // Cached with the page and refreshed every 5 minutes; an admin save clears
  // the 'products' tag at once (app/api/revalidate), so edits still show
  // immediately. Fetched fresh on every visit before 30 Sep, which cost the
  // product pages 1.5–2 s each.
  const supabase = createClient(url, key, { global: { fetch: (input: RequestInfo | URL, init?: RequestInit) =>
        fetch(input, { ...init, next: { revalidate: 300, tags: ['products'] } } as RequestInit), } })

  const { data, error } = await supabase
    .from(table)
    .select('id, product_name, salt_ingredient, packaging, formulation, category, species, indication, description, usp_benefits, description_hi, usp_benefits_hi, aliases, image_url, video_url')
    .order('id', { ascending: true })
    .limit(500)

  if (error || !data) {
    console.error('[Products] Supabase error:', error?.message)
    return []
  }

  return data.map((row: any): Product => {
    const rawPackaging = (row.packaging || '').trim()
    const formulation  = (row.formulation || '').trim() || getFormulationFallback(rawPackaging)

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
      description_hi:  (row.description_hi  || '').trim(),
      usp_benefits_hi: (row.usp_benefits_hi || '').trim(),
      aliases:     (row.aliases         || '').trim(),
      image_url:   (row.image_url       || '').trim(),
      video_url:   (row.video_url        || '').trim(),
    }
  })
}

// Any YouTube link form the admin accepts (watch, youtu.be, embed, shorts) -> the 11-char id.
export function youtubeId(url: string): string | null {
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([A-Za-z0-9_-]{11})/)
  return m?.[1] ?? null
}

// Small MP4s for download live in the public `film-downloads` bucket, named
// <youtubeId>.mp4. Listing needs the service key; any failure (bucket not
// created yet, key missing) just means no download buttons.
export const DOWNLOAD_BUCKET = 'film-downloads'

export async function fetchDownloads(): Promise<Map<string, number>> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  const sizes = new Map<string, number>()
  if (!url || !key) return sizes
  const { data, error } = await createClient(url, key, { auth: { persistSession: false } })
    .storage.from(DOWNLOAD_BUCKET).list('', { limit: 1000 })
  if (error || !data) return sizes
  for (const f of data) {
    const m = f.name.match(/^([A-Za-z0-9_-]{11})\.mp4$/)
    if (m) sizes.set(m[1], Number(f.metadata?.size) || 0)
  }
  return sizes
}

// ?download= makes Supabase send Content-Disposition, so phones save the file instead of playing it
export function downloadUrl(youtubeId: string, name: string): string {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${DOWNLOAD_BUCKET}/${youtubeId}.mp4?download=${encodeURIComponent(fileName(name))}`
}

// The factory's films, published by `factory/small_films.mjs --site` (video
// repo) as film-downloads/films/<slug>.mp4 + <slug>.jpg + manifest.json.
// `ids` are the products_enriched ids the film belongs to; a film with ids
// but none still on the site is hidden, so deleting a product retires it.
export interface SiteFilm {
  slug:      string
  name:      string
  nameHi:    string
  ids:       number[]
  category:  string
  youtubeId: string
  vertical:  boolean
  bytes:     number
}

export async function fetchFilms(): Promise<SiteFilm[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!url) return []
  try {
    const res = await fetch(`${url}/storage/v1/object/public/${DOWNLOAD_BUCKET}/films/manifest.json`,
      { next: { revalidate: 60 } })
    if (!res.ok) return []
    const m = await res.json()
    return Array.isArray(m?.films) ? m.films : []
  } catch {
    return []
  }
}

function fileName(name: string): string {
  return `${name.replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '')}-MADVET.mp4`
}

export function filmFiles(f: SiteFilm) {
  const base = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${DOWNLOAD_BUCKET}/films/${f.slug}`
  return {
    mp4:        `${base}.mp4`,
    poster:     `${base}.jpg`,
    download:   `${base}.mp4?download=${encodeURIComponent(fileName(f.name))}`,
    downloadMB: Math.max(1, Math.round(f.bytes / 1e6)),
  }
}

// The product folder as web pages, published by the video repo's
// `factory/small_films.mjs --folder-web`: folder/pages/NN.webp (1600 px),
// folder/thumbs/NN.webp and folder/manifest.json. `ids` on a product page
// are the products_enriched ids it covers.
export interface FolderPage {
  p:        number
  kind:     'cover' | 'section' | 'product' | 'back'
  title:    string
  section?: string
  ids?:     number[]
}

export async function fetchFolder(): Promise<FolderPage[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!url) return []
  try {
    const res = await fetch(`${url}/storage/v1/object/public/${DOWNLOAD_BUCKET}/folder/manifest.json`, { next: { revalidate: 300 } })
    if (!res.ok) return []
    const m = await res.json()
    return Array.isArray(m?.pages) ? m.pages : []
  } catch {
    return []
  }
}

export function folderImage(p: number, size: 'pages' | 'thumbs' = 'pages'): string {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${DOWNLOAD_BUCKET}/folder/${size}/${String(p).padStart(2, '0')}.webp`
}
