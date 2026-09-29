'use client'

import { useRef, useState } from 'react'

// Share a film to WhatsApp as the VIDEO ITSELF where the phone allows it.
// A wa.me link can only carry text, so on phones we hand the MP4 to the
// system share sheet (Web Share API with files): the user picks WhatsApp and
// the video lands in the chat. Anything that can't share files (most
// desktops, old phones) falls back to the wa.me text link.
//
// Safari only lets share() run straight off a tap, and the 3-5 MB download
// can outlast that. If the first attempt is refused the button turns into
// "tap again to send", which is a fresh tap with the file already in hand.

type Stage = 'idle' | 'loading' | 'ready'

export default function ShareVideo({ name, src, text, waUrl, className, style, children, readyLabel, loadingLabel,
  mime = 'video/mp4', ext = 'mp4' }: {
  name: string
  mime?: string           // also shares the product folder PDF
  ext?: string
  src?: string            // our MP4; '' or undefined -> link only
  text: string            // caption sent with the video
  waUrl: string           // fallback wa.me link
  className?: string
  style?: React.CSSProperties
  children: React.ReactNode
  readyLabel?: React.ReactNode
  loadingLabel?: React.ReactNode
}) {
  const [stage, setStage] = useState<Stage>('idle')
  const file = useRef<File | null>(null)

  const fallback = () => { window.open(waUrl, '_blank', 'noopener') }

  async function shareFile(): Promise<boolean> {
    if (!file.current) return false
    try {
      await navigator.share({ files: [file.current], text })
      return true
    } catch (e) {
      // The user closing the sheet is not a failure; a refused call is.
      return (e as DOMException)?.name === 'AbortError'
    }
  }

  async function onClick(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    const canFiles = typeof navigator !== 'undefined' && typeof navigator.canShare === 'function'
    if (!src || !canFiles) return fallback()

    if (stage === 'ready') {
      if (!(await shareFile())) fallback()
      setStage('idle')
      return
    }
    if (stage === 'loading') return

    setStage('loading')
    try {
      const blob = await (await fetch(src)).blob()
      const type = blob.type || mime
      const f = new File([blob], `${name.replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '')}-MADVET.${type === 'image/jpeg' ? 'jpg' : type === 'image/png' ? 'png' : ext}`, { type })
      if (!navigator.canShare({ files: [f] })) { setStage('idle'); return fallback() }
      file.current = f
      if (await shareFile()) setStage('idle')
      else setStage('ready')   // Safari refused after the download: one more tap sends it
    } catch {
      setStage('idle')
      fallback()
    }
  }

  return (
    <a href={waUrl} onClick={onClick} className={className} style={style} target="_blank" rel="noopener" aria-busy={stage === 'loading'}>
      {stage === 'loading' ? (loadingLabel ?? children) : stage === 'ready' ? (readyLabel ?? children) : children}
    </a>
  )
}
