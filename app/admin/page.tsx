'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { generateAdminToken, isAdminAuthenticated, setStoredAdminToken } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'

// ── Types ─────────────────────────────────────────────────────────────────────
type ProductData = {
  product_name: string; salt_ingredient: string; packaging: string
  description: string; category: string; species: string
  indication: string; aliases: string; dosage: string
  usp_benefits: string; image_url: string
}
type AdminMode   = 'home' | 'ai' | 'manual' | 'image'
type Stage       = 'step1' | 'extracting' | 'review' | 'saving' | 'done' | 'error'
type ImageStage  = 'select' | 'upload' | 'preview' | 'saving' | 'done' | 'error'

const EMPTY: ProductData = {
  product_name:'', salt_ingredient:'', packaging:'', description:'',
  category:'', species:'', indication:'', aliases:'', dosage:'',
  usp_benefits:'', image_url:''
}

const CATEGORIES = [
  'Antibiotic','Anthelmintic / Antiparasitic','Ectoparasiticide',
  'Anti-inflammatory / Analgesic','Antihistamine','Reproductive Hormone',
  'Probiotic','Vitamin Supplement','Udder Care','Antidiarrheal','Dermatological',
]
const SPECIES_OPTIONS = ['Cattle','Buffalo','Sheep','Goat','Dog','Cat','Horse','Poultry']

// ── Supabase Storage upload ───────────────────────────────────────────────────
async function uploadToStorage(base64: string, mime: string, name: string): Promise<string | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null
  try {
    const supabase = createClient(url, key)
    const ext  = mime.includes('png') ? 'png' : 'jpg'
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')
    const file = `${slug}-${Date.now()}.${ext}`
    const bytes = atob(base64)
    const arr   = new Uint8Array(bytes.length)
    for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i)
    const blob = new Blob([arr], { type: mime })
    const { error } = await supabase.storage.from('product-images').upload(file, blob, { contentType: mime, upsert: false })
    if (error) { console.error('[Storage]', error.message); return null }
    const { data } = supabase.storage.from('product-images').getPublicUrl(file)
    return data?.publicUrl ?? null
  } catch(e) { console.error('[Storage]', e); return null }
}

// ── Canvas auto-enhance (brightness + contrast boost for product photos) ──────
async function enhanceImage(dataUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.width; canvas.height = img.height
      const ctx = canvas.getContext('2d')!
      ctx.filter = 'contrast(1.15) brightness(1.08) saturate(1.1)'
      ctx.drawImage(img, 0, 0)
      resolve(canvas.toDataURL('image/jpeg', 0.92))
    }
    img.src = dataUrl
  })
}

// ── toBase64 ──────────────────────────────────────────────────────────────────
const toBase64 = (file: File): Promise<string> =>
  new Promise((res, rej) => {
    const r = new FileReader()
    r.onload = () => res((r.result as string).split(',')[1])
    r.onerror = rej
    r.readAsDataURL(file)
  })

const toDataUrl = (file: File): Promise<string> =>
  new Promise((res, rej) => {
    const r = new FileReader()
    r.onload = () => res(r.result as string)
    r.onerror = rej
    r.readAsDataURL(file)
  })

// ── Password Gate ─────────────────────────────────────────────────────────────
function PasswordGate({ onUnlock }: { onUnlock: (p: string) => boolean }) {
  const [pw, setPw] = useState('')
  const [err, setErr] = useState(false)
  return (
    <div className="min-h-screen bg-[#212121] text-white flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-[#2f2f2f] rounded-2xl p-8 border border-white/10">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-green-600 flex items-center justify-center mx-auto mb-4 text-2xl">🐄</div>
          <h1 className="text-2xl font-bold mb-1">Madvet Admin</h1>
          <p className="text-white/50 text-sm">Product Management System</p>
        </div>
        <form onSubmit={e => { e.preventDefault(); if (!onUnlock(pw)) setErr(true) }} className="space-y-4">
          <input type="password" value={pw} onChange={e => { setPw(e.target.value); setErr(false) }}
            placeholder="Password" autoFocus
            className={`w-full px-4 py-3 bg-[#1f1f1f] border rounded-lg text-white placeholder-white/30
              focus:outline-none focus:ring-2 focus:ring-green-500 ${err ? 'border-red-500' : 'border-white/20'}`} />
          {err && <p className="text-red-400 text-sm text-center">Galat password!</p>}
          <button type="submit" className="w-full py-3 rounded-lg bg-green-600 hover:bg-green-500 font-semibold transition-colors">
            Unlock
          </button>
        </form>
      </div>
    </div>
  )
}

