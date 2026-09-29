// What the assistant knows, built from the same live sources the website
// renders — products (Supabase), films and folder (storage manifests), schemes
// (the office's Google Sheet), company facts (lib/company.ts). Nothing here is
// written for the bot alone, so it can never know something the site does not
// show, or miss something the site does.
//
// Two parts, sized for cost:
//  • KNOWLEDGE — one compact line per product plus films, folder, company and
//    site map. The same for every visitor, and sent first so OpenAI's
//    automatic prompt cache (50% off repeated prefixes) can reuse it.
//  • DETAILS — full records (composition, species, packs, indications) for the
//    few products this question is about, found by a keyword match that knows
//    Hindi and Hinglish disease words. Sent per question.
import type { MadvetProduct } from './supabase'
import { getCachedProducts } from './productCache'
import { fetchFilms, fetchFolder, type SiteFilm, type FolderPage } from './catalog'
import { fetchSchemes, matchScheme } from './schemes'
import { COMPANY } from './company'
import { SITE } from './share'

const clip = (s: string | undefined, n: number) => {
  const t = (s || '').replace(/\s+/g, ' ').trim()
  return t.length > n ? t.slice(0, n - 1) + '…' : t
}
const squash = (s: string) => s.toLowerCase().replace(/[^a-z0-9ऀ-ॿ]/g, '')

// ── Dose form ────────────────────────────────────────────────────────────────
// Every product is labelled with its form, and a customer's condition on form
// ("no injection", "bolus only", "pilane wali") is enforced in code: a small
// model told "no injection" still recommended an injection (29 Sep, 3D Plus
// for fever). The model gets only products that obey, and the cards shown
// under its answer are filtered the same way.
export type Form = 'injection' | 'bolus' | 'tablet' | 'oral liquid' | 'powder' | 'gel' | 'spray' | 'soap' | 'pour-on' | 'ointment' | 'shampoo' | 'intrauterine' | 'other'

export function formOf(p: MadvetProduct): Form {
  const t = `${p.product_name} ${p.formulation} ${p.packaging}`.toLowerCase()
  if (/\bi\.?u\b|intra.?uterine/.test(t)) return 'intrauterine'
  if (/inj|vial|i\.m\.|i\.v\.|s\.c\./.test(t)) return 'injection'
  if (/bolus/.test(t)) return 'bolus'
  if (/tab(let)?s?\b/.test(t)) return 'tablet'
  if (/pour.?on/.test(t)) return 'pour-on'
  if (/spray/.test(t)) return 'spray'
  if (/soap/.test(t)) return 'soap'
  if (/shampoo/.test(t)) return 'shampoo'
  if (/oint|cream/.test(t)) return 'ointment'
  if (/\bgel\b/.test(t)) return 'gel'
  if (/powder|sachet|\bgm\b|\bkg\b/.test(t)) return 'powder'
  if (/syrup|syp|liquid|liq|suspension|susp|litre|ltr|\bml\b|oral/.test(t)) return 'oral liquid'
  return 'other'
}

const ORAL: Form[] = ['bolus', 'tablet', 'oral liquid', 'powder', 'gel']
export interface Constraints { avoid: Set<Form>; only: Set<Form> | null; note: string }

export function parseConstraints(text: string): Constraints {
  const t = text.toLowerCase()
  const avoid = new Set<Form>()
  let only: Set<Form> | null = null
  const NEG = '(no|not|without|bina|binaa|except|avoid|mat|nahi|nahin|na|नहीं|नही|मत|बिना|ना)'
  const INJ = '(inj|injection|injectable|injections|sui|इंजेक्शन|सुई)'
  if (new RegExp(`${NEG}\\s*(an?\\s+|koi\\s+|कोई\\s+)?${INJ}`).test(t) || new RegExp(`${INJ}\\s*(wala\\s*|वाला\\s*)?${NEG}`).test(t) || /injection se dar|सुई से डर/.test(t)) avoid.add('injection')
  if (new RegExp(`${NEG}\\s*(an?\\s+)?(bolus|बोलस)`).test(t) || /(bolus|बोलस)\s*(nahi|nahin|नहीं|mat|मत)/.test(t)) avoid.add('bolus')
  if (/\b(oral|orally|by mouth|muh se|munh se|मुंह से|मुँह से|khilane|pilane|pilaane|पिलाने|खिलाने)\b/.test(t)) { only = new Set(ORAL); avoid.add('injection') }
  if (/\b(only|sirf|bas|keval)\s+(bolus|बोलस)|bolus (only|hi|ही)|सिर्फ बोलस/.test(t)) only = new Set<Form>(['bolus'])
  if (/\b(only|sirf|bas|keval)\s+(inj|injection)|injection (only|hi)|सिर्फ इंजेक्शन/.test(t)) only = new Set<Form>(['injection'])
  if (/\b(syrup|liquid|syp|पिलाने वाली)\b/.test(t) && !only) only = new Set<Form>(['oral liquid'])
  const bits: string[] = []
  if (only) bits.push(`ONLY these forms: ${[...only].join(', ')}`)
  if (avoid.size) bits.push(`NO ${[...avoid].join(', ')}`)
  return { avoid, only, note: bits.join('; ') }
}

