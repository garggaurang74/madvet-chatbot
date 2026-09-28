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
      `#${p.id} ${p.product_name}`,
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
    `## Product index (${products.length} products). Format: #id name | category | species | pack | indications [film, folder page]`,
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

export function findRelevant(k: ChatKnowledge, text: string, max = 6): MadvetProduct[] {
  const low = text.toLowerCase()
  const words = low.split(/[^a-z0-9ऀ-ॿ%]+/).filter(w => w.length >= 3 && !STOP.has(w))
  const expanded = new Set<string>(words)
  for (const [t, en] of Object.entries(TERMS)) if (low.includes(t)) en.forEach(e => expanded.add(e))
  const q = squash(text)

  const scored = k.products.map(p => {
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
    return { p, s }
  }).filter(x => x.s > 0).sort((a, b) => b.s - a.s)

  return scored.slice(0, max).map(x => x.p)
}

export function productDetails(k: ChatKnowledge, list: MadvetProduct[]): string {
  if (!list.length) return ''
  return '## Full details for the products this question is about\n' + list.map(p => {
    const f = k.filmOf.get(p.id!)
    const pg = k.pageOf.get(p.id!)
    return [
      `### #${p.id} ${p.product_name}`,
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
