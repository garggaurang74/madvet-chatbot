import { NextRequest, NextResponse } from 'next/server'

// madvet.in and ai.madvet.in are ONE site. Until madvet.in's DNS points here,
// ai.madvet.in keeps opening the chat at its root, as it always has. Once
// CANONICAL_HOST is set on Vercel (e.g. "madvet.in"), every request on any
// other host is sent to the same path there — ai.madvet.in/products/12 →
// madvet.in/products/12 — so old links, WhatsApp shares and QR codes keep
// working and there is only one address.
export function middleware(req: NextRequest) {
  const host = (req.headers.get('host') || '').toLowerCase().split(':')[0]
  const canonical = (process.env.CANONICAL_HOST || '').toLowerCase()
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
