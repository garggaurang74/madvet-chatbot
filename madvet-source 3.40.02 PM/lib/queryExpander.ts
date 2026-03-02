// lib/queryExpander.ts
// Expands a user query into clinical terms, species hints, and form factors
// Used to improve product search accuracy before hitting Fuse.js

import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export interface ExpandedQuery {
  clinicalTerms: string[]
  species:       string[]
  formFactor:    string[]
  isFollowUp:    boolean
}

// Cache expansions per query (process lifetime)
const expansionCache = new Map<string, ExpandedQuery>()

const EMPTY: ExpandedQuery = {
  clinicalTerms: [],
  species:       [],
  formFactor:    [],
  isFollowUp:    false,
}

// ─────────────────────────────────────────────
// FAST RULE-BASED FALLBACK
// Handles common queries without an LLM call
// ─────────────────────────────────────────────
const QUICK_MAP: Array<{ pattern: RegExp; result: Partial<ExpandedQuery> }> = [
  // Parasites
  { pattern: /keeda|keede|kide|kira|kire|worm|deworming|dewormer|helmin/i,
    result: { clinicalTerms: ['anthelmintic', 'antiparasitic', 'worm', 'dewormer'] } },
  { pattern: /tick|cheechad|chittal|ectoparasit|lice|jheen|mite|mange/i,
    result: { clinicalTerms: ['ectoparasiticide', 'tick', 'external parasite'] } },

  // Fever / Infection
  { pattern: /bukhar|bukhaar|fever|tez bukhar|high fever/i,
    result: { clinicalTerms: ['antipyretic', 'fever', 'antibiotic'] } },
  { pattern: /infection|bacterial|antibiotic/i,
    result: { clinicalTerms: ['antibiotic', 'bacterial', 'antimicrobial'] } },

  // Digestive
  { pattern: /dast|diarrhea|loose motion|pechish|dysentery/i,
    result: { clinicalTerms: ['antidiarrheal', 'diarrhea', 'gastrointestinal'] } },
  { pattern: /bloat|tympany|pet phula|afara/i,
    result: { clinicalTerms: ['bloat', 'tympany', 'anti-flatulent', 'emergency'] } },

  // Milk / Udder
  { pattern: /mastitis|thaan|teat|udder/i,
    result: { clinicalTerms: ['mastitis', 'udder', 'intramammary'] } },
  { pattern: /dudh|doodh|milk|galactagogue/i,
    result: { clinicalTerms: ['milk', 'galactagogue', 'udder', 'production'] } },

  // Weakness / Nutrition
  { pattern: /kamzori|kamjori|weakness|sust|vitamin|supplement|tonic/i,
    result: { clinicalTerms: ['vitamin', 'supplement', 'tonic', 'weakness'] } },
  { pattern: /calcium|milk fever|hypocalcemia/i,
    result: { clinicalTerms: ['calcium', 'hypocalcemia', 'mineral', 'milk fever'] } },
  { pattern: /mineral/i,
    result: { clinicalTerms: ['mineral', 'supplement', 'calcium', 'trace element'] } },

  // Skin / Wound
  { pattern: /wound|zakhm|ghav|ghao|maggot/i,
    result: { clinicalTerms: ['wound', 'topical', 'antiseptic', 'dermatological'] } },
  { pattern: /skin|chamdi|khujli|khaj|daane|eczema|dermatit/i,
    result: { clinicalTerms: ['dermatological', 'skin', 'topical'] } },

  // Reproductive
  { pattern: /repeat breeding|baar baar garam|bachcha nahi|infertil/i,
    result: { clinicalTerms: ['repeat breeding', 'reproductive', 'hormone'] } },
  { pattern: /byaana|calving|parturition|oxytocin/i,
    result: { clinicalTerms: ['calving', 'oxytocin', 'reproductive'] } },
  { pattern: /garbhpat|abortion|progesterone/i,
    result: { clinicalTerms: ['abortion', 'progesterone', 'reproductive'] } },
  { pattern: /pyometra|metritis|uterine/i,
    result: { clinicalTerms: ['uterine', 'intrauterine', 'reproductive'] } },

  // Pain / Inflammation
  { pattern: /sujan|swelling|inflammation|dard|pain|analgesic|anti.inflam/i,
    result: { clinicalTerms: ['anti-inflammatory', 'analgesic', 'swelling'] } },
  { pattern: /joint|arthritis|gath|lameness|foot rot/i,
    result: { clinicalTerms: ['joint', 'anti-inflammatory', 'analgesic', 'arthritis'] } },

  // Safety / Pregnancy / Withdrawal / Duration — CRITICAL: these must NOT be treated as follow-ups
  { pattern: /pregnancy|pregnant|garbh|garbhavast|garbhawastha|byaane wali|gabhit|गर्ࢗ|गर्भावस्था/i,
    result: { clinicalTerms: ['pregnancy', 'safety', 'contraindication'] } },
  { pattern: /safe|safety|nuksan|side.?effect|reaction|harmful|haanikaarak/i,
    result: { clinicalTerms: ['safety', 'side effects', 'contraindication'] } },
  { pattern: /withdrawal|dudh phenke|milk withdrawal|doodh band|milk safe/i,
    result: { clinicalTerms: ['withdrawal', 'lactation', 'milk safety'] } },
  { pattern: /kitne din|how long|course kab tak|duration|kab tak dein/i,
    result: { clinicalTerms: ['duration', 'course'] } },
  { pattern: /combine|saath mein de sakte|ke saath|interaction|dono dawa/i,
    result: { clinicalTerms: ['drug interaction', 'combination'] } },

  // Allergy
  { pattern: /allergy|histamine|urticaria|hives/i,
    result: { clinicalTerms: ['antihistamine', 'anti-allergic', 'urticaria'] } },

  // Probiotic / Gut
  { pattern: /probiotic|gut|digestive|rumen/i,
    result: { clinicalTerms: ['probiotic', 'digestive', 'rumen', 'gut'] } },

  // Liver
  { pattern: /liver|hepato|anemia|khoon ki kami/i,
    result: { clinicalTerms: ['liver', 'hepatoprotective', 'tonic', 'vitamin'] } },

  // Respiratory
  { pattern: /cough|khansi|respiratory|pneumonia|breathing|sans/i,
    result: { clinicalTerms: ['respiratory', 'pneumonia', 'bronchitis'] } },
]

