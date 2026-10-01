// Checks the assistant's finished answer against the data it was given (1 Oct
// 2026). The model is small and is kept on cost grounds, so it sometimes says
// something its own context contradicts — on 30 Sep it told a retailer Butacin
// had "no scheme" while holding the scheme line. A wrong FACT is corrected in
// code before the customer leaves; a risky phrase that cannot be un-said is
// flagged in the log for review.
import type { MadvetProduct } from './supabase'

export interface GuardResult { fix: string; flags: string[] }

const NO_SCHEME = /no (trade )?scheme|no scheme|not (have|has) (a|any) scheme|no offer|scheme (is )?not (available|listed)|scheme nahi|koi scheme nahi|कोई स्कीम नहीं|स्कीम नहीं|कोई योजना नहीं|योजना नहीं|ऑफर नहीं/i
const DOSE = /(\d+(?:\.\d+)?)\s*(ml|मिली|bolus|boluses|बोलस|tablets?|टैबलेट|gm|grams?|ग्राम|sachets?)\s*(per|daily|a day|twice|दिन|रोज|प्रति|bar|बार|kg|किलो)/i
const VIRAL = /lumpy|लंपी|लम्पी|fmd|foot.and.mouth|खुरपका|मुँहपका|मुंहपका/i
const CURE = /\bcures?\b|\bcured\b|ठीक कर देगा|ठीक कर देती|ठीक हो जाएगा|ठीक हो जाएगी|जड़ से|पूरी तरह ठीक|रोग खत्म/i
const SAFETY = /no side.?effects?|कोई साइड इफेक्ट नहीं|कोई दुष्प्रभाव नहीं|safe in pregnancy|गर्भावस्था में सुरक्षित|no withdrawal/i

const squash = (s: string) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '')

export function checkAnswer(answer: string, o: {
  named: MadvetProduct[]                 // products the answer recommended (its PRODUCTS: tag)
  relevant: MadvetProduct[]              // products the question was about
  all: MadvetProduct[]
  schemeOf: Map<number, string[]>
  month: string
  hindi: boolean
}): GuardResult {
  const flags: string[] = []
  const fixes: string[] = []
  const text = answer.replace(/\n*PRODUCTS:[\s\S]*$/, '')

  // 1. "No scheme" said about a product that has one this month.
  if (NO_SCHEME.test(text)) {
    const pool = o.named.length ? o.named : o.relevant.slice(0, 1)
    for (const p of pool) {
      const lines = o.schemeOf.get(p.id!) || []
      if (!lines.length) continue
      fixes.push(o.hindi
        ? `**सुधार:** इस महीने (${o.month}) **${p.product_name}** पर स्कीम है — ${lines.join(' | ')}। अंतिम शर्तें Madvet प्रतिनिधि बताएँगे।`
        : `**Correction:** **${p.product_name}** does have a scheme this ${o.month} — ${lines.join(' | ')}. Final terms are confirmed by the Madvet representative.`)
      flags.push(`no-scheme-contradicted:${p.id}`)
    }
  }

  // 2. Things that cannot be un-said once streamed: flagged for review.
  if (DOSE.test(text)) flags.push('dose-figure')
  if (VIRAL.test(text) && CURE.test(text)) flags.push('viral-cure-wording')
  if (/vaccin|टीका|वैक्सीन/i.test(text)) flags.push('vaccine-mentioned')
  if (SAFETY.test(text)) flags.push('safety-claim')
  if (/\+?91[\s-]?\d{10}|\b\d{10}\b/.test(text)) flags.push('phone-number')
  // A bold name that is no product in the catalogue may be an invented one.
  const names = o.all.map(p => squash(p.product_name || '')).filter(n => n.length >= 3)
  for (const m of text.matchAll(/\*\*([^*]{3,40})\*\*/g)) {
    const b = squash(m[1])
    if (!/[a-z]/.test(b) || b.length < 4) continue
    if (/correction|madvet|scheme|note/.test(b)) continue
    const k = Math.min(6, b.length)
    if (!names.some(n => n.slice(0, k) === b.slice(0, k))) flags.push(`unknown-name:${m[1].slice(0, 30)}`)
  }

  return { fix: fixes.length ? `\n\n${fixes.join('\n\n')}` : '', flags }
}
