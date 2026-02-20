import Fuse from 'fuse.js'
import type { MadvetProduct } from './supabase'

// ─────────────────────────────────────────────
// HINDI / HINGLISH → CLINICAL KEYWORD MAP
// ─────────────────────────────────────────────
const HINDI_KEYWORD_MAP: Record<string, string[]> = {
  // Parasites
  keeda:              ['parasite', 'anthelmintic', 'antiparasitic', 'worm', 'dewormer'],
  keede:              ['parasite', 'anthelmintic', 'antiparasitic', 'worm', 'dewormer'],
  kide:               ['parasite', 'anthelmintic', 'antiparasitic', 'worm', 'dewormer'],
  kira:               ['worm', 'anthelmintic', 'parasite'],
  kire:               ['worm', 'anthelmintic', 'parasite'],
  deworming:          ['anthelmintic', 'antiparasitic', 'worm', 'bolus'],
  dewormer:           ['anthelmintic', 'antiparasitic', 'worm'],
  cheechad:           ['tick', 'ectoparasiticide', 'permethrin'],
  chittal:            ['tick', 'ectoparasiticide'],
  jheen:              ['lice', 'ectoparasiticide'],

  // Fever & Infection
  bukhar:             ['fever', 'antibiotic', 'antipyretic'],
  bukhaar:            ['fever', 'antibiotic', 'antipyretic'],
  'tez bukhar':       ['high fever', 'antibiotic', 'antipyretic', 'critical'],
  infection:          ['antibiotic', 'bacterial', 'antimicrobial'],

  // Digestive
  dast:               ['diarrhea', 'antidiarrheal', 'loose motions'],
  pechish:            ['diarrhea', 'dysentery', 'antidiarrheal'],
  ulti:               ['vomiting', 'gastro', 'antiemetic'],
  'pet phula':        ['bloat', 'tympany', 'gastro', 'emergency'],

  // Milk & Udder
  'dudh kam':         ['milk production', 'udder', 'mastitis', 'galactagogue'],
  dudh:               ['milk', 'mastitis', 'udder', 'production'],
  teat:               ['mastitis', 'udder', 'teat'],
  thaan:              ['mastitis', 'udder', 'teat', 'milk'],
  mastitis:           ['mastitis', 'udder', 'antibiotic', 'intramammary'],

  // Weakness & Nutrition
  kamzori:            ['vitamin', 'supplement', 'weakness', 'tonic'],
  kamjori:            ['vitamin', 'supplement', 'weakness', 'tonic'],
  sust:               ['weakness', 'vitamin', 'supplement', 'liver tonic'],
  bhook:              ['appetite', 'digestive', 'tonic', 'liver'],
  'khana nahi':       ['appetite loss', 'liver', 'tonic', 'supplement'],
  'chaara nahi':      ['appetite loss', 'digestive', 'fever', 'stress'],

  // Wounds & Skin
  zakhm:              ['wound', 'topical', 'antiseptic', 'wound care'],
  ghav:               ['wound', 'topical', 'antiseptic'],
  khujli:             ['itch', 'parasite', 'antifungal', 'skin', 'dermatitis'],
  khaj:               ['itch', 'parasite', 'skin', 'mange'],
  chamdi:             ['skin', 'dermatological', 'topical'],
  daane:              ['allergy', 'antihistamine', 'urticaria', 'skin'],
  safai:              ['antiseptic', 'wound', 'topical'],

  // Respiratory
  sans:               ['respiratory', 'pneumonia', 'breathing'],
  khansi:             ['cough', 'respiratory', 'bronchitis'],

  // Bones & Minerals
  haddi:              ['calcium', 'bone', 'mineral', 'phosphorus'],
  calcium:            ['calcium', 'mineral', 'hypocalcemia', 'milk fever'],
  'milk fever':       ['hypocalcemia', 'calcium', 'emergency', 'calving'],

  // Reproductive
  garbhpat:           ['abortion', 'reproductive', 'progesterone'],
  'baar baar garam':  ['repeat breeding', 'reproductive', 'hormone'],
  'bachcha nahi':     ['repeat breeding', 'reproductive', 'infertility'],
  byaana:             ['calving', 'parturition', 'oxytocin', 'reproductive'],
  heat:               ['estrus', 'reproductive', 'hormone'],

  // Joints & Swelling
  'pair sujan':       ['foot rot', 'joint infection', 'anti-inflammatory'],
  sujan:              ['inflammation', 'anti-inflammatory', 'swelling'],
  'aankhein laal':    ['pink eye', 'conjunctivitis', 'vitamin A', 'eye'],
  liver:              ['liver', 'hepato', 'tonic', 'hepatoprotective'],
  allergy:            ['antihistamine', 'anti-allergic', 'urticaria'],

  // Form factors
  bolus:              ['bolus', 'tablet', 'oral'],
  injection:          ['injection', 'injectable', 'parenteral'],
  soap:               ['soap', 'ectoparasiticide', 'topical'],
  dawai:              ['medicine', 'treatment'],
  dawa:               ['medicine', 'treatment'],
  ilaj:               ['treatment', 'medicine'],
}

