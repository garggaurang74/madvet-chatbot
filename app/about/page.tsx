import { Metadata } from 'next'
import Link from 'next/link'
import SiteNav from '@/components/SiteNav'
import { COMPANY_CSS } from '@/components/companyCss'
import { COMPANY } from '@/lib/company'
import { fetchProducts } from '@/lib/catalog'

export const metadata: Metadata = {
  title: 'About us | Madvet Animal Healthcare',
  description: 'Madvet Animal Healthcare is a veterinary pharmaceutical company based in Ghaziabad since 2010.',
}

export const revalidate = 600

// No photographs on this page — the client's instruction (28 Sep): leadership
// is shown by name and title only.
export default async function AboutPage() {
  const products = await fetchProducts()
  return (
    <>
      <style>{COMPANY_CSS}</style>
      <div className="cp">
        <SiteNav active="about" />
        <header className="cp-hero slim">
          <div className="cp-hero-in">
            <div>
              <div className="cp-eyebrow">About us</div>
              <h1>A veterinary company, <em>since {COMPANY.since}</em>.</h1>
              <p className="lead">{COMPANY.name} is based in {COMPANY.city}. We serve veterinarians, retailers and stockists with a range built for everyday practice.</p>
            </div>
          </div>
        </header>

        <section className="cp-sec">
          <div className="cp-wrap cp-split">
            <div className="cp-prose">
              <div className="cp-kicker">Who we are</div>
              <p>{COMPANY.name} has been in veterinary healthcare since {COMPANY.since}, and is based in Ghaziabad.</p>
              <p>Our range covers antibiotics as injections and boluses, multivitamin injections, animal feed supplements and formulations that combine vitamins, minerals and herbs — {products.length} products today, for cattle, buffalo, sheep, goats, horses and companion animals.</p>
              <p>Our products reach the market under the brand name <b>Madvet</b>. Pet products carry our sub-brand <b>{COMPANY.petBrand}</b>.</p>
              <p>Every product has its full composition, dosage and indications published on this site, with a short film and a page in our product folder — so a veterinarian, a retailer or a farmer can see exactly what they are buying.</p>
            </div>
            <ul className="cp-list">
              <li><b>Injections and boluses</b>Antibiotics, anti-inflammatories and antipyretics for large animals.</li>
              <li><b>Supplements</b>Calcium, multivitamins, minerals, liver tonics and feed supplements.</li>
              <li><b>Parasite control</b>Dewormers and products for ticks, lice and mites.</li>
              <li><b>Pet care — {COMPANY.petBrand}</b>Products for dogs and cats.</li>
            </ul>
          </div>
        </section>

        <section className="cp-sec alt" id="leadership">
          <div className="cp-wrap">
            <div className="cp-kicker">Leadership</div>
            <h2>The people behind Madvet</h2>
            <div className="cp-people" style={{ marginTop: 28 }}>
              {COMPANY.leaders.map(l => (
                <div key={l.name} className="cp-person"><h3>{l.name}</h3><p>{l.role}</p></div>
              ))}
            </div>
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
