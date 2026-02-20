import type { MadvetProduct } from './supabase'

// ─────────────────────────────────────────────
// Extracts products MENTIONED BY NAME in bot response text
// Only shows card if bot actually recommended the product
// FIX: Uses canonical salt_ingredient — not old p.salt
// FIX: Stricter matching — avoids false positives
// ─────────────────────────────────────────────
export function extractMentionedProducts(
  text:     string,
  products: MadvetProduct[]
): MadvetProduct[] {
  if (!text || products.length === 0) return []

  const lower  = text.toLowerCase()
  const seen   = new Set<string>()
  const result: MadvetProduct[] = []

  for (const p of products) {
    const name = (p.product_name ?? '').toLowerCase().trim()
    if (!name || name.length < 3) continue

    // FIX: Only match by product name — not by salt
    // Salt matching caused wrong products to appear
    // Bot mentions product by name — that's the signal
    const nameWords    = name.split(/\s+/).filter((w) => w.length >= 3)
    const allWordsMatch = nameWords.length > 0 && nameWords.every((w) => lower.includes(w))

    // Also check aliases
    const aliases = (p.aliases ?? '')
      .toLowerCase()
      .split(/[,|]/)
      .map((a) => a.trim())
      .filter((a) => a.length >= 4)
    const aliasMatch = aliases.some((alias) => lower.includes(alias))

    if ((allWordsMatch || aliasMatch) && !seen.has(name)) {
      seen.add(name)
      result.push(p)
    }
  }

  // FIX: Max 1 product card — bot recommends one at a time
  return result.slice(0, 1)
}
