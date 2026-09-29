// The product card — one design, two shapes:
//  • 'story' 1080×1350: the image a phone sends into a WhatsApp chat
//    (/api/card/<id>), big enough to read without opening.
//  • 'og' 1200×630: the picture a shared link unfolds into
//    (app/products/[id]/opengraph-image.tsx).
// Drawn with next/og (Satori): every box with more than one child must be a
// flex box, and the pack photo must be JPEG/PNG (the catalogue's are .jpg).
import { COMPANY } from './company'
import { SITE } from './share'
import { cleanIndications, compShort, packLabel, speciesList, type CopyProduct } from './productCopy'

const F = '#1a3a2a', N = '#0f2318', GOLD = '#c8a96e', GL = '#e8d5a8', CREAM = '#f5f0e8'

export type CardShape = 'story' | 'og'
export const CARD_SIZE: Record<CardShape, { width: number; height: number }> = {
  story: { width: 1080, height: 1350 },
  og:    { width: 1200, height: 630 },
}

// Mukta (Latin + Devanagari), the films' own face, converted to TTF because
// Satori cannot read woff2. Bundled via import.meta.url so Vercel ships them.
export async function cardFonts() {
  const { readFile } = await import('node:fs/promises')
  const load = (f: string) => readFile(new URL(`./fonts/${f}`, import.meta.url))
  const [b7, b8, d7] = await Promise.all([load('mukta-700-latin.ttf'), load('mukta-800-latin.ttf'), load('mukta-700-devanagari.ttf')])
  return [
    { name: 'Mukta', data: b7, weight: 700 as const, style: 'normal' as const },
    { name: 'Mukta', data: b8, weight: 800 as const, style: 'normal' as const },
    { name: 'Mukta', data: d7, weight: 700 as const, style: 'normal' as const },
  ]
}

export function ProductCard({ p, scheme, shape, pack }: { p: CopyProduct & { image_url: string }; scheme: string; shape: CardShape; pack?: string }) {
  const img = pack || p.image_url
  const uses = cleanIndications(p.indication, shape === 'story' ? 4 : 3, p.id)
  const sp = speciesList(p.species).slice(0, 6)
  const story = shape === 'story'
  const nameSize = p.name.length > 22 ? (story ? 62 : 46) : (story ? 78 : 56)

  const header = (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <img src={`${SITE}/madvet-icon.png`} width={story ? 64 : 52} height={story ? 64 : 52} style={{ borderRadius: 12 }} />
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: story ? 30 : 24, fontWeight: 700, color: CREAM, letterSpacing: 1 }}>MADVET</div>
          <div style={{ fontSize: story ? 17 : 14, color: GOLD, letterSpacing: 3 }}>ANIMAL HEALTHCARE</div>
        </div>
      </div>
      <div style={{ display: 'flex', padding: story ? '10px 22px' : '8px 18px', borderRadius: 999, border: `2px solid ${GOLD}`, color: GL, fontSize: story ? 22 : 18, fontWeight: 700 }}>
        {p.category || p.formulation}
      </div>
    </div>
  )

  const photo = (w: number, h: number) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: w, height: h, borderRadius: 28, background: 'linear-gradient(160deg, #ffffff 0%, #efe9dc 100%)', boxShadow: '0 30px 60px rgba(0,0,0,.35)' }}>
      {img
        ? <img src={img} style={{ maxWidth: w - (pack ? 60 : 20), maxHeight: h - (pack ? 60 : 20), objectFit: 'contain' }} />
        : <div style={{ display: 'flex', fontSize: 120, color: F, fontWeight: 700 }}>{p.name.slice(0, 1)}</div>}
    </div>
  )

  const chips = (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
      {uses.map(u => (
        <div key={u} style={{ display: 'flex', padding: story ? '10px 18px' : '7px 14px', borderRadius: 999, background: 'rgba(245,240,232,.1)', border: '1px solid rgba(200,169,110,.45)', color: CREAM, fontSize: story ? 26 : 19, alignItems: 'center', gap: 10 }}><div style={{ display: 'flex', width: story ? 12 : 9, height: story ? 12 : 9, borderRadius: 99, background: GOLD }} />{u}</div>
      ))}
    </div>
  )

  const band = scheme ? (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, width: '100%', padding: story ? '22px 28px' : '14px 20px', borderRadius: 20, background: `linear-gradient(90deg, ${GOLD}, #e2c98f)`, color: N }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: story ? '10px 14px' : '8px 10px', borderRadius: 12, background: N, color: GOLD, fontSize: story ? 22 : 17, fontWeight: 800, letterSpacing: 2 }}>FREE</div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontSize: story ? 18 : 14, fontWeight: 700, letterSpacing: 3 }}>THIS MONTH'S SCHEME</div>
        <div style={{ fontSize: story ? 32 : 24, fontWeight: 700 }}>{scheme}</div>
      </div>
    </div>
  ) : null

  const footer = (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', color: GL, fontSize: story ? 24 : 19 }}>
      <div style={{ display: 'flex' }}>Call / WhatsApp  {COMPANY.phone}</div>
      <div style={{ display: 'flex', color: CREAM, fontWeight: 700 }}>{SITE.replace('https://', '')}/products/{p.id}</div>
    </div>
  )

  if (story) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', padding: 56, gap: 30, background: `radial-gradient(circle at 80% 0%, #2c5a41 0%, ${F} 45%, ${N} 100%)`, fontFamily: 'Mukta' }}>
        {header}
        <div style={{ display: 'flex', justifyContent: 'center' }}>{photo(968, 500)}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', fontSize: nameSize, fontWeight: 700, color: CREAM, lineHeight: 1.05 }}>{p.name}</div>
          <div style={{ display: 'flex', fontSize: 28, color: GOLD, fontWeight: 700 }}>{packLabel(p)}{sp.length ? `  ·  ${sp.join(' · ')}` : ''}</div>
        </div>
        {chips}
        {p.salt ? <div style={{ display: 'flex', fontSize: 24, color: 'rgba(245,240,232,.75)', lineHeight: 1.35 }}>{compShort(p.salt, 150)}</div> : null}
        <div style={{ display: 'flex', flex: 1 }} />
        {band}
        {footer}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', width: '100%', height: '100%', padding: 40, gap: 36, background: `radial-gradient(circle at 90% 0%, #2c5a41 0%, ${F} 45%, ${N} 100%)`, fontFamily: 'Mukta' }}>
      <div style={{ display: 'flex', alignItems: 'center' }}>{photo(420, 550)}</div>
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: 16 }}>
        {header}
        <div style={{ display: 'flex', fontSize: nameSize, fontWeight: 700, color: CREAM, lineHeight: 1.05, marginTop: 6 }}>{p.name}</div>
        <div style={{ display: 'flex', fontSize: 22, color: GOLD, fontWeight: 700 }}>{packLabel(p)}{sp.length ? `  ·  ${sp.join(', ')}` : ''}</div>
        {chips}
        <div style={{ display: 'flex', flex: 1 }} />
        {band}
        {footer}
      </div>
    </div>
  )
}
