// The images a scheme travels as, drawn with next/og (Satori — every box
// with more than one child is a flex box; images must be PNG or JPEG):
//  • SchemeStory 1080×1350 — one product's scheme, sent into a chat as an
//    image from the scheme's Share button (/api/scheme-card/<key>).
//  • SchemeLink  1200×630  — the picture a shared /schemes/<key> link unfolds
//    into on WhatsApp.
//  • MonthLink   1200×630  — the picture the /schemes link itself unfolds into.
// Same palette and face as the product cards (lib/productCard.tsx).
import { SITE } from './share'
import { titleCase, type SchemeGroup } from './schemeGroups'

const F = '#1a3a2a', N = '#0f2318', GOLD = '#c8a96e', GL = '#e8d5a8', CREAM = '#f5f0e8'
const BG = `radial-gradient(circle at 85% 0%, #2c5a41 0%, ${F} 45%, ${N} 100%)`

const squash = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')
/** "Buy 11 PCS" plus the line's item when a card holds offers on different items. */
const buyText = (g: SchemeGroup, o: SchemeGroup['offers'][number]) =>
  `Buy ${o.qty}${g.offers.length > 1 && squash(o.item) !== squash(g.offers[0].item) ? ` ${titleCase(o.item)}` : ''}`
const monthText = (m: string) => (m ? titleCase(m) : 'This month')

function Brand({ size }: { size: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: size * 0.45 }}>
      <img src={`${SITE}/icon.png?v=3`} width={size * 2} height={size * 2} style={{ borderRadius: size * 0.4 }} />
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontSize: size, fontWeight: 800, color: CREAM, letterSpacing: 1 }}>MADVET</div>
        <div style={{ fontSize: size * 0.55, color: GOLD, letterSpacing: 3, fontWeight: 700 }}>ANIMAL HEALTHCARE</div>
      </div>
    </div>
  )
}

function Pack({ g, w, h }: { g: SchemeGroup; w: number; h: number }) {
  const src = g.pack || g.image
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: w, height: h, borderRadius: 28, background: 'linear-gradient(160deg, #ffffff 0%, #efe9dc 100%)', boxShadow: '0 30px 60px rgba(0,0,0,.35)' }}>
      {src
        ? <img src={src} style={{ maxWidth: w - (g.pack ? 70 : 24), maxHeight: h - (g.pack ? 70 : 24), objectFit: 'contain' }} />
        : <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: 24 }}>
            <div style={{ display: 'flex', fontSize: Math.round(h / 5), fontWeight: 800, color: F, lineHeight: 1 }}>{g.offers.length}</div>
            <div style={{ display: 'flex', fontSize: Math.round(h / 14), fontWeight: 700, color: F }}>{g.offers.length === 1 ? 'offer this month' : 'offers this month'}</div>
            <div style={{ display: 'flex', fontSize: Math.round(h / 16), color: '#9a7a3e', fontWeight: 700, letterSpacing: 3 }}>MADVET</div>
          </div>}
    </div>
  )
}

function Offer({ g, o, big }: { g: SchemeGroup; o: SchemeGroup['offers'][number]; big: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', width: '100%', borderRadius: 20, overflow: 'hidden', background: `linear-gradient(90deg, ${GOLD}, #e2c98f)` }}>
      <div style={{ display: 'flex', flexDirection: 'column', padding: big ? '18px 26px' : '12px 20px', background: N, color: GL, minWidth: big ? 300 : 230 }}>
        <div style={{ fontSize: big ? 17 : 13, letterSpacing: 3, fontWeight: 700, color: GOLD }}>BUY</div>
        <div style={{ fontSize: big ? 42 : 28, fontWeight: 800, lineHeight: 1.05 }}>{titleCase(buyText(g, o).replace(/^Buy /, ''))}</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', padding: big ? '18px 26px' : '12px 20px', color: N, flex: 1 }}>
        <div style={{ fontSize: big ? 17 : 13, letterSpacing: 3, fontWeight: 800 }}>GET FREE</div>
        <div style={{ fontSize: big ? 42 : 28, fontWeight: 800, lineHeight: 1.05 }}>{o.free ? titleCase(o.free) : '—'}</div>
      </div>
    </div>
  )
}

