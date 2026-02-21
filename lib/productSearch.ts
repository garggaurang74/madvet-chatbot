import Fuse from 'fuse.js'
import type { MadvetProduct } from './supabase'
import type { ExpandedQuery } from './queryExpander'

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
  zakhm:              ['wound', 'topical', 'antiseptic', 'wound care', 'dermatological'],
  ghav:               ['wound', 'topical', 'antiseptic', 'dermatological'],
  khujli:             ['itch', 'parasite', 'antifungal', 'skin', 'dermatitis'],
  khaj:               ['itch', 'parasite', 'skin', 'mange'],
  chamdi:             ['skin', 'dermatological', 'topical'],
  daane:              ['allergy', 'antihistamine', 'urticaria', 'skin'],
  safai:              ['antiseptic', 'wound', 'topical'],

  // English wound/skin — these were missing, causing wrong products for English queries
  wound:              ['wound', 'topical', 'antiseptic', 'dermatological', 'wound care'],
  'wound treatment':  ['wound', 'topical', 'dermatological', 'antiseptic', 'wound care'],
  'wound care':       ['wound', 'topical', 'dermatological', 'antiseptic'],
  skin:               ['skin', 'dermatological', 'topical'],
  'skin infection':   ['skin', 'dermatological', 'topical', 'antiseptic'],
  ointment:           ['wound', 'dermatological', 'topical', 'ointment'],
  maggot:             ['wound', 'dermatological', 'topical', 'maggot'],
  ghao:               ['wound', 'topical', 'antiseptic', 'dermatological'],

  // Respiratory
  sans:               ['respiratory', 'pneumonia', 'breathing'],
  khansi:             ['cough', 'respiratory', 'bronchitis'],

  // Bones & Minerals
  haddi:              ['calcium', 'bone', 'mineral', 'phosphorus'],
  calcium:            ['calcium', 'mineral', 'hypocalcemia', 'milk fever'],
  'milk fever':       ['hypocalcemia', 'calcium', 'emergency', 'calving'],
  mineral:            ['mineral', 'supplement', 'calcium', 'trace element'],
  'mineral mixture':  ['mineral', 'supplement', 'calcium', 'minerals mixture', 'trace element'],
  'khaniaj':          ['mineral', 'calcium', 'supplement'],
  pashumin:           ['mineral', 'supplement', 'milk production', 'minerals mixture'],
  'mineral mix':      ['mineral', 'supplement', 'calcium'],

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

  // Product-specific common misspellings / short queries
  // These are real Madvet products — map to their clinical keywords for search
  'pure flud':        ['fluid', 'electrolyte', 'oral rehydration', 'dehydration', 'diarrhea', 'pure flud'],
  'pure fluid':       ['fluid', 'electrolyte', 'oral rehydration', 'dehydration'],
  'projest':          ['progesterone', 'reproductive', 'hormone', 'repeat breeding'],
  'projest np':       ['progesterone', 'reproductive', 'hormone'],
  'd projest':        ['progesterone', 'reproductive', 'hormone'],
  'd projest np':     ['progesterone', 'reproductive', 'hormone', 'injectable'],
  tikks:              ['tick', 'ectoparasite', 'external parasite', 'permethrin', 'ectoparasiticide'],
  tiks:               ['tick', 'ectoparasite', 'ectoparasiticide'],
  flud:               ['fluid', 'electrolyte', 'oral rehydration', 'dehydration'],

  // More clinical gaps
  'khoon':            ['anemia', 'blood', 'vitamin', 'supplement', 'liver'],
  'khoon ki kami':    ['anemia', 'iron deficiency', 'vitamin', 'liver tonic'],
  anemia:             ['anemia', 'blood', 'liver tonic', 'vitamin'],
  'naak se paani':    ['respiratory', 'nasal discharge', 'pneumonia'],
  'nasal':            ['respiratory', 'pneumonia', 'nasal discharge'],
  lameness:           ['foot rot', 'joint', 'anti-inflammatory', 'analgesic'],
  'pair mein':        ['foot rot', 'joint infection', 'anti-inflammatory'],
  'aankhein band':    ['eye', 'vitamin A', 'conjunctivitis'],
  'aankh':            ['eye', 'vitamin A', 'conjunctivitis'],
  pyometra:           ['uterine', 'reproductive', 'intrauterine', 'metritis'],
  metritis:           ['uterine', 'reproductive', 'intrauterine', 'antibiotic'],
  'garbhashay':       ['uterine', 'reproductive', 'intrauterine'],
  doodh:              ['milk', 'mastitis', 'udder', 'galactagogue', 'production'],
  'baal jhadna':      ['skin', 'coat', 'vitamin', 'supplement', 'dermatological'],
  baal:               ['coat', 'skin', 'vitamin', 'supplement'],
  energy:             ['energy', 'tonic', 'vitamin', 'supplement', 'weakness'],
  'taakat':           ['energy', 'tonic', 'vitamin', 'supplement'],
  recovery:           ['probiotic', 'vitamin', 'tonic', 'supplement', 'recovery'],
  'theek karna':      ['treatment', 'antibiotic', 'vitamin'],
  'wajan':            ['weight gain', 'supplement', 'tonic', 'appetite'],
  weight:             ['weight gain', 'supplement', 'appetite', 'tonic'],
  rumen:              ['rumen', 'probiotic', 'digestive', 'supplement'],
  bloat:              ['bloat', 'tympany', 'gastro', 'emergency', 'anti-flatulent'],
  tympany:            ['bloat', 'tympany', 'anti-flatulent', 'emergency'],
  colic:              ['colic', 'analgesic', 'antispasmodic', 'pain'],
  'dard':             ['pain', 'analgesic', 'anti-inflammatory'],
  joint:              ['joint', 'anti-inflammatory', 'analgesic', 'arthritis'],
  arthritis:          ['arthritis', 'joint', 'anti-inflammatory', 'analgesic'],
  'gath':             ['joint', 'arthritis', 'anti-inflammatory'],
}

