import { Metadata } from 'next'
import SiteNav from '@/components/SiteNav'
import { COMPANY_CSS } from '@/components/companyCss'
import { COMPANY } from '@/lib/company'

export const metadata: Metadata = {
  title: 'Contact | Madvet Animal Healthcare',
  description: 'Call, WhatsApp or email Madvet Animal Healthcare, Ghaziabad.',
}

const ENQUIRY = 'नमस्ते Madvet, मुझे आपके प्रोडक्ट्स के बारे में जानकारी चाहिए।'

// No photographs on this page (client, 28 Sep). No street address either:
// the 2020 site's Jhansi address is stale and the current one has not been given.
export default function ContactPage() {
  return (
    <>
      <style>{COMPANY_CSS}</style>
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
              <a href={`tel:+${COMPANY.phoneRaw}`}><div className="k">Call</div><div className="v">{COMPANY.phone}</div><div className="s">Tap to call</div></a>
              <a href={`https://wa.me/${COMPANY.phoneRaw}?text=${encodeURIComponent(ENQUIRY)}`}><div className="k">WhatsApp</div><div className="v">{COMPANY.phone}</div><div className="s">Send us a message</div></a>
              <a href={`mailto:${COMPANY.email}`}><div className="k">Email</div><div className="v sm">{COMPANY.email}</div><div className="s">Write to us</div></a>
              <div><div className="k">Based in</div><div className="v">{COMPANY.city}</div><div className="s">{COMPANY.name}</div></div>
            </div>
          </div>
        </section>

        <section className="cp-sec alt">
          <div className="cp-wrap">
            <div className="cp-kicker">Leadership</div>
            <div className="cp-people" style={{ marginTop: 12 }}>
              {COMPANY.leaders.map(l => (
                <div key={l.name} className="cp-person"><h3>{l.name}</h3><p>{l.role}</p></div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </>
  )
}
