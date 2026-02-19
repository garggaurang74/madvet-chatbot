'use client'
import { useState } from 'react'
import type { Conversation } from '@/lib/chatHistory'

interface SidebarProps {
  conversations: Conversation[]
  activeId: string | null
  onSelect: (id: string) => void
  onNewChat: () => void
  onDelete: (id: string) => void
  isOpen: boolean
  onToggle: () => void
}

export default function Sidebar({
  conversations, activeId, onSelect, onNewChat, onDelete, isOpen, onToggle
}: SidebarProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  // Group conversations by date
  const today = new Date().toDateString()
  const yesterday = new Date(Date.now() - 86400000).toDateString()
  const grouped: Record<string, Conversation[]> = {}
  
  conversations.forEach(c => {
    const d = new Date(c.updated_at).toDateString()
    const label = d === today ? 'Today' : d === yesterday ? 'Yesterday' : 'Older'
    if (!grouped[label]) grouped[label] = []
    grouped[label].push(c)
  })

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 md:hidden"
          onClick={onToggle}
        />
      )}
      
      {/* Sidebar */}
      <div className={`
        fixed md:relative z-30 h-full flex flex-col
        bg-[#171717] text-white transition-all duration-300
        ${isOpen ? 'w-64 translate-x-0' : 'w-0 -translate-x-full md:translate-x-0 md:w-0'}
        overflow-hidden
      `}>
        <div className="flex flex-col h-full w-64">
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-green-600 flex items-center justify-center text-xs font-bold">
                M
              </div>
              <span className="font-semibold text-sm">Madvet</span>
            </div>
            <button
              onClick={onToggle}
              className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* New Chat Button */}
          <div className="p-2">
            <button
              onClick={onNewChat}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
                hover:bg-white/10 transition-colors text-sm font-medium border border-white/20"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Chat
            </button>
          </div>

          {/* Conversation List */}
          <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-4">
            {Object.entries(grouped).map(([label, convs]) => (
              <div key={label}>
                <p className="text-xs text-white/40 font-medium px-2 py-1">{label}</p>
                {convs.map(c => (
                  <div
                    key={c.id}
                    onMouseEnter={() => setHoveredId(c.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    onClick={() => onSelect(c.id)}
                    className={`group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer
                      transition-colors text-sm relative
                      ${activeId === c.id
                        ? 'bg-white/15 text-white'
                        : 'text-white/70 hover:bg-white/10 hover:text-white'
                      }`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 flex-shrink-0 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                    <span className="flex-1 truncate">{c.title}</span>
                    {(hoveredId === c.id || activeId === c.id) && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onDelete(c.id) }}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-white/20 transition-all"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ))}
            {conversations.length === 0 && (
              <p className="text-white/30 text-xs text-center py-8 px-4">
                Koi conversation nahi mili. Nayi chat shuru karein!
              </p>
            )}
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-white/10">
            <div className="flex items-center gap-2 px-2 py-2 rounded-lg">
              <div className="w-7 h-7 rounded-full bg-green-700 flex items-center justify-center text-xs font-bold">
                🐄
              </div>
              <div>
                <p className="text-xs font-medium">Dr. Madvet Assistant</p>
                <p className="text-xs text-white/40">Animal Healthcare AI</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