// ─────────────────────────────────────────────
// CATEGORY EXCLUSION MAP
// ─────────────────────────────────────────────
const CATEGORY_EXCLUSION_MAP: Record<string, string[]> = {
  parasite:          ['antidiarrheal', 'digestive', 'antipyretic', 'antibiotic'],
  anthelmintic:      ['antidiarrheal', 'digestive', 'antipyretic'],
  worm:              ['antidiarrheal', 'digestive', 'antipyretic'],
  dewormer:          ['antidiarrheal', 'digestive', 'antipyretic'],
  diarrhea:          ['anthelmintic', 'antiparasitic', 'ectoparasiticide'],
  fever:             ['anthelmintic', 'antiparasitic'],
  tick:              ['antidiarrheal', 'digestive', 'antibiotic', 'anthelmintic'],
  ectoparasiticide:  ['antidiarrheal', 'digestive', 'antibiotic', 'anthelmintic'],

  // Wound/skin queries — exclude internal medicines; topical products should win
  wound:             ['anti-inflammatory', 'analgesic', 'antipyretic', 'anthelmintic', 'antiparasitic', 'probiotic', 'vitamin', 'reproductive', 'antihistamine'],
  topical:           ['anthelmintic', 'antiparasitic', 'antibiotic', 'anti-inflammatory', 'analgesic', 'probiotic', 'reproductive', 'vitamin'],
  dermatological:    ['anthelmintic', 'antiparasitic', 'anti-inflammatory', 'analgesic', 'probiotic', 'reproductive', 'vitamin', 'antibiotic'],
  antiseptic:        ['anthelmintic', 'antiparasitic', 'anti-inflammatory', 'analgesic', 'probiotic', 'vitamin'],
  skin:              ['anthelmintic', 'antiparasitic', 'anti-inflammatory', 'analgesic', 'probiotic', 'vitamin', 'reproductive'],
}

// ─────────────────────────────────────────────
// SPECIES MAP
// ─────────────────────────────────────────────
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

export function getSearchableText(p: MadvetProduct): string {
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
    .replace(/[i1]/g, 'l')
}

