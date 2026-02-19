'use client'

const SUGGESTIONS = [
  { id: '1', label: '🐄 Gaay mein keede ka ilaaj', value: 'Gaay mein keede ka ilaaj' },
  { id: '2', label: '🐔 Poultry vitamins', value: 'Poultry vitamins' },
  { id: '3', label: '🩹 Wound treatment', value: 'Wound treatment' },
  { id: '4', label: '💊 Antibiotic for cattle fever', value: 'Antibiotic for cattle fever' },
  { id: '5', label: '🥛 Milk production badhana', value: 'Milk production badhana' },
]

interface QuickRepliesProps {
  onSelect: (value: string) => void
  visible: boolean
  dark?: boolean
}

export default function QuickReplies({ onSelect, visible, dark = false }: QuickRepliesProps) {
  if (!visible) return null

  const buttonClass = dark
    ? 'bg-[#2f2f2f] text-white/80 border-white/20 hover:bg-[#3f3f3f]'
    : 'bg-madvet-accent text-madvet-primary border border-madvet-primary/30 hover:bg-madvet-primary/10'

  return (
    <div className={`${dark ? 'grid grid-cols-2 gap-2' : 'flex flex-wrap gap-2'} px-4 pb-2`}>
      {SUGGESTIONS.map((s) => (
        <button
          key={s.id}
          onClick={() => onSelect(s.value)}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${buttonClass}`}
        >
          {s.label}
        </button>
      ))}
    </div>
  )
}
