import Fuse from 'fuse.js'
import type { MadvetProduct } from './supabase'

const HINDI_KEYWORD_MAP: Record<string, string> = {
  keeda: 'parasite antiparasitic anthelmintic',
  keede: 'parasite antiparasitic anthelmintic',
  kide: 'parasite antiparasitic anthelmintic',
  kira: 'parasite worm anthelmintic',
  kire: 'parasite worm anthelmintic',
  bukhar: 'fever antibiotic antipyretic',
  bukhaar: 'fever antibiotic antipyretic',
  dast: 'diarrhea antidiarrheal loose motions',
  pechish: 'diarrhea dysentery antidiarrheal',
  ulti: 'vomiting gastro',
  dudh: 'milk mastitis udder',
  teat: 'mastitis udder',
  kamzori: 'vitamin supplement weakness',
  kamjori: 'vitamin supplement weakness',
  zakhm: 'wound topical antiseptic',
  ghav: 'wound topical antiseptic',
  khujli: 'itch parasite antifungal skin dermatitis',
  khaj: 'itch parasite skin',
  sans: 'respiratory pneumonia breathing',
  khansi: 'cough respiratory',
  liver: 'liver hepato tonic',
  haddi: 'calcium bone mineral',
  motions: 'diarrhea antidiarrheal',
  loose: 'diarrhea antidiarrheal',
  bolus: 'bolus tablet oral',
  injection: 'injection injectable',
  dawai: 'medicine treatment',
  dawa: 'medicine treatment',
  ilaj: 'treatment medicine',
  sust: 'weakness vitamin supplement liver tonic',
  'dudh kam': 'milk production udder mastitis',
  'pet phula': 'bloat tympany gastro',
  'pair sujan': 'foot rot joint infection',
  'aankhein laal': 'pink eye vitamin eye infection',
  'baar baar garam': 'repeat breeding reproductive hormone',
  'bachcha nahi rukta': 'repeat breeding reproductive infertility',
  garbhpat: 'abortion reproductive progesterone',
  thaan: 'mastitis udder teat milk',
  sujan: 'inflammation anti-inflammatory swelling',
  'tez bukhar': 'high fever antibiotic antipyretic',
  safai: 'antiseptic wound topical',
  cheechad: 'tick ectoparasiticide permethrin',
  chittal: 'tick ectoparasiticide',
  jheen: 'lice ectoparasiticide',
  allergy: 'antihistamine anti-allergic urticaria',
  daane: 'allergy antihistamine urticaria skin',
  chamdi: 'skin dermatological topical',
  deworming: 'anthelmintic antiparasitic worm',
  dewormer: 'anthelmintic antiparasitic worm',
  antibiotic: 'antibiotic bacterial infection',
  spray: 'spray topical dermatological',
  soap: 'soap ectoparasiticide topical',
}

function buildKeywordQuery(query: string): string {
  const lower = query.toLowerCase().trim()
  let expanded = lower
  for (const [hindi, english] of Object.entries(HINDI_KEYWORD_MAP)) {
    if (lower.includes(hindi)) {
      expanded += ' ' + english
    }
  }
  return expanded
}

// Check if query is asking about a specific product by name
function isSpecificProductQuery(query: string, products: MadvetProduct[]): MadvetProduct | null {
  const lower = query.toLowerCase().trim()
  for (const p of products) {
    const name = (p.product_name || '').toLowerCase()
    if (!name) continue
    // Direct name match
    if (lower.includes(name)) return p
    // Check aliases
    const aliases = (p.aliases || '').toLowerCase().split(',').map(a => a.trim())
    for (const alias of aliases) {
      if (alias.length >= 4 && lower.includes(alias)) return p
    }
  }
  return null
}

export function searchProducts(
  products: MadvetProduct[],
  query: string,
  topK = 5
): MadvetProduct[] {
  if (!query?.trim() || products.length === 0) return []

  // Check for specific product query first — if found, return only that product
  const specificMatch = isSpecificProductQuery(query, products)
  if (specificMatch) return [specificMatch]

  // Dynamically discover all string column names from actual product data
  const allKeys = products.length > 0
    ? Object.keys(products[0]).filter((k) => typeof products[0][k] === 'string')
    : ['product_name', 'salt_ingredient', 'dosage', 'category', 'species', 'indication', 'aliases']

  const fuseKeys = allKeys.map((k) => ({
    name: k,
    weight:
      k.includes('name') ? 3 :
      k === 'aliases' ? 2.5 :
      k.includes('indication') ? 2 :
      k.includes('salt') || k.includes('composition') ? 2 :
      k.includes('category') || k.includes('species') ? 1.5 : 0.5,
  }))

  const fuse = new Fuse(products, {
    keys: fuseKeys,
    threshold: 0.45,
    includeScore: true,
    ignoreLocation: true,
    minMatchCharLength: 3,
    shouldSort: true,
  })

  const lowerQuery = query.toLowerCase()
  const expandedQuery = buildKeywordQuery(query)

  // Layer 0: direct word-level match — minimum 4 chars to avoid noise
  const queryWords = lowerQuery.split(/\s+/).filter((w) => w.length >= 4)
  const directMatches: MadvetProduct[] = []
  
  for (const p of products) {
    const searchable = (
      (p.product_name || '') + ' ' +
      (p.salt_ingredient || p.salt || '') + ' ' +
      (p.category || '') + ' ' +
      (p.indication || '') + ' ' +
      (p.aliases || '')
    ).toLowerCase()
    
    if (queryWords.some((w) => searchable.includes(w))) {
      directMatches.push(p)
    }
  }

  // Layer 1: fuzzy on original query
  const layer1 = fuse.search(query).map((r) => r.item)

  // Layer 2: fuzzy on Hindi-expanded query
  const layer2 = expandedQuery !== lowerQuery
    ? fuse.search(expandedQuery).map((r) => r.item)
    : []

  // Merge all layers, deduplicate
  const seen = new Set<string>()
  const combined: MadvetProduct[] = []
  for (const p of [...directMatches, ...layer1, ...layer2]) {
    const key = (p.product_name || '') + '||' + (p.salt_ingredient || p.salt || '')
    if (!seen.has(key)) {
      seen.add(key)
      combined.push(p)
    }
  }

  return combined.slice(0, topK)
}
