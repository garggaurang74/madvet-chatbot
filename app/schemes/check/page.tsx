import { Metadata } from 'next'
import SiteNav from '@/components/SiteNav'
import { COMPANY_CSS } from '@/components/companyCss'
import { fetchProducts } from '@/lib/catalog'
import { fetchSchemes, matchScheme } from '@/lib/schemes'

export const metadata: Metadata = { title: 'Scheme check | Madvet', robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

// For the office: every line of the schemes sheet, and the product the site
// put it under. Open this after editing the sheet. A line with no product
// still shows on /schemes (as plain text) — it just has no photo or link.
export default async function SchemeCheck() {
  const [{ month, schemes }, products] = await Promise.all([fetchSchemes(), fetchProducts()])
  const rows = schemes.map(s => ({ s, ...matchScheme(s.item, products) }))
  const miss = rows.filter(r => !r.product).length
  return (
    <>
      <style>{COMPANY_CSS + CSS}</style>
      <div className="cp">
        <SiteNav active="schemes" />
        <section className="cp-sec">
          <div className="cp-wrap">
            <div className="cp-kicker">Schemes sheet check · {month || 'no month found'}</div>
            <h2>{rows.length} lines read · {rows.length - miss} matched · {miss} without a product</h2>
            <p className="intro">This is what the site read from the Google Sheet just now (the public page refreshes within 5 minutes of an edit). Lines in amber show on /schemes as plain text. To fix one, write the product name as it appears on the Products page, with the pack size if there is more than one.</p>
            <table className="ck">
              <thead><tr><th>Quantity</th><th>Item (sheet)</th><th>Free</th><th>Shown under</th><th>Why</th></tr></thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className={r.product ? '' : 'miss'}>
                    <td>{r.s.qty}</td><td>{r.s.item}</td><td>{r.s.free}</td>
                    <td>{r.product ? <a href={`/products/${r.product.id}`}>{r.product.name}</a> : r.family ? <span>photo of <a href={`/products/${r.family.id}`}>{r.family.name}</a></span> : '—'}</td>
                    <td>{r.why}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </>
  )
}

const CSS = `
.ck { width:100%; border-collapse:collapse; background:#fff; border-radius:12px; overflow:hidden; font-size:14px; }
.ck th, .ck td { padding:10px 12px; text-align:left; border-bottom:1px solid rgba(26,58,42,.08); vertical-align:top; }
.ck th { background:var(--forest); color:var(--cream); font-size:12px; letter-spacing:1px; text-transform:uppercase; }
.ck tr.miss td { background:#fff4dc; }
.ck a { color:var(--forest); font-weight:600; }
@media (max-width:700px) { .ck { font-size:12.5px; } .ck th:nth-child(5), .ck td:nth-child(5) { display:none; } }
`
