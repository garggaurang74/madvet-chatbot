import { NextRequest } from 'next/server'
import { ADMIN_COOKIE, checkPassword, isAdmin, newSessionCookie } from '@/lib/adminSession'

// GET: is this browser logged in?  POST {password}: log in.  DELETE: log out.

export async function GET(req: NextRequest) {
  return Response.json({ admin: isAdmin(req) })
}

export async function POST(req: NextRequest) {
  const { password } = await req.json().catch(() => ({ password: '' }))
  if (typeof password !== 'string' || !(await checkPassword(password))) {
    // A small delay makes guessing the password slow.
    await new Promise(r => setTimeout(r, 800))
    return Response.json({ admin: false }, { status: 401 })
  }
  const session = newSessionCookie()
  if (!session) {
    return Response.json({ error: 'SUPABASE_SERVICE_ROLE_KEY is not set on the server.' }, { status: 500 })
  }
  const { value, maxAge } = session
  const res = Response.json({ admin: true })
  res.headers.append('Set-Cookie',
    `${ADMIN_COOKIE}=${value}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Strict`)
  return res
}

export async function DELETE() {
  const res = Response.json({ admin: false })
  res.headers.append('Set-Cookie', `${ADMIN_COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict`)
  return res
}
