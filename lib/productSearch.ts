import Fuse from 'fuse.js'
import type { MadvetProduct } from './supabase'

const HINDI_KEYWORD_MAP: Record<string, string> = {
  keeda: 'parasite antiparasitic',
  kide: 'parasite antiparasitic',
  kira: 'parasite worm',
  bukhar: 'fever antibiotic',
  bukhaar: 'fever antibiotic',
  dast: 'diarrhea antidiarrheal loose motions',
  ulti: 'vomiting gastro',
  dudh: 'milk mastitis udder',
  teat: 'mastitis udder',
  kamzori: 'vitamin supplement weakness',
  kamjori: 'vitamin supplement',
  zakhm: 'wound topical antiseptic',
  ghav: 'wound topical',
  khujli: 'itch parasite antifungal skin',
  khaj: 'itch parasite skin',
  sans: 'respiratory pneumonia breathing',
  khansi: 'cough respiratory',
  liver: 'liver hepato tonic',
  pet: 'gastro intestinal stomach',
  haddi: 'calcium bone mineral',
  motions: 'diarrhea antidiarrheal',
  loose: 'diarrhea antidiarrheal',
  stop: 'diarrhea antidiarrheal bolus',
  bolus: 'bolus tablet oral',
  injection: 'injection injectable',
  dawai: 'medicine treatment',
  dawa: 'medicine treatment',
  ilaj: 'treatment medicine',
  sust: 'weakness vitamin supplement liver tonic',
  'khana nahi': 'appetite digestive vitamin',
  'chaara nahi': 'appetite digestive vitamin',
  'dudh kam': 'milk production udder mastitis',
  'pet phula': 'bloat tympany gastro',
  'pair sujan': 'foot rot joint infection',
  'aankhein laal': 'pink eye vitamin eye infection',
  'baar baar garam': 'repeat breeding reproductive hormone',
  'bachcha nahi rukta': 'repeat breeding reproductive infertility',
  garbhpat: 'abortion reproductive progesterone',
  thaan: 'mastitis udder teat milk',
  'sujan injection': 'anti-inflammatory pain fever',
  'dard hai': 'pain anti-inflammatory analgesic',
  sujan: 'inflammation anti-inflammatory',
  'tez bukhar': 'high fever antibiotic antipyretic',
  safai: 'antiseptic wound topical',
  wounds: 'wound topical antiseptic',
  cheechad: 'tick ectoparasiticide permethrin',
  chittal: 'tick ectoparasiticide',
  jheen: 'lice ectoparasiticide',
  allergy: 'antihistamine anti-allergic',
  daane: 'allergy antihistamine urticaria',
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

export function searchProducts(
  products: MadvetProduct[],
  query: string,
  topK = 5
): MadvetProduct[] {
  if (!query?.trim() || products.length === 0) return []

  // Dynamically discover all string column names from actual product data
  const allKeys = products.length > 0
    ? Object.keys(products[0]).filter((k) => typeof products[0][k] === 'string')
    : ['product_name', 'salt', 'dosage', 'category', 'species']

  const fuseKeys = allKeys.map((k) => ({
    name: k,
    weight:
      k.includes('name') ? 3 :
      k.includes('salt') || k.includes('composition') ? 2 :
      k.includes('category') || k.includes('species') || k.includes('use') || k.includes('indication') ? 1.5 : 0.5,
  }))

  const fuse = new Fuse(products, {
    keys: fuseKeys,
    threshold: 0.45,
    includeScore: true,
    ignoreLocation: true,
    minMatchCharLength: 2,
    shouldSort: true,
  })

  const lowerQuery = query.toLowerCase()
  const expandedQuery = buildKeywordQuery(query)

  // Layer 0: direct word-level match against product name + salt
  const queryWords = lowerQuery.split(/\s+/).filter((w) => w.length >= 2)
  const directMatches: MadvetProduct[] = []
  for (const p of products) {
    const searchable = (
      (p.product_name || '') + ' ' +
      (p.salt || '') + ' ' +
      (p.category || '') + ' ' +
      (p.species || '') + ' ' +
      (p.dosage || '')
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
    const key = (p.product_name || '') + '||' + (p.salt || '')
    if (!seen.has(key)) {
      seen.add(key)
      combined.push(p)
    }
  }

  return combined.slice(0, topK)
}