const SPECIES_PATTERNS: Array<{ pattern: RegExp; species: string[] }> = [
  { pattern: /gaay|gaye|cow|cattle|bovine/i,   species: ['cattle', 'cow'] },
  { pattern: /bhains|buffalo/i,                 species: ['buffalo'] },
  { pattern: /bakri|goat|caprine/i,             species: ['goat'] },
  { pattern: /bhed|sheep|ovine/i,               species: ['sheep'] },
  { pattern: /murgi|chicken|poultry|broiler/i,  species: ['poultry', 'chicken'] },
  { pattern: /ghoda|horse|equine/i,             species: ['horse'] },
  { pattern: /kutte|dog|canine/i,               species: ['dog'] },
  { pattern: /billi|cat|feline/i,               species: ['cat'] },
]

const FORM_PATTERNS: Array<{ pattern: RegExp; form: string[] }> = [
  { pattern: /bolus/i,             form: ['bolus'] },
  { pattern: /inj|injection/i,     form: ['injection', 'injectable'] },
  { pattern: /tablet|tab\b/i,      form: ['tablet', 'oral'] },
  { pattern: /spray/i,             form: ['spray', 'topical'] },
  { pattern: /powder|sachet/i,     form: ['powder'] },
  { pattern: /liquid|syrup|drench/i, form: ['liquid', 'oral'] },
  { pattern: /soap/i,              form: ['soap', 'topical'] },
  { pattern: /gel|ointment/i,      form: ['gel', 'topical'] },
  { pattern: /pour.on/i,           form: ['pour-on', 'topical'] },
]

const FOLLOW_UP_PATTERNS = [
  /^(aur|dose|kitna|kab|kaise|theek|haan|nahi|ok|acha|samajh|batao)/i,
  /^(aur koi|aur kuch|doosra|alternative|other option)/i,
  /^(और|खुराक|कितना|कब|कैसे|ठीक|हाँ|नहीं|ओके|अच्छा|बताओ)/u,
  /^(how much|how long|where|when)/i,  // NOTE: 'is it safe' and 'withdrawal' removed — these are new queries not follow-ups
  /^\?+$/,
  /^(yes|no|ok|okay|thanks|got it|understood|shukriya|dhanyawad)$/i,
  /^(aur kuch|kuch aur|bas|thik hai|bilkul)$/i,
]

