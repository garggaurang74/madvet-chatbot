import { createHmac, timingSafeEqual } from 'crypto'
import { createClient } from '@supabase/supabase-js'
import type { NextRequest } from 'next/server'

// Server-only. The admin password lives in ADMIN_PASSWORD (no NEXT_PUBLIC_
// prefix, so it never reaches the browser). A successful login sets an
// httpOnly cookie holding "<expiry>.<hmac>", keyed on the password itself, so
// changing ADMIN_PASSWORD in Vercel logs every session out.

export const ADMIN_COOKIE = 'madvet_admin'
const MAX_AGE_S = 24 * 60 * 60

function sign(expiry: string, password: string): string {
  return createHmac('sha256', password).update(`madvet-admin:${expiry}`).digest('hex')
}

function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a), y = Buffer.from(b)
  return x.length === y.length && timingSafeEqual(x, y)
}

export function checkPassword(given: string): boolean {
  const password = process.env.ADMIN_PASSWORD
  return Boolean(password) && safeEqual(given, password!)
}

export function newSessionCookie(): { value: string; maxAge: number } {
  const expiry = String(Date.now() + MAX_AGE_S * 1000)
  return { value: `${expiry}.${sign(expiry, process.env.ADMIN_PASSWORD!)}`, maxAge: MAX_AGE_S }
}

export function isAdmin(req: NextRequest): boolean {
  const password = process.env.ADMIN_PASSWORD
  const cookie   = req.cookies.get(ADMIN_COOKIE)?.value
  if (!password || !cookie) return false
  const [expiry, mac] = cookie.split('.')
  if (!expiry || !mac || Number(expiry) < Date.now()) return false
  return safeEqual(mac, sign(expiry, password))
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
