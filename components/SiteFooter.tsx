'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { COMPANY, TEAM_PHOTOS } from '@/lib/company'

// One footer under every public page, so the company pages and the catalogue
// read as one site. The chat (/ask) is a full-screen app
// and /admin is internal, so neither carries it.
export default function SiteFooter() {
  const path = usePathname() || '/'
  if (path.startsWith('/ask') || path.startsWith('/admin')) return null
  const year = new Date().getFullYear()
  // Pages that already carry the team's photos in their own layout.
  const hasPhotos = ['/', '/about', '/contact', '/careers'].includes(path) || path.startsWith('/schemes/check')
  return (
    <>
      <style>{CSS}</style>
      {!hasPhotos && (
        <section className="sf-people" aria-label="The Madvet team">
          <div className="sf-people-head">
            <span>Our people · meets, visits and the trade</span>
            <Link href="/about">About Madvet →</Link>
          </div>
          <div className="sf-strip">
            {TEAM_PHOTOS.map(ph => (
              <figure key={ph.src}><img src={ph.src} alt={ph.caption} loading="lazy" /><figcaption>{ph.caption}</figcaption></figure>
            ))}
          </div>
        </section>
      )}
      <footer className="sf">
        <div className="sf-in">
          <div className="sf-brand">
            <img src="/madvet-icon.png" alt="" />
            <div>
              <strong>{COMPANY.name}</strong>
              <span>{COMPANY.city} · since {COMPANY.since}</span>
            </div>
          </div>
          <nav className="sf-cols">
            <div>
              <h4>Range</h4>
              <Link href="/products">Products</Link>
              <Link href="/videos">Videos</Link>
              <Link href="/folder">Product folder</Link>
              <Link href="/schemes">Trade schemes</Link>
            </div>
            <div>
              <h4>Company</h4>
              <Link href="/about">About us</Link>
              <Link href="/careers">Careers</Link>
              <Link href="/contact">Contact</Link>
              <Link href="/ask">Ask AI</Link>
            </div>
            <div>
              <h4>Reach us</h4>
              <a href={`tel:+${COMPANY.phoneRaw}`}>{COMPANY.phone}</a>
              <a href={`https://wa.me/${COMPANY.phoneRaw}`}>WhatsApp</a>
              <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>
              <a href={COMPANY.youtube} target="_blank" rel="noopener">YouTube</a>
            </div>
          </nav>
        </div>
        <div className="sf-base">© {year} {COMPANY.name}. For veterinarians, retailers and stockists — use every product on veterinary advice.</div>
      </footer>
    </>
  )
}

const CSS = `
.sf-people { background:#13291d; padding:26px 0 30px; font-family:'DM Sans','Noto Sans Devanagari',sans-serif; border-top:1px solid rgba(200,169,110,.18); }
.sf-people-head { max-width:1320px; margin:0 auto 14px; padding:0 48px; display:flex; justify-content:space-between; align-items:baseline; gap:12px; }
.sf-people-head span { font-size:11px; letter-spacing:2.5px; text-transform:uppercase; font-weight:700; color:#c8a96e; }
.sf-people-head a { font-size:13px; font-weight:600; color:#e8d5a8; text-decoration:none; }
.sf-strip { display:flex; gap:12px; overflow-x:auto; padding:0 48px; scrollbar-width:none; scroll-snap-type:x mandatory; }
.sf-strip::-webkit-scrollbar { display:none; }
.sf-strip figure { position:relative; flex:none; width:260px; height:170px; margin:0; border-radius:12px; overflow:hidden; scroll-snap-align:start; background:#0f2318; }
.sf-strip img { width:100%; height:100%; object-fit:cover; display:block; }
.sf-strip figcaption { position:absolute; left:0; right:0; bottom:0; padding:22px 10px 8px; font-size:12px; font-weight:600; color:#fff; background:linear-gradient(transparent, rgba(15,35,24,.85)); }
@media (max-width:700px) { .sf-people-head, .sf-strip { padding:0 16px; } .sf-strip figure { width:200px; height:132px; } }
@media (orientation: landscape) and (max-height: 540px) { .sf-people { display:none; } }
.sf { background:#0f2318; color:rgba(245,240,232,.7); font-family:'DM Sans','Noto Sans Devanagari',sans-serif; border-top:1px solid rgba(200,169,110,.18); }
.sf-in { max-width:1320px; margin:0 auto; padding:48px 48px 32px; display:flex; justify-content:space-between; gap:40px; flex-wrap:wrap; }
.sf-brand { display:flex; gap:14px; align-items:flex-start; }
.sf-brand img { width:44px; height:44px; border-radius:9px; }
.sf-brand strong { display:block; font-family:'DM Serif Display',serif; font-weight:400; font-size:21px; color:#f5f0e8; }
.sf-brand span { font-size:13px; }
.sf-cols { display:flex; gap:56px; flex-wrap:wrap; }
.sf-cols h4 { margin:0 0 12px; font-size:11px; letter-spacing:2.5px; text-transform:uppercase; color:#c8a96e; font-weight:700; }
.sf-cols a { display:block; color:rgba(245,240,232,.72); text-decoration:none; font-size:14px; line-height:2; }
.sf-cols a:hover { color:#f5f0e8; }
.sf-base { max-width:1320px; margin:0 auto; padding:18px 48px 28px; border-top:1px solid rgba(245,240,232,.08); font-size:12px; color:rgba(245,240,232,.45); }
@media (max-width:700px) { .sf-in { padding:36px 20px 24px; } .sf-cols { gap:32px; } .sf-base { padding:16px 20px 24px; } }
`
