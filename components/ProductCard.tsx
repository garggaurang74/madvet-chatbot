'use client'

import type { MadvetProduct } from '@/lib/supabase'

interface ProductCardProps {
  product: MadvetProduct
  dark?:   boolean
}

export default function ProductCard({ product, dark = false }: ProductCardProps) {
  const name     = product.product_name ?? 'Unknown Product'
  const packing  = product.packaging
  const category = product.category
  const species  = product.species
  const benefits = product.usp_benefits
  const description = product.description

  // Trim indication to first sentence / first comma-chunk — avoid keyword dumps
  const rawIndication = product.indication ?? ''
  const indication = rawIndication.length > 120
    ? rawIndication.split(/[,،]/)[0].trim()   // first comma-chunk only
    : rawIndication

  return (
    <div className={`rounded-xl border-2 p-4 shadow-sm ${
      dark
        ? 'bg-[#2f2f2f] border-green-700'
        : 'bg-white border-madvet-accent'
    }`}>

      {/* Name + Category badge */}
      <div className="flex items-start justify-between gap-2">
        <p className={`font-semibold ${dark ? 'text-green-400' : 'text-madvet-primary'}`}>
          {name}
        </p>
        {category && (
          <span className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0 ${
            dark
              ? 'bg-green-700/50 text-green-300'
              : 'bg-madvet-accent text-madvet-primary'
          }`}>
            {category.split('/')[0].trim()}
          </span>
        )}
      </div>

      {/* Description (preferred) or trimmed indication */}
      {(description || indication) && (
        <p className={`mt-2 text-sm ${dark ? 'text-gray-300' : 'text-gray-600'}`}>
          {description || indication}
        </p>
      )}

      {/* Packing */}
      {packing && (
        <p className={`mt-1.5 text-sm ${dark ? 'text-gray-400' : 'text-gray-500'}`}>
          📦 <span className="font-medium">Packing:</span> {packing}
        </p>
      )}

      {/* Benefits — only if short */}
      {benefits && benefits.length < 120 && (
        <p className={`mt-1 text-sm ${dark ? 'text-gray-300' : 'text-gray-600'}`}>
          ✅ {benefits}
        </p>
      )}

      {/* Vet reminder */}
      <p className={`mt-3 text-xs px-2 py-1.5 rounded-lg ${
        dark
          ? 'bg-green-900/30 text-green-400'
          : 'bg-green-50 text-green-700'
      }`}>
        🩺 Sahi dose ke liye apne vet se milein 🙏
      </p>
    </div>
  )
}
