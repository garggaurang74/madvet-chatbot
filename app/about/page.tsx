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
  description: 'Madvet Animal Healthcare, Ghaziabad — veterinary medicines and supplements for livestock and pets since 2010. High potency, top quality.',
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
              <div className="cp-eyebrow">About Madvet · Ghaziabad · since {COMPANY.since}</div>
              <h1>A veterinary brand, <em>built with the trade</em>.</h1>
              <p className="lead">Since {COMPANY.since}, {COMPANY.name} has worked alongside veterinarians, retailers and stockists to put dependable medicines within reach of every livestock owner and pet parent they serve.</p>
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
              <div className="cp-kicker">What we stand for</div>
              <h2>High potency. Top quality.</h2>
              <p>Those four words are the promise on every Madvet product, and the standard each one is held to before it carries our name.</p>
              <p>Many of our products are combinations — two actives that work together, or an active with the vitamins, minerals or herbs that support it. The choice of combination, strength and dose form is where a Madvet product differs from the same molecule on the next shelf.</p>
              <p>Today that is {products.length} products for cattle, buffalo, sheep, goats, horses, dogs and cats: antibiotics, pain and fever relief, parasite control, calcium, minerals and tonics, probiotics and herbal formulations. Pet products carry our sub-brand <b>{COMPANY.petBrand}</b>.</p>
            </div>
            <ul className="cp-list">
              <li><b>A complete range</b>From antibiotics and pain relief to parasite control, calcium, tonics and probiotics — one supplier for the whole shelf.</li>
              <li><b>People in the field</b>Representatives who visit clinics and counters, and know the products they recommend.</li>
              <li><b>Schemes every month</b>Trade offers for retailers and stockists, kept current by our office.</li>
              <li><b>Nothing hidden</b>Composition and indications for every product on this site, and the dose on its page in our product folder.</li>
              <li><b>Help at the counter</b>Short Hindi films and a folder page for every product, to show or send to a customer.</li>
            </ul>
          </div>
        </section>

        <section className="cp-sec alt" id="team">
          <div className="cp-wrap cp-split">
            <div>
              <div className="cp-kicker">Our people</div>
              <h2>In the clinic, at the counter</h2>
              <p className="intro">Madvet is sold by people who know the products. Our field team meets veterinarians and retailers where they work, and once a year the trade comes together at our Diwali Meet &amp; Award Ceremony.</p>
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
              <div><h3>See the full range</h3><p>{products.length} products, each with its composition, indications and a one-minute film.</p></div>
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
