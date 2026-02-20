'use client'
import { useState, useRef, useEffect } from 'react'
import { generateAdminToken, isAdminAuthenticated, setStoredAdminToken, clearStoredAdminToken } from '@/lib/auth'

type ProductData = {
  product_name: string
  salt_ingredient: string
  packaging: string
  description: string
  category: string
  species: string
  indication: string
  aliases: string
  dosage: string
  usp_benefits: string
}

type Stage = 'upload' | 'extracting' | 'review' | 'enriching' | 'saving' | 'done' | 'error'

const EMPTY_PRODUCT: ProductData = {
  product_name: '', salt_ingredient: '', packaging: '',
  description: '', category: '', species: '',
  indication: '', aliases: '', dosage: '', usp_benefits: ''
}

const CATEGORIES = [
  'Antibiotic', 'Anthelmintic', 'Antiparasitic', 'Ectoparasiticide',
  'Anti-inflammatory', 'Antihistamine', 'Reproductive Hormone',
  'Probiotic', 'Vitamin Supplement', 'Udder Care', 'Antidiarrheal',
  'Dermatological', 'Analgesic / Antipyretic'
]

const SPECIES_OPTIONS = ['Cattle', 'Buffalo', 'Sheep', 'Goat', 'Dog', 'Cat', 'Horse', 'Poultry']

function PasswordGate({ onUnlock }: { onUnlock: (password: string) => boolean }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)
  const [shake, setShake] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const isValid = onUnlock(password)
    if (isValid) {
      setError(false)
    } else {
      setError(true)
      setShake(true)
      setTimeout(() => setShake(false), 500)
    }
  }

  return (
    <div className="min-h-screen bg-[#212121] text-white flex items-center justify-center p-4">
      <div className={`max-w-md w-full ${shake ? 'animate-pulse' : ''}`}>
        <div className="bg-[#2f2f2f] rounded-2xl p-8 shadow-2xl border border-white/10">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-full bg-green-600 flex items-center justify-center mx-auto mb-4 text-2xl">
              🐄
            </div>
            <h1 className="text-2xl font-bold mb-2">Madvet Admin</h1>
            <p className="text-white/60 text-sm">Product Ingestion System</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  setError(false)
                }}
                className={`w-full px-4 py-3 bg-[#1f1f1f] border rounded-lg text-white
                  placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-green-500
                  transition-colors ${error ? 'border-red-500 animate-pulse' : 'border-white/20'}`}
                placeholder="Enter password to continue"
                autoFocus
              />
              {error && (
                <p className="mt-2 text-sm text-red-400 text-center">
                  Galat password! Dobara try karein. 🙏
                </p>
              )}
            </div>
            <button
              type="submit"
              className="w-full py-3 rounded-lg bg-green-600 hover:bg-green-500 
                text-white font-semibold transition-colors"
            >
              Unlock Admin Panel
            </button>
          </form>

          <p className="text-center text-white/40 text-xs mt-6">
            Madvet team ke liye protected area
          </p>
        </div>
      </div>
    </div>
  )
}

