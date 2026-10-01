// The recommendation test: node scripts/eval.mjs [--verbose]
// Asks every question in eval/questions.json of lib/recommend.ts against the
// LIVE product list (Supabase, read-only anon key from .env.local) and prints a
// score. Run it after any change to search, the concepts or the product data;
// a number that drops is a regression, whatever the change was for.
import { readFileSync, existsSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { search, goesWith, conceptsIn } from '../lib/recommend.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const verbose = process.argv.includes('--verbose')

function env() {
  const f = join(root, '.env.local')
  const out = { ...process.env }
  if (existsSync(f)) for (const line of readFileSync(f, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.*)$/)
    if (m && !out[m[1]]) out[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
  return out
}

async function products() {
  const e = env()
  const snap = join(root, 'eval', 'products.snapshot.json')
  try {
    const table = e.NEXT_PUBLIC_SUPABASE_TABLE || 'products_enriched'
    const url = `${e.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/${table}?select=id,product_name,salt_ingredient,category,species,indication,description,usp_benefits,aliases,packaging,formulation&order=id`
    const r = await fetch(url, { headers: { apikey: e.NEXT_PUBLIC_SUPABASE_ANON_KEY, Authorization: `Bearer ${e.NEXT_PUBLIC_SUPABASE_ANON_KEY}` } })
    if (!r.ok) throw new Error(String(r.status))
    const rows = await r.json()
    writeFileSync(snap, JSON.stringify(rows))
    return rows
  } catch (err) {
    console.warn(`(live product list unavailable: ${err.message}; using the last snapshot)`)
    return JSON.parse(readFileSync(snap, 'utf8'))
  }
}

const rows = await products()
const items = rows.map(p => ({
  id: p.id, name: (p.product_name || '').trim(), salt: p.salt_ingredient || '', category: p.category || '', species: p.species || '',
  indication: p.indication || '', description: p.description || '', benefits: p.usp_benefits || '', aliases: p.aliases || '',
  packaging: p.packaging || '', formulation: p.formulation || '',
}))
const byId = new Map(items.map(p => [p.id, p]))
const file = process.argv.slice(2).find(a => a.endsWith('.json')) || join(root, 'eval', 'questions.json')
const { questions } = JSON.parse(readFileSync(file, 'utf8'))

let pass = 0, conceptOk = 0, conceptAsked = 0
const fails = []
for (const t of questions) {
  const { hits, concepts } = search(items, t.q, { max: 5 })
  const top3 = hits.slice(0, 3).map(h => h.item.id)
  const top5 = hits.slice(0, 5).map(h => h.item.id)
  const ids = concepts.map(c => c.id)
  const okHit = t.expect.some(id => top3.includes(id))
  const okAvoid = !(t.avoid || []).some(id => top5.includes(id))
  const okConcept = !t.concept || ids.includes(t.concept)
  const okNot = !t.notConcept || !ids.includes(t.notConcept)
  if (t.concept) { conceptAsked++; if (okConcept) conceptOk++ }
  const ok = okHit && okAvoid && okConcept && okNot
  if (ok) pass++
  else fails.push({ t, top3, ids })
  if (verbose) console.log(`${ok ? '✓' : '✗'} ${t.q.padEnd(40)} [${ids.join(',')}] → ${top3.map(id => byId.get(id)?.name).join(' · ')}`)
}

// "Goes well with" must never pair a pet product with a cattle one, or a
// product with another pack of itself.
let pairBad = 0, pairTotal = 0, noPartner = 0
for (const p of items) {
  const g = goesWith(p, items)
  if (!g.length) noPartner++
  for (const x of g) {
    pairTotal++
    const pet = s => /^(\s*(dog|cat)s?\s*,?\s*)+$/i.test(s || '')
    if (pet(p.species) !== pet(x.item.species) && pet(p.species)) { pairBad++; console.log(`  ✗ pet product ${p.name} paired with ${x.item.name}`) }
  }
}

console.log(`\nSearch: ${pass}/${questions.length} pass (${Math.round(100 * pass / questions.length)}%) · complaint recognised ${conceptOk}/${conceptAsked}`)
console.log(`Goes well with: ${pairTotal} pairings over ${items.length} products, ${noPartner} with none, ${pairBad} pet/livestock mismatches`)
if (fails.length) {
  console.log('\nFailing:')
  for (const { t, top3, ids } of fails) console.log(`  ${t.q} — recognised [${ids.join(',') || 'nothing'}], got ${top3.map(id => `${id} ${byId.get(id)?.name}`).join(' · ') || 'nothing'}; wanted one of ${t.expect.join(',')}${t.avoid ? `, never ${t.avoid}` : ''}`)
}
process.exitCode = pass === questions.length && !pairBad ? 0 : 1
void conceptsIn