export const obeys = (p: MadvetProduct, c: Constraints) =>
  !c.avoid.has(formOf(p)) && (!c.only || c.only.has(formOf(p)))

export interface ChatKnowledge {
  products: MadvetProduct[]
  knowledge: string          // same for every visitor
  schemesText: string        // this month's schemes (changes when the office edits the sheet)
  filmOf: Map<number, SiteFilm>
  pageOf: Map<number, number>
  schemeOf: Map<number, string[]>   // product id → its lines on this month's sheet
  month: string
}

let memo: { at: number; value: ChatKnowledge } | null = null

export async function getChatKnowledge(): Promise<ChatKnowledge> {
  if (memo && Date.now() - memo.at < 5 * 60 * 1000) return memo.value
  const [products, films, folder, { month, schemes }] = await Promise.all([
    getCachedProducts(), fetchFilms(), fetchFolder(), fetchSchemes(),
  ])
  const filmOf = new Map<number, SiteFilm>()
  for (const f of films) for (const id of f.ids) if (!filmOf.has(id)) filmOf.set(id, f)
  const pageOf = new Map<number, number>()
  for (const pg of folder as FolderPage[]) for (const id of pg.ids || []) if (!pageOf.has(id)) pageOf.set(id, pg.p)

  const productLines = [...products].sort((a, b) => (a.id ?? 0) - (b.id ?? 0)).map(p => {
    const bits = [
      `#${p.id} ${p.product_name} [${formOf(p).toUpperCase()}]`,
      clip(p.category, 40),
      clip(p.species, 60),
      clip(p.packaging || p.formulation, 50),
      clip(p.indication, 140),
    ].filter(Boolean)
    const tags = [filmOf.has(p.id!) ? 'film' : '', pageOf.has(p.id!) ? `folder p${pageOf.get(p.id!)}` : ''].filter(Boolean)
    return bits.join(' | ') + (tags.length ? ` [${tags.join(', ')}]` : '')
  })

  const protocols = films.filter(f => !f.ids.length)
  const sections = (folder as FolderPage[]).filter(p => p.kind === 'section').map(p => `${p.title} (p${p.p})`)

  const knowledge = [
    `## Company`,
    `${COMPANY.name} — based in ${COMPANY.city}, in veterinary healthcare since ${COMPANY.since}. Pet products under the sub-brand ${COMPANY.petBrand}.`,
    `Call or WhatsApp ${COMPANY.phone} · email ${COMPANY.email} · YouTube ${COMPANY.youtube}`,
    `Where the products are manufactured is NOT known to you — never state it.`,
    ``,
    `## Website pages (base ${SITE})`,
    `${SITE}/products — full range; ${SITE}/products/<id> — one product (composition, uses, its film, WhatsApp share)`,
    `${SITE}/videos — ${films.length} short Hindi product films; ${SITE}/videos?film=<key> opens one`,
    `${SITE}/folder — the printed product folder page by page; ${SITE}/folder?p=<n> opens page n`,
    `${SITE}/schemes — this month's trade schemes · ${SITE}/contact · ${SITE}/about · ${SITE}/careers (field sales, distribution — apply by email/WhatsApp)`,
    ``,
    `## Treatment-protocol films (not tied to one product)`,
    ...protocols.map(f => `- ${f.name} → ${SITE}/videos?film=${encodeURIComponent(f.youtubeId || f.slug)}`),
    ``,
    `## Product folder sections`,
    sections.join(' · ') || '(not loaded)',
    ``,
    `## Product index (${products.length} products). Format: #id name [FORM] | category | species | pack | indications [film, folder page]`,
    ...productLines,
  ].join('\n')

  const forMatch = products.map(x => ({ id: x.id!, name: x.product_name || '', packaging: x.packaging }))
  const schemeOf = new Map<number, string[]>()
  const schemeLines = schemes.map(s => {
    const p = matchScheme(s.item, forMatch).product
    const line = `Buy ${s.qty} ${s.item} → free ${s.free}`
    if (p) schemeOf.set(p.id, [...(schemeOf.get(p.id) || []), line])
    return `- ${line}${p ? ` (#${p.id})` : ''}`
  })
  const schemesText = schemes.length
    ? `## Trade schemes — ${month || 'this month'} (from the office sheet, for retailers/stockists; final terms are confirmed by the Madvet representative; full list at ${SITE}/schemes)\n${schemeLines.join('\n')}`
    : `## Trade schemes\nNo schemes are listed right now.`

  const value = { products, knowledge, schemesText, filmOf, pageOf, schemeOf, month: month || 'this month' }
  memo = { at: Date.now(), value }
  return value
}

// ── Finding the products a question is about ────────────────────────────────
// Hindi and Hinglish words the catalogue writes in English.
const TERMS: Record<string, string[]> = {
  'थनैला': ['mastitis'], 'thanaila': ['mastitis'], 'thanela': ['mastitis'], 'थन': ['udder', 'mastitis', 'teat'],
  'कीड़े': ['worm', 'anthelmintic', 'deworm'], 'कीड़ा': ['worm', 'anthelmintic'], 'keede': ['worm', 'anthelmintic'], 'keeda': ['worm'], 'kide': ['worm'], 'कृमि': ['worm', 'anthelmintic'],
  'बुखार': ['fever', 'antipyretic', 'pyrexia'], 'bukhar': ['fever', 'antipyretic'], 'bukhaar': ['fever'], 'ज्वर': ['fever'],
  'दस्त': ['diarrh', 'scour', 'dysentery'], 'dast': ['diarrh', 'scour'], 'पेचिश': ['dysentery'], 'pechish': ['dysentery'],
  'चिचड़ी': ['tick', 'ectopar'], 'किलनी': ['tick'], 'chichdi': ['tick'], 'kilni': ['tick'], 'जूँ': ['lice', 'louse'], 'पिस्सू': ['flea'],
  'दूध': ['milk', 'lactation', 'galactog'], 'doodh': ['milk', 'galactog'], 'dudh': ['milk'],
  'खुजली': ['itch', 'mange', 'dermat', 'scabies'], 'khujli': ['itch', 'mange'], 'दर्द': ['pain', 'analges'], 'dard': ['pain'],
  'सूजन': ['swelling', 'inflamm', 'oedema'], 'sujan': ['swelling', 'inflamm'], 'घाव': ['wound', 'maggot'], 'ghav': ['wound'], 'zakhm': ['wound'],
  'बच्चेदानी': ['uter', 'prolapse', 'metritis'], 'जेर': ['placenta', 'retained'], 'ब्याने': ['calving', 'parturition', 'postpartum'],
  'निमोनिया': ['pneumonia'], 'खांसी': ['cough', 'respirat'], 'khansi': ['cough'], 'सांस': ['respirat'],
  'लीवर': ['liver', 'hepat'], 'jigar': ['liver'], 'कमजोरी': ['weak', 'debility', 'tonic'], 'कमज़ोरी': ['weak', 'tonic'], 'kamzori': ['weak', 'tonic'], 'kamjori': ['weak'],
  'भूख': ['appetite', 'anorexia', 'digest'], 'bhook': ['appetite'], 'bhuk': ['appetite'], 'अफारा': ['bloat', 'tympan'], 'afara': ['bloat'], 'गैस': ['bloat', 'gas'],
  'हीट': ['heat', 'estrus', 'oestrus', 'anestrus'], 'garmi': ['heat', 'anestrus'], 'गर्भ': ['pregnan', 'conception'], 'एलर्जी': ['allerg'],
  'संक्रमण': ['infection', 'antibiotic'], 'इन्फेक्शन': ['infection', 'antibiotic'], 'कैल्शियम': ['calcium'], 'फ्लूक': ['fluke'],
  'त्वचा': ['skin', 'dermat'], 'खुर': ['foot', 'hoof'], 'विटामिन': ['vitamin'], 'बछड़ा': ['calf'], 'bachda': ['calf'],
  'लंपी': ['lumpy'], 'lumpy': ['lumpy'], 'milk fever': ['calcium', 'hypocalc'], 'मिल्क फीवर': ['calcium', 'hypocalc'],
  'कुत्ता': ['dog', 'canine'], 'kutta': ['dog'], 'बिल्ली': ['cat', 'feline'], 'billi': ['cat'], 'गाय': ['cattle', 'cow'], 'gaay': ['cattle'],
  'भैंस': ['buffalo'], 'bhains': ['buffalo'], 'बकरी': ['goat'], 'bakri': ['goat'], 'भेड़': ['sheep'], 'घोड़ा': ['horse'], 'मुर्गी': ['poultry'],
}
const STOP = new Set(['the', 'and', 'for', 'kya', 'hai', 'mein', 'ke', 'ki', 'ka', 'ko', 'se', 'aur', 'what', 'which', 'with', 'about', 'batao', 'bataiye', 'dawa', 'dawai', 'medicine', 'product', 'products', 'है', 'में', 'के', 'की', 'का', 'को', 'से', 'और', 'क्या', 'दवा', 'please', 'give', 'best', 'use', 'kaun', 'konsa', 'कौन'])

export function findRelevant(k: ChatKnowledge, text: string, max = 6, c?: Constraints): MadvetProduct[] {
  // When the customer sets a condition on form ("no injection"), the form
  // words describe the condition, not the product, so they must not score
  // injections up.
  const raw = text.toLowerCase()
  const low = c?.note ? raw.replace(/\b(inj|injection|injections|injectable|bolus|oral|syrup|tablet)s?\b|इंजेक्शन|बोलस/g, ' ') : raw
  const species = speciesIn(raw)
  const words = low.split(/[^a-z0-9ऀ-ॿ%]+/).filter(w => w.length >= 3 && !STOP.has(w))
  const expanded = new Set<string>(words)
  for (const [t, en] of Object.entries(TERMS)) if (low.includes(t)) en.forEach(e => expanded.add(e))
  const q = squash(text)

  const scored = k.products.filter(p => !c || obeys(p, c)).map(p => {
    const name = squash(p.product_name || '')
    const base = name.replace(/\d.*$/, '')
    const aliases = (p.aliases || '').toLowerCase()
    const body = `${p.indication} ${p.description} ${p.category} ${p.species} ${p.usp_benefits} ${p.salt_ingredient}`.toLowerCase()
    let s = 0
    if (base.length >= 4 && q.includes(base)) s += 40                       // the product is named
    else if (name.length >= 6 && q.includes(name.slice(0, 6))) s += 15
    for (const a of aliases.split(/[,;/|]/).map(x => squash(x)).filter(x => x.length >= 4)) if (q.includes(a)) s += 30
    for (const w of expanded) {
      if (w.length >= 4 && name.includes(squash(w))) s += 8
      if (body.includes(w)) s += 2
    }
    // The animal named in the question: its products first; a product whose
    // species list clearly leaves it out drops away (a dog question should not
    // be answered with a cattle bolus).
    if (s > 0) s += roleBoost(raw, p)
    if (s > 0 && species.length) {
      const sp = `${p.species} ${p.product_name}`.toLowerCase()
      if (species.some(x => sp.includes(x))) s += 12
      else if (p.species && p.species.trim()) s -= 30
    }
    return { p, s }
  }).filter(x => x.s > 0).sort((a, b) => b.s - a.s)

  return scored.slice(0, max).map(x => x.p)
}

// Complaint → the molecules whose MAIN job it is, strongest first. A word in an
// indication row is not enough to rank (Spas-Go lists "fever" too, but its
// molecules are an antispasmodic and mefenamic acid; paracetamol is the
// fever drug), so the product that actually treats the complaint goes first.
const ROLES: [RegExp, [RegExp, number][]][] = [
  [/fever|bukhar|bukhaar|बुखार|ज्वर|temperature|tap\b/, [[/paracetamol/, 30], [/meloxicam|flunixin|piroxicam|ketoprofen|nimesulide|meglumine/, 14]]],
  [/pain|dard|दर्द|swelling|sujan|soojan|सूजन|lame|langda|लंगड/, [[/meloxicam|flunixin|piroxicam|ketoprofen|nimesulide|mefenamic|diclofenac|meglumine/, 18], [/serratiopeptidase|paracetamol/, 8]]],
  [/marod|मरोड़|colic|spasm|ऐंठन|ainthan|pet dard|पेट दर्द|pet me dard/, [[/dicyclomine|hyoscine|drotaverine|pitofenone|fenpiverinium/, 30], [/flunixin|meglumine|mefenamic|meloxicam/, 10]]],
  [/worm|keed|keede|kide|कीड़|कृमि|fluke|फ्लूक/, [[/albendazole|fenbendazole|oxyclozanide|levamisole|ivermectin|praziquantel|closantel|triclabendazole/, 25]]],
  [/tick|chichdi|kilni|चिचड़|किलनी|lice|जूँ|mange|mite|khujli|खुजली|flea|पिस्सू/, [[/permethrin|amitraz|flumethrin|cypermethrin|deltamethrin|ivermectin|fipronil/, 22]]],
  [/diarrh|dast|दस्त|pechish|पेचिश|scour/, [[/metronidazole|tinidazole|furazolidone|ciprofloxacin|ofloxacin|loperamide|norfloxacin/, 22]]],
  [/mastitis|thanaila|थनैला|than\b|थन/, [[/ceftriaxone|cefoperazone|ceftiofur|amoxicillin|cloxacillin|enrofloxacin|levofloxacin|cefixime/, 18]]],
  [/bloat|afara|अफारा|gas\b|गैस/, [[/simethicone|dimethicone|turpentine|dill/, 25]]],
  [/milk fever|मिल्क फीवर|calcium|कैल्शियम|down cow|uth nahi/, [[/calcium/, 25]]],
  [/allerg|एलर्जी|pitti|पित्ती|rash|chakatte/, [[/chlorpheniramine|pheniramine|cetirizine/, 25]]],
]
function roleBoost(q: string, p: MadvetProduct): number {
  const salt = (p.salt_ingredient || '').toLowerCase()
  let b = 0
  for (const [complaint, mols] of ROLES) if (complaint.test(q)) for (const [m, w] of mols) if (m.test(salt)) { b += w; break }
  return b
}

const SPECIES: [RegExp, string[]][] = [
  [/\b(dog|dogs|puppy|kutta|kutte|kuttiya)\b|कुत्त|पिल्ल/, ['dog', 'canine', 'pet']],
  [/\b(cat|cats|kitten|billi)\b|बिल्ली/, ['cat', 'feline', 'pet']],
  [/\b(cow|cows|cattle|gaay|gay|gai|bachda|calf|calves|bachhiya)\b|गाय|बछ/, ['cattle', 'cow', 'calf', 'calves']],
  [/\b(buffalo|bhains|bhais)\b|भैंस/, ['buffalo']],
  [/\b(goat|goats|bakri|bakra)\b|बकरी|बकरा/, ['goat']],
  [/\b(sheep|bhed)\b|भेड़/, ['sheep']],
  [/\b(horse|ghoda|ghodi)\b|घोड़/, ['horse', 'equine']],
  [/\b(poultry|chicken|murgi|hen)\b|मुर्गी/, ['poultry', 'bird']],
]
export function speciesIn(text: string): string[] {
  return SPECIES.filter(([re]) => re.test(text)).flatMap(([, w]) => w)
}

export function productDetails(k: ChatKnowledge, list: MadvetProduct[]): string {
  if (!list.length) return ''
  return '## Full details for the products this question is about (best match for the main complaint FIRST)\n' + list.map(p => {
    const f = k.filmOf.get(p.id!)
    const pg = k.pageOf.get(p.id!)
    return [
      `### #${p.id} ${p.product_name}`,
      `Form: ${formOf(p)}`,
      p.category && `Category: ${p.category}`,
      p.salt_ingredient && `Composition: ${clip(p.salt_ingredient, 400)}`,
      p.packaging && `Pack: ${p.packaging}`,
      p.species && `Species: ${p.species}`,
      p.indication && `Indications: ${clip(p.indication, 400)}`,
      p.description && `About: ${clip(p.description, 500)}`,
      p.usp_benefits && `Key benefits: ${clip(p.usp_benefits, 400)}`,
      `Page: ${SITE}/products/${p.id}`,
      f && `Film: ${SITE}/videos?film=${encodeURIComponent(f.youtubeId || f.slug)}`,
      pg && `Folder page: ${SITE}/folder?p=${pg}`,
      // A small model misses one line in a 60-line scheme list, so each
      // product carries its own lines here — including "none", which is also
      // an answer.
      `Trade schemes this ${k.month}: ${(k.schemeOf.get(p.id!) || []).join(' | ') || 'none listed for this product'}`,
    ].filter(Boolean).join('\n')
  }).join('\n\n')
}