export function SchemeStory({ g, month }: { g: SchemeGroup; month: string }) {
  const offers = g.offers.slice(0, 4)
  const nameSize = g.name.length > 24 ? 60 : 76
  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', padding: 56, gap: 28, background: BG, fontFamily: 'Mukta' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
        <Brand size={30} />
        <div style={{ display: 'flex', padding: '10px 22px', borderRadius: 999, border: `2px solid ${GOLD}`, color: GL, fontSize: 22, fontWeight: 700 }}>{monthText(month)} scheme</div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center' }}><Pack g={g} w={968} h={offers.length > 2 ? 470 : offers.length === 2 ? 580 : 680} /></div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', fontSize: nameSize, fontWeight: 800, color: CREAM, lineHeight: 1.05 }}>{g.name}</div>
        {g.category ? <div style={{ display: 'flex', fontSize: 26, color: GOLD, fontWeight: 700 }}>{g.category}</div> : null}
      </div>
      <div style={{ display: 'flex', flex: 1 }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {offers.map((o, i) => <Offer key={i} g={g} o={o} big />)}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', color: 'rgba(245,240,232,.7)', fontSize: 20 }}>
        <div style={{ display: 'flex' }}>Terms confirmed by your MADVET representative</div>
        <div style={{ display: 'flex', color: CREAM, fontWeight: 700, fontSize: 24 }}>{SITE.replace('https://', '')}/schemes</div>
      </div>
    </div>
  )
}

export function SchemeLink({ g, month }: { g: SchemeGroup; month: string }) {
  const offers = g.offers.slice(0, 2)
  return (
    <div style={{ display: 'flex', width: '100%', height: '100%', padding: 40, gap: 36, background: BG, fontFamily: 'Mukta' }}>
      <div style={{ display: 'flex', alignItems: 'center' }}><Pack g={g} w={400} h={550} /></div>
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Brand size={24} />
          <div style={{ display: 'flex', padding: '8px 18px', borderRadius: 999, border: `2px solid ${GOLD}`, color: GL, fontSize: 18, fontWeight: 700 }}>{monthText(month)} scheme</div>
        </div>
        <div style={{ display: 'flex', fontSize: g.name.length > 22 ? 46 : 58, fontWeight: 800, color: CREAM, lineHeight: 1.05, marginTop: 10 }}>{g.name}</div>
        {g.category ? <div style={{ display: 'flex', fontSize: 22, color: GOLD, fontWeight: 700 }}>{g.category}</div> : null}
        <div style={{ display: 'flex', flex: 1 }} />
        {offers.map((o, i) => <Offer key={i} g={g} o={o} big={false} />)}
        <div style={{ display: 'flex', color: CREAM, fontSize: 20, fontWeight: 700, justifyContent: 'center' }}>{SITE.replace('https://', '')}/schemes</div>
      </div>
    </div>
  )
}

export function MonthLink({ groups, month }: { groups: SchemeGroup[]; month: string }) {
  const offers = groups.reduce((a, g) => a + g.offers.length, 0)
  // The packs that draw best: real cut-outs first.
  const show = [...groups.filter(g => g.pack), ...groups.filter(g => !g.pack && g.image)].slice(0, 4)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', padding: '40px 48px', gap: 22, background: BG, fontFamily: 'Mukta' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Brand size={24} />
        <div style={{ display: 'flex', padding: '8px 18px', borderRadius: 999, border: `2px solid ${GOLD}`, color: GL, fontSize: 18, fontWeight: 700 }}>For retailers & stockists</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 28 }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', fontSize: 24, color: GOLD, letterSpacing: 4, fontWeight: 700 }}>TRADE SCHEMES · {monthText(month).toUpperCase()}</div>
          <div style={{ display: 'flex', fontSize: 64, fontWeight: 800, color: CREAM, lineHeight: 1.02 }}>{offers} offers on {groups.length} products</div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 18, flex: 1 }}>
        {show.map(g => (
          <div key={g.key} style={{ display: 'flex', flexDirection: 'column', flex: 1, borderRadius: 20, overflow: 'hidden', background: 'rgba(245,240,232,.06)', border: '1px solid rgba(200,169,110,.35)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 190, background: 'linear-gradient(160deg, #ffffff 0%, #efe9dc 100%)' }}>
              <img src={g.pack || g.image} style={{ maxWidth: 220, maxHeight: 160, objectFit: 'contain' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', padding: '10px 14px', gap: 2 }}>
              <div style={{ display: 'flex', fontSize: 19, fontWeight: 800, color: CREAM, lineHeight: 1.1 }}>{g.name.length > 22 ? g.name.slice(0, 21) + '…' : g.name}</div>
              <div style={{ display: 'flex', fontSize: 17, fontWeight: 700, color: GL }}>{buyText(g, g.offers[0])} → {g.offers[0].free ? titleCase(g.offers[0].free) : ''}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', color: CREAM, fontSize: 22, fontWeight: 700 }}>{SITE.replace('https://', '')}/schemes</div>
    </div>
  )
}
