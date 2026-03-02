'use client'

import type { MadvetProduct } from '@/lib/supabase'

interface ProductCardProps {
  product: MadvetProduct
  dark?:   boolean
}

export default function ProductCard({ product, dark = false }: ProductCardProps) {
  const name        = product.product_name ?? 'Unknown Product'
  const packing     = product.packaging
  const category    = product.category
  const species     = product.species
  const benefits    = product.usp_benefits
  const description = product.description
  const imageUrl    = product.image_url

  // Use proxy for Supabase images to avoid CORS issues
  const getProxyUrl = (url: string) => {
    if (!url) return url
    if (url.includes('pzijwpqaadhdfcjjtobf.supabase.co')) {
      const imagePath = url.replace('https://pzijwpqaadhdfcjjtobf.supabase.co/storage/v1/object/public/', '')
      return `/api/images/proxy?path=${encodeURIComponent(imagePath)}`
    }
    return url
  }

  const proxyImageUrl = getProxyUrl(imageUrl || '')

  // Trim indication to first clean chunk only — avoid keyword dumps
  const rawIndication = product.indication ?? ''
  const indication = rawIndication.length > 120
    ? rawIndication.split(/[,،]/)[0].trim()
    : rawIndication

  const MetaRow = ({ label, value }: { label: string; value: string }) => (
    <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start', fontSize: 13 }}>
      <span style={{
        fontSize: 10, fontWeight: 700, letterSpacing: '0.07em',
        textTransform: 'uppercase', opacity: 0.45, flexShrink: 0, paddingTop: 1,
      }}>
        {label}
      </span>
      <span style={{ lineHeight: 1.4 }}>{value}</span>
    </div>
  )

  return (
    <div className={`rounded-xl border-2 overflow-hidden shadow-sm ${
      dark
        ? 'bg-[#2a2a2a] border-green-800/50'
        : 'bg-white border-madvet-accent'
    }`}>

      {/* Product Image */}
      {imageUrl && (
        <div className="w-full overflow-hidden" style={{ background: 'linear-gradient(135deg,#f9f6f1 0%,#ede8e0 100%)', aspectRatio:'1/1', maxHeight: 220 }}>
          <img
            src={proxyImageUrl}
            alt={name}
            className="w-full h-full object-contain transition-opacity duration-300"
            style={{ padding: '8px' }}
            loading="lazy"
            decoding="async"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            onError={(e) => {
              console.log('[ProductCard] Image failed to load via proxy, trying direct URL:', imageUrl)
              const img = e.target as HTMLImageElement
              // Fallback to direct URL if proxy fails
              if (img.src !== imageUrl) {
                img.src = imageUrl
              } else {
                img.style.display = 'none'
                const placeholder = img.parentElement!.querySelector('.img-placeholder') as HTMLElement | null
                if (placeholder) placeholder.style.display = 'flex'
              }
            }}
            onLoad={(e) => {
              const img = e.target as HTMLImageElement
              img.style.opacity = '1'
            }}
          />
          <div className="img-placeholder" style={{ display: 'none', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', fontSize: 40 }}>🐄</div>
        </div>
      )}

      <div className="p-4">

      {/* Name + category badge */}
      <div className="flex items-start justify-between gap-2 mb-2.5">
        <p className={`font-semibold text-base leading-snug ${
          dark ? 'text-green-400' : 'text-madvet-primary'
        }`}>
          {name}
        </p>
        {category && (
          <span className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0 font-medium ${
            dark
              ? 'bg-green-900/50 text-green-300'
              : 'bg-madvet-accent text-madvet-primary'
          }`}>
            {category.split('/')[0].trim()}
          </span>
        )}
      </div>

      {/* Description or indication — main body text */}
      {(description || indication) && (
        <p className={`text-sm leading-relaxed mb-3 ${
          dark ? 'text-gray-300' : 'text-gray-600'
        }`}>
          {description || indication}
        </p>
      )}

      {/* Metadata rows — no emoji prefixes */}
      <div className={`space-y-1.5 border-t pt-3 ${
        dark ? 'border-white/10 text-gray-400' : 'border-gray-100 text-gray-500'
      }`}>
        {packing  && <MetaRow label="Form"    value={packing} />}
        {species  && <MetaRow label="For"     value={species} />}
        {benefits && benefits.length < 120 && <MetaRow label="Note" value={benefits} />}
      </div>

      {/* Vet reminder — ⚕️ is Unicode 2695 (very safe), no 🩺 */}
      <p className={`mt-3 text-xs px-2.5 py-1.5 rounded-lg ${
        dark
          ? 'bg-green-900/25 text-green-400/80'
          : 'bg-green-50 text-green-700'
      }`}>
        ⚕️ Sahi dose ke liye apne vet se milein 🙏
      </p>
      </div>
    </div>
  )
}
