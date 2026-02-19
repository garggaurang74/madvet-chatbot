'use client'

import type { MadvetProduct } from '@/lib/supabase'

interface ProductCardProps {
  product: MadvetProduct
  dark?: boolean
}

export default function ProductCard({ product, dark = false }: ProductCardProps) {
  const name = product.product_name || 'Unknown Product'

  // Support both old (salt, packing) and new (salt_ingredient, packaging) column names
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = product as any
  const salt = p.salt_ingredient || p.salt
  const dosage = p.dosage
  const packing = p.packaging || p.packing
  const category = p.category
  const species = p.species
  const indication = p.indication

  const needsWithdrawal =
    category?.toLowerCase().includes('antibiotic') ||
    category?.toLowerCase().includes('antiparasitic') ||
    salt?.toLowerCase().includes('ivermectin') ||
    salt?.toLowerCase().includes('fenbendazole') ||
    salt?.toLowerCase().includes('ceftiofur') ||
    salt?.toLowerCase().includes('enrofloxacin') ||
    salt?.toLowerCase().includes('oxytetracycline')

  return (
    <div className={`rounded-xl border-2 p-4 shadow-sm ${
      dark 
        ? 'bg-[#2f2f2f] border-green-700' 
        : 'bg-white border-madvet-accent'
    }`}>
      <div className="flex items-start justify-between gap-2">
        <p className={`font-semibold ${
          dark ? 'text-green-400' : 'text-madvet-primary'
        }`}>{name}</p>
        {category && (
          <span className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0 ${
            dark 
              ? 'bg-green-700 text-green-400' 
              : 'bg-madvet-accent text-madvet-primary'
          }`}>
            {category.split('/')[0].trim()}
          </span>
        )}
      </div>
      {salt && (
        <p className={`mt-1.5 text-sm ${
          dark ? 'text-gray-300' : 'text-gray-600'
        }`}>
          <span className="font-medium">🧪 Composition:</span> {salt}
        </p>
      )}
      {species && (
        <p className={`mt-1 text-sm ${
          dark ? 'text-gray-400' : 'text-gray-500'
        }`}>
          <span className="font-medium">🐄 Species:</span> {species}
        </p>
      )}
      {indication && (
        <p className={`mt-1 text-sm italic ${
          dark ? 'text-gray-300' : 'text-gray-600'
        }`}>{indication}</p>
      )}
      {dosage && (
        <p className={`mt-1 text-sm ${
          dark ? 'text-gray-200' : 'text-gray-700'
        }`}>
          <span className="font-medium">💊 Dosage:</span> {dosage}
        </p>
      )}
      {packing && (
        <p className={`mt-1 text-sm ${
          dark ? 'text-gray-300' : 'text-gray-600'
        }`}>
          <span className="font-medium">📦 Packing:</span> {packing}
        </p>
      )}
      {needsWithdrawal && (
        <p className={`mt-2 text-xs font-medium px-2 py-1 rounded-lg ${
          dark 
            ? 'bg-red-900/30 text-red-400' 
            : 'bg-red-50 text-red-600'
        }`}>
          ⚠️ Withdrawal period (milk/meat) check karein — product leaflet dekhein
        </p>
      )}
    </div>
  )
}