// ── Shared Review Form ────────────────────────────────────────────────────────
function ReviewForm({
  product, setProduct, onSave, onBack, error, imagePreview, isManual
}: {
  product: ProductData
  setProduct: (p: ProductData) => void
  onSave: () => void
  onBack: () => void
  error: string
  imagePreview: string | null
  isManual: boolean
}) {
  const update = (f: keyof ProductData, v: string) => setProduct({ ...product, [f]: v })
  const toggleSpecies = (s: string) => {
    const cur = product.species.split(',').map(x => x.trim()).filter(Boolean)
    update('species', (cur.includes(s) ? cur.filter(x => x !== s) : [...cur, s]).join(', '))
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold mb-1">{isManual ? 'Product Details' : 'Review & Edit'}</h2>
        <p className="text-white/40 text-sm">{isManual ? 'Saari details fill karein' : 'AI ne extract kiya — check karein'}</p>
      </div>

      {/* Image preview */}
      {imagePreview && (
        <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/10">
          <img src={imagePreview} alt="Product" className="w-16 h-16 rounded-lg object-contain bg-white/10 p-1" />
          <div>
            <p className="text-xs text-green-400 font-medium">✅ Photo ready</p>
            <p className="text-xs text-white/40 mt-0.5">Save karte waqt upload hogi</p>
          </div>
        </div>
      )}

      {/* Core fields */}
      <div className="bg-white/5 rounded-xl p-4 space-y-4 border border-white/10">
        <p className="text-xs text-green-400 font-semibold uppercase tracking-wide">📋 Product Info</p>
        {([
          { label: 'Product Name *',     field: 'product_name',    ph: 'e.g. Wormi Stop'          },
          { label: 'Salt / Composition *',field: 'salt_ingredient', ph: 'e.g. Albendazole 2500mg'  },
          { label: 'Packaging',          field: 'packaging',        ph: 'e.g. Bolus 1x4'           },
          { label: 'Dosage',             field: 'dosage',           ph: 'e.g. 1 bolus per 100kg'   },
        ] as const).map(({ label, field, ph }) => (
          <div key={field}>
            <label className="text-xs text-white/50 mb-1 block">{label}</label>
            <input value={product[field]} onChange={e => update(field, e.target.value)} placeholder={ph}
              className="w-full bg-[#2f2f2f] border border-white/10 rounded-lg px-3 py-2.5
                text-sm text-white placeholder-white/25 focus:outline-none focus:border-green-500" />
          </div>
        ))}
      </div>

      {/* Enriched fields */}
      <div className="bg-white/5 rounded-xl p-4 space-y-4 border border-white/10">
        <p className="text-xs text-green-400 font-semibold uppercase tracking-wide">🤖 Details</p>

        <div>
          <label className="text-xs text-white/50 mb-2 block">Category</label>
          <select value={product.category} onChange={e => update('category', e.target.value)}
            className="w-full bg-[#2f2f2f] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-green-500">
            <option value="">Select category</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div>
          <label className="text-xs text-white/50 mb-2 block">Species</label>
          <div className="flex flex-wrap gap-2">
            {SPECIES_OPTIONS.map(s => (
              <button key={s} onClick={() => toggleSpecies(s)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors
                  ${product.species.includes(s) ? 'bg-green-600 text-white' : 'bg-[#2f2f2f] text-white/50 border border-white/10 hover:border-white/30'}`}>
                {s}
              </button>
            ))}
          </div>
        </div>

        {([
          { label: 'Indication',   field: 'indication',   ph: 'e.g. Diarrhea, dast, loose motions', rows: 3 },
          { label: 'Aliases',      field: 'aliases',      ph: 'e.g. wormi, wormy stop, keede ki dawa', rows: 3 },
          { label: 'Description',  field: 'description',  ph: 'Product description', rows: 2 },
          { label: 'USP/Benefits', field: 'usp_benefits', ph: 'Key benefits', rows: 2 },
        ] as const).map(({ label, field, ph, rows }) => (
          <div key={field}>
            <label className="text-xs text-white/50 mb-1 block">{label}</label>
            <textarea value={product[field]} onChange={e => update(field, e.target.value)}
              placeholder={ph} rows={rows}
              className="w-full bg-[#2f2f2f] border border-white/10 rounded-lg px-3 py-2.5
                text-sm text-white placeholder-white/25 focus:outline-none focus:border-green-500 resize-none" />
          </div>
        ))}
      </div>

      {error && <p className="text-red-400 text-sm bg-red-900/20 px-4 py-2 rounded-lg">{error}</p>}

      <div className="flex gap-3">
        <button onClick={onBack}
          className="flex-1 py-3 rounded-xl border border-white/20 hover:bg-white/5 text-sm font-medium transition-colors">
          ← Back
        </button>
        <button onClick={onSave} disabled={!product.product_name || !product.salt_ingredient}
          className="flex-1 py-3 rounded-xl bg-green-600 hover:bg-green-500 disabled:opacity-40 font-semibold transition-colors">
          ✅ Save to Supabase
        </button>
      </div>
    </div>
  )
}

// ── Done Screen ───────────────────────────────────────────────────────────────
function DoneScreen({ name, imageUrl, onAddMore, label }: {
  name: string; imageUrl?: string; onAddMore: () => void; label: string
}) {
  return (
    <div className="flex flex-col items-center text-center py-12">
      <div className="w-20 h-20 rounded-full bg-green-600/20 border-2 border-green-500 flex items-center justify-center text-4xl mb-6">✅</div>
      <h2 className="text-xl font-semibold mb-2">{label}</h2>
      {imageUrl && (
        <div className="my-4">
          <img src={imageUrl} alt={name} className="h-24 mx-auto rounded-xl object-contain bg-white/5 px-3 py-2" />
          <p className="text-xs text-green-400 mt-2">Photo uploaded ✅</p>
        </div>
      )}
      <p className="text-white/40 text-sm mb-8">{name}</p>
      <div className="flex gap-3 w-full">
        <button onClick={onAddMore} className="flex-1 py-3 rounded-xl bg-green-600 hover:bg-green-500 font-semibold transition-colors">
          + Aur Karo
        </button>
        <a href="/" className="flex-1 py-3 rounded-xl border border-white/20 hover:bg-white/5 text-sm font-medium text-center transition-colors">
          Chat pe Jao
        </a>
      </div>
    </div>
  )
}

// ── Spinner ───────────────────────────────────────────────────────────────────
function Spinner({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin mb-6" />
      <h2 className="text-lg font-semibold mb-2">{text}</h2>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── MODE 1: AI Product Upload ─────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════
function AiUploadMode({ onHome }: { onHome: () => void }) {
  const [stage, setStage]             = useState<Stage>('step1')
  const [productImage, setProductImage] = useState<string | null>(null)
  const [productMime, setProductMime] = useState('image/jpeg')
  const [productPreview, setProductPreview] = useState<string | null>(null)
  const [saltImage, setSaltImage]     = useState<string | null>(null)
  const [saltMime, setSaltMime]       = useState('image/jpeg')
  const [saltPreview, setSaltPreview] = useState<string | null>(null)
  const [product, setProduct]         = useState<ProductData>(EMPTY)
  const [error, setError]             = useState('')
  const [savedImageUrl, setSavedImageUrl] = useState('')

  const productRef = useRef<HTMLInputElement>(null)
  const saltRef    = useRef<HTMLInputElement>(null)

  const handleProductImg = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    if (file.name.toLowerCase().endsWith('.heic')) {
      setError('HEIC not supported. iPhone: Settings > Camera > Formats > Most Compatible'); return
    }
    const [b64, dataUrl] = await Promise.all([toBase64(file), toDataUrl(file)])
    setProductImage(b64); setProductMime(file.type)
    setProductPreview(dataUrl)
    setError('')
  }

  const handleSaltImg = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    const [b64, dataUrl] = await Promise.all([toBase64(file), toDataUrl(file)])
    setSaltImage(b64); setSaltMime(file.type); setSaltPreview(dataUrl)
  }

  const handleExtract = async () => {
    if (!productImage) { setError('Product ki photo upload karein'); return }
    setStage('extracting'); setError('')
    try {
      const res  = await fetch('/api/extract-product', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productImageBase64: productImage, saltImageBase64: saltImage, productMimeType: productMime, saltMimeType: saltMime })
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      setProduct({ ...EMPTY, ...data.data, image_url: '' })
      setStage('review')
    } catch(e) { setError(String(e)); setStage('error') }
  }

  const handleSave = async () => {
    if (!product.product_name) { setError('Product name required'); return }
    setStage('saving')
    try {
      // Upload the product photo from step 1 automatically
      let imageUrl = ''
      if (productImage) {
        const enhanced = productPreview ? await enhanceImage(productPreview) : null
        const b64  = enhanced ? enhanced.split(',')[1] : productImage
        const mime = enhanced ? 'image/jpeg' : productMime
        imageUrl   = (await uploadToStorage(b64, mime, product.product_name)) ?? ''
      }
      const res  = await fetch('/api/save-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-secret': process.env.NEXT_PUBLIC_ADMIN_SECRET ?? '' },
        body: JSON.stringify({ ...product, image_url: imageUrl })
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setSavedImageUrl(imageUrl)
      setStage('done')
    } catch(e) { setError(String(e)); setStage('error') }
  }

  const reset = () => {
    setStage('step1'); setProductImage(null); setProductMime('image/jpeg')
    setProductPreview(null); setSaltImage(null); setSaltPreview(null)
    setProduct(EMPTY); setError(''); setSavedImageUrl('')
  }

  const steps = ['Photo', 'Reading', 'Review', 'Saving', 'Done']
  const stepIdx = { step1:0, extracting:1, review:2, saving:3, done:4, error:0 }

  return (
    <div>
      {/* Progress */}
      <div className="flex items-center gap-2 mb-8 text-xs overflow-x-auto pb-1">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center gap-2 flex-shrink-0">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center font-medium
              ${stepIdx[stage] === i ? 'bg-green-600 text-white' : stepIdx[stage] > i ? 'bg-green-900 text-green-300' : 'bg-white/10 text-white/30'}`}>
              {i+1}
            </div>
            <span className={stepIdx[stage] === i ? 'text-white' : 'text-white/30'}>{s}</span>
            {i < steps.length-1 && <div className="w-5 h-px bg-white/10" />}
          </div>
        ))}
      </div>

      {stage === 'step1' && (
        <div className="space-y-5">
          <div>
            <h2 className="text-lg font-semibold mb-1">Product Photos Upload Karein</h2>
            <p className="text-white/40 text-sm">AI product name, salt, packaging extract karega — same photo product image ban jaegi</p>
          </div>

          {/* Product photo */}
          <div onClick={() => productRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-5 cursor-pointer transition-colors text-center
              ${productPreview ? 'border-green-600 bg-green-900/20' : 'border-white/20 hover:border-white/40'}`}>
            <input ref={productRef} type="file" accept="image/*" capture="environment" onChange={handleProductImg} className="hidden" />
            {productPreview ? (
              <div>
                <img src={productPreview} alt="Product" className="max-h-36 mx-auto rounded-lg object-contain mb-2" />
                <p className="text-green-400 text-sm">✅ Product photo — yahi product image banega · tap to change</p>
              </div>
            ) : (
              <div>
                <div className="text-3xl mb-2">📦</div>
                <p className="font-medium mb-1">Product Label Photo *</p>
                <p className="text-white/40 text-sm">Name, packing clearly dikhni chahiye</p>
                <p className="text-white/30 text-xs mt-1">Yahi photo automatically product image banega</p>
              </div>
            )}
          </div>

          {/* Salt photo */}
          <div onClick={() => saltRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-5 cursor-pointer transition-colors text-center
              ${saltPreview ? 'border-green-600 bg-green-900/20' : 'border-white/20 hover:border-white/40'}`}>
            <input ref={saltRef} type="file" accept="image/*" capture="environment" onChange={handleSaltImg} className="hidden" />
            {saltPreview ? (
              <div>
                <img src={saltPreview} alt="Salt" className="max-h-28 mx-auto rounded-lg object-contain mb-2" />
                <p className="text-green-400 text-sm">✅ Ingredient photo · tap to change</p>
              </div>
            ) : (
              <div>
                <div className="text-3xl mb-2">🧪</div>
                <p className="font-medium mb-1">Salt/Ingredient Photo <span className="text-white/30">(optional)</span></p>
                <p className="text-white/40 text-sm">Composition list ki photo</p>
              </div>
            )}
          </div>

          {error && <p className="text-red-400 text-sm bg-red-900/20 px-4 py-2 rounded-lg">{error}</p>}

          <button onClick={handleExtract} disabled={!productImage}
            className="w-full py-3 rounded-xl bg-green-600 hover:bg-green-500 disabled:opacity-40 font-semibold transition-colors">
            🤖 AI se Extract Karein
          </button>
          <button onClick={onHome} className="w-full py-2 text-sm text-white/40 hover:text-white transition-colors">← Back</button>
        </div>
      )}

      {stage === 'extracting' && <Spinner text="AI product padh raha hai..." />}

      {stage === 'review' && (
        <ReviewForm product={product} setProduct={setProduct}
          onSave={handleSave} onBack={reset} error={error}
          imagePreview={productPreview} isManual={false} />
      )}

      {stage === 'saving' && <Spinner text="Saving + photo upload ho rahi hai..." />}

      {stage === 'done' && (
        <DoneScreen name={product.product_name} imageUrl={savedImageUrl}
          onAddMore={reset} label="Product save ho gaya!" />
      )}

      {stage === 'error' && (
        <div className="text-center py-12">
          <div className="text-5xl mb-4">❌</div>
          <p className="text-red-400 text-sm bg-red-900/20 px-4 py-3 rounded-lg mb-6">{error}</p>
          <button onClick={reset} className="px-6 py-3 rounded-xl bg-green-600 hover:bg-green-500 font-semibold">Dobara Try Karein</button>
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── MODE 2: Manual Product Upload ────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════
function ManualUploadMode({ onHome }: { onHome: () => void }) {
  const [stage, setStage]           = useState<Stage>('step1')
  const [name, setName]             = useState('')
  const [salt, setSalt]             = useState('')
  const [product, setProduct]       = useState<ProductData>(EMPTY)
  const [error, setError]           = useState('')
  const [savedImageUrl, setSavedImageUrl] = useState('')
  const [imagePreview, setImagePreview]   = useState<string | null>(null)
  const [imageBase64, setImageBase64]     = useState<string | null>(null)
  const [imageMime, setImageMime]         = useState('image/jpeg')
  const imgRef = useRef<HTMLInputElement>(null)

  const handleImg = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    const [b64, dataUrl] = await Promise.all([toBase64(file), toDataUrl(file)])
    setImageBase64(b64); setImageMime(file.type); setImagePreview(dataUrl)
  }

  const handleNext = () => {
    if (!name.trim()) { setError('Product name required'); return }
    if (!salt.trim()) { setError('Salt/composition required'); return }
    setProduct({ ...EMPTY, product_name: name.trim(), salt_ingredient: salt.trim() })
    setError('')
    setStage('review')
  }

  const handleSave = async () => {
    if (!product.product_name) return
    setStage('saving')
    try {
      let imageUrl = ''
      if (imageBase64) {
        const enhanced = imagePreview ? await enhanceImage(imagePreview) : null
        const b64  = enhanced ? enhanced.split(',')[1] : imageBase64
        const mime = enhanced ? 'image/jpeg' : imageMime
        imageUrl   = (await uploadToStorage(b64, mime, product.product_name)) ?? ''
      }
      const res  = await fetch('/api/save-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-secret': process.env.NEXT_PUBLIC_ADMIN_SECRET ?? '' },
        body: JSON.stringify({ ...product, image_url: imageUrl })
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setSavedImageUrl(imageUrl)
      setStage('done')
    } catch(e) { setError(String(e)); setStage('error') }
  }

  const reset = () => {
    setStage('step1'); setName(''); setSalt(''); setProduct(EMPTY)
    setError(''); setSavedImageUrl(''); setImagePreview(null)
    setImageBase64(null)
  }

  return (
    <div>
      {/* Progress */}
      <div className="flex items-center gap-2 mb-8 text-xs">
        {['Details','Review','Saving','Done'].map((s,i) => {
          const cur = { step1:0, review:1, saving:2, done:3, error:0, extracting:0 }[stage]
          return (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center font-medium
                ${cur===i ? 'bg-green-600 text-white' : cur>i ? 'bg-green-900 text-green-300' : 'bg-white/10 text-white/30'}`}>
                {i+1}
              </div>
              <span className={cur===i ? 'text-white' : 'text-white/30'}>{s}</span>
              {i < 3 && <div className="w-5 h-px bg-white/10" />}
            </div>
          )
        })}
      </div>

      {stage === 'step1' && (
        <div className="space-y-5">
          <div>
            <h2 className="text-lg font-semibold mb-1">Product Details</h2>
            <p className="text-white/40 text-sm">Sirf naam aur salt chahiye — baaki AI bharega</p>
          </div>

          <div className="bg-white/5 rounded-xl p-4 space-y-4 border border-white/10">
            <div>
              <label className="text-xs text-white/50 mb-1 block">Product Name *</label>
              <input value={name} onChange={e => { setName(e.target.value); setError('') }}
                placeholder="e.g. Wormi Stop" autoFocus
                className="w-full bg-[#2f2f2f] border border-white/10 rounded-lg px-3 py-3
                  text-base text-white placeholder-white/25 focus:outline-none focus:border-green-500" />
            </div>
            <div>
              <label className="text-xs text-white/50 mb-1 block">Salt / Composition *</label>
              <input value={salt} onChange={e => { setSalt(e.target.value); setError('') }}
                placeholder="e.g. Albendazole 2500mg"
                className="w-full bg-[#2f2f2f] border border-white/10 rounded-lg px-3 py-3
                  text-base text-white placeholder-white/25 focus:outline-none focus:border-green-500" />
            </div>
          </div>

          {/* Optional image */}
          <div onClick={() => imgRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-4 cursor-pointer transition-colors text-center
              ${imagePreview ? 'border-green-600 bg-green-900/20' : 'border-white/20 hover:border-white/40'}`}>
            <input ref={imgRef} type="file" accept="image/*" capture="environment" onChange={handleImg} className="hidden" />
            {imagePreview ? (
              <div className="flex items-center gap-3 justify-center">
                <img src={imagePreview} alt="Product" className="h-12 rounded-lg object-contain" />
                <p className="text-green-400 text-sm">✅ Photo added · tap to change</p>
              </div>
            ) : (
              <p className="text-white/40 text-sm">📷 Product photo add karein (optional)</p>
            )}
          </div>

          {error && <p className="text-red-400 text-sm bg-red-900/20 px-4 py-2 rounded-lg">{error}</p>}

          <button onClick={handleNext}
            className="w-full py-3 rounded-xl bg-green-600 hover:bg-green-500 font-semibold transition-colors">
            Aage Badhein →
          </button>
          <button onClick={onHome} className="w-full py-2 text-sm text-white/40 hover:text-white transition-colors">← Back</button>
        </div>
      )}

      {stage === 'review' && (
        <ReviewForm product={product} setProduct={setProduct}
          onSave={handleSave} onBack={() => setStage('step1')} error={error}
          imagePreview={imagePreview} isManual={true} />
      )}

      {stage === 'saving' && <Spinner text="Save ho raha hai..." />}

      {stage === 'done' && (
        <DoneScreen name={product.product_name} imageUrl={savedImageUrl}
          onAddMore={reset} label="Product save ho gaya!" />
      )}

      {stage === 'error' && (
        <div className="text-center py-12">
          <div className="text-5xl mb-4">❌</div>
          <p className="text-red-400 text-sm bg-red-900/20 px-4 py-3 rounded-lg mb-6">{error}</p>
          <button onClick={reset} className="px-6 py-3 rounded-xl bg-green-600 hover:bg-green-500 font-semibold">Dobara Try Karein</button>
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── MODE 3: Add Image to Existing Product ────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════
function AddImageMode({ onHome }: { onHome: () => void }) {
  const [imgStage, setImgStage]       = useState<ImageStage>('select')
  const [allProducts, setAllProducts] = useState<{ id: number; product_name: string; image_url: string }[]>([])
  const [search, setSearch]           = useState('')
  const [selected, setSelected]       = useState<{ id: number; product_name: string } | null>(null)
  const [loading, setLoading]         = useState(true)
  const [preview, setPreview]         = useState<string | null>(null)
  const [enhanced, setEnhanced]       = useState<string | null>(null)
  const [base64, setBase64]           = useState<string | null>(null)
  const [mime, setMime]               = useState('image/jpeg')
  const [processing, setProcessing]   = useState(false)
  const [error, setError]             = useState('')
  const imgRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const url   = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key   = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !key) return
    const supabase = createClient(url, key)
    supabase
      .from('products_enriched')
      .select('id, product_name, image_url')
      .order('product_name', { ascending: true })
      .limit(500)
      .then(({ data }) => {
        setAllProducts((data ?? []) as any)
        setLoading(false)
      })
  }, [])

  const filtered = allProducts.filter(p =>
    p.product_name.toLowerCase().includes(search.toLowerCase())
  )

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    setProcessing(true)
    const [b64, dataUrl] = await Promise.all([toBase64(file), toDataUrl(file)])
    setBase64(b64); setMime(file.type); setPreview(dataUrl)
    // Auto-enhance
    const enh = await enhanceImage(dataUrl)
    setEnhanced(enh)
    setProcessing(false)
    setImgStage('preview')
  }

  const handleSave = async () => {
    if (!selected || !enhanced) return
    setImgStage('saving')
    try {
      const b64Enh  = enhanced.split(',')[1]
      const imageUrl = await uploadToStorage(b64Enh, 'image/jpeg', selected.product_name)
      if (!imageUrl) throw new Error('Upload failed')

      // Update product in Supabase
      const url   = process.env.NEXT_PUBLIC_SUPABASE_URL
      const key   = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      if (!url || !key) throw new Error('Supabase not configured')
      const supabase = createClient(url, key)
      const { error: dbErr } = await supabase
        .from('products_enriched')
        .update({ image_url: imageUrl })
        .eq('id', selected.id)
      if (dbErr) throw new Error(dbErr.message)

      setImgStage('done')
    } catch(e) { setError(String(e)); setImgStage('error') }
  }

  const reset = () => {
    setImgStage('select'); setSelected(null); setSearch('')
    setPreview(null); setEnhanced(null); setBase64(null)
    setError('')
  }

  return (
    <div>
      {/* Progress */}
      <div className="flex items-center gap-2 mb-8 text-xs">
        {['Select','Upload','Preview','Done'].map((s,i) => {
          const cur = { select:0, upload:1, preview:2, saving:2, done:3, error:0 }[imgStage]
          return (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center font-medium
                ${cur===i ? 'bg-green-600 text-white' : cur>i ? 'bg-green-900 text-green-300' : 'bg-white/10 text-white/30'}`}>
                {i+1}
              </div>
              <span className={cur===i ? 'text-white' : 'text-white/30'}>{s}</span>
              {i < 3 && <div className="w-5 h-px bg-white/10" />}
            </div>
          )
        })}
      </div>

      {/* STEP: SELECT PRODUCT */}
      {imgStage === 'select' && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold mb-1">Product Select Karein</h2>
            <p className="text-white/40 text-sm">Jis product ki photo add karni hai use dhoondein</p>
          </div>

          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Product naam type karein..."
              className="w-full bg-[#2f2f2f] border border-white/10 rounded-xl pl-10 pr-4 py-3
                text-sm text-white placeholder-white/25 focus:outline-none focus:border-green-500" />
          </div>

          {loading ? (
            <div className="text-center py-8 text-white/40 text-sm">Products load ho rahe hain...</div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {filtered.length === 0 && (
                <div className="text-center py-8 text-white/40 text-sm">Koi product nahi mila</div>
              )}
              {filtered.map(p => (
                <button key={p.id} onClick={() => { setSelected({ id: p.id, product_name: p.product_name }); setImgStage('upload') }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5
                    border border-white/10 hover:border-green-600 hover:bg-green-900/20 transition-colors text-left">
                  {p.image_url ? (
                    <img src={p.image_url} alt={p.product_name} className="w-10 h-10 rounded-lg object-contain bg-white/10 flex-shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0 text-lg">📦</div>
                  )}
                  <div>
                    <p className="text-sm font-medium text-white">{p.product_name}</p>
                    <p className="text-xs text-white/30 mt-0.5">{p.image_url ? '✅ Photo hai — replace karein' : '📷 Photo nahi hai'}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
          <button onClick={onHome} className="w-full py-2 text-sm text-white/40 hover:text-white transition-colors">← Back</button>
        </div>
      )}

      {/* STEP: UPLOAD */}
      {imgStage === 'upload' && selected && (
        <div className="space-y-5">
          <div>
            <h2 className="text-lg font-semibold mb-1">{selected.product_name}</h2>
            <p className="text-white/40 text-sm">Product ki photo lo — AI automatically enhance karega</p>
          </div>

          <div onClick={() => imgRef.current?.click()}
            className="border-2 border-dashed border-white/20 hover:border-white/40 rounded-xl p-8 cursor-pointer transition-colors text-center">
            <input ref={imgRef} type="file" accept="image/*" capture="environment" onChange={handleFile} className="hidden" />
            <div className="text-4xl mb-3">📷</div>
            <p className="font-medium mb-1">Photo lo ya upload karo</p>
            <p className="text-white/40 text-sm">AI automatically brightness, contrast enhance karega</p>
          </div>

          {processing && <Spinner text="AI photo enhance kar raha hai..." />}

          <button onClick={() => setImgStage('select')}
            className="w-full py-2 text-sm text-white/40 hover:text-white transition-colors">← Back</button>
        </div>
      )}

      {/* STEP: PREVIEW */}
      {imgStage === 'preview' && selected && enhanced && (
        <div className="space-y-5">
          <div>
            <h2 className="text-lg font-semibold mb-1">Preview</h2>
            <p className="text-white/40 text-sm">{selected.product_name}</p>
          </div>

          {/* Before / After */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/5 rounded-xl p-3 border border-white/10">
              <p className="text-xs text-white/40 mb-2 text-center">Original</p>
              <img src={preview!} alt="Original" className="w-full h-32 object-contain rounded-lg" />
            </div>
            <div className="bg-white/5 rounded-xl p-3 border border-green-900/50">
              <p className="text-xs text-green-400 mb-2 text-center">✨ Enhanced</p>
              <img src={enhanced} alt="Enhanced" className="w-full h-32 object-contain rounded-lg" />
            </div>
          </div>

          <p className="text-xs text-white/40 text-center">AI ne contrast, brightness aur saturation improve kiya hai</p>

          {error && <p className="text-red-400 text-sm bg-red-900/20 px-4 py-2 rounded-lg">{error}</p>}

          <div className="flex gap-3">
            <button onClick={() => setImgStage('upload')}
              className="flex-1 py-3 rounded-xl border border-white/20 hover:bg-white/5 text-sm font-medium transition-colors">
              Dobara Lo
            </button>
            <button onClick={handleSave}
              className="flex-1 py-3 rounded-xl bg-green-600 hover:bg-green-500 font-semibold transition-colors">
              ✅ Save Karo
            </button>
          </div>
        </div>
      )}

      {imgStage === 'saving' && <Spinner text="Photo upload aur save ho rahi hai..." />}

      {imgStage === 'done' && selected && (
        <DoneScreen name={selected.product_name} imageUrl={enhanced ?? undefined}
          onAddMore={reset} label="Photo save ho gayi!" />
      )}

      {imgStage === 'error' && (
        <div className="text-center py-12">
          <div className="text-5xl mb-4">❌</div>
          <p className="text-red-400 text-sm bg-red-900/20 px-4 py-3 rounded-lg mb-6">{error}</p>
          <button onClick={reset} className="px-6 py-3 rounded-xl bg-green-600 hover:bg-green-500 font-semibold">Dobara Try</button>
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── MAIN ADMIN PAGE ───────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════
export default function AdminPage() {
  const [unlocked, setUnlocked] = useState(false)
  const [mode, setMode]         = useState<AdminMode>('home')

  useEffect(() => { if (isAdminAuthenticated()) setUnlocked(true) }, [])

  if (!unlocked) {
    return (
      <PasswordGate onUnlock={(pw) => {
        const ok = pw === (process.env.ADMIN_PASSWORD || 'madvetkaboss')
        if (ok) { setStoredAdminToken(generateAdminToken()); setUnlocked(true) }
        return ok
      }} />
    )
  }

  return (
    <div className="min-h-screen bg-[#212121] text-white">
      {/* Header */}
      <div className="border-b border-white/10 px-6 py-4 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center font-bold text-sm">M</div>
        <div>
          <h1 className="font-semibold">Madvet Admin</h1>
          <p className="text-xs text-white/40">Product Management</p>
        </div>
        {mode !== 'home' && (
          <button onClick={() => setMode('home')} className="ml-auto text-xs text-white/40 hover:text-white transition-colors">
            ← Home
          </button>
        )}
        {mode === 'home' && (
          <a href="/" className="ml-auto text-xs text-white/40 hover:text-white transition-colors">← Chat</a>
        )}
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">

        {/* HOME — 3 mode cards */}
        {mode === 'home' && (
          <div className="space-y-4">
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-1">Kya karna hai?</h2>
              <p className="text-white/40 text-sm">Teen options available hain</p>
            </div>

            {/* Card 1 */}
            <button onClick={() => setMode('ai')}
              className="w-full p-5 rounded-2xl bg-white/5 border border-white/10
                hover:border-green-600 hover:bg-green-900/20 transition-colors text-left group">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-green-600/20 border border-green-600/30
                  flex items-center justify-center text-2xl flex-shrink-0 group-hover:bg-green-600/30 transition-colors">
                  🤖
                </div>
                <div>
                  <p className="font-semibold text-base mb-1">AI se Product Upload</p>
                  <p className="text-sm text-white/50">Product ka photo lo → AI automatically naam, salt, category sab extract karega → same photo product image banega</p>
                </div>
              </div>
            </button>

            {/* Card 2 */}
            <button onClick={() => setMode('manual')}
              className="w-full p-5 rounded-2xl bg-white/5 border border-white/10
                hover:border-green-600 hover:bg-green-900/20 transition-colors text-left group">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-600/20 border border-blue-600/30
                  flex items-center justify-center text-2xl flex-shrink-0 group-hover:bg-blue-600/30 transition-colors">
                  ✏️
                </div>
                <div>
                  <p className="font-semibold text-base mb-1">Manual Product Upload</p>
                  <p className="text-sm text-white/50">Sirf naam aur salt daalo → baaki details review screen pe fill karo → save</p>
                </div>
              </div>
            </button>

            {/* Card 3 */}
            <button onClick={() => setMode('image')}
              className="w-full p-5 rounded-2xl bg-white/5 border border-white/10
                hover:border-green-600 hover:bg-green-900/20 transition-colors text-left group">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-orange-600/20 border border-orange-600/30
                  flex items-center justify-center text-2xl flex-shrink-0 group-hover:bg-orange-600/30 transition-colors">
                  📸
                </div>
                <div>
                  <p className="font-semibold text-base mb-1">Existing Product ki Photo Add Karo</p>
                  <p className="text-sm text-white/50">Purane products ki photo add karo — product dhoondo → photo lo → AI enhance karega → save</p>
                </div>
              </div>
            </button>
          </div>
        )}

        {mode === 'ai'     && <AiUploadMode     onHome={() => setMode('home')} />}
        {mode === 'manual' && <ManualUploadMode  onHome={() => setMode('home')} />}
        {mode === 'image'  && <AddImageMode      onHome={() => setMode('home')} />}
      </div>
    </div>
  )
}
