'use client'

import Link from 'next/link'

// The one menu every public page shares — madvet.in is one site, so the
// company pages (Home, About, Contact) and the catalogue pages (Products,
// Videos, Folder, Schemes, Ask AI) sit in the same bar. On a phone the links
// scroll sideways rather than wrap.

export type NavKey = 'home' | 'about' | 'assistant' | 'products' | 'videos' | 'folder' | 'schemes' | 'contact' | 'careers'

const LINKS: { key: NavKey; href: string; en: string; hi: string }[] = [
  { key: 'products',  href: '/products', en: 'Products', hi: 'उत्पाद' },
  { key: 'videos',    href: '/videos',   en: 'Videos',   hi: 'वीडियो' },
  { key: 'folder',    href: '/folder',   en: 'Folder',   hi: 'फ़ोल्डर' },
  { key: 'schemes',   href: '/schemes',  en: 'Schemes',  hi: 'स्कीम' },
  { key: 'assistant', href: '/ask',      en: 'Ask AI',   hi: 'AI से पूछें' },
  { key: 'about',     href: '/about',    en: 'About',    hi: 'हमारे बारे में' },
  { key: 'contact',   href: '/contact',  en: 'Contact',  hi: 'संपर्क' },
]

export default function SiteNav({ active, hi = false }: { active: NavKey; hi?: boolean }) {
  return (
    <>
      <style>{CSS}</style>
      <nav className="sn">
        <Link href="/" className="sn-brand" aria-label="Madvet Animal Healthcare — home">
          <img src="/madvet-icon.png" alt="" /> <span>Madvet</span>
        </Link>
        <div className="sn-links">
          {LINKS.map(l => l.key === active
            ? <span key={l.key} className="on" aria-current="page">{hi ? l.hi : l.en}</span>
            : <Link key={l.key} href={l.href}>{hi ? l.hi : l.en}</Link>)}
          <a className="sn-train" href="/madvet-training.html">🎓 {hi ? 'ट्रेनिंग' : 'Training'}</a>
        </div>
      </nav>
    </>
  )
}

const CSS = `
.sn { position: relative; z-index: 60; height: 56px; padding: 0 40px; display: flex; align-items: center; justify-content: space-between; gap: 16px;
  background: #0f2318; border-bottom: 1px solid rgba(200,169,110,.15); font-family: 'DM Sans', 'Noto Sans Devanagari', sans-serif; }
.sn-brand { flex: none; display: flex; align-items: center; gap: 10px; color: #f5f0e8; text-decoration: none; font-family: 'DM Serif Display', serif; font-size: 19px; }
.sn-brand img { width: 32px; height: 32px; border-radius: 7px; object-fit: cover; }
.sn-links { display: flex; align-items: center; gap: 2px; overflow-x: auto; scrollbar-width: none; }
.sn-links::-webkit-scrollbar { display: none; }
.sn-links a, .sn-links span { flex: none; padding: 7px 12px; border-radius: 7px; font-size: 13px; font-weight: 500; color: rgba(245,240,232,.62); text-decoration: none; white-space: nowrap; transition: color .15s, background .15s; }
.sn-links a:hover { color: #f5f0e8; background: rgba(255,255,255,.05); }
.sn-links .on { color: #e8d5a8; background: rgba(200,169,110,.14); }
.sn-links .sn-train { margin-left: 8px; background: #c8a96e; color: #1a3a2a; font-weight: 700; }
.sn-links .sn-train:hover { background: #d8b97e; color: #1a3a2a; }
@media (max-width: 700px) {
  .sn { padding: 0 10px 0 12px; height: 50px; gap: 8px; }
  .sn-brand span { display: none; }
  .sn-links a, .sn-links span { padding: 6px 9px; font-size: 12.5px; }
  .sn-links .sn-train { margin-left: 4px; }
}
`
