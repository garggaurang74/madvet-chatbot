import Fuse from 'fuse.js'
import type { MadvetProduct } from './supabase'

// ─────────────────────────────────────────────
// HINDI / HINGLISH → CLINICAL KEYWORD MAP
// ─────────────────────────────────────────────
const HINDI_KEYWORD_MAP: Record<string, string[]> = {
  // Parasites
  keeda:           ['parasite', 'anthelmintic', 'antiparasitic', 'worm'],
  keede:           ['parasite', 'anthelmintic', 'antiparasitic', 'worm'],
  kide:            ['parasite', 'anthelmintic', 'antiparasitic', 'worm'],
  kira:            ['worm', 'anthelmintic', 'parasite'],
  kire:            ['worm', 'anthelmintic', 'parasite'],
  deworming:       ['anthelmintic', 'antiparasitic', 'worm', 'bolus'],
  dewormer:        ['anthelmintic', 'antiparasitic', 'worm'],
  cheechad:        ['tick', 'ectoparasiticide', 'permethrin'],
  chittal:         ['tick', 'ectoparasiticide'],
  jheen:           ['lice', 'ectoparasiticide'],

  // Fever & Infection
  bukhar:          ['fever', 'antibiotic', 'antipyretic'],
  bukhaar:         ['fever', 'antibiotic', 'antipyretic'],
  'tez bukhar':    ['high fever', 'antibiotic', 'antipyretic', 'critical'],
  infection:       ['antibiotic', 'bacterial', 'antimicrobial'],
  antibiotic:      ['antibiotic', 'bacterial', 'antimicrobial'],

  // Digestive
  dast:            ['diarrhea', 'antidiarrheal', 'loose motions'],
  pechish:         ['diarrhea', 'dysentery', 'antidiarrheal'],
  ulti:            ['vomiting', 'gastro', 'antiemetic'],
  loose:           ['diarrhea', 'antidiarrheal'],
  motions:         ['diarrhea', 'antidiarrheal'],
  'pet phula':     ['bloat', 'tympany', 'gastro', 'emergency'],
  pet:             ['gastro', 'digestive', 'gastric'],

  // Milk & Udder
  dudh:            ['milk', 'mastitis', 'udder', 'production'],
  'dudh kam':      ['milk production', 'udder', 'mastitis', 'galactagogue'],
  teat:            ['mastitis', 'udder', 'teat'],
  thaan:           ['mastitis', 'udder', 'teat', 'milk'],
  mastitis:        ['mastitis', 'udder', 'antibiotic', 'intramammary'],

  // Weakness & Nutrition
  kamzori:         ['vitamin', 'supplement', 'weakness', 'tonic'],
  kamjori:         ['vitamin', 'supplement', 'weakness', 'tonic'],
  sust:            ['weakness', 'vitamin', 'supplement', 'liver tonic'],
  bhook:           ['appetite', 'digestive', 'tonic', 'liver'],
  'khana nahi':    ['appetite loss', 'liver', 'tonic', 'supplement'],
  'chaara nahi':   ['appetite loss', 'digestive', 'fever', 'stress'],

  // Wounds & Skin
  zakhm:           ['wound', 'topical', 'antiseptic', 'wound care'],
  ghav:            ['wound', 'topical', 'antiseptic'],
  khujli:          ['itch', 'parasite', 'antifungal', 'skin', 'dermatitis'],
  khaj:            ['itch', 'parasite', 'skin', 'mange'],
  chamdi:          ['skin', 'dermatological', 'topical'],
  daane:           ['allergy', 'antihistamine', 'urticaria', 'skin'],
  safai:           ['antiseptic', 'wound', 'topical'],
  spray:           ['spray', 'topical', 'dermatological'],

  // Respiratory
  sans:            ['respiratory', 'pneumonia', 'breathing'],
  khansi:          ['cough', 'respiratory', 'bronchitis'],

  // Bones & Minerals
  haddi:           ['calcium', 'bone', 'mineral', 'phosphorus'],
  calcium:         ['calcium', 'mineral', 'hypocalcemia', 'milk fever'],
  'milk fever':    ['hypocalcemia', 'calcium', 'emergency', 'calving'],

  // Reproductive
  garbhpat:        ['abortion', 'reproductive', 'progesterone'],
  'baar baar garam': ['repeat breeding', 'reproductive', 'hormone'],
  'bachcha nahi':  ['repeat breeding', 'reproductive', 'infertility'],
  byaana:          ['calving', 'parturition', 'oxytocin', 'reproductive'],
  heat:            ['estrus', 'reproductive', 'hormone'],
  garam:           ['estrus', 'heat', 'reproductive'],

  // Joints & Swelling
  'pair sujan':    ['foot rot', 'joint infection', 'anti-inflammatory'],
  sujan:           ['inflammation', 'anti-inflammatory', 'swelling'],
  'aankhein laal': ['pink eye', 'conjunctivitis', 'vitamin A', 'eye'],
  liver:           ['liver', 'hepato', 'tonic', 'hepatoprotective'],
  allergy:         ['antihistamine', 'anti-allergic', 'urticaria'],

  // Form factors
  bolus:           ['bolus', 'tablet', 'oral'],
  injection:       ['injection', 'injectable', 'parenteral'],
  soap:            ['soap', 'ectoparasiticide', 'topical'],
  dawai:           ['medicine', 'treatment'],
  dawa:            ['medicine', 'treatment'],
  ilaj:            ['treatment', 'medicine'],
}

