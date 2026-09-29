// Clean, customer-facing text from a product row. The rows mix English,
// Devanagari and romanised Hindi in one comma list ("weakness, vitamin kami,
// urja samarthan, कमजोरी") because they were written for search, not for
// reading. Everything a customer SEES goes through here, so the list page,
// the product page and the share card say the same thing.
export interface CopyProduct {
  id: number
  name: string
  salt: string
  packaging: string
  formulation: string
  category: string
  species: string
  indication: string
  description: string
  benefits: string
}

// Romanised Hindi words that appear in the indication rows. A chip containing
// any of them is search text, not reading text.
const ROMAN_HI = /\b(kami|kamzori|kamjori|thakawat|thakan|durbalta|samarthan|urja|bukhar|bukhaar|dard|soojan|sujan|dast|doodh|dudh|pashu|garmi|gathiya|jod|jodon|maveshiyon|bhainson|sankraman|dawa|dawai|ilaj|kharab|keede|kide|khujli|mein|ka|ki|ke|ko|aur|nahi|poshan|rog|sehat|takat|taakat|bhook|bhuk|pachan|thanaila|ghav|zakhm|chichdi|kilni|joon|pechish|afara|marod|haddi|ainthan|kamjor|kamzor|bachcha|bachda|byaana|jer|garbh|khushk|balat|kharish|chichdi|dukhad|pida|peeda|takleef|bimari|beemari|rog)\b/i
const DEVANAGARI = /[ऀ-ॿ]/

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

// Indications in the database that the product's composition cannot support,
// kept off every customer-facing surface until the row is corrected in /admin
// (29 Sep audit). A herbal udder spray does not treat milk fever — that is a
// blood-calcium problem.
const NOT_SUPPORTED: Record<number, RegExp> = {
  13: /milk fever/i,   // Mastiout Spray
}

export function cleanIndications(ind: string, max = 8, id?: number): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  const block = id != null ? NOT_SUPPORTED[id] : undefined
  for (const raw of (ind || '').split(/[,;]/)) {
    const s = raw.replace(/\s+/g, ' ').trim()
    if (s.length < 3 || DEVANAGARI.test(s) || ROMAN_HI.test(s) || (block && block.test(s))) continue
    const k = s.toLowerCase().replace(/[^a-z]/g, '')
    // "fever" and "fever in cattle" say the same thing on a card
    if (seen.has(k) || [...seen].some(x => k.startsWith(x) && x.length > 4)) continue
    seen.add(k)
    out.push(cap(s))
    if (out.length >= max) break
  }
  return out
}

export function hindiIndications(ind: string, max = 8): string[] {
  return [...new Set((ind || '').split(/[,;]/).map(s => s.trim()).filter(s => DEVANAGARI.test(s)))].slice(0, max)
}

// One line: what it is for. The description's first sentence when it is a
// sentence; otherwise the first indications.
export function purposeLine(p: CopyProduct, max = 120): string {
  const first = (p.description || '').split(/(?<=[.!?])\s+/)[0]?.trim() || ''
  const line = first.length >= 25 && !DEVANAGARI.test(first) ? first : cleanIndications(p.indication, 4, p.id).join(', ')
  return clip(line, max)
}

export function clip(s: string, max: number): string {
  const t = (s || '').replace(/\s+/g, ' ').trim()
  if (t.length <= max) return t
  const cut = t.slice(0, max - 1)
  return cut.slice(0, Math.max(cut.lastIndexOf(' '), max * 0.6)).replace(/[,;:\s]+$/, '') + '…'
}

export function compList(salt: string): string[] {
  return (salt || '')
    .replace(/\s+/g, ' ')
    .split(/,(?![^()]*\))|;|\s&\s(?=[A-Z])/)
    .map(s => s.trim().replace(/^and\s+/i, ''))
    .filter(s => s && !/^(water for injection|excipients?|q\.?s\.?)\b/i.test(s))
}

export function compShort(salt: string, max = 110): string {
  return clip(compList(salt).join(' · '), max)
}

const SP_NORM: Record<string, string> = {
  cattle: 'Cattle', cow: 'Cattle', cows: 'Cattle', buffalo: 'Buffalo', buffaloes: 'Buffalo',
  sheep: 'Sheep', goat: 'Goat', goats: 'Goat', dog: 'Dog', dogs: 'Dog', cat: 'Cat', cats: 'Cat',
  poultry: 'Poultry', horse: 'Horse', horses: 'Horse', calf: 'Calf', calves: 'Calf',
  camel: 'Camel', camels: 'Camel', pig: 'Pig', pigs: 'Pig', swine: 'Pig',
}
export function speciesList(species: string): string[] {
  const out: string[] = []
  for (const raw of (species || '').split(/[,/&]| and /)) {
    const k = raw.trim().toLowerCase()
    const v = SP_NORM[k] || (k && !DEVANAGARI.test(k) ? cap(k) : '')
    if (v && !out.includes(v)) out.push(v)
  }
  return out
}

export const SP_ICON: Record<string, string> = {
  Cattle: '🐄', Buffalo: '🐃', Sheep: '🐑', Goat: '🐐', Dog: '🐕', Cat: '🐈',
  Poultry: '🐔', Horse: '🐎', Calf: '🐮', Camel: '🐪', Pig: '🐖',
}

export function packLabel(p: CopyProduct): string {
  const pk = (p.packaging || '').replace(/\s+/g, ' ').trim()
  return pk ? cap(pk) : p.formulation
}
