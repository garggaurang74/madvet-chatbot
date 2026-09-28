'use client'

import Link from 'next/link'
import ShareVideo from './ShareVideo'
import { FOLDER_DOWNLOAD, FOLDER_PDF, SITE } from '@/lib/share'

// Download / WhatsApp buttons for the product folder PDF, for the dark
// headers of /products and /videos. On a phone the WhatsApp button sends the
// PDF itself; elsewhere it sends a link to it.
export default function FolderButtons({ hi }: { hi: boolean }) {
  const caption = `*MADVET Product Folder 2026* — ${hi ? 'सभी प्रोडक्ट एक जगह' : 'the full range'}\n${SITE}/products`
  const wa = `https://wa.me/?text=${encodeURIComponent(`*MADVET Product Folder 2026*\n${FOLDER_PDF}`)}`
  const base: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 8, padding: '11px 16px', borderRadius: 10,
    fontFamily: "'DM Sans','Noto Sans Devanagari',sans-serif", fontSize: 13.5, fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap',
  }
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
      <Link href="/folder" style={{ ...base, background: '#c8a96e', color: '#1a3a2a' }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2 5h8a2 2 0 0 1 2 2v13a2 2 0 0 0-2-2H2zM22 5h-8a2 2 0 0 0-2 2v13a2 2 0 0 1 2-2h8z" /></svg>
        {hi ? 'प्रोडक्ट फ़ोल्डर देखें' : 'View Product Folder'}
      </Link>
      <ShareVideo name="Product-Folder-2026" src={FOLDER_PDF} mime="application/pdf" ext="pdf" text={caption} waUrl={wa}
        style={{ ...base, background: '#25a244', color: '#fff' }}
        loadingLabel={hi ? 'तैयार हो रहा है…' : 'Preparing…'}
        readyLabel={hi ? 'भेजने के लिए फिर दबाएँ' : 'Tap again to send'}>
        {hi ? 'फ़ोल्डर WhatsApp पर भेजें' : 'Send folder on WhatsApp'}
      </ShareVideo>
      <a href={FOLDER_DOWNLOAD} download style={{ ...base, padding: '11px 12px', border: '1px solid rgba(200,169,110,.35)', color: '#e8d5a8' }}>
        {hi ? 'PDF डाउनलोड' : 'PDF'} ⬇
      </a>
    </div>
  )
}