export default function AdminPage() {
  const [unlocked, setUnlocked] = useState(false)
  const [stage, setStage] = useState<Stage>('upload')
  const [productImage, setProductImage] = useState<string | null>(null)
  const [saltImage, setSaltImage] = useState<string | null>(null)
  const [productMime, setProductMime] = useState('image/jpeg')
  const [saltMime, setSaltMime] = useState('image/jpeg')
  const [productPreview, setProductPreview] = useState<string | null>(null)
  const [saltPreview, setSaltPreview] = useState<string | null>(null)
  const [product, setProduct] = useState<ProductData>(EMPTY_PRODUCT)
  const [error, setError] = useState('')
  const [savedProduct, setSavedProduct] = useState<ProductData | null>(null)

  const productInputRef = useRef<HTMLInputElement>(null)
  const saltInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isAdminAuthenticated()) {
      setUnlocked(true)
    }
  }, [])

  if (!unlocked) {
    return (
      <PasswordGate onUnlock={(password) => {
        // In production, verify against hashed password
        const isValid = password === (process.env.ADMIN_PASSWORD || 'madvetkaboss')
        if (isValid) {
          const token = generateAdminToken()
          setStoredAdminToken(token)
          setUnlocked(true)
        }
        return isValid
      }} />
    )
  }

  
  const toBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result as string
        resolve(result.split(',')[1])
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })

  const handleProductImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const b64 = await toBase64(file)
    setProductImage(b64)
    setProductMime(file.type)
    setProductPreview(URL.createObjectURL(file))
  }

  const handleSaltImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const b64 = await toBase64(file)
    setSaltImage(b64)
    setSaltMime(file.type)
    setSaltPreview(URL.createObjectURL(file))
  }

  const handleExtract = async () => {
    if (!productImage) { setError('Product ki photo upload karein'); return }
    setStage('extracting')
    setError('')
    try {
      const res = await fetch('/api/extract-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productImageBase64: productImage,
          saltImageBase64: saltImage,
          productMimeType: productMime,
          saltMimeType: saltMime
        })
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      setProduct({ ...EMPTY_PRODUCT, ...data.data })
      setStage('review')
    } catch (err) {
      setError('Extraction failed: ' + String(err))
      setStage('error')
    }
  }

  const handleSave = async () => {
    if (!product.product_name) { setError('Product name required'); return }
    setStage('saving')
    try {
      const res = await fetch('/api/save-product', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-secret': process.env.NEXT_PUBLIC_ADMIN_SECRET ?? '',
        },
        body: JSON.stringify(product)
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setSavedProduct(product)
      setStage('done')
    } catch (err) {
      setError('Save failed: ' + String(err))
      setStage('error')
    }
  }

  const handleReset = () => {
    setStage('upload')
    setProductImage(null)
    setSaltImage(null)
    setProductPreview(null)
    setSaltPreview(null)
    setProduct(EMPTY_PRODUCT)
    setError('')
    setSavedProduct(null)
  }

  const updateField = (field: keyof ProductData, value: string) => {
    setProduct(prev => ({ ...prev, [field]: value }))
  }

  const toggleSpecies = (s: string) => {
    const current = product.species.split(',').map(x => x.trim()).filter(Boolean)
    const updated = current.includes(s)
      ? current.filter(x => x !== s)
      : [...current, s]
    updateField('species', updated.join(', '))
  }

  return (
    <div className="min-h-screen bg-[#212121] text-white">
      {/* Header */}
      <div className="border-b border-white/10 px-6 py-4 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center font-bold text-sm">M</div>
        <div>
          <h1 className="font-semibold">Madvet Admin</h1>
          <p className="text-xs text-white/40">Product Ingestion System</p>
        </div>
        <a href="/" className="ml-auto text-xs text-white/40 hover:text-white transition-colors">
          ← Back to Chat
        </a>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">

        {/* Progress Steps */}
        <div className="flex items-center gap-2 mb-8 text-xs">
          {['upload', 'extracting', 'review', 'saving', 'done'].map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center font-medium
                ${stage === s ? 'bg-green-600 text-white' :
                  ['extracting','review','saving','done'].indexOf(s) <= 
                  ['extracting','review','saving','done'].indexOf(stage) && stage !== 'upload'
                  ? 'bg-green-800 text-green-300' : 'bg-white/10 text-white/30'}`}>
                {i + 1}
              </div>
              <span className={stage === s ? 'text-white' : 'text-white/30'}>
                {s === 'upload' ? 'Upload' : s === 'extracting' ? 'Reading' : 
                 s === 'review' ? 'Review' : s === 'saving' ? 'Saving' : 'Done'}
              </span>
              {i < 4 && <div className="w-6 h-px bg-white/10" />}
            </div>
          ))}
        </div>

        {/* STAGE: UPLOAD */}
        {stage === 'upload' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold mb-1">Product Photos Upload Karein</h2>
              <p className="text-white/50 text-sm">Product ka label photo aur salt/ingredient photo upload karein</p>
            </div>

            {/* Product Image Upload */}
            <div
              onClick={() => productInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 cursor-pointer transition-colors text-center
                ${productPreview ? 'border-green-600 bg-green-900/20' : 'border-white/20 hover:border-white/40'}`}
            >
              <input ref={productInputRef} type="file" accept="image/*" capture="environment"
                onChange={handleProductImage} className="hidden" />
              {productPreview ? (
                <div>
                  <img src={productPreview} alt="Product" className="max-h-40 mx-auto rounded-lg object-contain mb-2" />
                  <p className="text-green-400 text-sm">✅ Product photo ready — tap to change</p>
                </div>
              ) : (
                <div>
                  <div className="text-4xl mb-2">📦</div>
                  <p className="font-medium mb-1">Product Photo</p>
                  <p className="text-white/40 text-sm">Product ke label ki photo — name, packing visible honi chahiye</p>
                  <p className="text-white/30 text-xs mt-2">Tap to upload or take photo</p>
                </div>
              )}
            </div>

            {/* Salt Image Upload */}
            <div
              onClick={() => saltInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 cursor-pointer transition-colors text-center
                ${saltPreview ? 'border-green-600 bg-green-900/20' : 'border-white/20 hover:border-white/40'}`}
            >
              <input ref={saltInputRef} type="file" accept="image/*" capture="environment"
                onChange={handleSaltImage} className="hidden" />
              {saltPreview ? (
                <div>
                  <img src={saltPreview} alt="Salt" className="max-h-40 mx-auto rounded-lg object-contain mb-2" />
                  <p className="text-green-400 text-sm">✅ Ingredient photo ready — tap to change</p>
                </div>
              ) : (
                <div>
                  <div className="text-4xl mb-2">🧪</div>
                  <p className="font-medium mb-1">Salt/Ingredient Photo (Optional)</p>
                  <p className="text-white/40 text-sm">Composition ya ingredient list ki photo</p>
                  <p className="text-white/30 text-xs mt-2">Tap to upload or take photo</p>
                </div>
              )}
            </div>

            {error && <p className="text-red-400 text-sm bg-red-900/20 px-4 py-2 rounded-lg">{error}</p>}

            <button
              onClick={handleExtract}
              disabled={!productImage}
              className="w-full py-3 rounded-xl bg-green-600 hover:bg-green-500 disabled:opacity-40
                disabled:cursor-not-allowed font-semibold transition-colors"
            >
              🤖 AI se Extract Karein
            </button>
          </div>
        )}

        {/* STAGE: EXTRACTING */}
        {stage === 'extracting' && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin mb-6" />
            <h2 className="text-lg font-semibold mb-2">AI Product Padh Raha Hai...</h2>
            <p className="text-white/50 text-sm">
              Claude photo se product name, salt, packaging extract kar raha hai
              aur veterinary data enrich kar raha hai
            </p>
          </div>
        )}

        {/* STAGE: REVIEW */}
        {stage === 'review' && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-semibold mb-1">Review & Edit Karein</h2>
              <p className="text-white/50 text-sm">AI ne ye data extract kiya hai — confirm karein ya edit karein</p>
            </div>

            {/* Core Fields */}
            <div className="bg-white/5 rounded-xl p-4 space-y-4 border border-white/10">
              <p className="text-xs text-green-400 font-medium uppercase tracking-wide">📋 Label se Extract Kiya</p>
              
              {[
                { label: 'Product Name *', field: 'product_name', placeholder: 'e.g. Stop Stop' },
                { label: 'Salt / Composition *', field: 'salt_ingredient', placeholder: 'e.g. Metronidazole 1000mg' },
                { label: 'Packaging *', field: 'packaging', placeholder: 'e.g. Bolus 1x4, Injection 100ml' },
                { label: 'Dosage', field: 'dosage', placeholder: 'e.g. 1 bolus per 100kg' },
              ].map(({ label, field, placeholder }) => (
                <div key={field}>
                  <label className="text-xs text-white/50 mb-1 block">{label}</label>
                  <input
                    value={product[field as keyof ProductData]}
                    onChange={e => updateField(field as keyof ProductData, e.target.value)}
                    placeholder={placeholder}
                    className="w-full bg-[#2f2f2f] border border-white/10 rounded-lg px-3 py-2.5
                      text-sm text-white placeholder-white/25 focus:outline-none focus:border-green-500"
                  />
                </div>
              ))}
            </div>

            {/* AI Enriched Fields */}
            <div className="bg-white/5 rounded-xl p-4 space-y-4 border border-white/10">
              <p className="text-xs text-green-400 font-medium uppercase tracking-wide">🤖 AI ne Enrich Kiya</p>

              {/* Category */}
              <div>
                <label className="text-xs text-white/50 mb-2 block">Category</label>
                <select
                  value={product.category}
                  onChange={e => updateField('category', e.target.value)}
                  className="w-full bg-[#2f2f2f] border border-white/10 rounded-lg px-3 py-2.5
                    text-sm text-white focus:outline-none focus:border-green-500"
                >
                  <option value="">Select category</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {/* Species */}
              <div>
                <label className="text-xs text-white/50 mb-2 block">Species</label>
                <div className="flex flex-wrap gap-2">
                  {SPECIES_OPTIONS.map(s => (
                    <button
                      key={s}
                      onClick={() => toggleSpecies(s)}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors
                        ${product.species.includes(s)
                          ? 'bg-green-600 text-white'
                          : 'bg-[#2f2f2f] text-white/50 border border-white/10 hover:border-white/30'}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Indication */}
              <div>
                <label className="text-xs text-white/50 mb-1 block">
                  Indication (conditions yeh treat karta hai)
                </label>
                <textarea
                  value={product.indication}
                  onChange={e => updateField('indication', e.target.value)}
                  placeholder="e.g. Diarrhea, dast, loose motions, pechish, dysentery"
                  rows={3}
                  className="w-full bg-[#2f2f2f] border border-white/10 rounded-lg px-3 py-2.5
                    text-sm text-white placeholder-white/25 focus:outline-none focus:border-green-500 resize-none"
                />
              </div>

              {/* Aliases */}
              <div>
                <label className="text-xs text-white/50 mb-1 block">
                  Aliases (misspellings, Hindi names, how farmers ask for it)
                </label>
                <textarea
                  value={product.aliases}
                  onChange={e => updateField('aliases', e.target.value)}
                  placeholder="e.g. stop stop bolus, stap stap, dast ki dawa, loose motion bolus"
                  rows={3}
                  className="w-full bg-[#2f2f2f] border border-white/10 rounded-lg px-3 py-2.5
                    text-sm text-white placeholder-white/25 focus:outline-none focus:border-green-500 resize-none"
                />
              </div>

              {/* Description */}
              <div>
                <label className="text-xs text-white/50 mb-1 block">Description</label>
                <textarea
                  value={product.description}
                  onChange={e => updateField('description', e.target.value)}
                  placeholder="Product description"
                  rows={2}
                  className="w-full bg-[#2f2f2f] border border-white/10 rounded-lg px-3 py-2.5
                    text-sm text-white placeholder-white/25 focus:outline-none focus:border-green-500 resize-none"
                />
              </div>

              {/* Benefits */}
              <div>
                <label className="text-xs text-white/50 mb-1 block">USP / Benefits</label>
                <textarea
                  value={product.usp_benefits}
                  onChange={e => updateField('usp_benefits', e.target.value)}
                  placeholder="Key benefits"
                  rows={2}
                  className="w-full bg-[#2f2f2f] border border-white/10 rounded-lg px-3 py-2.5
                    text-sm text-white placeholder-white/25 focus:outline-none focus:border-green-500 resize-none"
                />
              </div>
            </div>

            {error && <p className="text-red-400 text-sm bg-red-900/20 px-4 py-2 rounded-lg">{error}</p>}

            <div className="flex gap-3">
              <button
                onClick={handleReset}
                className="flex-1 py-3 rounded-xl border border-white/20 hover:bg-white/5
                  font-medium text-sm transition-colors"
              >
                ← Wapas Jao
              </button>
              <button
                onClick={handleSave}
                disabled={!product.product_name || !product.salt_ingredient}
                className="flex-1 py-3 rounded-xl bg-green-600 hover:bg-green-500
                  disabled:opacity-40 disabled:cursor-not-allowed font-semibold transition-colors"
              >
                ✅ Supabase mein Save Karein
              </button>
            </div>
          </div>
        )}

        {/* STAGE: SAVING */}
        {stage === 'saving' && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin mb-6" />
            <h2 className="text-lg font-semibold mb-2">Supabase mein Save Ho Raha Hai...</h2>
            <p className="text-white/50 text-sm">Thoda wait karein</p>
          </div>
        )}

        {/* STAGE: DONE */}
        {stage === 'done' && (
          <div className="flex flex-col items-center text-center py-12">
            <div className="w-20 h-20 rounded-full bg-green-600/20 border-2 border-green-500
              flex items-center justify-center text-4xl mb-6">
              ✅
            </div>
            <h2 className="text-xl font-semibold mb-2">Product Save Ho Gaya!</h2>
            <p className="text-white/50 text-sm mb-1">
              <span className="text-white font-medium">{savedProduct?.product_name}</span> successfully
              Supabase products_enriched table mein add ho gaya
            </p>
            <p className="text-white/30 text-xs mb-8">
              Bot 5 minutes mein is product ko automatically pick up kar lega
            </p>
            <div className="flex gap-3 w-full">
              <button
                onClick={handleReset}
                className="flex-1 py-3 rounded-xl bg-green-600 hover:bg-green-500 font-semibold transition-colors"
              >
                + Aur Product Add Karein
              </button>
              <a
                href="/"
                className="flex-1 py-3 rounded-xl border border-white/20 hover:bg-white/5
                  font-medium text-sm transition-colors text-center"
              >
                Chat pe Jao
              </a>
            </div>
          </div>
        )}

        {/* STAGE: ERROR */}
        {stage === 'error' && (
          <div className="flex flex-col items-center text-center py-12">
            <div className="text-5xl mb-4">❌</div>
            <h2 className="text-lg font-semibold mb-2">Kuch Error Aa Gaya</h2>
            <p className="text-red-400 text-sm mb-6 bg-red-900/20 px-4 py-2 rounded-lg">{error}</p>
            <button onClick={handleReset}
              className="px-6 py-3 rounded-xl bg-green-600 hover:bg-green-500 font-semibold transition-colors">
              Dobara Try Karein
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
