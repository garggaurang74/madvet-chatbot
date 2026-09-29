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
              <div className="cp-eyebrow">{COMPANY.city} · since {COMPANY.since}</div>
              <h1>Veterinary medicines for the people who <em>treat animals</em>.</h1>
              <p className="lead">
                {COMPANY.name} brings injections, boluses, feed supplements and pet care for cattle,
                buffalo, sheep, goats and companion animals to veterinarians, retailers and
                stockists across India.
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
            <div className="cp-kicker">Everything in one place</div>
            <h2>For the counter, the clinic and the field</h2>
            <p className="intro">Every product has its composition, dose and indications on one page — with a short film to show a customer and a folder page to send on WhatsApp.</p>
            <div className="cp-cards">
              <Link href="/products" className="cp-card"><span className="ic">💊</span><h3>Products</h3><p>The full range with composition, dosage and pack sizes. Search in Hindi or English.</p><span className="go">See the range →</span></Link>
              <Link href="/videos" className="cp-card"><span className="ic">▶️</span><h3>Videos</h3><p>{shown.length} short Hindi films, one per product — play, download or send on WhatsApp.</p><span className="go">Watch →</span></Link>
              <Link href="/folder" className="cp-card"><span className="ic">📖</span><h3>Product folder</h3><p>The printed folder, page by page. Share any single page with a customer.</p><span className="go">Open the folder →</span></Link>
              <Link href="/schemes" className="cp-card"><span className="ic">🎁</span><h3>Trade schemes</h3><p>{schemes.length ? `${schemes.length} offers this ${month ? title(month) : 'month'} — buy the quantity, get the gift.` : 'This month’s offers for retailers and stockists.'}</p><span className="go">See schemes →</span></Link>
              <Link href="/ask" className="cp-card"><span className="ic">💬</span><h3>Ask AI</h3><p>Ask about any product, dose or indication and get the answer from our own catalogue.</p><span className="go">Ask a question →</span></Link>
            </div>
          </div>
        </section>

        <section className="cp-sec alt">
          <div className="cp-wrap">
            <div className="cp-kicker">The range</div>
            <h2>{products.length} products across {catList.length} categories</h2>
            <p className="intro">Antibiotics as injections and boluses, anti-inflammatories, dewormers, ectoparasiticides, multivitamins, calcium and feed supplements — and pet care under our {COMPANY.petBrand} line.</p>
            <div className="cp-chips">
              {catList.map(([c, n]) => <Link key={c} href="/products" className="cp-chip">{c}<b>{n}</b></Link>)}
            </div>
          </div>
        </section>

        {featured.length > 0 && (
          <section className="cp-sec">
            <div className="cp-wrap">
              <div className="cp-kicker">Product films</div>
              <h2>A film for every product</h2>
              <p className="intro">Each one explains what the product does and when to reach for it — in Hindi, in about a minute and a half.</p>
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
            <h2>In the field, with the trade</h2>
            <p className="intro">Our team works with veterinarians, retailers and stockists across the region — at the counter, in the clinic and at our annual meets.</p>
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
            <div className="cp-kicker">What they say</div>
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
                <h3>Stock Madvet, or become a distributor</h3>
                <p>Message us on WhatsApp, or write to {COMPANY.email}.</p>
              </div>
              <div className="cp-cta" style={{ marginTop: 0 }}>
                <a href={`https://wa.me/${COMPANY.phoneRaw}`} className="cp-btn gold">WhatsApp us</a>
                <Link href="/contact" className="cp-btn line">Contact</Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  )
}
