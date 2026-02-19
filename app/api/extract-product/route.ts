import OpenAI from 'openai'
import { NextRequest } from 'next/server'

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const { productImageBase64, saltImageBase64, productMimeType, saltMimeType } = await req.json()

    const content: OpenAI.Chat.Completions.ChatCompletionContentPart[] = []

    // Add product image
    if (productImageBase64) {
      content.push({
        type: 'image_url',
        image_url: {
          url: `data:${productMimeType || 'image/jpeg'};base64,${productImageBase64}`,
        }
      })
    }

    // Add salt/ingredient image if provided
    if (saltImageBase64) {
      content.push({
        type: 'image_url',
        image_url: {
          url: `data:${saltMimeType || 'image/jpeg'};base64,${saltImageBase64}`,
        }
      })
    }

    content.push({
      type: 'text',
      text: `You are a veterinary product data extraction expert.
      
Look at the product image(s) provided and extract ALL visible information.
Return ONLY a valid JSON object with these exact fields:

{
  "product_name": "exact product name from label",
  "salt_ingredient": "active ingredients/composition from label",
  "packaging": "packaging size and form (e.g. bolus 1x4, injection 100ml, spray 100ml)",
  "description": "brief product description based on what you can read",
  "category": "ONE of: Antibiotic / Anthelmintic / Antiparasitic / Ectoparasiticide / Anti-inflammatory / Antihistamine / Reproductive Hormone / Probiotic / Vitamin Supplement / Udder Care / Antidiarrheal / Dermatological / Analgesic / Antipyretic",
  "species": "comma separated: Cattle, Buffalo, Sheep, Goat, Dog, Cat, Horse, Poultry",
  "indication": "comma separated list of conditions this treats — include Hindi words like keede, dast, bukhar, khujli etc where relevant",
  "aliases": "comma separated list of: common misspellings, Hindi names, short names, how farmers would ask for this product",
  "dosage": "dosage instructions if visible on label",
  "usp_benefits": "key benefits visible on label"
}

Rules:
- Extract EXACTLY what is on label for product_name, salt_ingredient, packaging
- For category, species, indication, aliases — use your veterinary knowledge to enrich
- For indication include both English and Hindi symptom words
- For aliases include common misspellings and Hindi/colloquial names farmers use
- If information is not visible, make your best clinical inference based on salt
- Return ONLY the JSON object, no other text or markdown formatting`
    })

    const response = await client.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 1500,
      messages: [{ role: 'user', content }]
    })

    const text = response.choices[0]?.message?.content || ''
    
    // Clean and parse JSON
    const cleaned = text.replace(/```json|```/g, '').trim()
    const extracted = JSON.parse(cleaned)

    return Response.json({ success: true, data: extracted })
  } catch (err) {
    console.error('[Extract Product Error]', err)
    return Response.json({ success: false, error: String(err) }, { status: 500 })
  }
}
