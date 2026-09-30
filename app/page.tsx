import { Metadata } from 'next'
import Link from 'next/link'
import SiteNav from '@/components/SiteNav'
import { COMPANY_CSS } from '@/components/companyCss'
import { COMPANY, TESTIMONIALS } from '@/lib/company'
import { fetchFilms, fetchProducts, filmFiles } from '@/lib/catalog'
import { fetchSchemes } from '@/lib/schemes'
import { PageMark } from '@/components/SiteFooter'
import { speciesList, SP_ICON } from '@/lib/productCopy'

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
  // Animals the range treats, counted from the catalogue (calves are cattle).
  const species = new Set(products.flatMap(p => speciesList(p.species)).filter(x => x in SP_ICON && x !== 'Calf'))

  return (
    <>
      <style>{COMPANY_CSS}</style>
      <PageMark photos />
      <div className="cp">
        <SiteNav active="home" />

        <header className="cp-hero">
          <div className="cp-hero-in">
            <div>
              <div className="cp-eyebrow">Madvet · since {COMPANY.since}</div>
              <h1>High potency.<br /><em>Top quality.</em></h1>
              <p className="lead">
                Veterinary medicines and supplements for cattle, buffalo, sheep, goats, poultry,
                horses, dogs and cats — {products.length} products for the conditions a vet sees every day, supplied
                to veterinarians, retailers and stockists since {COMPANY.since}.
              </p>
              <div className="cp-cta">
                <Link href="/products" className="cp-btn gold">Explore the range →</Link>
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
          <div className="cp-stat"><b>{catList.length}</b><span>Therapeutic categories</span></div>
          <div className="cp-stat"><b>{species.size}</b><span>Animal species</span></div>
          <div className="cp-stat"><b>{COMPANY.since}</b><span>Serving the trade since</span></div>
        </div>

        <section className="cp-sec">
          <div className="cp-wrap">
            <div className="cp-kicker">Why Madvet</div>
            <h2>Medicines the counter can stand behind</h2>
            <p className="intro">Every Madvet product is held to one standard — high potency and top quality — and backed by a team that stays with the retailer long after the sale.</p>
            <div className="cp-cards">
              <Link href="/products" className="cp-card"><span className="ic">💊</span><h3>Formulations that do more</h3><p>Many of our products pair two actives, or an active with the vitamins, minerals or herbs that support it — each combination chosen for the condition it treats.</p><span className="go">See the range →</span></Link>
              <Link href="/products" className="cp-card"><span className="ic">🐄</span><h3>For every animal on the farm</h3><p>Antibiotics, pain and fever relief, parasite control, calcium, minerals, tonics and probiotics for large animals — and our {COMPANY.petBrand} range for dogs and cats.</p><span className="go">Browse by category →</span></Link>
              <Link href="/about" className="cp-card"><span className="ic">🤝</span><h3>A team in the field</h3><p>Our representatives visit clinics and counters across the region, and every year the trade gathers at the Madvet Diwali Meet &amp; Award Ceremony.</p><span className="go">Meet the team →</span></Link>
              <Link href="/schemes" className="cp-card"><span className="ic">🎁</span><h3>Schemes every month</h3><p>{schemes.length ? `${schemes.length} offers this ${month ? title(month) : 'month'} for retailers and stockists — buy the quantity, take home the gift.` : 'Trade offers for retailers and stockists, updated every month.'}</p><span className="go">See this month’s schemes →</span></Link>
            </div>
          </div>
        </section>

        <section className="cp-sec alt">
          <div className="cp-wrap">
            <div className="cp-kicker">Tools for the counter</div>
            <h2>Everything you need to sell it</h2>
            <p className="intro">Whoever recommends a Madvet product has the full story to hand — to read, to show, or to send to a customer.</p>
            <div className="cp-cards">
              <Link href="/products" className="cp-card"><span className="ic">🔎</span><h3>Product details</h3><p>Composition, indications and pack sizes for every product. Search by name, molecule, disease or animal.</p><span className="go">Search the range →</span></Link>
              <Link href="/folder" className="cp-card"><span className="ic">📖</span><h3>Product folder</h3><p>One clear page per product, dose included. Send a single page to a customer on WhatsApp.</p><span className="go">Open the folder →</span></Link>
              <Link href="/videos" className="cp-card"><span className="ic">▶️</span><h3>Counter films</h3><p>Short Hindi films that show a customer what a product does and when to use it.</p><span className="go">Watch →</span></Link>
              <Link href="/ask" className="cp-card"><span className="ic">💬</span><h3>Ask Madvet</h3><p>Questions on any product, answered from our own catalogue in English or हिंदी.</p><span className="go">Ask a question →</span></Link>
            </div>
          </div>
        </section>

        <section className="cp-sec">
          <div className="cp-wrap">
            <div className="cp-kicker">The range</div>
            <h2>{products.length} products across {catList.length} categories</h2>
            <p className="intro">Antibiotic injections and boluses, pain and fever relief, dewormers and tick control, calcium, minerals and liver tonics, probiotics and herbal formulations — and pet care under our {COMPANY.petBrand} line. Tap a category to see its products.</p>
            <div className="cp-chips">
              {catList.map(([c, n]) => <Link key={c} href={`/products?cat=${encodeURIComponent(c)}`} className="cp-chip">{c}<b>{n}</b></Link>)}
            </div>
          </div>
        </section>

        {featured.length > 0 && (
          <section className="cp-sec alt">
            <div className="cp-wrap">
              <div className="cp-kicker">Product films</div>
              <h2>Show a customer in a minute</h2>
              <p className="intro">What the product does and when to use it, in plain Hindi — play it at the counter or forward it on WhatsApp.</p>
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

        <section className="cp-sec">
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
