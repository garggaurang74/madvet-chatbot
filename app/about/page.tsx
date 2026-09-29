import { Metadata } from 'next'
import Link from 'next/link'
import SiteNav from '@/components/SiteNav'
import { COMPANY_CSS } from '@/components/companyCss'
import { COMPANY, TEAM_PHOTOS } from '@/lib/company'
import PhotoSlideshow from '@/components/PhotoSlideshow'
import { fetchProducts } from '@/lib/catalog'
import { PageMark } from '@/components/SiteFooter'

export const metadata: Metadata = {
  title: 'About us | Madvet Animal Healthcare',
  description: 'Madvet Animal Healthcare is a veterinary pharmaceutical company based in Ghaziabad since 2010.',
}

export const revalidate = 600

// No leadership block (client, 29 Sep: "remove people behind madvet ... just
// add meeting photos in about to add the appeal").
export default async function AboutPage() {
  const products = await fetchProducts()
  return (
    <>
      <style>{COMPANY_CSS}</style>
      <PageMark photos />
      <div className="cp">
        <SiteNav active="about" />
        <header className="cp-hero">
          <div className="cp-hero-in">
            <div>
              <div className="cp-eyebrow">About us</div>
              <h1>A veterinary company, <em>since {COMPANY.since}</em>.</h1>
              <p className="lead">{COMPANY.name} is based in {COMPANY.city}. We serve veterinarians, retailers and stockists with a range built for everyday practice.</p>
            </div>
            <figure className="cp-photo" style={{ margin: 0, aspectRatio: '3 / 2' }}>
              <img src="/company/diwali-meet-1.jpg" alt="Madvet Diwali Meet and Award Ceremony" />
              <figcaption>Diwali Meet &amp; Award Ceremony</figcaption>
            </figure>
          </div>
        </header>

        <section className="cp-sec">
          <div className="cp-wrap cp-split">
            <div className="cp-prose">
              <div className="cp-kicker">Who we are</div>
              <p>{COMPANY.name} has been in veterinary healthcare since {COMPANY.since}, and is based in Ghaziabad.</p>
              <p>Our range covers antibiotics as injections and boluses, multivitamin injections, animal feed supplements and formulations that combine vitamins, minerals and herbs — {products.length} products today, for cattle, buffalo, sheep, goats, horses and companion animals.</p>
              <p>Our products reach the market under the brand name <b>Madvet</b>. Pet products carry our sub-brand <b>{COMPANY.petBrand}</b>.</p>
              <p>Every product has its composition and indications published on this site, most with a short film, and each with a page in our product folder — so a veterinarian, a retailer or a farmer can see exactly what they are buying.</p>
            </div>
            <ul className="cp-list">
              <li><b>Injections and boluses</b>Antibiotics, anti-inflammatories and antipyretics for large animals.</li>
              <li><b>Supplements</b>Calcium, multivitamins, minerals, liver tonics and feed supplements.</li>
              <li><b>Parasite control</b>Dewormers and products for ticks, lice and mites.</li>
              <li><b>Pet care — {COMPANY.petBrand}</b>Products for dogs and cats.</li>
            </ul>
          </div>
        </section>

        <section className="cp-sec alt" id="team">
          <div className="cp-wrap cp-split">
            <div>
              <div className="cp-kicker">Our people</div>
              <h2>Meets, visits and the trade</h2>
              <p className="intro">Our team works with veterinarians, retailers and stockists across the region — at the counter, in the clinic, and every year at our Diwali Meet &amp; Award Ceremony.</p>
              <div className="cp-grid4">
                {TEAM_PHOTOS.slice(4, 7).concat(TEAM_PHOTOS.slice(2, 3)).map(ph => (
                  <figure key={ph.src} className="cp-photo" style={{ margin: 0 }}><img src={ph.src} alt={ph.caption} loading="lazy" /></figure>
                ))}
              </div>
            </div>
            <PhotoSlideshow slides={TEAM_PHOTOS} />
          </div>
        </section>

        <section className="cp-sec">
          <div className="cp-wrap">
            <div className="cp-band">
              <div><h3>See the full range</h3><p>{products.length} products, each with its composition, dose and a short film.</p></div>
              <div className="cp-cta" style={{ marginTop: 0 }}>
                <Link href="/products" className="cp-btn gold">Products →</Link>
                <Link href="/contact" className="cp-btn line">Contact us</Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  )
}
