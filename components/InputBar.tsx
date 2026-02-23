'use client'

import { useRef, useState } from 'react'

interface InputBarProps {
  onSend: (text: string) => void
  disabled?: boolean
  dark?: boolean
}

export default function InputBar({ onSend, disabled, dark }: InputBarProps) {
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSubmit = () => {
    const text = value.trim()
    if (!text || disabled) return
    onSend(text)
    setValue('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
  }

  const inputClass = dark
    ? 'bg-[#2f2f2f] border-white/10 text-white placeholder-white/40 focus:ring-white/20 focus:border-white/30'
    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:ring-madvet-primary/50 focus:border-madvet-primary'

  const wrapperClass = dark
    ? 'flex items-end gap-2 p-3'
    : 'flex items-end gap-2 p-4 bg-white border-t border-gray-200'

  const sendBtnClass = dark
    ? 'bg-white text-black hover:bg-white/90'
    : 'bg-madvet-primary text-white hover:bg-madvet-primary/90'

  return (
    <div className={wrapperClass}>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        placeholder="Apni problem Hindi ya English mein likhein..."
        lang="hi"
        rows={1}
        disabled={disabled}
        className={`flex-1 resize-none rounded-2xl border px-4 py-3 text-base 
          focus:outline-none focus:ring-2 disabled:opacity-60 
          max-h-[120px] overflow-y-auto ${inputClass}`}
      />

      {/* Send Button — upward arrow like ChatGPT/Claude */}
      <button
        onClick={handleSubmit}
        disabled={!value.trim() || disabled}
        type="button"
        className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center 
          justify-center disabled:opacity-50 disabled:cursor-not-allowed 
          transition-all hover:scale-105 ${sendBtnClass}`}
        aria-label="Send"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" strokeWidth="2.5"
          strokeLinecap="round" strokeLinejoin="round"
          className="w-5 h-5">
          <line x1="12" y1="19" x2="12" y2="5" />
          <polyline points="5 12 12 5 19 12" />
        </svg>
      </button>
    </div>
  )
}
