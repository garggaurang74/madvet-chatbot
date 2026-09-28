import { Metadata } from 'next'
import SiteNav from '@/components/SiteNav'
import { COMPANY_CSS } from '@/components/companyCss'
import { COMPANY } from '@/lib/company'
import Link from 'next/link'
import PhotoSlideshow from '@/components/PhotoSlideshow'

export const metadata: Metadata = {
  title: 'Contact | Madvet Animal Healthcare',
  description: 'Call, WhatsApp or email Madvet Animal Healthcare, Ghaziabad.',
}

const ENQUIRY = 'नमस्ते Madvet, मुझे आपके प्रोडक्ट्स के बारे में जानकारी चाहिए।'

// No leadership block (client, 28 Sep: "remove this"); instead the team's own
// meeting and field photos and a map. The map shows the CITY only — the office's
// street address has not been given, and a guessed pin would send a stockist
// to the wrong door. The 2020 site's Jhansi address is stale.
const SLIDES = [
  { src: '/company/diwali-meet-1.jpg', caption: 'Diwali Meet & Award Ceremony' },
  { src: '/company/team-group.jpg',    caption: 'The Madvet team' },
  { src: '/company/field-3.jpg',       caption: 'With a retailer, in the field' },
  { src: '/company/diwali-meet-2.jpg', caption: 'Diwali Meet & Award Ceremony' },
  { src: '/company/team-outdoor.jpg',  caption: 'Our sales team' },
  { src: '/company/field-1.jpg',       caption: 'At the counter with our products' },
  { src: '/company/field-2.jpg',       caption: 'Meeting the trade' },
]
const MAP = 'https://www.google.com/maps?q=Ghaziabad,+Uttar+Pradesh&z=11&output=embed'
export default function ContactPage() {
  return (
    <>
      <style>{COMPANY_CSS + CSS}</style>
      <div className="cp">
        <SiteNav active="contact" />
        <header className="cp-hero slim">
          <div className="cp-hero-in">
            <div>
              <div className="cp-eyebrow">Contact</div>
              <h1>Talk to <em>Madvet</em>.</h1>
              <p className="lead">For orders, distribution, product questions or schemes — call, WhatsApp or write to us.</p>
            </div>
          </div>
        </header>

        <section className="cp-sec">
          <div className="cp-wrap">
            <div className="cp-contact">
              <div><div className="k">Call or WhatsApp</div><div className="v">{COMPANY.phone}</div>
                <div className="cp-cta" style={{ marginTop: 16 }}>
                  <a href={`tel:+${COMPANY.phoneRaw}`} className="cp-btn dark">📞 Call</a>
                  <a href={`https://wa.me/${COMPANY.phoneRaw}?text=${encodeURIComponent(ENQUIRY)}`} className="cp-btn wa">WhatsApp</a>
                </div>
              </div>
              <a href={`mailto:${COMPANY.email}`}><div className="k">Email</div><div className="v sm">{COMPANY.email}</div><div className="s">Write to us</div></a>
              <div><div className="k">Based in</div><div className="v">{COMPANY.city}</div><div className="s">{COMPANY.name}</div></div>
            </div>
          </div>
        </section>

        <section className="cp-sec alt">
          <div className="cp-wrap">
            <div className="ct-split">
              <div>
                <div className="cp-kicker">Our people</div>
                <h2>Meets, visits and the trade</h2>
                <PhotoSlideshow slides={SLIDES} />
              </div>
              <div>
                <div className="cp-kicker">Where we are</div>
                <h2>Based in Ghaziabad</h2>
                <div className="ct-map">
                  <iframe src={MAP} title="Ghaziabad, Uttar Pradesh on Google Maps" loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
                  <a className="ct-map-open" href="https://maps.google.com/?q=Ghaziabad,+Uttar+Pradesh" target="_blank" rel="noopener">Open in Google Maps ↗</a>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="cp-sec">
          <div className="cp-wrap">
            <div className="cp-kicker">How we can help</div>
            <h2>What would you like to do?</h2>
            <div className="cp-cards" style={{ marginTop: 28 }}>
              <a href={`https://wa.me/${COMPANY.phoneRaw}?text=${encodeURIComponent('नमस्ते Madvet, मुझे ऑर्डर / डिस्ट्रीब्यूशन के बारे में बात करनी है।')}`} className="cp-card"><span className="ic">📦</span><h3>Order or distribute</h3><p>Stock Madvet, place an order or take up distribution in your area.</p><span className="go">WhatsApp us →</span></a>
              <Link href="/ask" className="cp-card"><span className="ic">💬</span><h3>Ask about a product</h3><p>Dose, composition or indication — our assistant answers from the catalogue.</p><span className="go">Ask AI →</span></Link>
              <Link href="/schemes" className="cp-card"><span className="ic">🎁</span><h3>This month’s schemes</h3><p>Trade offers for retailers and stockists, updated by our office.</p><span className="go">See schemes →</span></Link>
              <Link href="/careers" className="cp-card"><span className="ic">🤝</span><h3>Join the team</h3><p>Field sales and distribution roles across the region.</p><span className="go">Careers →</span></Link>
            </div>
          </div>
        </section>
      </div>
    </>
  )
}

const CSS = `
.ct-split { display:grid; grid-template-columns:1.15fr 1fr; gap:40px; align-items:start; }
.ct-split h2 { margin-bottom:22px; }
.ct-map { position:relative; aspect-ratio:4/3; border-radius:18px; overflow:hidden; border:1px solid rgba(26,58,42,.12); background:#dfe7dc; box-shadow:0 24px 50px -24px rgba(15,35,24,.45); }
.ct-map iframe { width:100%; height:100%; border:0; display:block; filter:saturate(.85) contrast(1.02); }
.ct-map-open { position:absolute; right:12px; bottom:12px; padding:8px 13px; border-radius:9px; background:var(--forest); color:var(--cream) !important; font-size:12.5px; font-weight:700; text-decoration:none; }
@media (max-width:980px) { .ct-split { grid-template-columns:1fr; gap:48px; } }
`
