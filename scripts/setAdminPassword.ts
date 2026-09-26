/**
 * Set the /admin password. Stores only a salted scrypt hash, in the PRIVATE
 * `admin-config` bucket, which the live site reads with its service-role key.
 * No Vercel setting is involved, and logins pick up the change immediately.
 *
 *   npx tsx scripts/setAdminPassword.ts            # uses ADMIN_PASSWORD from .env.local
 *   npx tsx scripts/setAdminPassword.ts <password> # sets a new one
 */
import { readFileSync } from 'fs'
import { randomBytes } from 'crypto'
import { createClient } from '@supabase/supabase-js'
import { ADMIN_CONFIG_BUCKET, hashPassword } from '../lib/adminSession'

const env: Record<string, string> = {}
for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/)
  if (m && !(m[1] in env)) env[m[1]] = m[2].trim()
}

const password = process.argv[2] || env.ADMIN_PASSWORD
if (!password || password.length < 10) {
  console.error('❌  Need a password of at least 10 characters (argument or ADMIN_PASSWORD in .env.local)')
  process.exit(1)
}
if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌  NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing from .env.local')
  process.exit(1)
}

async function main() {
  const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

  const { data: bucket } = await sb.storage.getBucket(ADMIN_CONFIG_BUCKET)
  if (!bucket) {
    const { error } = await sb.storage.createBucket(ADMIN_CONFIG_BUCKET, { public: false })
    if (error) throw error
    console.log(`created private bucket ${ADMIN_CONFIG_BUCKET}`)
  } else if (bucket.public) {
    throw new Error(`${ADMIN_CONFIG_BUCKET} is PUBLIC — refusing to write the hash there`)
  }

  const salt = randomBytes(16).toString('hex')
  const body = JSON.stringify({ salt, hash: hashPassword(password, salt), updated: new Date().toISOString() })
  const { error } = await sb.storage.from(ADMIN_CONFIG_BUCKET)
    .upload('admin.json', Buffer.from(body), { contentType: 'application/json', upsert: true })
  if (error) throw error
  console.log('✅  admin password hash stored')
}

main().catch(e => { console.error('❌ ', e.message || e); process.exit(1) })