// ─────────────────────────────────────────────
// BUILD EXCLUSION LIST FROM QUERY
// ─────────────────────────────────────────────
function buildExcludeCategories(clinicalTerms: string[], rawQuery: string): string[] {
  const excludeSet = new Set<string>()
  const lower = rawQuery.toLowerCase()

  // From LLM-expanded clinical terms
  for (const term of clinicalTerms) {
    const t = term.toLowerCase()
    const excluded = CATEGORY_EXCLUSION_MAP[t]
    if (excluded) excluded.forEach(e => excludeSet.add(e))
  }

  // From raw query via Hindi keyword map
  const sortedKeys = Object.keys(HINDI_KEYWORD_MAP).sort((a, b) => b.length - a.length)
  for (const key of sortedKeys) {
    if (lower.includes(key)) {
      const hints = HINDI_KEYWORD_MAP[key]
      for (const hint of hints) {
        const excluded = CATEGORY_EXCLUSION_MAP[hint]
        if (excluded) excluded.forEach(e => excludeSet.add(e))
      }
    }
  }

  return [...excludeSet]
}

// Returns true if product should be excluded
function isExcluded(p: MadvetProduct, excludeCategories: string[]): boolean {
  if (excludeCategories.length === 0) return false
  const cat = (p.category ?? '').toLowerCase()
  const ind = (p.indication ?? '').toLowerCase()
  return excludeCategories.some(ex => cat.includes(ex) || ind.includes(ex))
}

// ─────────────────────────────────────────────
// SMART PRODUCT NAME MATCHING
// Handles: spaces ("pure flud"→"pureflud"), dots/dashes ("D. Progest-NP"),
//          spelling variants ("projest"↔"progest"), apostrophes ("Tikk's")
// ─────────────────────────────────────────────

