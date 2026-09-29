// Clean pack cut-outs (transparent, cropped to the carton) published by the
// video repo's factory/site_packs.mjs. 93 of 94 products have one; the rest
// fall back to their catalogue photograph.
const BASE = () => `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/film-downloads/packs`

export async function fetchPackIds(): Promise<Set<number>> {
  try {
    const res = await fetch(`${BASE()}/manifest.json`, { next: { revalidate: 300 } })
    if (!res.ok) return new Set()
    const m = await res.json()
    return new Set(Object.keys(m?.packs || {}).map(Number))
  } catch { return new Set() }
}

export const packUrl = (id: number, ext: 'webp' | 'png' = 'webp') => `${BASE()}/${id}.${ext}`
