// The site's one recommendation brain (1 Oct 2026). Product search, the
// product page's "goes well with", the films search and the assistant all ask
// this file, so a customer gets the same answer wherever they ask.
//
// Three ideas, each a lesson the folder already paid for:
//  • A complaint is matched by MEANING, not by the exact word: "dudh ghat
//    gaya", "doodh kam", "दूध कम हो गया" and "milk drop" are one concept, and
//    Hinglish spellings are folded together (doodh = dudh, bukhaar = bukhar).
//  • A product is chosen for a complaint by what its MOLECULE does (the All
//    Stop lesson, CLAUDE.md): fever → paracetamol first, not any product whose
//    indication row happens to say "fever".
//  • "Goes well with" is a role pairing (antibiotic → fever/pain relief, liver
//    support, gut recovery), never "same category" — an antibiotic page used to
//    suggest eight more antibiotics.
//
// Pure functions, no I/O: safe in the browser and on the server.

export interface RecItem {
  id: number
  name: string
  salt: string
  category: string
  species: string
  indication: string
  description?: string
  benefits?: string
  aliases?: string
  packaging?: string
  formulation?: string
}

// ── Folding: one spelling for the many ways a word is typed ─────────────────
// Hinglish: doubled vowels, aspirates and z/j are folded (doodh, dudh → dud;
// bukhaar → bukar; kamzori → kamjori). Devanagari: the nukta and chandrabindu
// are folded (कीड़े → कीडे, हैं → हैं).
export function fold(s: string): string {
  let t = (s || '').toLowerCase().normalize('NFC')
  t = t.replace(/़/g, '').replace(/ँ/g, 'ं').replace(/[‌‍]/g, '')
  t = t.replace(/[’'`]/g, '')
  while (/[bcdgjkpt]h/.test(t)) t = t.replace(/([bcdgjkpt])h/g, '$1')
  t = t.replace(/sh/g, 's').replace(/ph/g, 'f')
  t = t.replace(/z/g, 'j').replace(/w/g, 'v').replace(/q/g, 'k')
  t = t.replace(/ai/g, 'e').replace(/ee/g, 'i').replace(/oo/g, 'u').replace(/aa/g, 'a').replace(/(.)\1+/g, '$1')
  return t.replace(/[^a-z0-9ऀ-ॿ%]+/g, ' ').replace(/\s+/g, ' ').trim()
}
const squash = (s: string) => (s || '').toLowerCase().replace(/[^a-z0-9ऀ-ॿ]/g, '')

// ── Roles: what a product IS, read from its composition first ───────────────
export type Role =
  | 'antibiotic' | 'antipyretic' | 'nsaid' | 'antispasmodic' | 'steroid' | 'antihistamine'
  | 'anthelmintic' | 'flukicide' | 'ecto' | 'antidiarrheal' | 'antiflatulent' | 'probiotic'
  | 'liver' | 'calcium' | 'phosphorus' | 'mineral' | 'vitB' | 'vitADE' | 'galactogogue'
  | 'uterine' | 'intrauterine' | 'prolapse' | 'fertility' | 'wound' | 'skin' | 'udder' | 'petcoat' | 'growth' | 'immunity'

const ROLE_TESTS: [Role, (p: RecItem, salt: string, all: string) => boolean][] = [
  ['antibiotic', (p, s) => /antibiotic/i.test(p.category) || /ceftriaxone|ceftiofur|cefixime|cephalexin|amoxy|amoxi|cloxacillin|sulbactam|tazobactam|levofloxacin|enrofloxacin|ciprofloxacin|ofloxacin/.test(s)],
  ['antipyretic', (_, s) => /paracetamol/.test(s)],
  ['nsaid', (_, s) => /meloxicam|flunixin|piroxicam|ketoprofen|mefenamic|nimesulide|diclofenac/.test(s)],
  ['antispasmodic', (_, s) => /dicyclomine|pitofenone|fenpiverinium|hyoscine|drotaverine/.test(s)],
  ['steroid', (_, s) => /isoflupredone|dexamethasone|prednisolone/.test(s)],
  ['antihistamine', (_, s) => /chlorpheniramine|pheniramine|cetirizine/.test(s)],
  ['anthelmintic', (_, s) => /albendazole|fenbendazole|oxyclozanide|levamisole|ivermectin|praziquantel|closantel/.test(s)],
  ['flukicide', (_, s) => /oxyclozanide|closantel|triclabendazole/.test(s)],
  ['ecto', (p, s) => /ectoparasiticide/i.test(p.category) || /permethrin|amitraz|flumethrin|cypermethrin|deltamethrin|fipronil|ivermectin/.test(s)],
  ['antidiarrheal', (_, s) => /metronidazole|furazolidone|loperamide|tinidazole/.test(s)],
  ['antiflatulent', (_, s) => /simethicone|dimethicone|dill/.test(s)],
  ['probiotic', (p, s) => /probiotic/i.test(p.category) || /yeast|lactobac|saccharomyces|probiotic/.test(s)],
  // A probiotic whose row lists "liver disorder" among ten things is a rumen
  // product, not a liver tonic.
  ['liver', (p, s, a) => /liver extract|silymarin/.test(s) || !/probiotic/i.test(p.category) && /liver tonic|liver health|liver disorder|liver problem|लीवर टॉनिक|जिगर की/.test(a)],
  ['calcium', (_, s) => /calcium/.test(s)],
  ['phosphorus', (_, s) => /butaphosphan|sodium acid phosphate|phosphorus/.test(s)],
  ['mineral', (_, s) => /mineral|chelated|zinc|copper|cobalt|manganese/.test(s)],
  ['vitB', (_, s) => /mecobalamin|methylcobalamin|cyanocobalamin|thiamine|pyridoxine|riboflavin|b12|b complex|vitamin-b/.test(s)],
  ['vitADE', (_, s) => /vitamin a\b.*d3|vitamin a,|vitamin e/.test(s)],
  // The indication row only: a soap whose blurb says "better milk yield" is
  // not a milk product.
  ['galactogogue', (p, s) => !/ectopara|antibiotic|anthelmintic|dermatolog/i.test(p.category) &&
    (/galactog/i.test(p.category) || /shatavari|jivanti|leptadenia|vidarikand|chandrasur/.test(s) || /milk production|milk increase|doodh badhane|sudden milk drop|milk yield/.test((p.indication || '').toLowerCase()))],
  ['intrauterine', p => /\biu\b|intra.?uterine/i.test(p.name)],
  ['uterine', (p, s, a) => /utro/i.test(p.name) || /ashoka|dashmool/.test(s) || /metritis|endometritis|pyometra|uterine/.test(a) && /reproduct/i.test(p.category)],
  ['prolapse', (_, __, a) => /prolapse/.test(a)],
  ['fertility', (_, s, a) => /progest/.test(s) || /anoestrus|anestrus|silent heat|infertility|repeat breed/.test(a)],
  ['wound', (_, __, a) => /maggot|wound/.test(a)],
  ['skin', p => /dermatolog/i.test(p.category)],
  ['udder', p => /udder care/i.test(p.category)],
  ['petcoat', (p, s) => /omega/.test(s) || /hair fall|dull coat/.test((p.indication || '').toLowerCase())],
  ['growth', (_, __, a) => /better growth|growth and development|strong bones|growth support/.test(a)],
  ['immunity', (_, __, a) => /immunity|immune support/.test(a)],
]

const roleMemo = new WeakMap<RecItem, Set<Role>>()
export function rolesOf(p: RecItem): Set<Role> {
  const hit = roleMemo.get(p)
  if (hit) return hit
  const salt = (p.salt || '').toLowerCase()
  const all = `${p.name} ${p.indication} ${p.description || ''} ${p.benefits || ''}`.toLowerCase()
  const r = new Set<Role>()
  for (const [role, test] of ROLE_TESTS) if (test(p, salt, all)) r.add(role)
  roleMemo.set(p, r)
  return r
}

// The one thing a product is mainly for, in the order a vet would name it.
const ROLE_ORDER: Role[] = ['antibiotic', 'intrauterine', 'flukicide', 'anthelmintic', 'ecto', 'antidiarrheal', 'antispasmodic',
  'nsaid', 'antipyretic', 'steroid', 'antihistamine', 'antiflatulent', 'prolapse', 'fertility', 'uterine',
  'udder', 'wound', 'skin', 'calcium', 'phosphorus', 'liver', 'petcoat', 'probiotic', 'vitB', 'mineral', 'vitADE', 'galactogogue', 'growth', 'immunity']
// Most tonics carry calcium, vitamins and a milk claim at once, so the order
// above alone misnames them; the product's own name and first indication say
// which of its jobs it is sold for.
export function primaryRole(p: RecItem): Role | null {
  const r = rolesOf(p)
  const salt = (p.salt || '').toLowerCase()
  const ind = (p.indication || '').toLowerCase()
  if (r.has('liver') && !r.has('anthelmintic') && /^\s*liver|^\s*जिगर/.test(ind)) return 'liver'
  if (r.has('probiotic') && /probiotic/i.test(p.category)) return 'probiotic'
  if (r.has('vitADE') && /^\s*vitamin a\b/.test(salt)) return 'vitADE'
  if (r.has('calcium') && /calci/i.test(p.name)) return 'calcium'
  if (r.has('galactogogue') && (/doodh|milk/i.test(p.name) || /galactog/i.test(p.category) || /shatavari|jivanti|leptadenia|chandrasur|vidarikand/.test(salt))) return 'galactogogue'
  if (r.has('mineral') && /mineral mixture|minerals mixture/.test(salt)) return 'mineral'
  if (isPetOnly(p)) {
    if (r.has('growth') && /grow/i.test(p.name)) return 'growth'
    if (/immun/i.test(p.name)) return 'immunity'
    if (r.has('petcoat')) return 'petcoat'
  }
  return ROLE_ORDER.find(x => r.has(x)) ?? null
}

// ── Species ─────────────────────────────────────────────────────────────────
const PET = new Set(['dog', 'cat'])
export function speciesSet(p: RecItem): Set<string> {
  return new Set((p.species || '').toLowerCase().split(/[,/&]| and /).map(s => s.trim().replace(/s$/, '')).filter(Boolean))
}
export const isPetOnly = (p: RecItem) => { const s = speciesSet(p); return s.size > 0 && [...s].every(x => PET.has(x)) }
const isLivestock = (p: RecItem) => [...speciesSet(p)].some(x => !PET.has(x))

// Written as people type them; folded once, so "bhains", "bhais" and भैंस
// all land on buffalo.
const SPECIES_RAW: [string[], string[]][] = [
  [['dog', 'dogs', 'puppy', 'puppies', 'kutta', 'kutte', 'kuttiya', 'kutton', 'कुत्ता', 'कुत्ते', 'कुतिया', 'पिल्ला', 'पिल्ले'], ['dog']],
  [['cat', 'cats', 'kitten', 'billi', 'billiyan', 'बिल्ली', 'बिल्लियों'], ['cat']],
  [['cow', 'cows', 'cattle', 'gaay', 'gay', 'gai', 'gaye', 'gau', 'bachda', 'bachde', 'bachhiya', 'bachiya', 'calf', 'calves', 'गाय', 'गायों', 'बछड़ा', 'बछड़े', 'बछिया'], ['cattle', 'calf']],
  [['buffalo', 'buffaloes', 'bhains', 'bhais', 'bhainse', 'katda', 'katdi', 'भैंस', 'भैंसों', 'कटड़ा', 'कटड़ी'], ['buffalo']],
  [['goat', 'goats', 'bakri', 'bakra', 'bakriyan', 'बकरी', 'बकरा', 'बकरियों'], ['goat']],
  [['sheep', 'bhed', 'भेड़', 'भेड़ों'], ['sheep']],
  [['horse', 'ghoda', 'ghodi', 'घोड़ा', 'घोड़ी'], ['horse']],
  [['poultry', 'chicken', 'murgi', 'hen', 'birds', 'मुर्गी', 'मुर्गियों'], ['poultry']],
]
const SPECIES_WORDS: [Set<string>, string[]][] = SPECIES_RAW.map(([w, s]) => [new Set(w.map(fold)), s])
const isSpeciesWord = (w: string) => SPECIES_WORDS.some(([set]) => set.has(w))
export function speciesInQuery(q: string): string[] {
  const words = fold(q).split(' ')
  return [...new Set(SPECIES_WORDS.filter(([set]) => words.some(w => set.has(w))).flatMap(([, s]) => s))]
}
function speciesFits(p: RecItem, wanted: string[]): boolean | null {
  if (!wanted.length) return null
  const s = speciesSet(p)
  if (!s.size) return null
  return wanted.some(w => s.has(w) || (w === 'calf' && s.has('cattle')) || (w === 'cattle' && s.has('calf')))
}

// ── Concepts: the complaints people bring, in the words they bring them ─────
// triggers are matched on the FOLDED query at a word start, so a stem covers
// its endings ("कीड" → कीड़े, कीड़ों; "worm" → worms). mol/role weights rank by
// what the product's molecule does; ind is a weaker tie-break on its own
// indication row. supportive: there is no medicine for the cause (a virus) —
// the products treat what comes with it, and every surface must say so.
export interface Concept {
  id: string
  en: string
  hi: string
  triggers: string[]
  roles?: Partial<Record<Role, number>>
  mol?: [RegExp, number][]
  ind?: RegExp
  supportive?: boolean
  pet?: boolean
  // Two word sets that, both present anywhere in the question, name this
  // complaint however the sentence is built: "doodh dena KAM kar diya",
  // "bachchedani BAHAR aa gayi".
  near?: [string[], string[]]
}

export const CONCEPTS: Concept[] = [
  { id: 'fever', near: [['sarir', 'badan', 'body', 'शरीर', 'बदन'], ['garam', 'hot', 'गरम', 'गर्म']], en: 'Fever', hi: 'बुखार', triggers: ['fever', 'bukar', 'bukhar', 'tap', 'tapman', 'temperature', 'garam', 'badan garam', 'बुखार', 'ज्वर', 'तापमान', 'शरीर गरम'],
    mol: [[/paracetamol/, 30], [/meloxicam|flunixin|piroxicam/, 14], [/mefenamic|isoflupredone/, 6]] },
  { id: 'pain', en: 'Pain and swelling', hi: 'दर्द और सूजन', triggers: ['pain', 'dard', 'swelling', 'sujan', 'sojan', 'inflam', 'दर्द', 'सूजन', 'सुजन', 'सोजन'],
    mol: [[/meloxicam|flunixin|piroxicam|mefenamic/, 20], [/serratiopeptidase/, 8], [/isoflupredone/, 8], [/paracetamol/, 6]] },
  { id: 'lame', en: 'Lameness, joint pain', hi: 'लंगड़ापन, जोड़ों का दर्द', triggers: ['lame', 'langd', 'langda', 'langdana', 'limp', 'joint', 'arthrit', 'gatiya', 'jodo', 'लंगड', 'जोड', 'गठिया'],
    mol: [[/meloxicam|flunixin|piroxicam/, 22], [/serratiopeptidase/, 10], [/isoflupredone/, 8]] },
  { id: 'colic', en: 'Colic, stomach cramps', hi: 'पेट दर्द, मरोड़', triggers: ['colic', 'marod', 'maror', 'enthan', 'cramp', 'spasm', 'pet dard', 'pet me dard', 'मरोड', 'ऐंठन', 'पेट दर्द', 'पेट में दर्द'],
    mol: [[/dicyclomine|pitofenone|fenpiverinium|hyoscine/, 32], [/flunixin/, 12], [/mefenamic/, 6]] },
  { id: 'worms', en: 'Worms', hi: 'पेट के कीड़े', triggers: ['worm', 'deworm', 'kide', 'kida', 'kido', 'kidon', 'kidom', 'kiro', 'kiro', 'pet ke kide', 'krimi', 'helminth', 'roundworm', 'tapeworm', 'कीड', 'कृमि', 'पेट के कीड', 'पेट में कीड'],
    mol: [[/fenbendazole|albendazole/, 26], [/oxyclozanide|levamisole/, 22], [/ivermectin/, 16]] },
  { id: 'fluke', en: 'Liver fluke', hi: 'लीवर फ्लूक', triggers: ['fluke', 'fluk', 'jigar ke kide', 'liver ke kide', 'liver kide', 'फ्लूक', 'फ्लुक', 'जिगर के कीड', 'लीवर के कीड', 'लिवर के कीड'],
    mol: [[/oxyclozanide/, 34], [/albendazole/, 10]] },
  { id: 'ticks', en: 'Ticks', hi: 'चिचड़ी', triggers: ['tick', 'cicdi', 'cicri', 'cicad', 'kilni', 'kilani', 'gicdi', 'चिचड', 'चीचड', 'किलनी', 'किल्ली', 'टिक'],
    mol: [[/amitraz|flumethrin|permethrin|cypermethrin|deltamethrin/, 26], [/ivermectin/, 12]] },
  { id: 'lice', en: 'Lice', hi: 'जूँ', triggers: ['lice', 'louse', 'ju', 'jun', 'jui', 'जूं', 'जुएं', 'जूँ'],
    mol: [[/permethrin|amitraz|flumethrin|cypermethrin/, 24], [/ivermectin/, 16]] },
  { id: 'mange', en: 'Mange, mites, itching', hi: 'खुजली, खारिश', triggers: ['mange', 'mite', 'scabies', 'itch', 'itching', 'khujli', 'khujali', 'kharish', 'khaj', 'खुजली', 'खारिश', 'खाज'],
    mol: [[/ivermectin/, 16], [/amitraz|permethrin|flumethrin/, 14], [/chlorpheniramine/, 12], [/neem|turpentine|omega/, 6]], ind: /mange|itch|scabies|khujli/ },
  { id: 'fleas', en: 'Fleas', hi: 'पिस्सू', triggers: ['flea', 'pisu', 'पिस्सू'], pet: true,
    mol: [[/permethrin|fipronil|flumethrin/, 18], [/ivermectin/, 8]], ind: /flea/ },
  { id: 'diarrhoea', en: 'Diarrhoea, loose dung', hi: 'दस्त', triggers: ['diarh', 'diarrh', 'diarrhoea', 'diarea', 'loose motion', 'loose dung', 'dast', 'patla gobar', 'pecis', 'dysentery', 'scour', 'दस्त', 'पतला गोबर', 'पेचिश'],
    mol: [[/metronidazole|furazolidone|tinidazole/, 26], [/loperamide/, 10], [/yeast|lactobac|saccharomyces/, 8]] },
  { id: 'bloat', en: 'Bloat, gas', hi: 'अफारा, गैस', triggers: ['bloat', 'afara', 'afra', 'gas', 'pet fula', 'tympan', 'अफारा', 'आफरा', 'गैस', 'पेट फूल'],
    mol: [[/simethicone|dimethicone|dill/, 30], [/yeast|lactobac/, 6]] },
  { id: 'appetite', near: [['kana', 'cara', 'feed', 'fed', 'kati', 'kata', 'kane', 'खाना', 'चारा', 'खाती', 'खाता'], ['nahi', 'cod', 'band', 'kam', 'not', 'off', 'नहीं', 'छोड', 'बंद', 'कम']], en: 'Off feed, poor appetite', hi: 'भूख न लगना, चारा न खाना', triggers: ['appetite', 'of fed', 'off feed', 'not eating', 'buk', 'buk nahi', 'kana nahi', 'cara nahi', 'anorex', 'indigest', 'badhajmi', 'bad hajmi', 'भूख', 'चारा नहीं', 'खाना नहीं', 'बदहजमी', 'अपच'],
    roles: { probiotic: 22, liver: 12, vitB: 8 }, ind: /appetite|off feed|anorexia|indigestion|भूख/ },
  { id: 'acidosis', en: 'Acidosis, grain overload', hi: 'एसिडोसिस', triggers: ['acidosis', 'acidity', 'grain overload', 'ज्यादा दाना', 'एसिडोसिस'],
    roles: { probiotic: 20 }, ind: /acidosis/ },
  { id: 'mastitis', near: [['udder', 'tan', 'थन'], ['infection', 'sujan', 'swelling', 'hard', 'sakt', 'संक्रमण', 'सूजन', 'सख्त']], en: 'Mastitis', hi: 'थनैला', triggers: ['mastitis', 'udder infection', 'tanela', 'tanaila', 'tanel', 'tan me sujan', 'udder swelling', 'clots in milk', 'dud me tukde', 'kun wala dud', 'chhichhde', 'chichde', 'chhichde', 'dudh fat', 'dudh phat', 'थनैला', 'थनेला', 'थन में सूजन', 'दूध में छीछड', 'दूध फटा'],
    mol: [[/ceftriaxone|ceftiofur|cefixime|amoxy|cloxacillin|enrofloxacin|levofloxacin/, 20], [/meloxicam|flunixin|piroxicam/, 10]], roles: { udder: 14 }, ind: /mastitis/ },
  { id: 'teat', en: 'Teat sores, cracked teats', hi: 'थन पर घाव, फटे थन', triggers: ['teat', 'tan par gav', 'fate tan', 'थन पर घाव', 'फटे थन', 'थन फट'], roles: { udder: 26, wound: 8 }, ind: /teat/ },
  { id: 'milkdrop', near: [['dud', 'दूध', 'milk'], ['kam', 'gat', 'suk', 'band', 'badana', 'badane', 'badao', 'badhane', 'increase', 'less', 'low', 'drop', 'कम', 'घट', 'सूख', 'बढ', 'बंद']], en: 'Low milk, sudden milk drop', hi: 'दूध कम होना', triggers: ['milk drop', 'low milk', 'less milk', 'milk yield', 'more milk', 'increase milk', 'milk production', 'dud kam', 'dud gat', 'dud badana', 'dud badane', 'dud nahi', 'dud sukh', 'dud ki kami', 'दूध कम', 'दूध घट', 'दूध बढ', 'दूध नहीं', 'दूध सूख', 'दूध की कमी'],
    mol: [[/shatavari|jivanti|leptadenia|chandrasur|vidarikand/, 46]], roles: { galactogogue: 30, mineral: 8, calcium: 6 }, ind: /milk production|milk yield|milk drop|doodh badhane|galactog/ },
  { id: 'letdown', en: 'Milk not let down', hi: 'दूध न उतारना', triggers: ['let down', 'letdown', 'dud nahi utar', 'dud cadana', 'दूध नहीं उतार', 'दूध चढ़ा', 'दूध चढा'], roles: { galactogogue: 20 }, ind: /let down/ },
  { id: 'milkfever', en: 'Milk fever, cow down after calving', hi: 'मिल्क फीवर, ब्याने के बाद गिरना', triggers: ['milk fever', 'down cow', 'downer', 'ut nahi', 'ut nahi rahi', 'beti hui', 'gir gayi', 'hypocalc', 'मिल्क फीवर', 'उठ नहीं', 'बैठ गई', 'गिर गई'],
    mol: [[/calcium/, 26]], roles: { calcium: 28 }, ind: /milk fever|hypocalc/ },
  { id: 'calcium', en: 'Calcium deficiency, weak bones', hi: 'कैल्शियम की कमी', triggers: ['calcium', 'kalsium', 'bones', 'hadi', 'हड्डी', 'कैल्शियम', 'कैल्सियम'], mol: [[/calcium/, 24], [/phosph|vitamin d3|cholecalciferol/, 6]] },
  { id: 'weakness', en: 'Weakness, debility', hi: 'कमजोरी', triggers: ['weak', 'debility', 'kamjori', 'kamjor', 'kamzori', 'thakawat', 'thakavat', 'thakaan', 'thakan', 'thaki', 'thaka', 'tired', 'lethargic', 'dull', 'sust', 'durbal', 'energy', 'tonic', 'कमजोरी', 'कमज़ोरी', 'थकावट', 'सुस्त', 'दुर्बल', 'टॉनिक', 'ताकत'],
    roles: { vitB: 18, phosphorus: 12, mineral: 8, liver: 8 }, ind: /weakness|debility|kamzori|कमजोरी/ },
  { id: 'wasting', en: 'Losing weight, getting thin', hi: 'पशु का दुबला होना', triggers: ['weight loss', 'losing weight', 'getting thin', 'patla ho', 'patla hota', 'patli ho', 'patli hoti', 'dubla', 'dubli', 'vajan kam', 'vajan gat', 'वजन कम', 'वजन घट', 'दुबला', 'दुबली', 'पतला हो', 'पतली हो'],
    roles: { vitB: 20, anthelmintic: 18, mineral: 14, liver: 12, probiotic: 10 } },
  { id: 'recovery', en: 'Recovery after illness', hi: 'बीमारी के बाद रिकवरी', triggers: ['recovery', 'after illness', 'bimari ke bad', 'बीमारी के बाद', 'रिकवरी'], roles: { vitB: 16, liver: 12, probiotic: 10 }, ind: /recovery/ },
  { id: 'anaemia', en: 'Anaemia, low blood', hi: 'खून की कमी', triggers: ['anemia', 'anaemia', 'kun ki kami', 'kun kam', 'खून की कमी', 'खून कम', 'एनीमिया'], mol: [[/ferrous|iron|liver extract|cyanocobalamin|mecobalamin/, 20]], ind: /anemia|anaemia/ },
  { id: 'liver', en: 'Liver problems', hi: 'लीवर की कमजोरी', triggers: ['liver', 'livar', 'jigar', 'hepat', 'लीवर', 'लिवर', 'जिगर'], roles: { liver: 30 }, ind: /liver/ },
  { id: 'noheat', en: 'Not coming in heat, repeat breeding', hi: 'हीट में न आना, बार-बार फिरना', triggers: ['heat', 'garmi', 'garmi me nahi', 'repeat breed', 'repeat', 'anestrus', 'anoestrus', 'silent heat', 'conception', 'gabin nahi', 'garb nahi', 'firna', 'bar bar', 'infertil', 'हीट', 'गर्मी में नहीं', 'गाभिन नहीं', 'गर्भ नहीं', 'बार बार फिर', 'बार-बार फिर', 'फिर जाती', 'बांझ'],
    roles: { fertility: 30, mineral: 10, vitADE: 10, uterine: 6 }, ind: /anoestrus|anestrus|silent heat|infertility|conception|repeat/ },
  { id: 'placenta', en: 'Retained placenta', hi: 'जेर न गिरना', triggers: ['placenta', 'jer', 'jer nahi', 'जेर', 'झेर', 'जेर नहीं'], roles: { uterine: 26, calcium: 8 }, ind: /placenta|जेर/ },
  { id: 'uterus', en: 'Uterine infection, discharge', hi: 'बच्चेदानी का संक्रमण, गंदा स्राव', triggers: ['metritis', 'endometritis', 'pyometra', 'discharge', 'baccedani', 'bacedani', 'garbasay', 'safed pani', 'गर्भाशय', 'बच्चेदानी', 'सफेद पानी', 'मवाद'],
    roles: { intrauterine: 30, uterine: 18 }, mol: [[/levofloxacin|ceftiofur|ceftriaxone/, 8]], ind: /metritis|uterine/ },
  { id: 'prolapse', near: [['bahar', 'out', 'बाहर'], ['baccedani', 'bacedani', 'bacadani', 'uterus', 'garbasay', 'yoni', 'vagina', 'बच्चेदानी', 'गर्भाशय', 'योनि']], en: 'Prolapse (uterus or vagina out)', hi: 'बेल / बच्चेदानी बाहर आना', triggers: ['prolapse', 'bel', 'bel nikalna', 'bahar aana', 'bahar nikal', 'बेल', 'बाहर निकल', 'बाहर आ'], roles: { prolapse: 34, calcium: 8 } },
  { id: 'calving', en: 'Care around calving', hi: 'ब्याने के समय की देखभाल', triggers: ['calving', 'after calving', 'byane', 'byahne', 'byat', 'prasav', 'delivery', 'ब्याने', 'ब्यांत', 'प्रसव', 'ब्याई'],
    roles: { calcium: 16, uterine: 16, galactogogue: 6 }, ind: /calving|postpartum|placenta/ },
  { id: 'pneumonia', en: 'Pneumonia, cough, breathing trouble', hi: 'निमोनिया, खांसी, सांस', triggers: ['pneumonia', 'nimonia', 'cough', 'kansi', 'sans', 'breath', 'respirat', 'nak bahna', 'निमोनिया', 'खांसी', 'खाँसी', 'सांस', 'साँस', 'नाक बह'],
    mol: [[/levofloxacin|enrofloxacin|ceftiofur|ceftriaxone|amoxy/, 22], [/flunixin|meloxicam/, 8]], ind: /pneumonia|respiratory/ },
  { id: 'footrot', en: 'Foot rot', hi: 'खुर सड़न', triggers: ['foot rot', 'hoof', 'kur sadan', 'kur sad', 'kur me gav', 'खुर सड', 'खुर में घाव'],
    mol: [[/ceftiofur|ceftriaxone|amoxy|levofloxacin/, 20]], roles: { wound: 10 }, ind: /foot rot/ },
  { id: 'wound', en: 'Wounds, maggots', hi: 'घाव, घाव में कीड़े', triggers: ['wound', 'maggot', 'gav', 'jakm', 'jakam', 'cot', 'gav me kide', 'kide pad', 'sore', 'घाव', 'जख्म', 'ज़ख्म', 'चोट', 'घाव में कीड', 'कीड़े पड'],
    roles: { wound: 30, skin: 8 }, ind: /wound|maggot/ },
  { id: 'skin', en: 'Skin infection, dermatitis', hi: 'चमड़ी का रोग', triggers: ['skin', 'derma', 'eczema', 'camdi', 'camdi rog', 'camri', 'tvaca', 'dane', 'फुंसी', 'चमड़ी', 'चमडी', 'त्वचा', 'दाने'],
    roles: { skin: 22, wound: 8 }, ind: /skin|dermat|eczema/ },
  { id: 'ringworm', en: 'Ringworm, fungal skin', hi: 'दाद, फंगस', triggers: ['ringworm', 'fungal', 'fungus', 'dad', 'दाद', 'फंगस', 'फंगल'], roles: { skin: 16, wound: 10 }, ind: /ringworm|fungal|dermatomycosis/ },
  { id: 'allergy', en: 'Allergy, rash, hives', hi: 'एलर्जी, पित्ती', triggers: ['allerg', 'rash', 'hives', 'urticaria', 'piti', 'cakate', 'एलर्जी', 'पित्ती', 'चकत्ते'],
    mol: [[/chlorpheniramine|pheniramine/, 30], [/isoflupredone/, 10]] },
  { id: 'coat', en: 'Hair fall, dull coat', hi: 'बाल झड़ना', triggers: ['hair fall', 'hairfal', 'coat', 'shedding', 'bal jad', 'bal girna', 'बाल झड', 'बाल गिर'], pet: true, mol: [[/omega/, 46]], roles: { petcoat: 30, skin: 10 } },
  { id: 'roughcoat', en: 'Rough, dull coat (livestock)', hi: 'खुरदरे, बेजान बाल', triggers: ['rough coat', 'dull coat', 'bal kade', 'baal khade', 'chamak nahi', 'camak nahi', 'bal ruke', 'बाल खड़े', 'बाल खडे', 'चमक नहीं', 'रूखे बाल'],
    roles: { anthelmintic: 18, mineral: 18, vitADE: 16, liver: 10 } },
  { id: 'growth', en: 'Poor growth', hi: 'बढ़वार कम', triggers: ['growth', 'badvar', 'badhvar', 'vikas', 'not growing', 'बढ़वार', 'बढवार', 'विकास'], roles: { growth: 22, calcium: 8, mineral: 8, vitADE: 6 }, ind: /growth/ },
  { id: 'immunity', en: 'Immunity', hi: 'रोग प्रतिरोधक क्षमता', triggers: ['immun', 'pratirodak', 'प्रतिरोधक', 'इम्युनिटी', 'इम्यूनिटी'], roles: { immunity: 20, vitADE: 8, mineral: 6 } },
  { id: 'mineral', en: 'Mineral deficiency, eating soil', hi: 'खनिज की कमी, मिट्टी खाना', triggers: ['mineral', 'mitti', 'mitti kana', 'pica', 'kanij', 'मिट्टी खा', 'खनिज', 'मिनरल'], mol: [[/mineral mixture|minerals mixture/, 46]], roles: { mineral: 26, phosphorus: 10, calcium: 6 }, ind: /mineral/ },
  { id: 'nerve', en: 'Nerve weakness, paralysis', hi: 'नसों की कमजोरी, लकवा', triggers: ['nerve', 'neuro', 'paralys', 'lakva', 'lakwa', 'नस', 'लकवा', 'लकवे'], mol: [[/methylcobalamin|mecobalamin/, 20], [/thiamine|pyridoxine/, 10]] },
  { id: 'infection', en: 'Bacterial infection', hi: 'बैक्टीरियल संक्रमण', triggers: ['infection', 'bacteria', 'antibiotic', 'sankraman', 'infeksan', 'संक्रमण', 'इन्फेक्शन', 'एंटीबायोटिक'], roles: { antibiotic: 22 } },
  { id: 'lumpy', en: 'Lumpy skin disease', hi: 'लंपी', triggers: ['lumpy', 'lampi', 'lumpi', 'gant', 'लंपी', 'लम्पी', 'गांठ'], supportive: true,
    mol: [[/paracetamol/, 18], [/meloxicam|flunixin/, 14], [/ceftriaxone|ceftiofur|amoxy|levofloxacin|enrofloxacin/, 10]], roles: { wound: 14, vitB: 4 } },
  { id: 'fmd', en: 'Foot-and-mouth disease', hi: 'खुरपका-मुँहपका', triggers: ['fmd', 'foot and mouth', 'kurpaka', 'munpaka', 'mupaka', 'खुरपका', 'मुंहपका', 'मुँहपका'], supportive: true,
    mol: [[/paracetamol/, 18], [/meloxicam|flunixin/, 14], [/ceftriaxone|ceftiofur|amoxy/, 8]], roles: { wound: 14 } },
]

const STOP = new Set(fold('pashu pashuon janwar jaanwar animal animals cattle the and for with about please give best which what is are to of in on a an my me kya hai hain he ho ka ki ke ko se me mein mai aur bhi ya koi kuch batao bataiye bataye dijiye chahiye chaiye dawa dawai dava davai medicine product products tablet ilaj ilaaj liye lie wala wali vala vali raha rahi rahe gaya gayi gai hota hoti tha thi kar kare karo hua hui sakta sakti kaun konsa kaunsa kon kis jab abhi bahut bohot ji sir है हैं में के की का को से और भी या कोई कुछ क्या दवा दवाई इलाज लिए वाला वाली रहा रही गया गई हो हुआ हुई कौन बताओ बताइए चाहिए जी').split(' '))

export interface Matched { concept: Concept; at: string }
// A trigger of four letters or more, or in Devanagari, is a stem and matches
// the start of a word ("kide" → kido, "कीड" → कीड़ों); a shorter Latin one must
// be the whole word, or "tap" (fever) would find "tapeworm".
const TRIGGERS = CONCEPTS.map(c => ({ c, t: c.triggers.map(fold).filter(Boolean) }))
const hasTrigger = (f: string, t: string) =>
  t.length >= 4 || /[\u0900-\u097f]/.test(t) ? f.includes(` ${t}`) : f.includes(` ${t} `)
const NEAR = new Map(CONCEPTS.filter(c => c.near).map(c => [c.id, c.near!.map(set => set.map(fold))]))
function rawConcepts(f: string): Matched[] {
  const out: Matched[] = []
  for (const { c, t } of TRIGGERS) {
    let hit = t.find(x => hasTrigger(f, x))
    const near = NEAR.get(c.id)
    if (!hit && near) {
      const a = near[0].find(x => hasTrigger(f, x)), b = near[1].find(x => hasTrigger(f, x))
      if (a && b) hit = `${a} ${b}`
    }
    if (hit) out.push({ concept: c, at: hit })
  }
  return out
}
export function conceptsIn(q: string): Matched[] {
  const f = ` ${fold(q)} `
  const out = rawConcepts(f)
  // "kide" inside "jigar ke kide" is a fluke question, not a worm one; "kide
  // pad gaye" in a wound is maggots; "dud" in "dud me tukde" is mastitis.
  const ids = new Set(out.map(m => m.concept.id))
  const drop = (id: string) => { const i = out.findIndex(m => m.concept.id === id); if (i >= 0) out.splice(i, 1) }
  if (ids.has('fluke') && ids.has('worms') && !/pet ke|पेट के|गोल|round/.test(f)) drop('worms')
  if (ids.has('wound') && ids.has('worms')) drop('worms')
  if (ids.has('mastitis')) { drop('milkdrop'); drop('infection') }
  if (ids.has('milkfever')) { drop('fever'); drop('calving') }
  if (ids.has('noheat') && /garmi|गर्मी/.test(f) && /tap|bukar|बुखार|lu |लू/.test(f)) drop('noheat')
  if (ids.has('teat')) { drop('mastitis'); drop('wound') }
  if (ids.has('colic')) drop('pain')
  if (ids.has('lame')) drop('pain')
  if (ids.has('fmd')) drop('footrot')
  if (ids.has('roughcoat')) drop('coat')
  if (ids.has('prolapse')) drop('uterus')
  if (ids.has('letdown')) drop('milkdrop')
  return out
}

function conceptScore(c: Concept, p: RecItem): number {
  const salt = (p.salt || '').toLowerCase()
  const r = rolesOf(p)
  let s = 0
  for (const [re, w] of c.mol || []) if (re.test(salt)) { s = Math.max(s, w) }
  for (const [role, w] of Object.entries(c.roles || {}) as [Role, number][]) if (r.has(role)) s = Math.max(s, w + (primaryRole(p) === role ? 6 : 0))
  if (c.ind && c.ind.test(`${p.indication} ${p.benefits || ''}`.toLowerCase())) s += s ? 4 : 8
  if (c.pet && !isPetOnly(p) && !speciesSet(p).has('dog')) s = Math.min(s, 4)
  return s
}

// ── Dose form, and a customer's condition on it ─────────────────────────────
// "no injection", "sirf bolus", "pilane wali" hold in search as they do in the
// assistant (29 Sep: told "no injection", the bot still offered one).
export type Form = 'injection' | 'bolus' | 'tablet' | 'oral liquid' | 'powder' | 'gel' | 'spray' | 'soap' | 'pour-on' | 'ointment' | 'shampoo' | 'intrauterine' | 'other'
export function formOfItem(p: RecItem): Form {
  const t = `${p.name} ${p.formulation || ''} ${p.packaging || ''}`.toLowerCase()
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
export interface FormRule { avoid: Set<Form>; only: Set<Form> | null; words: string[] }
export function formsIn(text: string): FormRule {
  const t = ` ${(text || '').toLowerCase()} `
  const avoid = new Set<Form>()
  let only: Set<Form> | null = null
  const NEG = '(no|not|without|bina|binaa|except|avoid|mat|nahi|nahin|na|नहीं|नही|मत|बिना|ना)'
  const INJ = '(inj|injection|injectable|injections|sui|इंजेक्शन|सुई)'
  if (new RegExp(`${NEG}\\s*(an?\\s+|koi\\s+|कोई\\s+)?${INJ}`).test(t) || new RegExp(`${INJ}\\s*(wala\\s*|वाला\\s*|vala\\s*)?(ke\\s+|के\\s+)?${NEG}`).test(t) || /injection se dar|सुई से डर/.test(t)) avoid.add('injection')
  if (new RegExp(`${NEG}\\s*(an?\\s+)?(bolus|बोलस)`).test(t) || /(bolus|बोलस)\s*(nahi|nahin|नहीं|mat|मत)/.test(t)) avoid.add('bolus')
  if (/\b(oral|orally|by mouth|muh se|munh se|khilane|pilane|pilaane)\b|मुंह से|मुँह से|पिलाने|खिलाने/.test(t)) { only = new Set(ORAL); avoid.add('injection') }
  if (/\b(only|sirf|bas|keval)\s+(bolus)|bolus (only|hi)\b|सिर्फ बोलस|बोलस ही/.test(t)) only = new Set<Form>(['bolus'])
  if (/\b(only|sirf|bas|keval)\s+(inj|injection)|injection (only|hi)\b|सिर्फ इंजेक्शन/.test(t)) only = new Set<Form>(['injection'])
  if (/\b(syrup|syp)\b|पिलाने वाली/.test(t) && !only) only = new Set<Form>(['oral liquid'])
  const words = avoid.size || only ? ['inj', 'injection', 'injections', 'injectable', 'sui', 'bolus', 'oral', 'syrup', 'syp', 'nahi', 'nahin', 'bina', 'without', 'no', 'not', 'only', 'sirf', 'bas', 'wala', 'wali', 'इंजेक्शन', 'बोलस', 'नहीं', 'बिना', 'सिर्फ'].map(fold) : []
  return { avoid, only, words }
}
export const obeysForm = (p: RecItem, r: FormRule) => { const f = formOfItem(p); return !r.avoid.has(f) && (!r.only || r.only.has(f)) }

// ── Search: name, then meaning, then words ──────────────────────────────────
export interface Hit<T extends RecItem = RecItem> { item: T; score: number; why: string[] }
export interface SearchResult<T extends RecItem = RecItem> { hits: Hit<T>[]; concepts: Concept[]; species: string[]; rule?: FormRule }

export function search<T extends RecItem>(items: T[], query: string, opts: { max?: number; textMustMatch?: boolean } = {}): SearchResult<T> {
  const q = (query || '').trim()
  if (!q) return { hits: items.slice(0, opts.max ?? items.length).map(item => ({ item, score: 0, why: [] })), concepts: [], species: [] }
  const matched = conceptsIn(q)
  const concepts = matched.map(m => m.concept)
  const species = speciesInQuery(q)
  const qs = squash(q)
  const fq = fold(q)
  const rule = formsIn(q)
  // Words that are not a concept trigger, an animal or a filler word must find
  // themselves in the product ("Butacin", "ceftriaxone", "100ml"). Every word
  // of a recognised complaint's vocabulary is spent on it — "dudh" in "dudh me
  // chhichhde" is the mastitis, not a search for Doodh Double — and so are the
  // words of a complaint dropped for a more specific one ("byane" in a
  // milk-fever question).
  const consumed = new Set([...rawConcepts(` ${fq} `).flatMap(m => [m.at, ...m.concept.triggers.map(fold), ...(NEAR.get(m.concept.id) || []).flat()].flatMap(x => x.split(' '))), ...rule.words])
  const words = fq.split(' ').filter(w => w.length >= 2 && !STOP.has(w) && !consumed.has(w) &&
    !isSpeciesWord(w))
  const sizes = sizesIn(q)

  const hits: Hit<T>[] = []
  for (const p of items) {
    if (!obeysForm(p, rule)) continue
    const why: string[] = []
    let s = 0
    const nameSq = squash(p.name)
    const base = nameSq.replace(/\d.*$/, '')
    if (base.length >= 3 && qs.includes(base)) {
      s += 60
      if (sizes.length) {
        const own = sizesIn(`${p.name} ${p.packaging || ''}`)
        if (own.some(x => sizes.includes(x))) s += 25
        else if (own.length) s -= 15
      }
    }
    for (const a of (p.aliases || '').split(/[,;/|]/).map(squash).filter(a => a.length >= 4)) if (qs.includes(a)) { s += 35; break }

    let cs = 0
    for (const c of concepts) { const x = conceptScore(c, p); if (x) { cs += x; why.push(c.id) } }
    s += cs

    const hay = fold(`${p.name} ${p.aliases || ''} ${p.salt} ${p.indication} ${p.description || ''} ${p.benefits || ''} ${p.category} ${p.packaging || ''}`)
    const hayFlat = hay.replace(/ /g, '')
    let wordHits = 0
    for (const w of words) {
      if (fold(p.name).split(' ').some(n => n.startsWith(w))) { s += w.length >= 3 ? 30 : 10; wordHits++ }
      else if (` ${hay}`.includes(` ${w}`) || (w.length >= 4 && hayFlat.includes(w))) { s += 8; wordHits++ }
    }
    // Plain search (no complaint recognised): every word must be found, as
    // before. With a complaint, extra words only add.
    if (!concepts.length && words.length && wordHits < words.length && s < 60) continue
    if (s <= 0) continue

    const fits = speciesFits(p, species)
    // No animal named: most who ask keep cattle, so a dog-only tablet should
    // not outrank the cattle product for "bukhar".
    if (!species.length && concepts.length && isPetOnly(p)) s -= 8
    if (fits === true) s += 12
    else if (fits === false) { if (concepts.length || words.length) s -= 40; else continue }
    if (s <= 0) continue
    hits.push({ item: p, score: s, why })
  }
  hits.sort((a, b) => b.score - a.score)
  // Keep the strong matches; a long tail of 2-point word hits under a clear
  // answer reads as noise.
  const top = hits[0]?.score ?? 0
  const kept = hits.filter(h => h.score >= Math.min(20, top * 0.25))
  return { hits: kept.slice(0, opts.max ?? kept.length), concepts, species, rule }
}

export function sizesIn(t: string): number[] {
  return [...(t || '').matchAll(/(\d+(?:\.\d+)?)\s*(ml|ltr|litre|liter|l|gms?|gm|g|kg)\b/gi)].map(m => {
    const n = parseFloat(m[1]), u = m[2].toLowerCase()
    return /^(ltr|litre|liter|l|kg)$/.test(u) ? n * 1000 : n
  })
}

// ── Goes well with ──────────────────────────────────────────────────────────
// Role → the supporting roles a vet commonly pairs with it, and why, in words
// a retailer can repeat. Supportive care only — never a second drug of the
// same class, never a claim about the partner beyond what its class does.
interface Pair { role: Role; en: string; hi: string; petOnly?: boolean }
const PAIRS: Partial<Record<Role, Pair[]>> = {
  antibiotic: [
    { role: 'antipyretic', en: 'Brings down fever and pain while the antibiotic works', hi: 'एंटीबायोटिक के साथ बुखार और दर्द में आराम' },
    { role: 'liver', en: 'Liver support through the course', hi: 'कोर्स के दौरान लीवर को सहारा' },
    { role: 'probiotic', en: 'Gets the rumen and appetite back after the course', hi: 'कोर्स के बाद पाचन और भूख वापस' },
    { role: 'vitB', en: 'Strength and recovery after the illness', hi: 'बीमारी के बाद ताकत और रिकवरी' },
  ],
  intrauterine: [
    { role: 'uterine', en: 'Uterine tonic to clean and tone the uterus', hi: 'बच्चेदानी की सफाई और मजबूती' },
    { role: 'fertility', en: 'Brings her back into heat after treatment', hi: 'इलाज के बाद दोबारा हीट में लाने में मदद' },
    { role: 'mineral', en: 'Minerals for the next conception', hi: 'अगले गर्भ के लिए खनिज' },
  ],
  nsaid: [
    { role: 'antibiotic', en: 'When the fever or swelling comes from a bacterial infection', hi: 'जब बुखार या सूजन बैक्टीरियल संक्रमण से हो' },
    { role: 'vitB', en: 'Strength and appetite while she recovers', hi: 'ठीक होते समय ताकत और भूख' },
    { role: 'liver', en: 'Liver support during treatment', hi: 'इलाज के दौरान लीवर को सहारा' },
  ],
  antipyretic: [
    { role: 'antibiotic', en: 'When the fever comes from a bacterial infection', hi: 'जब बुखार बैक्टीरियल संक्रमण से हो' },
    { role: 'vitB', en: 'Strength and appetite while she recovers', hi: 'ठीक होते समय ताकत और भूख' },
    { role: 'liver', en: 'Liver support during treatment', hi: 'इलाज के दौरान लीवर को सहारा' },
  ],
  antispasmodic: [
    { role: 'antiflatulent', en: 'When the colic comes with gas and bloat', hi: 'जब मरोड़ के साथ गैस और अफारा हो' },
    { role: 'probiotic', en: 'Settles digestion after the colic', hi: 'मरोड़ के बाद पाचन ठीक करने में' },
  ],
  steroid: [
    { role: 'antibiotic', en: 'Cover for infection when the swelling is infected', hi: 'सूजन में संक्रमण हो तो उसके लिए' },
    { role: 'vitB', en: 'Strength while she recovers', hi: 'ठीक होते समय ताकत' },
  ],
  antihistamine: [
    { role: 'skin', en: 'Soothes the skin the allergy has inflamed', hi: 'एलर्जी से खराब हुई चमड़ी के लिए' },
    { role: 'ecto', en: 'When the itching comes from ticks, lice or mites', hi: 'जब खुजली चिचड़ी, जूँ या माइट से हो' },
  ],
  flukicide: [
    { role: 'liver', en: 'Repairs the liver the flukes damaged', hi: 'फ्लूक से खराब हुए लीवर की मरम्मत' },
    { role: 'vitB', en: 'Regains condition and blood after deworming', hi: 'कीड़े निकलने के बाद ताकत और खून' },
    { role: 'ecto', en: 'For the outside parasites — ticks and lice', hi: 'बाहरी परजीवी — चिचड़ी और जूँ के लिए' },
  ],
  anthelmintic: [
    { role: 'liver', en: 'Liver support after deworming', hi: 'कीड़े निकलने के बाद लीवर को सहारा' },
    { role: 'mineral', en: 'Minerals and vitamins to regain weight and condition', hi: 'वजन और ताकत वापस लाने के लिए खनिज-विटामिन' },
    { role: 'ecto', en: 'For the outside parasites — ticks and lice', hi: 'बाहरी परजीवी — चिचड़ी और जूँ के लिए' },
  ],
  ecto: [
    { role: 'wound', en: 'Heals the bites and sores ticks leave', hi: 'चिचड़ी के काटे घाव भरने के लिए' },
    { role: 'antihistamine', en: 'Calms the itching', hi: 'खुजली में आराम' },
    { role: 'anthelmintic', en: 'Clears the worms inside too', hi: 'अंदर के कीड़ों के लिए भी' },
  ],
  antidiarrheal: [
    { role: 'probiotic', en: 'Rebuilds the gut after the diarrhoea', hi: 'दस्त के बाद पेट को वापस ठीक करने में' },
    { role: 'vitB', en: 'Strength back after the loss', hi: 'कमजोरी दूर करने के लिए' },
  ],
  antiflatulent: [
    { role: 'probiotic', en: 'Keeps digestion working so the gas does not return', hi: 'पाचन ठीक रखे ताकि गैस दोबारा न बने' },
    { role: 'antispasmodic', en: 'When the bloat comes with cramping pain', hi: 'अफारे के साथ मरोड़ हो तो' },
  ],
  probiotic: [
    { role: 'liver', en: 'Liver tonic alongside, for appetite and digestion', hi: 'भूख और पाचन के लिए लीवर टॉनिक साथ में' },
    { role: 'vitB', en: 'B-vitamins to bring the appetite back', hi: 'भूख लौटाने के लिए बी-विटामिन' },
  ],
  liver: [
    { role: 'probiotic', en: 'Gut support with the liver tonic', hi: 'लीवर टॉनिक के साथ पाचन को सहारा' },
    { role: 'flukicide', en: 'When flukes are the cause of the liver trouble', hi: 'जब लीवर की खराबी फ्लूक से हो' },
    { role: 'immunity', en: 'Immunity and overall health alongside', hi: 'साथ में रोग प्रतिरोधक क्षमता और सेहत', petOnly: true },
    { role: 'growth', en: 'Growth and bones for the young animal', hi: 'बढ़ते पशु की बढ़वार और हड्डियाँ', petOnly: true },
  ],
  galactogogue: [
    { role: 'mineral', en: 'Minerals a milking animal runs short of', hi: 'दूध देने वाले पशु के लिए खनिज' },
    { role: 'calcium', en: 'Calcium for the milk she gives', hi: 'दूध के साथ जाने वाले कैल्शियम की भरपाई' },
    { role: 'probiotic', en: 'Better digestion, better use of feed', hi: 'अच्छा पाचन, चारे का पूरा फायदा' },
  ],
  calcium: [
    { role: 'phosphorus', en: 'Phosphorus works with calcium', hi: 'कैल्शियम के साथ फॉस्फोरस' },
    { role: 'mineral', en: 'Daily minerals to keep it from coming back', hi: 'रोज़ के खनिज ताकि कमी दोबारा न हो' },
    { role: 'galactogogue', en: 'Milk support for the milking animal', hi: 'दूध देने वाले पशु के लिए' },
  ],
  phosphorus: [
    { role: 'calcium', en: 'Calcium works with phosphorus', hi: 'फॉस्फोरस के साथ कैल्शियम' },
    { role: 'mineral', en: 'Daily minerals', hi: 'रोज़ के खनिज' },
  ],
  vitB: [
    { role: 'liver', en: 'Liver tonic for appetite and strength', hi: 'भूख और ताकत के लिए लीवर टॉनिक' },
    { role: 'mineral', en: 'Minerals alongside', hi: 'साथ में खनिज' },
  ],
  mineral: [
    { role: 'vitADE', en: 'Vitamins A, D3 and E alongside the minerals', hi: 'खनिज के साथ विटामिन A, D3, E' },
    { role: 'calcium', en: 'Calcium for the milking animal', hi: 'दूध देने वाले पशु के लिए कैल्शियम' },
  ],
  vitADE: [
    { role: 'mineral', en: 'Minerals alongside the vitamins', hi: 'विटामिन के साथ खनिज' },
    { role: 'fertility', en: 'When she is not coming into heat', hi: 'जब पशु हीट में न आए' },
  ],
  fertility: [
    { role: 'mineral', en: 'Minerals that heat and conception depend on', hi: 'हीट और गर्भ के लिए जरूरी खनिज' },
    { role: 'vitADE', en: 'Vitamins A, D3 and E for fertility', hi: 'प्रजनन के लिए विटामिन A, D3, E' },
    { role: 'uterine', en: 'Uterine tonic', hi: 'बच्चेदानी का टॉनिक' },
  ],
  uterine: [
    { role: 'calcium', en: 'Calcium around calving', hi: 'ब्याने के समय कैल्शियम' },
    { role: 'fertility', en: 'Back into heat for the next conception', hi: 'अगले गर्भ के लिए दोबारा हीट' },
    { role: 'intrauterine', en: 'When there is infection or discharge', hi: 'जब संक्रमण या गंदा स्राव हो' },
  ],
  prolapse: [
    { role: 'calcium', en: 'Low calcium often sits behind a prolapse', hi: 'बेल के पीछे अक्सर कैल्शियम की कमी होती है' },
    { role: 'uterine', en: 'Uterine tonic', hi: 'बच्चेदानी का टॉनिक' },
  ],
  udder: [
    { role: 'antibiotic', en: 'When the udder infection needs treating from inside', hi: 'जब थन के संक्रमण का अंदर से इलाज चाहिए' },
    { role: 'nsaid', en: 'Brings the udder swelling and pain down', hi: 'थन की सूजन और दर्द कम करने में' },
  ],
  wound: [
    { role: 'ecto', en: 'Keeps flies and ticks off the healing wound', hi: 'भरते घाव से मक्खी-चिचड़ी दूर रखने में' },
    { role: 'antibiotic', en: 'When a deep wound is infected', hi: 'गहरा घाव संक्रमित हो तो' },
    { role: 'nsaid', en: 'Pain and swelling around the wound', hi: 'घाव के आसपास दर्द और सूजन' },
  ],
  skin: [
    { role: 'antihistamine', en: 'Calms the itching', hi: 'खुजली में आराम' },
    { role: 'ecto', en: 'When parasites are behind the skin trouble', hi: 'जब चमड़ी की परेशानी परजीवी से हो' },
    { role: 'petcoat', en: 'Skin and coat from inside', hi: 'अंदर से चमड़ी और बालों के लिए' },
  ],
  petcoat: [
    { role: 'skin', en: 'Skin care from outside', hi: 'बाहर से चमड़ी की देखभाल' },
    { role: 'ecto', en: 'When fleas or ticks are the cause', hi: 'जब पिस्सू या चिचड़ी कारण हों' },
  ],
  growth: [
    { role: 'liver', en: 'Appetite and digestion for growth', hi: 'बढ़वार के लिए भूख और पाचन' },
    { role: 'immunity', en: 'Immunity while growing', hi: 'बढ़ते समय रोग प्रतिरोधक क्षमता' },
  ],
  immunity: [
    { role: 'growth', en: 'Growth and bones', hi: 'बढ़वार और हड्डियाँ' },
    { role: 'liver', en: 'Appetite and liver support', hi: 'भूख और लीवर को सहारा' },
  ],
}

export interface Partner<T extends RecItem = RecItem> { item: T; role: Role; en: string; hi: string }

const family = (p: RecItem) => squash(p.name).replace(/\d.*$/, '').replace(/(bolus|inj|injection|syrup|powder|gel|spray|soap|tablet|liquid|ml|gm|litre)$/, '')

function sameAnimals(a: RecItem, b: RecItem): boolean {
  if (isPetOnly(a)) { const sb = speciesSet(b); return sb.has('dog') || sb.has('cat') }
  if (isPetOnly(b)) return false
  const sa = speciesSet(a), sb = speciesSet(b)
  if (!sa.size || !sb.size) return true
  return [...sa].some(x => sb.has(x))
}

// The partner that best fills a role for this product: the right animals,
// a different family, and — where a list of preferred ids is given (products
// with a film, say) — one of those first.
// Hormones are never suggested as an add-on: whether an animal gets one is
// the vet's decision, not a pairing.
const HORMONE = /progest|prostaglandin|cloprostenol|oxytocin|gnrh|buserelin|estradiol/
function bestFor<T extends RecItem>(p: T, role: Role, all: T[], used: Set<number>, prefer?: Set<number>): T | undefined {
  const fam = family(p)
  const pet = isPetOnly(p)
  const cands = all.filter(x => x.id !== p.id && !used.has(x.id) && family(x) !== fam && rolesOf(x).has(role) && sameAnimals(p, x)
    && (pet ? isPetOnly(x) : isLivestock(x)) && !HORMONE.test((x.salt || '').toLowerCase()))
  cands.sort((a, b) =>
    (primaryRole(b) === role ? 1 : 0) - (primaryRole(a) === role ? 1 : 0) ||
    rolesOf(a).size - rolesOf(b).size ||
    (pet ? (isPetOnly(b) ? 1 : 0) - (isPetOnly(a) ? 1 : 0) : 0) ||
    (prefer ? (prefer.has(b.id) ? 1 : 0) - (prefer.has(a.id) ? 1 : 0) : 0) ||
    overlap(p, b) - overlap(p, a) ||
    a.id - b.id)
  return cands[0]
}
const overlap = (a: RecItem, b: RecItem) => { const sa = speciesSet(a); return [...speciesSet(b)].filter(x => sa.has(x)).length }

export function goesWith<T extends RecItem>(p: T, all: T[], opts: { max?: number; prefer?: Set<number>; rule?: FormRule } = {}): Partner<T>[] {
  if (opts.rule) all = all.filter(x => obeysForm(x, opts.rule!))
  const role = primaryRole(p)
  if (!role) return []
  const out: Partner<T>[] = []
  const used = new Set<number>()
  const usedFam = new Set<string>([family(p)])
  for (const pair of PAIRS[role] || []) {
    if (rolesOf(p).has(pair.role)) continue           // it already does that
    if (pair.petOnly && !isPetOnly(p)) continue
    const x = bestFor(p, pair.role, all, used, opts.prefer)
    if (!x || usedFam.has(family(x))) continue
    used.add(x.id); usedFam.add(family(x))
    out.push({ item: x, role: pair.role, en: pair.en, hi: pair.hi })
    if (out.length >= (opts.max ?? 4)) break
  }
  return out
}

// Other products that do the same job — another form, strength or molecule.
// One per family, so the five Mediforce packs do not fill the row.
export function alternatives<T extends RecItem>(p: T, all: T[], max = 6): T[] {
  const role = primaryRole(p)
  if (!role) return all.filter(x => x.id !== p.id && x.category === p.category).slice(0, max)
  const fam = family(p)
  const salt = new Set((p.salt || '').toLowerCase().match(/[a-z]{5,}/g) || [])
  const seen = new Set<string>([fam])
  return all
    .filter(x => x.id !== p.id && primaryRole(x) === role && sameAnimals(p, x) && isPetOnly(x) === isPetOnly(p))
    .map(x => ({ x, s: ((x.salt || '').toLowerCase().match(/[a-z]{5,}/g) || []).filter(w => salt.has(w)).length }))
    .sort((a, b) => b.s - a.s || a.x.id - b.x.id)
    .map(({ x }) => x)
    .filter(x => { const f = family(x); if (seen.has(f)) return false; seen.add(f); return true })
    .slice(0, max)
}

// What a complaint calls for beyond its first medicine — the same pairing,
// read from the best hit. Used by search ("often given with") and the bot.
export function companionsFor<T extends RecItem>(hits: Hit<T>[], all: T[], max = 2): Partner<T>[] {
  if (!hits.length) return []
  const shown = new Set(hits.slice(0, 4).map(h => h.item.id))
  return goesWith(hits[0].item, all, { max: max + 2 }).filter(x => !shown.has(x.item.id)).slice(0, max)
}
