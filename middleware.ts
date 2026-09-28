import { NextRequest, NextResponse } from 'next/server'

// madvet.in and ai.madvet.in are ONE site, at www.madvet.in (28 Sep 2026: DNS
// moved to Vercel; Vercel itself sends madvet.in → www.madvet.in). Every
// request on any other host goes to the same path there —
// ai.madvet.in/products/12 → www.madvet.in/products/12 — so old links,
// WhatsApp shares, YouTube descriptions and QR codes keep working and there is
// one address. CANONICAL_HOST on Vercel overrides it; set it to "off" to stop
// redirecting (ai.madvet.in/ then opens the chat again).
export function middleware(req: NextRequest) {
  const host = (req.headers.get('host') || '').toLowerCase().split(':')[0]
  const env = (process.env.CANONICAL_HOST || 'www.madvet.in').toLowerCase()
  const canonical = env === 'off' ? '' : env
  const { pathname, search } = req.nextUrl

  if (canonical && host !== canonical && !host.endsWith('.vercel.app') && host !== 'localhost') {
    return NextResponse.redirect(`https://${canonical}${pathname}${search}`, 301)
  }
  if (!canonical && host.startsWith('ai.') && pathname === '/') {
    return NextResponse.redirect(new URL('/ask', req.url), 307)
  }
  return NextResponse.next()
}

export const config = {
  // Pages only — static files, images and the API are never redirected.
  matcher: ['/((?!api|_next|.*\\..*).*)'],
}
