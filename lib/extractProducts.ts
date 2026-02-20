import type { MadvetProduct } from './supabase'

// ─────────────────────────────────────────────
// Extracts products MENTIONED BY NAME in bot response text
// Shows cards for ALL products the bot recommended
// ─────────────────────────────────────────────
export function extractMentionedProducts(
  text:     string,
  products: MadvetProduct[]
): MadvetProduct[] {
  if (!text || products.length === 0) return []

  const lower  = text.toLowerCase()
  const seen   = new Set<string>()
  const result: MadvetProduct[] = []

  // Sort products by name length descending — longer/more specific names match first
  // This prevents "Tikks" matching before "Tikks-Stop 6ml" etc.
  const sorted = [...products].sort(
    (a, b) => (b.product_name?.length ?? 0) - (a.product_name?.length ?? 0)
  )

  for (const p of sorted) {
    const name = (p.product_name ?? '').toLowerCase().trim()
    if (!name || name.length < 3) continue

    // Direct full name match (most reliable)
    const nameMatch = lower.includes(name)

    // All significant words match (for multi-word product names)
    const nameWords     = name.split(/\s+/).filter((w) => w.length >= 3)
    const allWordsMatch = nameWords.length > 1 && nameWords.every((w) => lower.includes(w))

    // Alias match
    const aliases = (p.aliases ?? '')
      .toLowerCase()
      .split(/[,|]/)
      .map((a) => a.trim())
      .filter((a) => a.length >= 4)
    const aliasMatch = aliases.some((alias) => lower.includes(alias))

    if ((nameMatch || allWordsMatch || aliasMatch) && !seen.has(name)) {
      seen.add(name)
      result.push(p)
    }
  }

  return result
}
