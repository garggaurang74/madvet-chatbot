'use client'
import { useState, useRef, useEffect } from 'react'
import { generateAdminToken, isAdminAuthenticated, setStoredAdminToken } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'

// ── Types ─────────────────────────────────────────────────────────────────────
type ProductData = {
  product_name: string; salt_ingredient: string; packaging: string
  description: string; category: string; species: string
  indication: string; aliases: string; dosage: string
  usp_benefits: string; image_url: string; formulation: string
}
type AdminMode  = 'home' | 'add' | 'image' | 'video'
type AddStage   = 'step1' | 'enriching' | 'review' | 'saving' | 'done' | 'error'
type ImageStage = 'select' | 'upload' | 'preview' | 'saving' | 'done' | 'error'

const EMPTY: ProductData = {
  product_name:'', salt_ingredient:'', packaging:'', description:'',
  category:'', species:'', indication:'', aliases:'', dosage:'',
  usp_benefits:'', image_url:'', formulation:''
}
// Base lists — new values from DB are merged in dynamically at runtime
const CATEGORIES = [
  'Antibiotic','Anthelmintic / Antiparasitic','Ectoparasiticide',
  'Anti-inflammatory / Analgesic','Antihistamine','Reproductive Hormone',
  'Probiotic','Vitamin Supplement','Udder Care','Antidiarrheal','Dermatological',
]
const SPECIES_OPTIONS = ['Cattle','Buffalo','Sheep','Goat','Dog','Cat','Horse','Poultry']
const FORMULATION_OPTIONS = [
  'Bolus','Injection','Liquid','Tablet','Powder',
  'Spray','Gel / Ointment','Soap','Suspension','Pour-On','Other',
]

// Merge in any new categories/species/formulations that exist in DB but not in base lists
function mergeOptions(base: string[], fromDB: string[]): string[] {
  const s = new Set(base)
  return [...base, ...fromDB.filter(v => v && !s.has(v))]
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const toBase64  = (f: File): Promise<string> => new Promise((res,rej) => { const r=new FileReader(); r.onload=()=>res((r.result as string).split(',')[1]); r.onerror=rej; r.readAsDataURL(f) })
const toDataUrl = (f: File): Promise<string> => new Promise((res,rej) => { const r=new FileReader(); r.onload=()=>res(r.result as string); r.onerror=rej; r.readAsDataURL(f) })

// ─── Studio Enhancement ────────────────────────────────────────────────────────
// Crops to the product (removes excess background), brightens, boosts colour,
// places on a clean white-to-warm-cream radial gradient background.
// Works well with real-world photos taken against walls/floors.
async function enhanceImage(dataUrl: string): Promise<string> {
  return new Promise(res => {
    const img = new Image()
    img.onload = () => {
      const maxW = 1200
      const scale = img.width > maxW ? maxW / img.width : 1
      const W = Math.round(img.width  * scale)
      const H = Math.round(img.height * scale)

      // ── 1. Draw source at normalised size ──────────────────────────────────
      const src = document.createElement('canvas')
      src.width = W; src.height = H
      const sx = src.getContext('2d')!
      sx.drawImage(img, 0, 0, W, H)
      const d = sx.getImageData(0, 0, W, H).data

      // ── 2. Auto-crop: find tightest bounding box of non-background pixels ──
      // Sample background colour from the 4 true corners (avg)
      const sampleCorner = (cx: number, cy: number) => {
        const i = (cy * W + cx) * 4
        return [d[i], d[i+1], d[i+2]]
      }
      const corners = [sampleCorner(0,0), sampleCorner(W-1,0), sampleCorner(0,H-1), sampleCorner(W-1,H-1)]
      const bgR = corners.reduce((a,c)=>a+c[0],0)/4
      const bgG = corners.reduce((a,c)=>a+c[1],0)/4
      const bgB = corners.reduce((a,c)=>a+c[2],0)/4
      const THRESH = 38  // colour distance to count as "not background"

      let minX = W, maxX = 0, minY = H, maxY = 0
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          const i = (y * W + x) * 4
          const dr = d[i]-bgR, dg = d[i+1]-bgG, db = d[i+2]-bgB
          if (Math.sqrt(dr*dr+dg*dg+db*db) > THRESH) {
            if (x < minX) minX = x; if (x > maxX) maxX = x
            if (y < minY) minY = y; if (y > maxY) maxY = y
          }
        }
      }
      // Fallback to full image if crop detection fails
      if (maxX <= minX || maxY <= minY) { minX=0; minY=0; maxX=W-1; maxY=H-1 }

      // Add generous padding around detected product area
      // Add generous padding — 20% of detected product size on each side
      const PAD_FRAC = 0.20
      const pw = Math.round((maxX - minX) * PAD_FRAC)
      const ph = Math.round((maxY - minY) * PAD_FRAC)
      const cropX = Math.max(0, minX - pw)
      const cropY = Math.max(0, minY - ph)
      const cropW = Math.min(W, maxX + pw + pw) - cropX
      const cropH = Math.min(H, maxY + ph + ph) - cropY

      // ── 3. Output canvas — square with clean studio background ────────────
      const SIZE = 900  // fixed square output
      const out = document.createElement('canvas')
      out.width = SIZE; out.height = SIZE
      const ctx = out.getContext('2d')!

      // Clean white → warm cream radial gradient (always light, professional)
      const bg = ctx.createRadialGradient(SIZE*0.5, SIZE*0.42, 0, SIZE*0.5, SIZE*0.5, SIZE*0.75)
      bg.addColorStop(0,   '#ffffff')
      bg.addColorStop(0.5, '#f8f5f0')
      bg.addColorStop(1,   '#ede8e0')
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, SIZE, SIZE)

      // ── 4. Fit product inside canvas with 15% margin on each side ─────────
      const MARGIN = SIZE * 0.15
      const availW = SIZE - MARGIN * 2
      const availH = SIZE - MARGIN * 2
      const scaleToFit = Math.min(availW / cropW, availH / cropH)
      const drawW = Math.round(cropW * scaleToFit)
      const drawH = Math.round(cropH * scaleToFit)
      const drawX = Math.round((SIZE - drawW) / 2)
      const drawY = Math.round((SIZE - drawH) / 2)

      // Soft drop shadow
      ctx.shadowColor   = 'rgba(0,0,0,0.15)'
      ctx.shadowBlur    = 24
      ctx.shadowOffsetY = 8
      ctx.shadowOffsetX = 0

      // Brightness + contrast + saturation boost
      ctx.filter = 'brightness(1.10) contrast(1.12) saturate(1.30)'
      ctx.drawImage(src, cropX, cropY, cropW, cropH, drawX, drawY, drawW, drawH)
      ctx.filter = 'none'
      ctx.shadowColor = 'transparent'

      res(out.toDataURL('image/jpeg', 0.92))
    }
    img.src = dataUrl
  })
}