// ─────────────────────────────────────────────
// FIX: Tiered category boosts — not all equal
// ─────────────────────────────────────────────
const CATEGORY_PRIORITY_MAP: Record<string, { keywords: string[]; boost: number }> = {
  skin:          { keywords: ['dermatological', 'topical', 'spray', 'ointment'], boost: 12 },
  chamdi:        { keywords: ['dermatological', 'topical'],                      boost: 12 },
  khujli:        { keywords: ['dermatological', 'antiparasitic'],                boost: 10 },
  wound:         { keywords: ['topical', 'antiseptic', 'wound care'],            boost: 10 },
  zakhm:         { keywords: ['topical', 'antiseptic'],                          boost: 10 },
  infection:     { keywords: ['antibiotic'],                                     boost: 8  },
  bukhar:        { keywords: ['antibiotic', 'antipyretic'],                      boost: 8  },
}

// Species keyword map
const SPECIES_MAP: Record<string, string[]> = {
  gaay:     ['cattle', 'cow', 'bovine'],
  cow:      ['cattle', 'cow', 'bovine'],
  bhains:   ['buffalo', 'bovine'],
  buffalo:  ['buffalo', 'bovine'],
  bakri:    ['goat', 'caprine', 'small ruminant'],
  goat:     ['goat', 'caprine'],
  bhed:     ['sheep', 'ovine', 'small ruminant'],
  sheep:    ['sheep', 'ovine'],
  murgi:    ['poultry', 'chicken', 'broiler', 'layer'],
  chicken:  ['poultry', 'broiler', 'layer'],
  poultry:  ['poultry', 'chicken', 'broiler'],
  ghoda:    ['horse', 'equine'],
  horse:    ['horse', 'equine'],
  suar:     ['pig', 'swine', 'porcine'],
  pig:      ['pig', 'swine'],
  kutte:    ['dog', 'canine'],
  dog:      ['dog', 'canine'],
  billi:    ['cat', 'feline'],
  cat:      ['cat', 'feline'],
}

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

function expandQuery(query: string): {
  expanded: string
  speciesHints: string[]
  clinicalHints: string[]
} {
  const lower = query.toLowerCase().trim()
  const clinicalHints: string[] = []
  const speciesHints: string[] = []

  // Multi-word phrases first (longer = more specific)
  const sortedKeys = Object.keys(HINDI_KEYWORD_MAP).sort((a, b) => b.length - a.length)
  for (const key of sortedKeys) {
    if (lower.includes(key)) {
      clinicalHints.push(...HINDI_KEYWORD_MAP[key])
    }
  }

  for (const [key, values] of Object.entries(SPECIES_MAP)) {
    if (lower.includes(key)) {
      speciesHints.push(...values)
    }
  }

  const expanded = [lower, ...clinicalHints, ...speciesHints].join(' ')
  return { expanded, speciesHints, clinicalHints }
}

