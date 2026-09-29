'use client'

const SUGGESTIONS = [
  { id: '1', label: '🐄  Dewormer for cattle', value: 'Which dewormer should I use for cattle?' },
  { id: '2', label: '🥛  गाय का दूध कम हो गया', value: 'गाय का दूध कम हो गया है, कौन सा प्रोडक्ट दें?' },
  { id: '3', label: '🦴  Calcium around calving', value: 'Which calcium product around calving?' },
  { id: '4', label: '🩺  Antibiotic for mastitis', value: 'Which antibiotic for mastitis?' },
  { id: '5', label: '🐕  Ticks on a dog', value: 'What do you have for ticks on a dog?' },
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
    : 'bg-white text-[#1a3a2a] border border-[#1a3a2a]/20 hover:border-[#1a3a2a]/50 hover:bg-[#ede6d6] shadow-sm'

  return (
    <div className={`${dark ? 'grid grid-cols-2 gap-2' : 'flex flex-wrap justify-center gap-2'} px-2 pb-2`}>
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