async function processImageForStudio(dataUrl: string): Promise<string> {
  return enhanceImage(dataUrl)
}


async function uploadToStorage(base64: string, mime: string, name: string): Promise<string | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null
  try {
    const sb   = createClient(url, key)
    const ext  = mime.includes('png') ? 'png' : 'jpg'
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')
    const file = `${slug}.${ext}`
    const bytes = atob(base64); const arr = new Uint8Array(bytes.length)
    for (let i=0;i<bytes.length;i++) arr[i]=bytes.charCodeAt(i)
    const { error } = await sb.storage.from('product-images').upload(file, new Blob([arr],{type:mime}), {contentType:mime, upsert:true})
    if (error) {
      console.error('[Storage] upload error:', error.message, error)
      throw new Error(`Storage: ${error.message}`)
    }
    const publicUrl = sb.storage.from('product-images').getPublicUrl(file).data?.publicUrl
    // Append a timestamp so browsers don't serve a stale cached version after an image update
    return publicUrl ? `${publicUrl}?t=${Date.now()}` : null
  } catch(e) { console.error('[Storage]',e); throw e }
}

// ── Password Gate ─────────────────────────────────────────────────────────────
function PasswordGate({ onUnlock }: { onUnlock: (p:string) => boolean }) {
  const [pw, setPw] = useState(''); const [err, setErr] = useState(false)
  return (
    <div className="min-h-screen bg-[#212121] text-white flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-[#2f2f2f] rounded-2xl p-8 border border-white/10">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full overflow-hidden mx-auto mb-4 flex items-center justify-center bg-black"><img src="/madvet-icon.png" alt="Madvet" className="w-full h-full object-cover" /></div>
          <h1 className="text-2xl font-bold mb-1">Madvet Admin</h1>
          <p className="text-white/50 text-sm">Product Management</p>
        </div>
        <form onSubmit={e=>{e.preventDefault(); if(!onUnlock(pw)) setErr(true)}} className="space-y-4">
          <input type="password" value={pw} onChange={e=>{setPw(e.target.value);setErr(false)}} placeholder="Password" autoFocus
            className={`w-full px-4 py-3 bg-[#1f1f1f] border rounded-lg text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-green-500 ${err?'border-red-500':'border-white/20'}`} />
          {err && <p className="text-red-400 text-sm text-center">Galat password!</p>}
          <button type="submit" className="w-full py-3 rounded-lg bg-green-600 hover:bg-green-500 font-semibold transition-colors">Unlock</button>
        </form>
      </div>
    </div>
  )
}

// ── Spinner ───────────────────────────────────────────────────────────────────
function Spinner({ text, sub }: { text: string; sub?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin mb-6" />
      <h2 className="text-lg font-semibold mb-2">{text}</h2>
      {sub && <p className="text-white/40 text-sm">{sub}</p>}
    </div>
  )
}

// ── Done Screen ───────────────────────────────────────────────────────────────
function DoneScreen({ name, imageUrl, onAddMore, label }: { name:string; imageUrl?:string; onAddMore:()=>void; label:string }) {
  return (
    <div className="flex flex-col items-center text-center py-12">
      <div className="w-20 h-20 rounded-full bg-green-600/20 border-2 border-green-500 flex items-center justify-center text-4xl mb-6">✅</div>
      <h2 className="text-xl font-semibold mb-2">{label}</h2>
      {imageUrl && <div className="my-4"><img src={imageUrl} alt={name} className="h-24 mx-auto rounded-xl object-contain bg-white/5 px-3 py-2" /><p className="text-xs text-green-400 mt-2">Photo uploaded ✅</p></div>}
      <p className="text-white/40 text-sm mb-8">{name}</p>
      <div className="flex gap-3 w-full">
        <button onClick={onAddMore} className="flex-1 py-3 rounded-xl bg-green-600 hover:bg-green-500 font-semibold transition-colors">+ Aur Karo</button>
        <a href="/" className="flex-1 py-3 rounded-xl border border-white/20 hover:bg-white/5 text-sm font-medium text-center transition-colors">Chat pe Jao</a>
      </div>
    </div>
  )
}

