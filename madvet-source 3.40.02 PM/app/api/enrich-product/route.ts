import OpenAI from 'openai'
import { NextRequest } from 'next/server'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const { product_name, salt_ingredient } = await req.json()
    if (!product_name) return Response.json({ error: 'product_name required' }, { status: 400 })

    const prompt = `You are a senior veterinary product expert for Indian farmers (rural India, Bundelkhand region).
Given this animal healthcare product name and salt/composition, fill in ALL fields with expert veterinary knowledge.

Product Name: ${product_name}
Salt / Composition: ${salt_ingredient || 'unknown'}

Return ONLY a valid JSON object with these exact fields:

{
  "category": "ONE of: Antibiotic / Anthelmintic / Antiparasitic / Ectoparasiticide / Anti-inflammatory / Analgesic / Antihistamine / Reproductive Hormone / Probiotic / Vitamin Supplement / Udder Care / Antidiarrheal / Dermatological",
  "species": "comma separated from: Cattle, Buffalo, Sheep, Goat, Dog, Cat, Horse, Poultry",
  "description": "1-2 sentence clinical description of what this product is and does",
  "usp_benefits": "3-5 key clinical benefits separated by periods",
  "packaging": "most common packaging form e.g. Bolus 1x4, Injection 100ml, Powder 1kg",
  "indication": "comprehensive comma-separated list of conditions, symptoms, diseases this treats — include English, Hindi and Hinglish terms (e.g. dast, bukhar, keede, khujli, kamzori, doodh badhana)",
  "aliases": "comma-separated list of: common misspellings, Hindi names, short names, how farmers in rural India would ask for this product",
  "dosage": "general dosage guidance e.g. 1 bolus per 100kg body weight"
}

Rules:
- Use your veterinary knowledge to infer correct category and species from the salt/name
- For indication and aliases include Hindi and Hinglish terms farmers actually use
- Be specific and clinically accurate
- Return ONLY the JSON, no markdown or explanation`

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      max_tokens: 800,
    })

    const text  = response.choices[0]?.message?.content?.trim() ?? ''
    const clean = text.replace(/```json|```/g, '').trim()
    const match = clean.match(/\{[\s\S]*\}/)
    if (!match) throw new Error('No JSON in response')
    const data = JSON.parse(match[0])

    return Response.json({ success: true, data })
  } catch (err) {
    console.error('[Enrich Product]', err)
    return Response.json({ success: false, error: String(err) }, { status: 500 })
  }
}
