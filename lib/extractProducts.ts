import type { MadvetProduct } from './supabase'

// ─────────────────────────────────────────────
// Generic words that appear in many product names — not reliable for matching
// e.g. "3D Plus Injection" should NOT match just because "plus" + "injection" appear in bot text
// ─────────────────────────────────────────────
const GENERIC_WORDS = new Set([
  'injection', 'bolus', 'plus', 'stop', 'spray', 'gel', 'powder', 'liquid',
  'tablet', 'tablets', 'solution', 'syrup', 'ointment', 'forte', 'vet',
  'force', 'care', 'fit', 'max', 'pro', 'new', 'super', 'extra', 'double',
  'active', 'gold', 'boost', 'top', 'ok', 'mix', 'oral', 'inj', 'tab',
])

// ─────────────────────────────────────────────
// Extracts products MENTIONED BY NAME in bot response text
// Shows cards for ALL products the bot explicitly recommended
// ─────────────────────────────────────────────
export function extractMentionedProducts(
  text:     string,
  products: MadvetProduct[]
): MadvetProduct[] {
  if (!text || products.length === 0) return []

  const lower  = text.toLowerCase()
  const seen   = new Set<string>()
  const result: MadvetProduct[] = []

  // Sort by name length descending — specific names match before generic ones
  const sorted = [...products].sort(
    (a, b) => (b.product_name?.length ?? 0) - (a.product_name?.length ?? 0)
  )

  for (const p of sorted) {
    const name = (p.product_name ?? '').toLowerCase().trim()
    if (!name || name.length < 3) continue

    // 1. Direct full product name match — always reliable
    const nameMatch = lower.includes(name)

    // 2. All SIGNIFICANT (non-generic) words match
    //    Filters out "injection", "bolus", "plus" etc to prevent false positives
    //    e.g. "3D Plus Injection" → significantWords = ["3d"] only (too short/all generic)
    //         "MELOFORCE PLUS INJECTION" → significantWords = ["meloforce"] → reliable
    const nameWords = name.split(/\s+/).filter(w => w.length >= 3)
    const significantWords = nameWords.filter(w => !GENERIC_WORDS.has(w))
    // Only use word-match if there are enough SPECIFIC words to be unambiguous
    const allWordsMatch = significantWords.length >= 2
      && significantWords.every(w => lower.includes(w))

    // 3. Single unique word match — only if the word is long and truly specific
    //    e.g. "meloforce" (10 chars) alone is enough; "stop" (4 chars) is not
    const singleUniqueMatch = significantWords.length === 1
      && significantWords[0].length >= 6
      && lower.includes(significantWords[0])

    // 4. Alias match — only full alias strings, not single words
    const aliases = (p.aliases ?? '')
      .toLowerCase()
      .split(/[,|]/)
      .map(a => a.trim())
      .filter(a => a.length >= 5)  // raised from 4 to 5 to reduce false alias matches
    const aliasMatch = aliases.some(alias => lower.includes(alias))

    if ((nameMatch || allWordsMatch || singleUniqueMatch || aliasMatch) && !seen.has(name)) {
      seen.add(name)
      result.push(p)
    }
  }

  return result
}