// ─────────────────────────────────────────────
// CATEGORY EXCLUSION MAP
// Prevents wrong-category products from appearing
// Key = query signal → exclude products in these categories
// ─────────────────────────────────────────────
const CATEGORY_EXCLUSION_MAP: Record<string, string[]> = {
  // Parasite queries should never return antidiarrheal products
  parasite:     ['antidiarrheal', 'digestive', 'antipyretic', 'antibiotic'],
  anthelmintic: ['antidiarrheal', 'digestive', 'antipyretic'],
  worm:         ['antidiarrheal', 'digestive', 'antipyretic'],
  dewormer:     ['antidiarrheal', 'digestive', 'antipyretic'],
  // Diarrhea queries should never return dewormers
  diarrhea:     ['anthelmintic', 'antiparasitic', 'ectoparasiticide'],
  // Skin queries should never return internal products
  topical:      ['anthelmintic', 'antiparasitic', 'antibiotic'],
  // Fever queries should never return dewormers
  fever:        ['anthelmintic', 'antiparasitic'],
}

// Species map
const SPECIES_MAP: Record<string, string[]> = {
  gaay:    ['cattle', 'cow', 'bovine'],
  cow:     ['cattle', 'cow', 'bovine'],
  bhains:  ['buffalo', 'bovine'],
  buffalo: ['buffalo', 'bovine'],
  bakri:   ['goat', 'caprine', 'small ruminant'],
  goat:    ['goat', 'caprine'],
  bhed:    ['sheep', 'ovine', 'small ruminant'],
  sheep:   ['sheep', 'ovine'],
  murgi:   ['poultry', 'chicken', 'broiler', 'layer'],
  chicken: ['poultry', 'broiler', 'layer'],
  poultry: ['poultry', 'chicken', 'broiler'],
  ghoda:   ['horse', 'equine'],
  horse:   ['horse', 'equine'],
  suar:    ['pig', 'swine', 'porcine'],
  pig:     ['pig', 'swine'],
  kutte:   ['dog', 'canine'],
  dog:     ['dog', 'canine'],
  billi:   ['cat', 'feline'],
  cat:     ['cat', 'feline'],
}

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

function expandQuery(query: string): {
  expanded:       string
  speciesHints:   string[]
  clinicalHints:  string[]
  excludeCategories: string[]
} {
  const lower           = query.toLowerCase().trim()
  const clinicalHints:  string[] = []
  const speciesHints:   string[] = []
  const excludeCategories: string[] = []

  // Multi-word phrases first
  const sortedKeys = Object.keys(HINDI_KEYWORD_MAP).sort((a, b) => b.length - a.length)
  for (const key of sortedKeys) {
    if (lower.includes(key)) clinicalHints.push(...HINDI_KEYWORD_MAP[key])
  }
  for (const [key, values] of Object.entries(SPECIES_MAP)) {
    if (lower.includes(key)) speciesHints.push(...values)
  }

  // Build exclusion list from clinical hints
  for (const hint of clinicalHints) {
    const excluded = CATEGORY_EXCLUSION_MAP[hint]
    if (excluded) excludeCategories.push(...excluded)
  }

  return {
    expanded:          [lower, ...clinicalHints, ...speciesHints].join(' '),
    speciesHints,
    clinicalHints,
    excludeCategories: [...new Set(excludeCategories)],
  }
}