function quickExpand(query: string): ExpandedQuery {
  const clinicalTerms: string[] = []
  const species: string[]       = []
  const formFactor: string[]    = []

  const isFollowUp = FOLLOW_UP_PATTERNS.some(p => p.test(query.trim()))

  for (const { pattern, result } of QUICK_MAP) {
    if (pattern.test(query)) {
      if (result.clinicalTerms) clinicalTerms.push(...result.clinicalTerms)
    }
  }

  for (const { pattern, species: sp } of SPECIES_PATTERNS) {
    if (pattern.test(query)) species.push(...sp)
  }

  for (const { pattern, form } of FORM_PATTERNS) {
    if (pattern.test(query)) formFactor.push(...form)
  }

  return {
    clinicalTerms: [...new Set(clinicalTerms)],
    species:       [...new Set(species)],
    formFactor:    [...new Set(formFactor)],
    isFollowUp,
  }
}

// ─────────────────────────────────────────────
// LLM EXPANSION (for complex/ambiguous queries)
// ─────────────────────────────────────────────
async function llmExpand(query: string): Promise<ExpandedQuery> {
  try {
    const res = await openai.chat.completions.create({
      model:       'gpt-4o-mini',
      temperature: 0,
      max_tokens:  200,
      messages: [
        {
          role:    'system',
          content: `You are a veterinary search assistant. Given a query (may be in Hindi, Hinglish, or English), extract:
1. clinicalTerms: veterinary clinical keywords (English only) — conditions, drug classes, symptoms
2. species: animal types mentioned (cattle, buffalo, goat, sheep, dog, cat, horse, poultry)
3. formFactor: product form if mentioned (bolus, injection, tablet, spray, powder, liquid, soap, gel, ointment)
4. isFollowUp: true if this is a follow-up question (not a new product search)

Respond ONLY with valid JSON like:
{"clinicalTerms":["fever","antibiotic"],"species":["cattle"],"formFactor":["injection"],"isFollowUp":false}`,
        },
        { role: 'user', content: query },
      ],
    })

    const raw = res.choices[0]?.message?.content?.trim() ?? '{}'
    const clean = raw.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean)

    return {
      clinicalTerms: Array.isArray(parsed.clinicalTerms) ? parsed.clinicalTerms : [],
      species:       Array.isArray(parsed.species)       ? parsed.species       : [],
      formFactor:    Array.isArray(parsed.formFactor)    ? parsed.formFactor    : [],
      isFollowUp:    Boolean(parsed.isFollowUp),
    }
  } catch (err) {
    console.error('[QueryExpander] LLM expansion failed:', err)
    return EMPTY
  }
}

// ─────────────────────────────────────────────
// MAIN EXPORT
// Tries quick rule-based first; falls back to LLM for complex queries
// ─────────────────────────────────────────────
export async function expandQuery(query: string): Promise<ExpandedQuery> {
  if (!query?.trim()) return EMPTY

  const cacheKey = query.slice(0, 200).toLowerCase().trim()
  if (expansionCache.has(cacheKey)) return expansionCache.get(cacheKey)!

  // Try quick rule-based expansion first
  const quick = quickExpand(query)

  // If we got clinical terms from rules, use them (fast, no API cost)
  if (quick.clinicalTerms.length > 0 || quick.isFollowUp) {
    expansionCache.set(cacheKey, quick)
    return quick
  }

  // Complex / unknown query — use LLM
  const expanded = await llmExpand(query)

  // Merge: LLM terms + rule-based species/form detection
  const merged: ExpandedQuery = {
    clinicalTerms: [...new Set([...expanded.clinicalTerms, ...quick.clinicalTerms])],
    species:       [...new Set([...expanded.species,       ...quick.species])],
    formFactor:    [...new Set([...expanded.formFactor,    ...quick.formFactor])],
    isFollowUp:    expanded.isFollowUp || quick.isFollowUp,
  }

  expansionCache.set(cacheKey, merged)
  return merged
}
