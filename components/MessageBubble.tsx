'use client'

import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import ProductCard from './ProductCard'
import { speakText, stopSpeaking } from '@/lib/tts'
import type { MadvetProduct } from '@/lib/supabase'

interface MessageBubbleProps {
  messageId:     string
  role:          'user' | 'assistant'
  content:       string
  products?:     MadvetProduct[]
  showFeedback?: boolean
  dark?:         boolean
}

function cleanForSpeech(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/#{1,6}\s/g, '')
    .replace(/✅|💊|⚠️|📦|🐄|🐔|🩹|🥛|🧪/g, '')
    .replace(/\[.*?\]\(.*?\)/g, '')
    .replace(/`[^`]+`/g, '')
    .replace(/\n{2,}/g, '. ')
    .replace(/\n/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

function getFormBadge(p: MadvetProduct): { label: string; color: string } {
  const pkg = (p.packaging   ?? '').toLowerCase()
  const cat = (p.category    ?? '').toLowerCase()
  const ind = (p.indication  ?? '').toLowerCase()
  const desc= (p.description ?? '').toLowerCase()
  const all = pkg + ' ' + cat + ' ' + ind + ' ' + desc

  if (/\binjection\b|injectable|parenteral|\binj\b/.test(pkg) || /injection/.test(cat))
    return { label: 'Injection', color: 'bg-blue-500/20 text-blue-300' }
  if (/\bbolus\b|\btablet\b/.test(pkg))
    return { label: 'Bolus / Tablet', color: 'bg-purple-500/20 text-purple-300' }
  if (/\bspray\b/.test(pkg))
    return { label: 'Spray', color: 'bg-cyan-500/20 text-cyan-300' }
  // Gel — distinguish oral from topical
  if (/\bgel\b/.test(pkg)) {
    const isOral = /oral|consume|drench|drink|swallow|lick|feed|intake/.test(all)
    return isOral
      ? { label: 'Oral Gel',    color: 'bg-lime-500/20 text-lime-300'   }
      : { label: 'Topical Gel', color: 'bg-orange-500/20 text-orange-300' }
  }
  if (/ointment/.test(pkg))
    return { label: 'Ointment', color: 'bg-orange-500/20 text-orange-300' }
  if (/powder/.test(pkg))
    return { label: 'Powder', color: 'bg-yellow-500/20 text-yellow-300' }
  if (/soap/.test(pkg))
    return { label: 'Soap', color: 'bg-pink-500/20 text-pink-300' }
  if (/drench|liquid|syrup/.test(pkg))
    return { label: 'Liquid', color: 'bg-teal-500/20 text-teal-300' }
  if (/\boral\b/.test(pkg))
    return { label: 'Oral', color: 'bg-lime-500/20 text-lime-300' }
  // fallback: first word of packaging
  const first = pkg.split(' ')[0]
  return { label: first ? first.charAt(0).toUpperCase() + first.slice(1) : 'Product', color: 'bg-gray-500/20 text-gray-300' }
}

// ── 1 primary card + named list for rest, each expandable ────────────────────
function ProductCards({ products, dark }: { products: MadvetProduct[]; dark: boolean }) {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null)
  if (products.length === 0) return null

  const primary = products[0]
  const rest    = products.slice(1)

  return (
    <div className="space-y-2">
      {/* Primary card — always visible */}
      <ProductCard product={primary} dark={dark} />

      {/* Other products — named rows, each expandable */}
      {rest.length > 0 && (
        <div className={`rounded-xl border px-3 py-2 ${
          dark ? 'border-white/10 bg-white/5' : 'border-gray-200 bg-gray-50'
        }`}>
          <p className={`text-xs font-semibold mb-2 uppercase tracking-wide ${
            dark ? 'text-white/40' : 'text-gray-400'
          }`}>
            Aur options
          </p>
          <div className="space-y-1">
            {rest.map((p, i) => {
              const badge  = getFormBadge(p)
              const isOpen = expandedIdx === i
              return (
                <div key={i}>
                  <button
                    onClick={() => setExpandedIdx(isOpen ? null : i)}
                    className={`w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg text-left transition-colors ${
                      dark ? 'hover:bg-white/10 text-white' : 'hover:bg-white text-gray-800'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className={`w-3 h-3 flex-shrink-0 transition-transform ${isOpen ? 'rotate-90' : ''} ${
                          dark ? 'text-green-400' : 'text-madvet-primary'
                        }`}
                        fill="none" viewBox="0 0 24 24" stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                      <span className="text-sm font-medium truncate">{p.product_name ?? 'Unknown'}</span>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 font-medium ${badge.color}`}>
                      {badge.label}
                    </span>
                  </button>
                  {isOpen && (
                    <div className="mt-1 ml-5">
                      <ProductCard product={p} dark={dark} />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default function MessageBubble({
  messageId,
  role,
  content,
  products = [],
  showFeedback = false,
  dark = false,
}: MessageBubbleProps) {
  const isUser = role === 'user'
  const [feedbackSent, setFeedbackSent] = useState<string | null>(null)
  const [playing, setPlaying]           = useState(false)

  const sendFeedback = async (rating: 'up' | 'down') => {
    if (feedbackSent) return
    try {
      await fetch('/api/feedback', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ messageId, rating, messageContent: content }),
      })
      setFeedbackSent(rating)
    } catch { /* ignore */ }
  }

  const handleSpeak = () => {
    if (playing) { stopSpeaking(); setPlaying(false); return }
    stopSpeaking()
    setPlaying(true)
    speakText(cleanForSpeech(content), () => setPlaying(false))
  }

  return (
    <div className={`flex gap-4 ${isUser ? 'flex-row-reverse' : ''}`}>
      {!isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-white font-bold text-sm">
          M
        </div>
      )}
      <div className={`flex-1 ${isUser ? 'max-w-[85%]' : ''}`}>
        {isUser ? (
          <div className={`rounded-2xl px-4 py-3 ${
            dark ? 'bg-[#2f2f2f] text-white' : 'bg-madvet-primary text-white'
          }`}>
            <p className="whitespace-pre-wrap">{content}</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className={`prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0 ${
              dark ? 'prose-invert' : ''
            }`}>
              <ReactMarkdown>{content}</ReactMarkdown>
            </div>

            {products.length > 0 && <ProductCards products={products} dark={dark} />}

            {content && (
              <div className="flex items-center gap-1">
                <button
                  onClick={handleSpeak}
                  title={playing ? 'Rokein' : 'Sunein'}
                  aria-label={playing ? 'Stop audio' : 'Play audio'}
                  className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-colors
                    ${playing
                      ? dark ? 'bg-white/20 text-white font-medium' : 'bg-madvet-primary/10 text-madvet-primary font-medium'
                      : dark ? 'text-white/50 hover:text-white hover:bg-white/10' : 'text-gray-400 hover:text-madvet-primary hover:bg-madvet-primary/10'
                    }`}
                >
                  {playing ? (
                    <span className="flex items-end gap-[2px] h-3">
                      <span className="w-[2px] bg-current animate-bounce" style={{ height: '60%', animationDelay: '0ms' }} />
                      <span className="w-[2px] bg-current animate-bounce" style={{ height: '100%', animationDelay: '150ms' }} />
                      <span className="w-[2px] bg-current animate-bounce" style={{ height: '70%', animationDelay: '300ms' }} />
                    </span>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                      <path d="M10.5 3.75a.75.75 0 00-1.264-.546L5.203 7H2.667a.75.75 0 00-.7.48A6.985 6.985 0 002 10c0 .887.165 1.737.468 2.52.111.29.39.48.7.48h2.535l4.033 3.796a.75.75 0 001.264-.546V3.75zM15.95 5.05a.75.75 0 00-1.06 1.061 5.5 5.5 0 010 7.778.75.75 0 001.06 1.06 7 7 0 000-9.899z" />
                      <path d="M13.829 7.172a.75.75 0 00-1.061 1.06 2.5 2.5 0 010 3.536.75.75 0 001.06 1.06 4 4 0 000-5.656z" />
                    </svg>
                  )}
                  <span>{playing ? 'Rok' : 'Sun'}</span>
                </button>
                <span className="flex-1" />
                {showFeedback && (
                  <>
                    <button
                      onClick={() => sendFeedback('up')}
                      className={`p-1 rounded-md text-sm transition-colors ${
                        feedbackSent === 'up'
                          ? dark ? 'text-green-400' : 'text-madvet-primary'
                          : dark ? 'text-white/50 hover:text-white' : 'text-gray-400 hover:text-gray-600'
                      }`}
                      aria-label="Good"
                    >👍</button>
                    <button
                      onClick={() => sendFeedback('down')}
                      className={`p-1 rounded-md text-sm transition-colors ${
                        feedbackSent === 'down'
                          ? 'text-red-400'
                          : dark ? 'text-white/50 hover:text-white' : 'text-gray-400 hover:text-gray-600'
                      }`}
                      aria-label="Bad"
                    >👎</button>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
