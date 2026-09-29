import { Metadata } from 'next'
import SiteNav from '@/components/SiteNav'
import { COMPANY_CSS } from '@/components/companyCss'
import { COMPANY } from '@/lib/company'
import { PageMark } from '@/components/SiteFooter'

export const metadata: Metadata = {
  title: 'Careers | Madvet Animal Healthcare',
  description: 'Build a career in veterinary sales and marketing with Madvet Animal Healthcare.',
}

const APPLY = 'नमस्ते Madvet, मैं आपकी टीम में काम करना चाहता/चाहती हूँ। मेरा CV:'

export default function CareersPage() {
  return (
    <>
      <style>{COMPANY_CSS}</style>
      <PageMark photos />
      <div className="cp">
        <SiteNav active="careers" />
        <header className="cp-hero">
          <div className="cp-hero-in">
            <div>
              <div className="cp-eyebrow">Careers</div>
              <h1>Our team is <em>our strength</em>.</h1>
              <p className="lead">We look for hard-working people who want to work in the field — with veterinarians, retailers and dairy farmers — and grow with the company.</p>
              <div className="cp-cta">
                <a href={`mailto:${COMPANY.email}?subject=${encodeURIComponent('Job application — Madvet')}`} className="cp-btn gold">Email your CV</a>
                <a href={`https://wa.me/${COMPANY.phoneRaw}?text=${encodeURIComponent(APPLY)}`} className="cp-btn line">Apply on WhatsApp</a>
              </div>
            </div>
            <figure className="cp-photo" style={{ margin: 0, aspectRatio: '4 / 3' }}>
              <img src="/company/team-outdoor.jpg" alt="The Madvet sales team" />
            </figure>
          </div>
        </header>

        <section className="cp-sec">
          <div className="cp-wrap cp-split">
            <div className="cp-prose">
              <div className="cp-kicker">Working at Madvet</div>
              <p>Our field team is how Madvet reaches veterinarians and dairy farmers — in towns and deep in the interior. The work is to explain our products well, support our retailers and stockists, and bring back what the market needs.</p>
              <p>We train our people on the products they sell: every product has its own film, folder page and composition on this site, and our training module is open to the whole team.</p>
              <p>If you are committed to field work and want to learn, perform and grow in veterinary healthcare, send us your CV.</p>
            </div>
            <ul className="cp-list">
              <li><b>Field sales</b>Veterinary sales officers and medical representatives.</li>
              <li><b>Distribution</b>Stockists and distributors for new areas.</li>
              <li><b>How to apply</b>Email {COMPANY.email} or message us on WhatsApp with your CV and the area you want to work in.</li>
            </ul>
          </div>
        </section>

        <section className="cp-sec alt">
          <div className="cp-wrap">
            <div className="cp-gallery">
              <figure className="cp-photo" style={{ margin: 0 }}><img src="/company/diwali-meet-1.jpg" alt="Madvet Diwali Meet and Award Ceremony" loading="lazy" /><figcaption>Diwali Meet &amp; Award Ceremony</figcaption></figure>
              <figure className="cp-photo" style={{ margin: 0 }}><img src="/company/field-2.jpg" alt="Madvet team with a retailer" loading="lazy" /></figure>
              <figure className="cp-photo" style={{ margin: 0 }}><img src="/company/diwali-meet-2.jpg" alt="Madvet Diwali Meet" loading="lazy" /></figure>
            </div>
          </div>
        </section>
      </div>
    </>
  )
}