// Strip punctuation + spaces, lowercase — "D. Progest-NP" → "dprogestnp"
function normalizeName(str: string): string {
  return str
    .toLowerCase()
    .replace(/[.\-'\u2019\s%]/g, '')
    .replace(/[i1]/g, 'l')
}

// Phonetic normalize — collapses doubled letters and sound variants
// "progest" and "projest" both → "projet"
function normalizePhonetic(str: string): string {
  return normalizeName(str)
    .replace(/(.)\1+/g, '$1')   // tikkk → tik
    .replace(/ph/g, 'f')
    .replace(/gh/g, 'g')
    .replace(/gest/g, 'jest')   // progest = projest
}

function findSpecificProductMatch(
  query:    string,
  products: MadvetProduct[]
): MadvetProduct | null {
  const lq        = query.toLowerCase().trim()
  const normLq    = normalizeName(lq)
  const phonLq    = normalizePhonetic(lq)

  // Split query into meaningful words (normalized + phonetic)
  const qWordsNorm = lq.split(/\s+/).map(normalizeName).filter(w => w.length >= 4)
  const qWordsPhon = lq.split(/\s+/).map(normalizePhonetic).filter(w => w.length >= 4)

  function matchesQuery(candidate: string): boolean {
    if (!candidate || candidate.length < 3) return false
    const lc       = candidate.toLowerCase()
    const normC    = normalizeName(candidate)
    const phonC    = normalizePhonetic(candidate)

    // 1. Direct substring match
    if (lq.includes(lc) || lc.includes(lq)) return true

    // 2. Normalized match — handles spaces/punctuation ("pure flud" ↔ "Pureflud")
    if (normC.length >= 4 && normLq.includes(normC)) return true

    // 3. Phonetic match — handles spelling variants ("projest" ↔ "Progest-NP")
    if (phonC.length >= 4 && phonLq.includes(phonC)) return true

    // 4. Word-level match — each significant word of candidate vs query words
    const candWords = candidate.split(/\s+/).map(normalizeName).filter(w => w.length >= 4)
    const candWordsP = candidate.split(/\s+/).map(normalizePhonetic).filter(w => w.length >= 4)

    for (const cw of candWords) {
      // Exact word match
      if (qWordsNorm.some(qw => qw === cw)) return true
      // One contains the other (handles "tikks" ↔ "tikksstop")
      if (qWordsNorm.some(qw => qw.includes(cw) || cw.includes(qw))) return true
    }
    for (const cw of candWordsP) {
      if (qWordsPhon.some(qw => qw === cw || qw.includes(cw) || cw.includes(qw))) return true
    }

    return false
  }

  // Longer product names first — more specific wins
  const sorted = [...products].sort(
    (a, b) => (b.product_name?.length ?? 0) - (a.product_name?.length ?? 0)
  )

  // Pass 1: product name
  for (const p of sorted) {
    if (matchesQuery(p.product_name ?? '')) return p
  }

  // Pass 2: aliases (split on comma or pipe)
  for (const p of sorted) {
    const aliases = (p.aliases ?? '').split(/[,|،]/).map(a => a.trim()).filter(a => a.length >= 3)
    for (const alias of aliases) {
      if (matchesQuery(alias)) return p
    }
  }

  return null
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
    if (sp.includes(hint))                                   score += 5
    else if (sp.includes('all') || sp.includes('general'))  score += 1
  }

  return score
}

// ─────────────────────────────────────────────
// MAIN EXPORT — searchProducts
// ─────────────────────────────────────────────
export function searchProducts(
  products: MadvetProduct[],
  query:    string,
  expanded: ExpandedQuery,
  topK = 5
): MadvetProduct[] {
  if (!query?.trim() || products.length === 0) return []

  // Step 1: Exact product / alias name match — bypass exclusion for direct product queries
  const specificMatch = findSpecificProductMatch(query, products)
  if (specificMatch) {
    // Also find all variants of the same product family (same base name)
    const baseName = (specificMatch.product_name ?? '').split(/\s+\d/)[0].toLowerCase().trim()
    const allVariants = baseName.length >= 4
      ? products.filter(p => {
          const pName = (p.product_name ?? '').toLowerCase()
          return pName.startsWith(baseName)
        })
      : [specificMatch]
    return allVariants.length > 1 ? allVariants.slice(0, topK) : [specificMatch]
  }

  // Step 2: Build category exclusion list from LLM terms + raw query signals
  const excludeCategories = buildExcludeCategories(expanded.clinicalTerms, query)

  // Step 3: Filter out wrong-category products FIRST ✅ (this was the bug — now fixed)
  const eligibleProducts = excludeCategories.length > 0
    ? products.filter(p => !isExcluded(p, excludeCategories))
    : products

  const expandedWords = [...expanded.clinicalTerms, ...expanded.species, ...expanded.formFactor]
    .filter((w: string) => w.length >= 3)

  // Step 4: Custom weighted scoring on eligible products only
  const dynamicThreshold = 4  // fixed: was "8 when no terms" which killed all results
  const scoredByCustom = eligibleProducts
    .map((p) => ({ p, score: scoreProduct(p, expandedWords, expanded.species, expanded.clinicalTerms) }))
    .filter(({ score }) => score >= dynamicThreshold)
    .sort((a, b) => b.score - a.score)
    .map(({ p }) => p)

  // Step 5: Fuse.js fuzzy fallback on eligible products only
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
    threshold:          0.30,
    includeScore:       true,
    ignoreLocation:     true,
    minMatchCharLength: 3,
    shouldSort:         true,
  })

  const fuseResults = fuse
    .search(expandedWords.join(' '))
    .filter(r => (r.score ?? 1) < 0.38)
    .map(r => r.item)

  // Step 6: Merge + deduplicate
  const seen     = new Set<string>()
  const combined: MadvetProduct[] = []

  for (const p of [...scoredByCustom, ...fuseResults]) {
    const key = `${p.product_name ?? ''}||${p.salt_ingredient ?? ''}||${p.category ?? ''}`
    if (!seen.has(key)) {
      seen.add(key)
      combined.push(p)
    }
  }

  // ── Prefer non-injection over injection when both exist and quality won't drop ──
  // Injections are last resort if spray/ointment/bolus/oral available for same condition
  const INJECTABLE_PATTERN = /injection|injectable|parenteral|\binj\b/i
  const ORAL_TOPICAL_PATTERN = /bolus|tablet|spray|ointment|powder|oral|topical|gel|liquid|drench|syrup|soap/i

  const hasOralOrTopical = combined.some(p =>
    ORAL_TOPICAL_PATTERN.test(p.packaging ?? '') || ORAL_TOPICAL_PATTERN.test(p.category ?? '')
  )

  if (hasOralOrTopical) {
    combined.sort((a, b) => {
      const aInj = INJECTABLE_PATTERN.test(a.packaging ?? '') || INJECTABLE_PATTERN.test(a.category ?? '')
      const bInj = INJECTABLE_PATTERN.test(b.packaging ?? '') || INJECTABLE_PATTERN.test(b.category ?? '')
      if (aInj && !bInj) return 1   // a is injection, push to back
      if (!aInj && bInj) return -1  // b is injection, push to back
      return 0
    })
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

// ─────────────────────────────────────────────
// COMPLEMENTARY PRODUCT SEARCH
// ─────────────────────────────────────────────
const COMPLEMENTARY_MAP: Record<string, string[]> = {
  'anthelmintic':    ['probiotic', 'digestive', 'vitamin', 'liver', 'tonic', 'supplement'],
  'antiparasitic':   ['probiotic', 'digestive', 'vitamin', 'liver', 'tonic', 'supplement'],
  'ectoparasiticide':['vitamin', 'supplement', 'tonic'],
  'antibiotic':      ['probiotic', 'digestive', 'vitamin', 'supplement', 'tonic'],
  'antipyretic':     ['vitamin', 'supplement', 'liver', 'tonic'],
  'analgesic':       ['vitamin', 'supplement', 'tonic'],
  'dermatological':  ['vitamin', 'supplement', 'tonic'],
  'wound':           ['vitamin', 'supplement', 'tonic'],
  'topical':         ['vitamin', 'supplement'],
  'galactagogue':    ['calcium', 'mineral', 'vitamin', 'supplement'],
  'udder':           ['calcium', 'mineral', 'supplement'],
  'mastitis':        ['probiotic', 'vitamin', 'supplement'],
  'antidiarrheal':   ['probiotic', 'digestive', 'electrolyte', 'vitamin'],
  'reproductive':    ['vitamin', 'calcium', 'mineral', 'supplement'],
  'hormone':         ['vitamin', 'supplement', 'tonic'],
}

export function searchComplementary(
  allProducts:     MadvetProduct[],
  primaryProducts: MadvetProduct[],
  expanded:        ExpandedQuery,
  topK = 2
): MadvetProduct[] {
  if (primaryProducts.length === 0) return []

  const primaryKeys = new Set(
    primaryProducts.map(p => `${p.product_name ?? ''}||${p.category ?? ''}`)
  )

  const complementaryKeywords: string[] = []

  for (const p of primaryProducts) {
    const searchIn = ((p.category ?? '') + ' ' + (p.indication ?? '')).toLowerCase()
    for (const [key, values] of Object.entries(COMPLEMENTARY_MAP)) {
      if (searchIn.includes(key)) complementaryKeywords.push(...values)
    }
  }

  for (const term of expanded.clinicalTerms) {
    const t = term.toLowerCase()
    for (const [key, values] of Object.entries(COMPLEMENTARY_MAP)) {
      if (t.includes(key) || key.includes(t)) complementaryKeywords.push(...values)
    }
  }

  if (complementaryKeywords.length === 0) return []

  const uniqueKeywords = [...new Set(complementaryKeywords)]

  const candidates = allProducts
    .filter(p => !primaryKeys.has(`${p.product_name ?? ''}||${p.category ?? ''}`))
    .map(p => {
      const text = getSearchableText(p)
      let score = 0
      for (const kw of uniqueKeywords) {
        if (text.includes(kw)) score += 3
      }
      const cat = (p.category ?? '').toLowerCase()
      if (/probiotic|vitamin|supplement|tonic|mineral|calcium|digestive/.test(cat)) score += 5
      return { p, score }
    })
    .filter(({ score }) => score >= 3)
    .sort((a, b) => b.score - a.score)
    .map(({ p }) => p)

  return candidates.slice(0, topK)
}
