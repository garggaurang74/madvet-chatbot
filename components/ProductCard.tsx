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
      {product.image_url && (
        <div className="w-full h-32 overflow-hidden bg-gray-100">
          <img
            src={product.image_url}
            alt={name}
            className="w-full h-full object-contain"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
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
