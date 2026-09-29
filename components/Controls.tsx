'use client'

// Small controls shared by /videos (moved out of the old products list, 29 Sep).
export type Lang = 'en' | 'hi'

export function Pill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      padding: '6px 14px', borderRadius: 20,
      border: `1px solid ${active ? '#c8a96e' : 'rgba(200,169,110,0.25)'}`,
      background: active ? '#c8a96e' : 'transparent',
      color: active ? '#1a3a2a' : 'rgba(245,240,232,0.6)',
      fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: active ? 600 : 500,
      cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.18s',
    }}>{label}</button>
  )
}

// ── LANGUAGE TOGGLE ───────────────────────────────────────────────────────────

export function LangToggle({ lang, setLang }: { lang: Lang; setLang: (l: Lang) => void }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center',
      background: 'rgba(255,255,255,0.07)', borderRadius: 8,
      border: '1px solid rgba(200,169,110,0.25)', padding: 3, gap: 2, flexShrink: 0,
    }}>
      {(['en', 'hi'] as Lang[]).map(l => (
        <button key={l} onClick={() => setLang(l)} style={{
          padding: '5px 13px', borderRadius: 6, border: 'none', cursor: 'pointer',
          fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 600,
          transition: 'all 0.15s',
          background: lang === l ? '#c8a96e' : 'transparent',
          color: lang === l ? '#1a3a2a' : 'rgba(245,240,232,0.5)',
        }}>
          {l === 'en' ? 'EN' : 'हिंदी'}
        </button>
      ))}
    </div>
  )
}