function getSearchableText(p: MadvetProduct): string {
  return [
    p.product_name,
    p.salt_ingredient,
    (p as any).salt,
    p.category,
    p.indication,
    p.species,
    p.aliases,
    p.description,
    p.usp_benefits,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

/** 
 * Exact / near-exact product name match (handles typos up to 2 chars)
 */
function findSpecificProductMatch(
  query: string,
  products: MadvetProduct[]
): MadvetProduct | null {
  const lower = query.toLowerCase().trim()

  for (const p of products) {
    const name = (p.product_name || '').toLowerCase()
    if (!name || name.length < 3) continue

    // Direct substring match
    if (lower.includes(name)) return p

    // Alias match
    const aliases = (p.aliases || '')
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

function scoreProduct(p: MadvetProduct, queryWords: string[], speciesHints: string[], clinicalHints: string[]): number {
  const text = getSearchableText(p)
  let score = 0

  for (const word of queryWords) {
    if (word.length < 3) continue
    if ((p.product_name || '').toLowerCase().includes(word)) score += 10
    if ((p.indication || '').toLowerCase().includes(word)) score += 6
    if (((p as any).salt_ingredient || (p as any).salt || '').toLowerCase().includes(word)) score += 5
    if ((p.category || '').toLowerCase().includes(word)) score += 4
    if ((p.aliases || '').toLowerCase().includes(word)) score += 8
    if (text.includes(word)) score += 2
  }

  for (const hint of clinicalHints) {
    if (text.includes(hint)) score += 4
  }

  for (const hint of speciesHints) {
    const sp = (p.species || '').toLowerCase()
    if (sp.includes(hint)) score += 5
    else if (sp === '' || sp.includes('all')) score += 1 // species-agnostic bonus
  }

  // FIX: Tiered boost per category — no flat +15 for everything
  const lowerQuery = queryWords.join(' ').toLowerCase()
  for (const [category, { keywords, boost }] of Object.entries(CATEGORY_PRIORITY_MAP)) {
    if (lowerQuery.includes(category)) {
      for (const keyword of keywords) {
        if (text.includes(keyword)) {
          score += boost
          break // only boost once per category match
        }
      }
    }
  }

  return score
}

// ─────────────────────────────────────────────
// MAIN EXPORT
// ─────────────────────────────────────────────

// ─────────────────────────────────────────────
// FIX: Minimum score threshold added
// ─────────────────────────────────────────────
const MIN_SCORE_THRESHOLD = 15

export function searchProducts(
  products: MadvetProduct[],
  query: string,
  topK = 5
): MadvetProduct[] {
  if (!query?.trim() || products.length === 0) return []

  // Step 1: Exact product name match → return only that product
  const specificMatch = findSpecificProductMatch(query, products)
  if (specificMatch) return [specificMatch]

  const lower = query.toLowerCase()
  const { expanded, speciesHints, clinicalHints } = expandQuery(query)

  // Step 2: Custom weighted scoring
  const expandedWords = expanded.split(/\s+/).filter((w) => w.length >= 3)

  const scoredByCustom = products
    .map((p) => ({ p, score: scoreProduct(p, expandedWords, speciesHints, clinicalHints) }))
    // FIX: Only include products above minimum confidence threshold
    .filter(({ score }) => score >= MIN_SCORE_THRESHOLD)
    .sort((a, b) => b.score - a.score)
    .map(({ p }) => p)

  // Step 3: Fuse.js fuzzy search as fallback
  const fuseKeys = [
    { name: 'product_name',    weight: 3.0 },
    { name: 'aliases',         weight: 2.5 },
    { name: 'indication',      weight: 2.0 },
    { name: 'salt_ingredient', weight: 2.0 },
    { name: 'salt',            weight: 2.0 },
    { name: 'category',        weight: 1.5 },
    { name: 'species',         weight: 1.5 },
    { name: 'description',     weight: 0.8 },
    { name: 'usp_benefits',    weight: 0.5 },
  ]

  const fuse = new Fuse(products, {
    keys:               fuseKeys,
    threshold:          0.35,   // FIX: tightened from 0.42 → fewer false matches
    includeScore:       true,
    ignoreLocation:     true,
    minMatchCharLength: 3,
    shouldSort:         true,
  })

  const fuseResults = fuse.search(expanded).map((r) => r.item)

  // Step 4: Merge and deduplicate
  const seen = new Set<string>()
  const combined: MadvetProduct[] = []

  for (const p of [...scoredByCustom, ...fuseResults]) {
    const key = `${p.product_name || ''}||${(p as any).salt_ingredient || (p as any).salt || ''}` 
    if (!seen.has(key)) {
      seen.add(key)
      combined.push(p)
    }
  }

  return combined.slice(0, topK)
}

// ─────────────────────────────────────────────
// UTILITY: detect if message is a follow-up
// ─────────────────────────────────────────────
export function isFollowUpMessage(message: string): boolean {
  const trimmed = message.trim()

  // FIX: Removed hard char limit — use pattern quality instead
  // Multi-part questions should NOT be treated as follow-ups
  const wordCount = trimmed.split(/\s+/).length
  if (wordCount > 12) return false

  // FIX: Must start with a follow-up trigger AND be a simple query
  const followUpPatterns = [
    /^(aur|dose|kitna|kab|kaise|theek|haan|nahi|ok|acha|samajh|batao)/i,
    /^(और|खुराक|कितना|कब|कैसे|ठीक|हाँ|नहीं|ओके|अच्छा|बताओ)/u,
    /^(how much|how long|where|when|is it safe|withdrawal)/i,
    /^\?+$/,
    /^(yes|no|ok|okay|thanks|got it|understood|shukriya|dhanyawad)$/i,
    /^(aur kuch|kuch aur|bas|thik hai|bilkul)$/i,
  ]

  // FIX: Reject if message contains new symptom/condition keywords
  // These signal a new query even if short
  const newQuerySignals = [
    /\b(bukhar|dast|sujan|keede|khansi|khujli|zakhm|mastitis|bloat|infection|fever|wound)\b/i,
    /\b(aur (bhi|ek|koi|product|dawa|dawai))\b/i,
  ]

  const isNewQuery = newQuerySignals.some((p) => p.test(trimmed))
  if (isNewQuery) return false

  return followUpPatterns.some((p) => p.test(trimmed))
}