// ── Review Form ───────────────────────────────────────────────────────────────
function ReviewForm({ product, setProduct, onSave, onBack, error, imagePreview }: {
  product: ProductData; setProduct: (p:ProductData)=>void
  onSave:()=>void; onBack:()=>void; error:string; imagePreview:string|null
}) {
  const u = (f: keyof ProductData, v: string) => setProduct({...product, [f]:v})
  const toggleSp = (s:string) => {
    const cur = product.species.split(',').map(x=>x.trim()).filter(Boolean)
    u('species', (cur.includes(s)?cur.filter(x=>x!==s):[...cur,s]).join(', '))
  }
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold mb-1">Review & Edit</h2>
        <p className="text-white/40 text-sm">AI ne sab fill kar diya — check karein ya edit karein</p>
      </div>

      {imagePreview && (
        <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/10">
          <img src={imagePreview} alt="Product" className="w-14 h-14 rounded-lg object-contain bg-white/10 p-1 flex-shrink-0" />
          <div><p className="text-xs text-green-400 font-medium">✅ Product photo ready</p><p className="text-xs text-white/30 mt-0.5">Save hone par automatically upload hogi</p></div>
        </div>
      )}

      {/* Core fields */}
      <div className="bg-white/5 rounded-xl p-4 space-y-4 border border-white/10">
        <p className="text-xs text-green-400 font-semibold uppercase tracking-wide">📋 Product Info</p>
        {([
          {label:'Product Name *',  field:'product_name',   ph:'e.g. Wormi Stop'},
          {label:'Salt / Composition *', field:'salt_ingredient', ph:'e.g. Albendazole 2500mg'},
          {label:'Packaging',       field:'packaging',      ph:'e.g. Bolus 1x4'},
          {label:'Dosage',          field:'dosage',         ph:'e.g. 1 bolus per 100kg'},
        ] as const).map(({label,field,ph}) => (
          <div key={field}>
            <label className="text-xs text-white/50 mb-1 block">{label}</label>
            <input value={product[field]} onChange={e=>u(field,e.target.value)} placeholder={ph}
              className="w-full bg-[#2f2f2f] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-green-500" />
          </div>
        ))}
      </div>

      {/* AI-enriched fields */}
      <div className="bg-white/5 rounded-xl p-4 space-y-4 border border-white/10">
        <p className="text-xs text-green-400 font-semibold uppercase tracking-wide">🤖 AI se Populate Kiya</p>
        <div>
          <label className="text-xs text-white/50 mb-2 block">Category</label>
          <select value={product.category} onChange={e=>u('category',e.target.value)}
            className="w-full bg-[#2f2f2f] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-green-500">
            <option value="">Select category</option>
            {((window as any).__madvetCats || CATEGORIES).map((c:string)=><option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-white/50 mb-2 block">Species</label>
          <div className="flex flex-wrap gap-2">
            {SPECIES_OPTIONS.map(s=>(
              <button key={s} onClick={()=>toggleSp(s)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${product.species.includes(s)?'bg-green-600 text-white':'bg-[#2f2f2f] text-white/50 border border-white/10 hover:border-white/30'}`}>
                {s}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs text-white/50 mb-2 block">Formulation / Form</label>
          <select value={product.formulation} onChange={e=>u('formulation',e.target.value)}
            className="w-full bg-[#2f2f2f] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-green-500">
            <option value="">Select form</option>
            {((window as any).__madvetForms || FORMULATION_OPTIONS).map((f:string)=><option key={f} value={f}>{f}</option>)}
          </select>
        </div>
        {([
          {label:'Indication',   field:'indication',   ph:'Conditions this treats (English + Hindi)', rows:3},
          {label:'Aliases',      field:'aliases',      ph:'How farmers ask for it', rows:3},
          {label:'Description',  field:'description',  ph:'Product description', rows:2},
          {label:'USP/Benefits', field:'usp_benefits', ph:'Key benefits', rows:2},
        ] as const).map(({label,field,ph,rows})=>(
          <div key={field}>
            <label className="text-xs text-white/50 mb-1 block">{label}</label>
            <textarea value={product[field]} onChange={e=>u(field,e.target.value)} placeholder={ph} rows={rows}
              className="w-full bg-[#2f2f2f] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-green-500 resize-none" />
          </div>
        ))}
      </div>

      {error && <p className="text-red-400 text-sm bg-red-900/20 px-4 py-2 rounded-lg">{error}</p>}

      <div className="flex gap-3">
        <button onClick={onBack} className="flex-1 py-3 rounded-xl border border-white/20 hover:bg-white/5 text-sm font-medium transition-colors">← Back</button>
        <button onClick={onSave} disabled={!product.product_name || !product.salt_ingredient}
          className="flex-1 py-3 rounded-xl bg-green-600 hover:bg-green-500 disabled:opacity-40 font-semibold transition-colors">
          ✅ Save to Supabase
        </button>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── ADD PRODUCT — UNIFIED FLOW ────────────────────────────────────────────────
// Photo OR Type for name/salt — single flow, AI enriches all fields
// ═══════════════════════════════════════════════════════════════════════════════
function AddProductMode({ onHome }: { onHome: () => void }) {
  const [stage, setStage]             = useState<AddStage>('step1')
  const [name, setName]               = useState('')
  const [salt, setSalt]               = useState('')
  const [product, setProduct]         = useState<ProductData>(EMPTY)
  const [error, setError]             = useState('')
  const [savedImageUrl, setSavedImageUrl] = useState('')

  // Product photo (label photo — becomes product image)
  const [productB64, setProductB64]   = useState<string|null>(null)
  const [productMime, setProductMime] = useState('image/jpeg')
  const [productPreview, setProductPreview] = useState<string|null>(null)

  // Salt photo
  const [saltB64, setSaltB64]         = useState<string|null>(null)
  const [saltMime, setSaltMime]       = useState('image/jpeg')
  const [saltPreview, setSaltPreview] = useState<string|null>(null)

  // Extracting state text
  const [extractMsg, setExtractMsg]   = useState('')

  const productRef = useRef<HTMLInputElement>(null)
  const saltRef    = useRef<HTMLInputElement>(null)

  // Load dynamic categories/formulations from DB on mount
  useEffect(() => {
    if (typeof window === 'undefined') return
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !key) return
    createClient(url, key)
      .from('products_enriched').select('category,formulation').limit(500)
      .then(({ data }) => {
        if (!data) return
        const dbCats  = [...new Set(data.map((r:any) => r.category).filter(Boolean))]
        const dbForms = [...new Set(data.map((r:any) => r.formulation).filter(Boolean))]
        ;(window as any).__madvetCats  = mergeOptions(CATEGORIES, dbCats)
        ;(window as any).__madvetForms = mergeOptions(FORMULATION_OPTIONS, dbForms)
      })
  }, [])

  const handleProductPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    if (file.name.toLowerCase().endsWith('.heic')) { setError('HEIC not supported. iPhone: Settings > Camera > Formats > Most Compatible'); return }
    const [b64, dataUrl] = await Promise.all([toBase64(file), toDataUrl(file)])
    setProductB64(b64); setProductMime(file.type); setProductPreview(dataUrl)
    setError('')
    // Auto-extract name+salt+all fields from photo (include salt photo if already added)
    autoExtractFromPhoto(b64, file.type, saltB64, saltMime)
  }

  const handleSaltPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    const [b64, dataUrl] = await Promise.all([toBase64(file), toDataUrl(file)])
    setSaltB64(b64); setSaltMime(file.type); setSaltPreview(dataUrl)
  }

  // Called when product photo is taken — extracts all fields immediately
  const autoExtractFromPhoto = async (prodB64: string, prodMime: string, sB64: string|null, sMime: string) => {
    setStage('enriching')
    setExtractMsg('AI photo padh raha hai...')
    try {
      const res  = await fetch('/api/extract-product', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productImageBase64: prodB64, saltImageBase64: sB64, productMimeType: prodMime, saltMimeType: sMime })
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      const extracted = data.data
      setName(extracted.product_name || '')
      setSalt(extracted.salt_ingredient || '')
      setProduct({ ...EMPTY, ...extracted, image_url: '' })
      setStage('review')
    } catch(e) { setError(String(e)); setStage('error') }
  }

  // Called when user has typed name+salt and clicks "Fill with AI"
  const enrichFromText = async () => {
    if (!name.trim()) { setError('Product name required'); return }
    if (!salt.trim()) { setError('Salt/composition required'); return }
    setStage('enriching')
    setExtractMsg('AI details fill kar raha hai...')
    setError('')
    try {
      const res  = await fetch('/api/enrich-product', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_name: name.trim(), salt_ingredient: salt.trim() })
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      setProduct({ ...EMPTY, product_name: name.trim(), salt_ingredient: salt.trim(), ...data.data, image_url: '' })
      setStage('review')
    } catch(e) { setError(String(e)); setStage('error') }
  }

  const handleSave = async () => {
    if (!product.product_name) return
    setStage('saving')
    try {
      let imageUrl = ''
      if (productB64) {
        const enhanced = productPreview ? await processImageForStudio(productPreview) : null
        const b64  = enhanced ? enhanced.split(',')[1] : productB64
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
    setStage('step1'); setName(''); setSalt(''); setProduct(EMPTY); setError('')
    setProductB64(null); setProductPreview(null); setSaltB64(null); setSaltPreview(null)
    setSavedImageUrl('')
  }

  const steps = ['Details','AI Fill','Review','Done']
  const stepIdx: Record<AddStage, number> = { step1:0, enriching:1, review:2, saving:3, done:3, error:0 }

  return (
    <div>
      {/* Progress */}
      <div className="flex items-center gap-2 mb-8 text-xs overflow-x-auto pb-1">
        {steps.map((s,i) => (
          <div key={s} className="flex items-center gap-2 flex-shrink-0">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center font-medium
              ${stepIdx[stage]===i?'bg-green-600 text-white':stepIdx[stage]>i?'bg-green-900 text-green-300':'bg-white/10 text-white/30'}`}>
              {i+1}
            </div>
            <span className={stepIdx[stage]===i?'text-white':'text-white/30'}>{s}</span>
            {i<steps.length-1 && <div className="w-5 h-px bg-white/10"/>}
          </div>
        ))}
      </div>

      {/* STEP 1: Product Details */}
      {stage === 'step1' && (
        <div className="space-y-5">
          <div>
            <h2 className="text-lg font-semibold mb-1">Product Details</h2>
            <p className="text-white/40 text-sm">Type karein <span className="text-white/60">ya</span> photo lo — AI sab details fill kar dega</p>
          </div>

          {/* Product Name field + photo button */}
          <div className="bg-white/5 rounded-xl p-4 border border-white/10 space-y-3">
            <div>
              <label className="text-xs text-white/50 mb-1.5 block">Product Name *</label>
              <div className="flex gap-2">
                <input value={name} onChange={e=>{setName(e.target.value);setError('')}}
                  placeholder="e.g. Wormi Stop"
                  className="flex-1 bg-[#2f2f2f] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-green-500" />
                <button onClick={()=>productRef.current?.click()}
                  title="Product ka photo lo — AI automatically naam extract karega"
                  className={`w-11 h-10 rounded-lg border flex items-center justify-center flex-shrink-0 transition-colors text-lg
                    ${productPreview?'border-green-600 bg-green-900/30':'border-white/20 bg-white/5 hover:border-white/40'}`}>
                  {productPreview ? '✅' : '📷'}
                </button>
                <input ref={productRef} type="file" accept="image/*" onChange={handleProductPhoto} className="hidden" />
              </div>
              {productPreview && (
                <div className="flex items-center gap-2 mt-2">
                  <img src={productPreview} alt="" className="h-10 rounded object-contain bg-white/10" />
                  <p className="text-xs text-green-400">Photo liya — AI naam + sab details extract karega · tap 📷 to change</p>
                </div>
              )}
            </div>

            {/* Salt field + photo button */}
            <div>
              <label className="text-xs text-white/50 mb-1.5 block">Salt / Composition *</label>
              <div className="flex gap-2">
                <input value={salt} onChange={e=>{setSalt(e.target.value);setError('')}}
                  placeholder="e.g. Albendazole 2500mg"
                  className="flex-1 bg-[#2f2f2f] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-green-500" />
                <button onClick={()=>saltRef.current?.click()}
                  title="Ingredient list ki photo lo"
                  className={`w-11 h-10 rounded-lg border flex items-center justify-center flex-shrink-0 transition-colors text-lg
                    ${saltPreview?'border-green-600 bg-green-900/30':'border-white/20 bg-white/5 hover:border-white/40'}`}>
                  {saltPreview ? '✅' : '🧪'}
                </button>
                <input ref={saltRef} type="file" accept="image/*" onChange={handleSaltPhoto} className="hidden" />
              </div>
              {saltPreview && (
                <div className="flex items-center gap-2 mt-2">
                  <img src={saltPreview} alt="" className="h-10 rounded object-contain bg-white/10" />
                  <p className="text-xs text-green-400">Salt photo ready</p>
                </div>
              )}
            </div>
          </div>

          {/* How it works hint */}
          <div className="flex gap-3 text-xs text-white/40 bg-white/5 rounded-xl p-3 border border-white/10">
            <div className="flex-1">
              <p className="font-medium text-white/60 mb-1">📷 Photo liya?</p>
              <p>AI automatically naam, salt aur <strong className="text-white/60">saari details</strong> extract karega</p>
            </div>
            <div className="w-px bg-white/10" />
            <div className="flex-1">
              <p className="font-medium text-white/60 mb-1">✏️ Type kiya?</p>
              <p>Naam aur salt type karo, phir AI baaki sab fill karega</p>
            </div>
          </div>

          {error && <p className="text-red-400 text-sm bg-red-900/20 px-4 py-2 rounded-lg">{error}</p>}

          {/* Only show this button if no photo was taken (typing flow) */}
          {!productPreview && (
            <button onClick={enrichFromText} disabled={!name.trim() || !salt.trim()}
              className="w-full py-3 rounded-xl bg-green-600 hover:bg-green-500 disabled:opacity-40 font-semibold transition-colors">
              ✨ AI se Sab Details Fill Karo
            </button>
          )}

          <button onClick={onHome} className="w-full py-2 text-sm text-white/40 hover:text-white transition-colors">← Back</button>
        </div>
      )}

      {stage === 'enriching' && <Spinner text={extractMsg} sub="GPT-4o sab fields fill kar raha hai..." />}

      {stage === 'review' && (
        <ReviewForm product={product} setProduct={setProduct}
          onSave={handleSave} onBack={reset} error={error}
          imagePreview={productPreview} />
      )}

      {stage === 'saving' && <Spinner text="Save ho raha hai..." sub="Photo upload bhi ho rahi hai" />}

      {stage === 'done' && (
        <DoneScreen name={product.product_name} imageUrl={savedImageUrl}
          onAddMore={reset} label="Product save ho gaya!" />
      )}

      {stage === 'error' && (
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
// ── ADD IMAGE TO EXISTING PRODUCT ────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════
function AddImageMode({ onHome }: { onHome: () => void }) {
  const [imgStage, setImgStage]       = useState<ImageStage>('select')
  const [allProducts, setAllProducts] = useState<{id:number;product_name:string;image_url:string}[]>([])
  const [search, setSearch]           = useState('')
  const [selected, setSelected]       = useState<{id:number;product_name:string}|null>(null)
  const [loading, setLoading]         = useState(true)
  const [preview, setPreview]         = useState<string|null>(null)
  const [enhanced, setEnhanced]       = useState<string|null>(null)
  const [processing, setProcessing]   = useState(false)
  const [error, setError]             = useState('')
  const imgRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !key) return
    createClient(url, key)
      .from('products_enriched').select('id,product_name,image_url')
      .order('product_name',{ascending:true}).limit(500)
      .then(({data}) => { setAllProducts((data||[]) as any); setLoading(false) })
  }, [])

  // Separately fetch distinct categories/species/formulations from DB
  // so dropdowns in ReviewForm always reflect what's actually in the database
  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !key) return
    createClient(url, key)
      .from('products_enriched').select('category,species,formulation').limit(500)
      .then(({ data }) => {
        if (!data) return
        const dbCats  = [...new Set(data.map((r:any) => r.category).filter(Boolean))]
        const dbForms = [...new Set(data.map((r:any) => r.formulation).filter(Boolean))]
        // Merge into module-level arrays so ReviewForm picks them up
        ;(window as any).__madvetCats  = mergeOptions(CATEGORIES, dbCats)
        ;(window as any).__madvetForms = mergeOptions(FORMULATION_OPTIONS, dbForms)
      })
  }, [])

  const filtered = allProducts.filter(p => p.product_name.toLowerCase().includes(search.toLowerCase()))

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    setProcessing(true)
    const dataUrl = await toDataUrl(file)
    setPreview(dataUrl)
    const enh = await processImageForStudio(dataUrl)
    setEnhanced(enh); setProcessing(false); setImgStage('preview')
  }

  const handleSave = async () => {
    if (!selected || !enhanced) return
    setImgStage('saving')
    try {
      const b64Enh   = enhanced.split(',')[1]
      const imageUrl = await uploadToStorage(b64Enh, 'image/jpeg', selected.product_name)
      if (!imageUrl) throw new Error('Upload returned null — check Supabase storage bucket policy')
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      if (!url || !key) throw new Error('Supabase not configured')
      const { error: dbErr } = await createClient(url, key)
        .from('products_enriched').update({image_url: imageUrl}).eq('id', selected.id)
      if (dbErr) throw new Error(dbErr.message)

      // Bust the Next.js page cache — pass product_id so the specific detail page is also cleared
      await fetch('/api/revalidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-secret': process.env.NEXT_PUBLIC_ADMIN_SECRET ?? '' },
        body: JSON.stringify({ product_id: selected.id }),
      })

      setImgStage('done')
    } catch(e) { setError(String(e)); setImgStage('error') }
  }

  const reset = () => { setImgStage('select'); setSelected(null); setSearch(''); setPreview(null); setEnhanced(null); setError('') }

  const steps = ['Select','Upload','Preview','Done']
  const stepIdx: Record<ImageStage,number> = { select:0, upload:1, preview:2, saving:2, done:3, error:0 }

  return (
    <div>
      <div className="flex items-center gap-2 mb-8 text-xs">
        {steps.map((s,i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center font-medium
              ${stepIdx[imgStage]===i?'bg-green-600 text-white':stepIdx[imgStage]>i?'bg-green-900 text-green-300':'bg-white/10 text-white/30'}`}>
              {i+1}
            </div>
            <span className={stepIdx[imgStage]===i?'text-white':'text-white/30'}>{s}</span>
            {i<3 && <div className="w-5 h-px bg-white/10"/>}
          </div>
        ))}
      </div>

      {imgStage === 'select' && (
        <div className="space-y-4">
          <div><h2 className="text-lg font-semibold mb-1">Product Select Karein</h2><p className="text-white/40 text-sm">Jis product ki photo add/replace karni hai</p></div>
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Product naam type karein..."
              className="w-full bg-[#2f2f2f] border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-white/25 focus:outline-none focus:border-green-500" />
          </div>
          {loading ? (
            <div className="text-center py-8 text-white/40 text-sm">Loading...</div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {filtered.length===0 && <div className="text-center py-8 text-white/40 text-sm">Koi product nahi mila</div>}
              {filtered.map(p => (
                <button key={p.id} onClick={()=>{setSelected({id:p.id,product_name:p.product_name});setImgStage('upload')}}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 border border-white/10 hover:border-green-600 hover:bg-green-900/20 transition-colors text-left">
                  {p.image_url ? <img src={p.image_url} alt={p.product_name} className="w-10 h-10 rounded-lg object-contain bg-white/10 flex-shrink-0" />
                    : <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0 text-lg">📦</div>}
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

      {imgStage === 'upload' && selected && (
        <div className="space-y-5">
          <div><h2 className="text-lg font-semibold mb-1">{selected.product_name}</h2><p className="text-white/40 text-sm">Photo lo ya Gallery se select karo — AI automatically enhance karega</p></div>
          {/* Camera button */}
          <div onClick={()=>{imgRef.current!.setAttribute('capture','environment'); imgRef.current?.click()}}
            className="border-2 border-dashed border-white/20 hover:border-green-600 rounded-xl p-8 cursor-pointer transition-colors text-center">
            <div className="text-4xl mb-3">📷</div>
            <p className="font-medium mb-1">Camera se Photo Lo</p>
            <p className="text-white/40 text-sm">Live camera → AI enhance karega</p>
          </div>
          {/* Gallery button */}
          <div onClick={()=>{imgRef.current!.removeAttribute('capture'); imgRef.current?.click()}}
            className="border-2 border-dashed border-white/20 hover:border-orange-500 rounded-xl p-8 cursor-pointer transition-colors text-center">
            <div className="text-4xl mb-3">🖼️</div>
            <p className="font-medium mb-1">Gallery se Upload Karo</p>
            <p className="text-white/40 text-sm">Phone ki gallery → AI enhance karega</p>
          </div>
          <input ref={imgRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
          {processing && <Spinner text="AI enhance kar raha hai..." />}
          <button onClick={()=>setImgStage('select')} className="w-full py-2 text-sm text-white/40 hover:text-white transition-colors">← Back</button>
        </div>
      )}

      {imgStage === 'preview' && selected && enhanced && (
        <div className="space-y-5">
          <div><h2 className="text-lg font-semibold mb-1">Preview</h2><p className="text-white/40 text-sm">{selected.product_name}</p></div>
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
          {error && <p className="text-red-400 text-sm bg-red-900/20 px-4 py-2 rounded-lg">{error}</p>}
          <div className="flex gap-3">
            <button onClick={()=>setImgStage('upload')} className="flex-1 py-3 rounded-xl border border-white/20 hover:bg-white/5 text-sm font-medium transition-colors">Dobara Lo</button>
            <button onClick={handleSave} className="flex-1 py-3 rounded-xl bg-green-600 hover:bg-green-500 font-semibold transition-colors">✅ Save Karo</button>
          </div>
        </div>
      )}

      {imgStage === 'saving' && <Spinner text="Upload ho rahi hai..." />}

      {imgStage === 'done' && selected && (
        <DoneScreen name={selected.product_name} imageUrl={enhanced ?? undefined} onAddMore={reset} label="Photo save ho gayi!" />
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
// ── ADD / UPDATE VIDEO LINK ──────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════
type VideoStage = 'select' | 'enter' | 'saving' | 'done' | 'error'

function AddVideoMode({ onHome }: { onHome: () => void }) {
  const [stage, setStage]         = useState<VideoStage>('select')
  const [allProducts, setAll]     = useState<{id:number;product_name:string;video_url:string}[]>([])
  const [search, setSearch]       = useState('')
  const [selected, setSelected]   = useState<{id:number;product_name:string;video_url:string}|null>(null)
  const [videoUrl, setVideoUrl]   = useState('')
  const [error, setError]         = useState('')
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !key) return
    createClient(url, key)
      .from('products_enriched').select('id,product_name,video_url')
      .order('product_name',{ascending:true}).limit(500)
      .then(({data}) => { setAll((data||[]) as any); setLoading(false) })
  }, [])

  const filtered = allProducts.filter(p => p.product_name.toLowerCase().includes(search.toLowerCase()))

  // Extract YouTube video ID for preview
  const extractYtId = (url: string) => {
    const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([A-Za-z0-9_-]{11})/)
    return m?.[1] ?? null
  }
  const previewId = videoUrl ? extractYtId(videoUrl) : null

  const handleSave = async () => {
    if (!selected) return
    if (videoUrl && !extractYtId(videoUrl)) {
      setError('YouTube link nahi hai. youtube.com ya youtu.be link paste karo.')
      return
    }
    setStage('saving')
    setError('')
    try {
      const res = await fetch('/api/update-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-secret': process.env.NEXT_PUBLIC_ADMIN_SECRET ?? '' },
        body: JSON.stringify({ product_id: selected.id, video_url: videoUrl || null })
      })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error)
      setStage('done')
    } catch(e) { setError(String(e)); setStage('error') }
  }

  const reset = () => { setStage('select'); setSelected(null); setSearch(''); setVideoUrl(''); setError('') }

  const steps = ['Select','Enter URL','Done']
  const stepIdx: Record<VideoStage,number> = { select:0, enter:1, saving:1, done:2, error:0 }

  return (
    <div>
      <div className="flex items-center gap-2 mb-8 text-xs">
        {steps.map((s,i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center font-medium
              ${stepIdx[stage]===i?'bg-purple-600 text-white':stepIdx[stage]>i?'bg-purple-900 text-purple-300':'bg-white/10 text-white/30'}`}>
              {i+1}
            </div>
            <span className={stepIdx[stage]===i?'text-white':'text-white/30'}>{s}</span>
            {i<2 && <div className="w-5 h-px bg-white/10"/>}
          </div>
        ))}
      </div>

      {stage === 'select' && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold mb-1">Product Select Karein</h2>
            <p className="text-white/40 text-sm">Jis product ka YouTube video link add/update karna hai</p>
          </div>
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Product naam type karein..."
              className="w-full bg-[#2f2f2f] border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-white/25 focus:outline-none focus:border-purple-500" />
          </div>
          {loading ? (
            <div className="text-center py-8 text-white/40 text-sm">Loading...</div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {filtered.length===0 && <div className="text-center py-8 text-white/40 text-sm">Koi product nahi mila</div>}
              {filtered.map(p => (
                <button key={p.id} onClick={()=>{setSelected(p);setVideoUrl(p.video_url||'');setStage('enter')}}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 border border-white/10 hover:border-purple-600 hover:bg-purple-900/20 transition-colors text-left">
                  <div className="w-10 h-10 rounded-lg bg-purple-600/20 border border-purple-600/30 flex items-center justify-center flex-shrink-0 text-lg">
                    {p.video_url ? '▶️' : '📹'}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{p.product_name}</p>
                    <p className="text-xs text-white/30 mt-0.5">{p.video_url ? '✅ Video hai — update karein' : '📹 Video nahi hai — add karein'}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
          <button onClick={onHome} className="w-full py-2 text-sm text-white/40 hover:text-white transition-colors">← Back</button>
        </div>
      )}

      {stage === 'enter' && selected && (
        <div className="space-y-5">
          <div>
            <h2 className="text-lg font-semibold mb-1">{selected.product_name}</h2>
            <p className="text-white/40 text-sm">YouTube video link paste karein</p>
          </div>
          <div className="bg-white/5 rounded-xl p-4 border border-white/10 space-y-3">
            <label className="text-xs text-white/50 block">YouTube Video URL</label>
            <input
              value={videoUrl}
              onChange={e=>{setVideoUrl(e.target.value);setError('')}}
              placeholder="https://youtube.com/watch?v=... ya https://youtu.be/..."
              className="w-full bg-[#2f2f2f] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-purple-500"
            />
            {videoUrl && !previewId && (
              <p className="text-amber-400 text-xs">⚠️ Valid YouTube link nahi laga — youtube.com/watch?v= ya youtu.be/ format use karein</p>
            )}
            {/* Live preview */}
            {previewId && (
              <div>
                <p className="text-xs text-purple-400 mb-2">✅ Preview:</p>
                <div style={{position:'relative',paddingBottom:'56.25%',height:0,borderRadius:10,overflow:'hidden',background:'#000'}}>
                  <iframe
                    src={`https://www.youtube.com/embed/${previewId}?rel=0`}
                    style={{position:'absolute',top:0,left:0,width:'100%',height:'100%'}}
                    frameBorder="0" allowFullScreen
                  />
                </div>
              </div>
            )}
            {/* Clear button if video exists */}
            {(selected.video_url || videoUrl) && (
              <button onClick={()=>setVideoUrl('')} className="text-xs text-red-400 hover:text-red-300 transition-colors">
                🗑️ Video link hatao (clear karo)
              </button>
            )}
          </div>
          {error && <p className="text-red-400 text-sm bg-red-900/20 px-4 py-2 rounded-lg">{error}</p>}
          <div className="flex gap-3">
            <button onClick={()=>setStage('select')} className="flex-1 py-3 rounded-xl border border-white/20 hover:bg-white/5 text-sm font-medium transition-colors">← Back</button>
            <button onClick={handleSave}
              disabled={!!(videoUrl && !previewId)}
              className="flex-1 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 font-semibold transition-colors">
              {videoUrl ? '✅ Save Video Link' : '🗑️ Remove Video'}
            </button>
          </div>
        </div>
      )}

      {stage === 'saving' && <Spinner text="Save ho raha hai..." />}

      {stage === 'done' && selected && (
        <DoneScreen
          name={selected.product_name}
          imageUrl={previewId ? `https://img.youtube.com/vi/${previewId}/mqdefault.jpg` : undefined}
          onAddMore={reset}
          label={videoUrl ? 'Video link save ho gaya! 🎬' : 'Video link remove ho gaya!'}
        />
      )}

      {stage === 'error' && (
        <div className="text-center py-12">
          <div className="text-5xl mb-4">❌</div>
          <p className="text-red-400 text-sm bg-red-900/20 px-4 py-3 rounded-lg mb-6">{error}</p>
          <button onClick={reset} className="px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 font-semibold">Dobara Try</button>
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── MAIN ─────────────────────────────────────────────────────────────────────
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
      <div className="border-b border-white/10 px-6 py-4 flex items-center gap-3">
        <img src="/madvet-icon.png" alt="Madvet" className="w-8 h-8 rounded-full object-cover" />
        <div><h1 className="font-semibold">Madvet Admin</h1><p className="text-xs text-white/40">Product Management</p></div>
        {mode !== 'home'
          ? <button onClick={()=>setMode('home')} className="ml-auto text-xs text-white/40 hover:text-white transition-colors">← Home</button>
          : <a href="/" className="ml-auto text-xs text-white/40 hover:text-white transition-colors">← Chat</a>
        }
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">
        {mode === 'home' && (
          <div className="space-y-4">
            <div className="mb-8"><h2 className="text-xl font-semibold mb-1">Kya karna hai?</h2><p className="text-white/40 text-sm">Do options available hain</p></div>

            <button onClick={()=>setMode('add')}
              className="w-full p-5 rounded-2xl bg-white/5 border border-white/10 hover:border-green-600 hover:bg-green-900/20 transition-colors text-left group">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-green-600/20 border border-green-600/30 flex items-center justify-center text-2xl flex-shrink-0 group-hover:bg-green-600/30 transition-colors">🤖</div>
                <div>
                  <p className="font-semibold text-base mb-1">Naya Product Add Karo</p>
                  <p className="text-sm text-white/50">Photo lo <strong className="text-white/70">ya</strong> naam type karo · Salt photo lo <strong className="text-white/70">ya</strong> type karo · AI automatically saari details fill karega</p>
                </div>
              </div>
            </button>

            <button onClick={()=>setMode('image')}
              className="w-full p-5 rounded-2xl bg-white/5 border border-white/10 hover:border-orange-600 hover:bg-orange-900/20 transition-colors text-left group">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-orange-600/20 border border-orange-600/30 flex items-center justify-center text-2xl flex-shrink-0 group-hover:bg-orange-600/30 transition-colors">📸</div>
                <div>
                  <p className="font-semibold text-base mb-1">Existing Product ki Photo Add Karo</p>
                  <p className="text-sm text-white/50">Purane products dhoondo · photo lo ya gallery se upload karo · AI enhance karega · save</p>
                </div>
              </div>
            </button>

            <button onClick={()=>setMode('video')}
              className="w-full p-5 rounded-2xl bg-white/5 border border-white/10 hover:border-purple-600 hover:bg-purple-900/20 transition-colors text-left group">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-purple-600/20 border border-purple-600/30 flex items-center justify-center text-2xl flex-shrink-0 group-hover:bg-purple-600/30 transition-colors">🎬</div>
                <div>
                  <p className="font-semibold text-base mb-1">Product Video Link Add Karo</p>
                  <p className="text-sm text-white/50">YouTube link paste karo · product page par embed hoga · training mein bhi dikhega · shareable</p>
                </div>
              </div>
            </button>
          </div>
        )}

        {mode === 'add'   && <AddProductMode onHome={()=>setMode('home')} />}
        {mode === 'image' && <AddImageMode   onHome={()=>setMode('home')} />}
        {mode === 'video' && <AddVideoMode   onHome={()=>setMode('home')} />}
      </div>
    </div>
  )
}