function getSearchableText(p: MadvetProduct): string {
  return [
    p.product_name,
    p.salt_ingredient,
    p.category,
    p.indication,
    p.species,
    p.aliases,
    p.description,
    p.usp_benefits,
    p.packaging,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

// Returns true if product should be excluded based on category exclusion rules
function isExcluded(p: MadvetProduct, excludeCategories: string[]): boolean {
  if (excludeCategories.length === 0) return false
  const cat = (p.category ?? '').toLowerCase()
  const ind = (p.indication ?? '').toLowerCase()
  return excludeCategories.some(
    (ex) => cat.includes(ex) || ind.includes(ex)
  )
}

function findSpecificProductMatch(
  query:    string,
  products: MadvetProduct[]
): MadvetProduct | null {
  const lower = query.toLowerCase().trim()

  for (const p of products) {
    const name = (p.product_name ?? '').toLowerCase()
    if (!name || name.length < 3) continue
    if (lower.includes(name)) return p

    const aliases = (p.aliases ?? '')
      .toLowerCase()
      .split(/[,|]/)
      .map((a) => a.trim())
      .filter((a) => a.length >= 3)

    for (const alias of aliases) {
      if (lower.includes(alias)) return p
    }
  }
  return null
}

function getDynamicThreshold(clinicalHints: string[]): number {
  return clinicalHints.length > 0 ? 8 : 15
}

function scoreProduct(
  p:              MadvetProduct,
  queryWords:     string[],
  speciesHints:   string[],
  clinicalHints:  string[]
): number {
  const text = getSearchableText(p)
  let score  = 0

  for (const word of queryWords) {
    if (word.length < 3) continue
    if ((p.product_name    ?? '').toLowerCase().includes(word)) score += 10
    if ((p.indication      ?? '').toLowerCase().includes(word)) score += 6
    if ((p.salt_ingredient ?? '').toLowerCase().includes(word)) score += 5
    if ((p.category        ?? '').toLowerCase().includes(word)) score += 4
    if ((p.aliases         ?? '').toLowerCase().includes(word)) score += 8
    if (text.includes(word))                                    score += 2
  }

  for (const hint of clinicalHints) {
    if (text.includes(hint)) score += 5
  }

  for (const hint of speciesHints) {
    const sp = (p.species ?? '').toLowerCase()
    if (sp.includes(hint))                                    score += 5
    else if (sp.includes('all') || sp.includes('general'))   score += 1
  }

  return score
}

// ─────────────────────────────────────────────
// MAIN EXPORT
// ─────────────────────────────────────────────
export function searchProducts(
  products: MadvetProduct[],
  query:    string,
  topK = 3  // Default 3 — fewer = more precise
): MadvetProduct[] {
  if (!query?.trim() || products.length === 0) return []

  // Step 1: Exact product / alias name match
  const specificMatch = findSpecificProductMatch(query, products)
  if (specificMatch) return [specificMatch]

  const { expanded, speciesHints, clinicalHints, excludeCategories } = expandQuery(query)
  const expandedWords = expanded.split(/\s+/).filter((w) => w.length >= 3)

  // Step 2: Filter out wrong-category products FIRST
  const eligibleProducts = products.filter((p) => !isExcluded(p, excludeCategories))

  // Step 3: Custom weighted scoring on eligible products only
  const dynamicThreshold = getDynamicThreshold(clinicalHints)
  const scoredByCustom = eligibleProducts
    .map((p) => ({ p, score: scoreProduct(p, expandedWords, speciesHints, clinicalHints) }))
    .filter(({ score }) => score >= dynamicThreshold)
    .sort((a, b) => b.score - a.score)
    .map(({ p }) => p)

  // Step 4: Fuse.js fuzzy fallback on eligible products only
  const fuse = new Fuse(eligibleProducts, {
    keys: [
      { name: 'product_name',    weight: 3.0 },
      { name: 'aliases',         weight: 2.5 },
      { name: 'indication',      weight: 2.0 },
      { name: 'salt_ingredient', weight: 2.0 },
      { name: 'category',        weight: 1.5 },
      { name: 'species',         weight: 1.5 },
      { name: 'description',     weight: 0.8 },
      { name: 'usp_benefits',    weight: 0.5 },
    ],
    threshold:          0.30,  // stricter than before
    includeScore:       true,
    ignoreLocation:     true,
    minMatchCharLength: 3,
    shouldSort:         true,
  })

  const fuseResults = fuse
    .search(expanded)
    .filter(r => (r.score ?? 1) < 0.22)  // strict — only high-confidence matches
    .map(r => r.item)

  // Step 5: Merge + deduplicate
  const seen     = new Set<string>()
  const combined: MadvetProduct[] = []

  for (const p of [...scoredByCustom, ...fuseResults]) {
    const key = `${p.product_name ?? ''}||${p.salt_ingredient ?? ''}`
    if (!seen.has(key)) {
      seen.add(key)
      combined.push(p)
    }
  }

  return combined.slice(0, topK)
}

// ─────────────────────────────────────────────
// FOLLOW-UP DETECTION
// ─────────────────────────────────────────────
export function isFollowUpMessage(message: string): boolean {
  const trimmed   = message.trim()
  const wordCount = trimmed.split(/\s+/).length

  if (wordCount > 12) return false

  const newQuerySignals = [
    /\b(bukhar|dast|sujan|keede|khansi|khujli|zakhm|mastitis|bloat|infection|fever|wound)\b/i,
  ]
  if (newQuerySignals.some((p) => p.test(trimmed))) return false

  const followUpPatterns = [
    /^(aur|dose|kitna|kab|kaise|theek|haan|nahi|ok|acha|samajh|batao)/i,
    /^(aur koi|aur kuch|doosra|alternative|other option)/i,
    /^(और|खुराक|कितना|कब|कैसे|ठीक|हाँ|नहीं|ओके|अच्छा|बताओ)/u,
    /^(how much|how long|where|when|is it safe|withdrawal)/i,
    /^\?+$/,
    /^(yes|no|ok|okay|thanks|got it|understood|shukriya|dhanyawad)$/i,
    /^(aur kuch|kuch aur|bas|thik hai|bilkul)$/i,
  ]

  return followUpPatterns.some((p) => p.test(trimmed))
}
