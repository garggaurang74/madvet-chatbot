import { createHmac, scryptSync, timingSafeEqual } from 'crypto'
import { createClient } from '@supabase/supabase-js'
import type { NextRequest } from 'next/server'

// Server-only. The admin password is checked here and never reaches the
// browser. It is stored as a salted scrypt hash in admin.json inside the
// PRIVATE `admin-config` storage bucket, readable only with the service-role
// key, so changing it needs no Vercel setting. ADMIN_PASSWORD in the
// environment, when set, overrides it (local development).
//
// A successful login sets an httpOnly cookie "<expiry>.<hmac>" signed with a
// key derived from SUPABASE_SERVICE_ROLE_KEY.

export const ADMIN_COOKIE = 'madvet_admin'
export const ADMIN_CONFIG_BUCKET = 'admin-config'
const MAX_AGE_S = 24 * 60 * 60

function sessionKey(): string | null {
  const k = process.env.SUPABASE_SERVICE_ROLE_KEY
  return k ? createHmac('sha256', k).update('madvet-admin-session').digest('hex') : null
}

function sign(expiry: string, key: string): string {
  return createHmac('sha256', key).update(`madvet-admin:${expiry}`).digest('hex')
}

function safeEqual(a: string | Buffer, b: string | Buffer): boolean {
  const x = Buffer.from(a), y = Buffer.from(b)
  return x.length === y.length && timingSafeEqual(x, y)
}

export function hashPassword(password: string, salt: string): string {
  return scryptSync(password, salt, 32).toString('hex')
}

export async function checkPassword(given: string): Promise<boolean> {
  if (!given) return false
  const envPassword = process.env.ADMIN_PASSWORD
  if (envPassword) return safeEqual(given, envPassword)

  const supabase = getAdminSupabase()
  if (!supabase) return false
  const { data, error } = await supabase.storage.from(ADMIN_CONFIG_BUCKET).download('admin.json')
  if (error || !data) return false
  try {
    const { salt, hash } = JSON.parse(await data.text())
    return Boolean(salt && hash) && safeEqual(hashPassword(given, salt), hash)
  } catch {
    return false
  }
}

export function newSessionCookie(): { value: string; maxAge: number } | null {
  const key = sessionKey()
  if (!key) return null
  const expiry = String(Date.now() + MAX_AGE_S * 1000)
  return { value: `${expiry}.${sign(expiry, key)}`, maxAge: MAX_AGE_S }
}

export function isAdmin(req: NextRequest): boolean {
  const key    = sessionKey()
  const cookie = req.cookies.get(ADMIN_COOKIE)?.value
  if (!key || !cookie) return false
  const [expiry, mac] = cookie.split('.')
  if (!expiry || !mac || Number(expiry) < Date.now()) return false
  return safeEqual(mac, sign(expiry, key))
}

export function unauthorized() {
  return Response.json({ error: 'Unauthorized — please log in to /admin again.' }, { status: 401 })
}

// Writes go through the service-role key, which bypasses row-level security.
// The anon key in every page is then free to be made read-only.
export function getAdminSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { persistSession: false } })
}
