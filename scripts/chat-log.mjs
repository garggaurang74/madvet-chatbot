// What people asked the assistant: node scripts/chat-log.mjs [days=7]
// Prints every question with what was found, flags and 👍/👎, then the
// questions that found nothing and the answers marked 👎 or flagged — the
// next additions to eval/questions.json. Needs SUPABASE_SERVICE_ROLE_KEY
// (.env.local); the log lives in the private admin-config bucket.
import { readFileSync, existsSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const env = { ...process.env }
if (existsSync('.env.local')) for (const l of readFileSync('.env.local', 'utf8').split('\n')) { const m = l.match(/^([A-Z_]+)=(.*)$/); if (m && !env[m[1]]) env[m[1]] = m[2] }
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const days = Number(process.argv[2] || 7)

const rows = [], votes = new Map()
for (let d = 0; d < days; d++) {
  const day = new Date(Date.now() - d * 864e5).toISOString().slice(0, 10)
  const { data } = await sb.storage.from('admin-config').list(`chat-log/${day}`, { limit: 1000 })
  for (const f of data || []) {
    const { data: blob } = await sb.storage.from('admin-config').download(`chat-log/${day}/${f.name}`)
    if (!blob) continue
    const j = JSON.parse(await blob.text())
    if (j.rating) votes.set(j.id, j.rating); else rows.push(j)
  }
}
rows.sort((a, b) => a.at.localeCompare(b.at))
for (const r of rows) {
  const v = votes.get(r.id)
  console.log(`${r.at.slice(5, 16)} ${v === 'down' ? '👎' : v === 'up' ? '👍' : '  '} ${r.q.slice(0, 70).padEnd(70)} [${r.concepts.join(',')}] found ${r.found.slice(0, 4).join(',')}${r.semantic?.length ? ` (+meaning ${r.semantic})` : ''}${r.flags.length ? `  ⚠ ${r.flags.join(' ')}` : ''}`)
}
const empty = rows.filter(r => !r.found.length)
const bad = rows.filter(r => votes.get(r.id) === 'down' || r.flags.length)
console.log(`\n${rows.length} questions in ${days} days · ${empty.length} found nothing · ${bad.length} marked 👎 or flagged`)
for (const r of bad) console.log(`\n— ${r.q}\n${r.answer}\n  ⚠ ${r.flags.join(' ') || '👎'}`)
