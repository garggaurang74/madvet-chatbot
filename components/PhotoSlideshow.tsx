'use client'

import { useEffect, useState } from 'react'

// A crossfading slideshow of the team's own photographs (meets, field visits).
// Pauses while the pointer is over it; the dots jump straight to a slide.
export interface Slide { src: string; caption: string }

export default function PhotoSlideshow({ slides, interval = 4500 }: { slides: Slide[]; interval?: number }) {
  const [i, setI] = useState(0)
  const [paused, setPaused] = useState(false)
  useEffect(() => {
    if (paused || slides.length < 2) return
    const t = setInterval(() => setI(k => (k + 1) % slides.length), interval)
    return () => clearInterval(t)
  }, [paused, slides.length, interval])

  return (
    <>
      <style>{CSS}</style>
      <div className="ps" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
        {slides.map((s, k) => (
          <figure key={s.src} className={k === i ? 'on' : ''} aria-hidden={k !== i}>
            <img src={s.src} alt={s.caption} loading={k === 0 ? 'eager' : 'lazy'} />
            <figcaption>{s.caption}</figcaption>
          </figure>
        ))}
        <button className="ps-arrow prev" onClick={() => setI(k => (k - 1 + slides.length) % slides.length)} aria-label="Previous photo">‹</button>
        <button className="ps-arrow next" onClick={() => setI(k => (k + 1) % slides.length)} aria-label="Next photo">›</button>
        <div className="ps-dots">
          {slides.map((s, k) => <button key={s.src} className={k === i ? 'on' : ''} onClick={() => setI(k)} aria-label={`Photo ${k + 1}`} />)}
        </div>
      </div>
    </>
  )
}

const CSS = `
.ps { position:relative; aspect-ratio:4/3; border-radius:18px; overflow:hidden; background:#0f2318; box-shadow:0 24px 50px -24px rgba(15,35,24,.6); }
.ps figure { position:absolute; inset:0; margin:0; opacity:0; transition:opacity .9s ease; }
.ps figure.on { opacity:1; }
.ps img { width:100%; height:100%; object-fit:cover; display:block; }
.ps figure.on img { animation:psZoom 6s ease-out both; }
@keyframes psZoom { from { transform:scale(1.06) } to { transform:scale(1) } }
.ps figcaption { position:absolute; left:0; right:0; bottom:0; padding:40px 20px 38px; font-size:14px; font-weight:600; color:#fff; background:linear-gradient(transparent, rgba(15,35,24,.88)); }
.ps-arrow { position:absolute; top:50%; z-index:3; width:40px; height:40px; margin-top:-20px; border-radius:50%; border:1px solid rgba(232,213,168,.4); background:rgba(15,35,24,.55); color:#e8d5a8; font-size:24px; line-height:1; cursor:pointer; opacity:0; transition:opacity .2s; }
.ps:hover .ps-arrow { opacity:1; }
.ps-arrow.prev { left:12px; } .ps-arrow.next { right:12px; }
.ps-dots { position:absolute; left:20px; bottom:14px; z-index:3; display:flex; gap:7px; }
.ps-dots button { width:8px; height:8px; padding:0; border:0; border-radius:4px; background:rgba(255,255,255,.45); cursor:pointer; transition:width .3s, background .3s; }
.ps-dots button.on { width:24px; background:#c8a96e; }
@media (hover:none) { .ps-arrow { opacity:1; } }
@media (prefers-reduced-motion: reduce) { .ps figure, .ps figure.on img { transition:none; animation:none; } }
`
