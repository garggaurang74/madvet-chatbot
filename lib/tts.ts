// ─────────────────────────────────────────────
// TTS — picks best Hindi voice available
// FIX: Handles Chrome async voice loading correctly
// ─────────────────────────────────────────────

let currentUtterance: SpeechSynthesisUtterance | null = null

const VOICE_PRIORITY: Array<(v: SpeechSynthesisVoice) => boolean> = [
  (v) => /swara/i.test(v.name),          // Microsoft Swara — best
  (v) => /madhur/i.test(v.name),         // Microsoft Madhur
  (v) => /google.*hindi/i.test(v.name),  // Google Hindi
  (v) => /hindi/i.test(v.name),
  (v) => v.lang === 'hi-IN',
  (v) => v.lang.startsWith('hi'),
]

function getBestHindiVoice(): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null
  const voices = window.speechSynthesis.getVoices()
  if (!voices.length) return null
  for (const test of VOICE_PRIORITY) {
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

  utter.rate        = 0.92
  utter.pitch       = 1.0
  utter.volume      = 1.0
  utter.lang        = 'hi-IN'

  utter.onend  = () => { currentUtterance = null; onEnd?.() }
  utter.onerror = () => { currentUtterance = null; onEnd?.() }

  // FIX: Chrome loads voices async — wait then assign
  const trySpeak = () => {
    const voice = getBestHindiVoice()
    if (voice) {
      utter.voice = voice
      utter.lang  = voice.lang
    }
    window.speechSynthesis.speak(utter)
  }

  const voices = window.speechSynthesis.getVoices()
  if (voices.length > 0) {
    trySpeak()
  } else {
    // FIX: Chrome needs this event before voices are available
    window.speechSynthesis.onvoiceschanged = () => {
      window.speechSynthesis.onvoiceschanged = null
      trySpeak()
    }
    // Fallback: speak anyway after 300ms if event never fires
    setTimeout(() => {
      if (currentUtterance === utter && !window.speechSynthesis.speaking) {
        trySpeak()
      }
    }, 300)
  }
}

export function stopSpeaking(): void {
  if (typeof window === 'undefined' || !window.speechSynthesis) return
  window.speechSynthesis.cancel()
  currentUtterance = null
}
