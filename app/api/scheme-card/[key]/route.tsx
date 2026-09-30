import { ImageResponse } from 'next/og'
import { cardFonts } from '@/lib/productCard'
import { schemeGroups } from '@/lib/schemeGroups'
import { SchemeStory, SchemeLink } from '@/lib/schemeCard'

// One scheme as an image: 1080×1350 to send into a chat (the default), or
// ?shape=og, 1200×630, for the preview a shared /schemes/<key> link unfolds into.
export const revalidate = 300

export async function GET(req: Request, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params
  const og = new URL(req.url).searchParams.get('shape') === 'og'
  const [{ month, groups }, fonts] = await Promise.all([schemeGroups(), cardFonts()])
  const g = groups.find(x => x.key === key)
  if (!g) return new Response('Not found', { status: 404 })
  return new ImageResponse(og ? <SchemeLink g={g} month={month} /> : <SchemeStory g={g} month={month} />, {
    ...(og ? { width: 1200, height: 630 } : { width: 1080, height: 1350 }),
    fonts,
    headers: { 'Cache-Control': 'public, max-age=300, s-maxage=300, stale-while-revalidate=3600' },
  })
}
