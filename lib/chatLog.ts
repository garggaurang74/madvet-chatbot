// Every question the assistant is asked, what it found and what it said, kept
// in the PRIVATE admin-config bucket (chat-log/<date>/<id>.json) — no IP, no
// name, nothing that identifies the asker. This is how the site gets better
// after launch: the questions people really type become test cases
// (eval/questions.json), and a 👎 or a guard flag marks an answer to read.
// Read them with: node scripts/chat-log.mjs [days]
import { getAdminSupabase } from './adminSession'

const BUCKET = 'admin-config'

export function newLogId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

const day = (id: string) => new Date(parseInt(id.split('-')[0], 36)).toISOString().slice(0, 10)

async function put(path: string, body: unknown): Promise<void> {
  const sb = getAdminSupabase()
  if (!sb) return
  const blob = new Blob([JSON.stringify(body)], { type: 'application/json' })
  // Never let logging hold up or break an answer.
  await Promise.race([
    sb.storage.from(BUCKET).upload(path, blob, { upsert: true, contentType: 'application/json' }).then(() => undefined, () => undefined),
    new Promise<void>(r => setTimeout(r, 1500)),
  ])
}

export interface ChatLogEntry {
  q: string
  lang: string
  concepts: string[]
  found: number[]          // products handed to the model, best first
  semantic: number[]       // of those, the ones only the meaning index found
  primary: number[]
  complementary: number[]
  answer: string
  flags: string[]
  ms: number
}

export async function logChat(id: string, e: ChatLogEntry): Promise<void> {
  try { await put(`chat-log/${day(id)}/${id}.json`, { id, at: new Date().toISOString(), ...e, answer: e.answer.slice(0, 3000) }) } catch {}
}

export async function logFeedback(id: string, rating: 'up' | 'down', note = ''): Promise<void> {
  if (!/^[a-z0-9]+-[a-z0-9]+$/.test(id)) return
  try { await put(`chat-log/${day(id)}/${id}.${rating}.json`, { id, rating, note: note.slice(0, 500), at: new Date().toISOString() }) } catch {}
}
