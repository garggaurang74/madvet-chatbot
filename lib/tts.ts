/**
 * lib/tts.ts
 * Picks the best natural Hindi voice available in the browser.
 *
 * Priority:
 *   1. Microsoft Swara (hi-IN) — Edge, very natural female
 *   2. Microsoft Madhur (hi-IN) — Edge, natural male
 *   3. Google हिन्दी — Chrome, decent
 *   4. Any hi-IN voice
 *   5. Any hi-* locale
 */

let currentUtterance: SpeechSynthesisUtterance | null = null

function getBestHindiVoice(): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null

  const voices = window.speechSynthesis.getVoices()
  if (!voices.length) return null

  const priority: Array<(v: SpeechSynthesisVoice) => boolean> = [
    (v) => /swara/i.test(v.name),
    (v) => /madhur/i.test(v.name),
    (v) => /google.*hindi/i.test(v.name),
    (v) => /hindi/i.test(v.name),
    (v) => v.lang === 'hi-IN',
    (v) => v.lang.startsWith('hi'),
  ]

  for (const test of priority) {
    const match = voices.find(test)
    if (match) return match
  }
  return null
}

export function speakText(text: string, onEnd?: () => void): void {
  if (typeof window === 'undefined' || !window.speechSynthesis) return
  if (!text.trim()) return

  stopSpeaking()

  const utter = new SpeechSynthesisUtterance(text)
  currentUtterance = utter

  const voice = getBestHindiVoice()
  if (voice) {
    utter.voice = voice
    utter.lang = voice.lang
  } else {
    utter.lang = 'hi-IN'
    // Retry when voices load (Chrome loads voices async)
    window.speechSynthesis.onvoiceschanged = () => {
      const v = getBestHindiVoice()
      if (v) { utter.voice = v; utter.lang = v.lang }
      window.speechSynthesis.onvoiceschanged = null
    }
  }

  utter.rate = 0.92   // Slightly slower = more natural
  utter.pitch = 1.0
  utter.volume = 1.0

  utter.onend = () => { currentUtterance = null; onEnd?.() }
  utter.onerror = () => { currentUtterance = null; onEnd?.() }

  window.speechSynthesis.speak(utter)
}

export function stopSpeaking(): void {
  if (typeof window === 'undefined' || !window.speechSynthesis) return
  window.speechSynthesis.cancel()
  currentUtterance = null
}
