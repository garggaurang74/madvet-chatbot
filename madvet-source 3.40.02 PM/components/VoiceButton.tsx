'use client'

import { useState, useRef } from 'react'

interface VoiceButtonProps {
  onTranscript: (text: string) => void
  disabled?: boolean
  dark?: boolean
}

export default function VoiceButton({ onTranscript, disabled, dark }: VoiceButtonProps) {
  const [listening, setListening] = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null)

  const startListening = () => {
    if (typeof window === 'undefined') return

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) {
      alert('Voice input ke liye Chrome browser use karein.')
      return
    }

    const recognition = new SR()
    // Support both Hindi AND English — user can speak either
    recognition.lang = 'hi-IN'
    recognition.interimResults = true   // Show live transcript
    recognition.maxAlternatives = 1
    recognition.continuous = false
    recognitionRef.current = recognition

    recognition.onstart = () => setListening(true)
    recognition.onend = () => setListening(false)
    recognition.onerror = (e: any) => {
      console.error('[Voice Error]', e.error)
      setListening(false)
    }
    recognition.onresult = (event: any) => {
      // Get the final result (not interim)
      let transcript = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          transcript += event.results[i][0].transcript
        }
      }
      if (transcript.trim()) {
        onTranscript(transcript.trim())
      }
    }

    try {
      recognition.start()
    } catch (e) {
      console.error('[Voice start error]', e)
      setListening(false)
    }
  }

  const stopListening = () => {
    try { recognitionRef.current?.stop() } catch {}
    setListening(false)
  }

  return (
    <button
      onClick={listening ? stopListening : startListening}
      disabled={disabled}
      type="button"
      title={listening ? 'Bol rahe hain... tap karein stop karne ke liye' : 'Voice mein bolen'}
      className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center 
        transition-all duration-200
        ${listening
          ? 'bg-red-500 animate-pulse shadow-lg shadow-red-300 scale-110'
          : 'bg-madvet-primary hover:bg-madvet-primary/90 hover:scale-105'
        } disabled:opacity-50 disabled:cursor-not-allowed`}
      aria-label={listening ? 'Stop listening' : 'Start voice input'}
    >
      {listening ? (
        // Stop icon
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" 
          fill="white" className="w-5 h-5">
          <rect x="6" y="6" width="12" height="12" rx="2"/>
        </svg>
      ) : (
        // Mic icon — FIXED: proper stroke/fill combination
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" 
          className="w-5 h-5">
          <path 
            fill="white"
            d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"
          />
          <path 
            fill="none"
            stroke="white" 
            strokeWidth="2" 
            strokeLinecap="round"
            d="M19 10v2a7 7 0 01-14 0v-2"
          />
          <line 
            x1="12" y1="19" x2="12" y2="23" 
            stroke="white" strokeWidth="2" strokeLinecap="round"
          />
          <line 
            x1="8" y1="23" x2="16" y2="23" 
            stroke="white" strokeWidth="2" strokeLinecap="round"
          />
        </svg>
      )}
    </button>
  )
}
