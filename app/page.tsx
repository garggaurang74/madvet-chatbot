import { Metadata } from 'next'
import Link from 'next/link'
import SiteNav from '@/components/SiteNav'
import { COMPANY_CSS } from '@/components/companyCss'
import { COMPANY, TESTIMONIALS } from '@/lib/company'
import { fetchFilms, fetchProducts, filmFiles } from '@/lib/catalog'
import { fetchSchemes } from '@/lib/schemes'
import { PageMark } from '@/components/SiteFooter'

export const metadata: Metadata = {
  title: 'Madvet Animal Healthcare — veterinary medicines, Ghaziabad',
  description: 'Veterinary injections, boluses, feed supplements and pet care from Madvet Animal Healthcare, Ghaziabad — for veterinarians, retailers and stockists.',
}

export const revalidate = 600

const title = (s: string) => s.toLowerCase().replace(/\b\w/g, c => c.toUpperCase())

// Every number on this page is counted from the live catalogue, so it moves
// when a product is added or retired in /admin and never needs editing here.
export default async function HomePage() {
  const [products, films, { month, schemes }] = await Promise.all([fetchProducts(), fetchFilms(), fetchSchemes()])
  const live = new Set(products.map(p => p.id))
  const shown = films.filter(f => !f.ids.length || f.ids.some(id => live.has(id)))
  const cats = new Map<string, number>()
  for (const p of products) if (p.category) cats.set(p.category, (cats.get(p.category) || 0) + 1)
  const catList = [...cats.entries()].sort((a, b) => b[1] - a[1])
  const featured = shown.filter(f => f.ids.length).slice(0, 6)

  return (
    <>
      <style>{COMPANY_CSS}</style>
      <PageMark photos />
      <div className="cp">
        <SiteNav active="home" />

        <header className="cp-hero">
          <div className="cp-hero-in">
            <div>
              <div className="cp-eyebrow">Ghaziabad · since {COMPANY.since}</div>
              <h1>Veterinary medicines, <em>explained in full</em>.</h1>
              <p className="lead">
                {products.length} products for cattle, buffalo, sheep, goats, horses, dogs and cats — each
                with its composition and indications in the open, a short Hindi film for the counter
                and a page in our product folder. Supplied to veterinarians, retailers and stockists
                since {COMPANY.since}.
              </p>
              <div className="cp-cta">
                <Link href="/products" className="cp-btn gold">Browse {products.length} products →</Link>
                <Link href="/schemes" className="cp-btn line">{month ? `${title(month)} schemes` : 'Trade schemes'}</Link>
              </div>
            </div>
            <figure className="cp-photo" style={{ margin: 0, aspectRatio: '3 / 2' }}>
              <img src="/company/team-group.jpg" alt="The Madvet team" />
              <figcaption>The Madvet team</figcaption>
            </figure>
          </div>
        </header>

        <div className="cp-stats">
          <div className="cp-stat"><b>{products.length}</b><span>Products</span></div>
          <div className="cp-stat"><b>{shown.length}</b><span>Product films</span></div>
          <div className="cp-stat"><b>{catList.length}</b><span>Categories</span></div>
          <div className="cp-stat"><b>{COMPANY.since}</b><span>Established</span></div>
        </div>

        <section className="cp-sec">
          <div className="cp-wrap">
            <div className="cp-kicker">Built for the trade</div>
            <h2>Everything you need to recommend it</h2>
            <p className="intro">A retailer should be able to explain a product as clearly as the vet who prescribed it. So every Madvet product comes with the same things: its full details, a film, a folder page and an assistant that answers questions about it.</p>
            <div className="cp-cards">
              <Link href="/products" className="cp-card"><span className="ic">💊</span><h3>Products</h3><p>Composition, indications and pack sizes for the whole range. Search by product, molecule, disease or animal.</p><span className="go">See the range →</span></Link>
              <Link href="/videos" className="cp-card"><span className="ic">▶️</span><h3>Videos</h3><p>{shown.length} short Hindi films, one per product — play, download or send on WhatsApp.</p><span className="go">Watch →</span></Link>
              <Link href="/folder" className="cp-card"><span className="ic">📖</span><h3>Product folder</h3><p>One page per product, written so anyone can follow it. Send a single page to a customer.</p><span className="go">Open the folder →</span></Link>
              <Link href="/schemes" className="cp-card"><span className="ic">🎁</span><h3>Trade schemes</h3><p>{schemes.length ? `${schemes.length} offers this ${month ? title(month) : 'month'} — buy the quantity, get the gift.` : 'This month’s offers for retailers and stockists.'}</p><span className="go">See schemes →</span></Link>
              <Link href="/ask" className="cp-card"><span className="ic">💬</span><h3>Ask AI</h3><p>Ask about any product, composition or indication. Answers come from our own catalogue, in Hindi or English.</p><span className="go">Ask a question →</span></Link>
            </div>
          </div>
        </section>

        <section className="cp-sec alt">
          <div className="cp-wrap">
            <div className="cp-kicker">The range</div>
            <h2>{products.length} products across {catList.length} categories</h2>
            <p className="intro">Antibiotic injections and boluses, pain and fever relief, dewormers and tick control, calcium, minerals and liver tonics, probiotics and herbal formulations — and pet care under our {COMPANY.petBrand} line.</p>
            <div className="cp-chips">
              {catList.map(([c, n]) => <Link key={c} href="/products" className="cp-chip">{c}<b>{n}</b></Link>)}
            </div>
          </div>
        </section>

        {featured.length > 0 && (
          <section className="cp-sec">
            <div className="cp-wrap">
              <div className="cp-kicker">Product films</div>
              <h2>A one-minute film for the counter</h2>
              <p className="intro">Each film says what the product does and when to reach for it, in plain Hindi — made to be played for a customer or forwarded on WhatsApp.</p>
              <div className="cp-films">
                {featured.map(f => (
                  <Link key={f.slug} href={`/videos?film=${encodeURIComponent(f.youtubeId || f.slug)}`} className="cp-film">
                    <img src={filmFiles(f).poster} alt="" loading="lazy" />
                    <span>{f.name}</span>
                  </Link>
                ))}
              </div>
              <div className="cp-cta"><Link href="/videos" className="cp-btn dark">All {shown.length} films →</Link></div>
            </div>
          </section>
        )}

        <section className="cp-sec alt">
          <div className="cp-wrap">
            <div className="cp-kicker">Our people</div>
            <h2>In the clinic, at the counter</h2>
            <p className="intro">Madvet is sold by people who know the products. Our field team meets veterinarians and retailers where they work, and once a year the trade comes together at our Diwali Meet &amp; Award Ceremony.</p>
            <div className="cp-gallery">
              <figure className="cp-photo" style={{ margin: 0 }}><img src="/company/diwali-meet-1.jpg" alt="Madvet Diwali Meet and Award Ceremony" loading="lazy" /><figcaption>Diwali Meet &amp; Award Ceremony</figcaption></figure>
              <figure className="cp-photo" style={{ margin: 0 }}><img src="/company/team-outdoor.jpg" alt="The Madvet sales team" loading="lazy" /></figure>
              <figure className="cp-photo" style={{ margin: 0 }}><img src="/company/field-3.jpg" alt="Madvet team with a retailer" loading="lazy" /></figure>
              <figure className="cp-photo" style={{ margin: 0 }}><img src="/company/field-1.jpg" alt="Madvet team at a retail counter" loading="lazy" /></figure>
              <figure className="cp-photo" style={{ margin: 0 }}><img src="/company/diwali-meet-2.jpg" alt="Madvet Diwali Meet" loading="lazy" /></figure>
            </div>
          </div>
        </section>

        <section className="cp-sec dark">
          <div className="cp-wrap">
            <div className="cp-kicker">What the trade says</div>
            <h2>From vets, retailers and farmers</h2>
            <div className="cp-quotes" style={{ marginTop: 32 }}>
              {TESTIMONIALS.map(t => (
                <figure key={t.who} className="cp-quote">
                  <blockquote>{t.quote}</blockquote>
                  <figcaption>{t.who}<span>{t.role}</span></figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>

        <section className="cp-sec">
          <div className="cp-wrap">
            <div className="cp-band">
              <div>
                <h3>Stock Madvet in your area</h3>
                <p>Retailers, stockists and distributors: write to {COMPANY.email} with your town and the products you carry, and our team will get back to you.</p>
              </div>
              <div className="cp-cta" style={{ marginTop: 0 }}>
                <a href={`mailto:${COMPANY.email}?subject=${encodeURIComponent('Stocking / distribution — Madvet')}`} className="cp-btn gold">Email us</a>
                <Link href="/contact" className="cp-btn line">Contact</Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  )
}
