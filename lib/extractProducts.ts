import type { MadvetProduct } from './supabase'

export function extractMentionedProducts(
  text: string,
  products: MadvetProduct[]
): MadvetProduct[] {
  if (!text || products.length === 0) return []
  const lower = text.toLowerCase()
  const seen = new Set<string>()
  const result: MadvetProduct[] = []

  for (const p of products) {
    const name = (p.product_name || '').toLowerCase().trim()
    const salt = (p.salt || '').toLowerCase().trim()
    if (!name) continue

    const nameWords = name.split(/\s+/).filter((w) => w.length >= 3)
    const saltWords = salt.split(/[\s,+\/]+/).filter((w) => w.length >= 4)

    const nameMatch = nameWords.length > 0 && nameWords.every((w) => lower.includes(w))
    const saltMatch = saltWords.length > 0 && saltWords.some((w) => lower.includes(w))
    const firstWordMatch = nameWords[0]?.length >= 4 && lower.includes(nameWords[0])

    if ((nameMatch || saltMatch || firstWordMatch) && !seen.has(name)) {
      seen.add(name)
      result.push(p)
    }
  }

  return result.slice(0, 3)
}
