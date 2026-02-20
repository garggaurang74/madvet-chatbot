// scripts/enrichAllProducts.ts
// Run once: npx ts-node --project tsconfig.json scripts/enrichAllProducts.ts
// This enriches ALL existing products in Supabase with AI-generated indication + aliases

import OpenAI from 'openai'
import { createClient } from '@supabase/supabase-js'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // use service role for bulk update
)

async function enrichProduct(product: Record<string, string>): Promise<{
  indication: string
  aliases: string
}> {
  const prompt = `You are a veterinary product expert for Indian farmers.
Given this animal healthcare product, generate:
1. "indication" — comprehensive list of ALL conditions, symptoms, diseases this treats. Include English, Hindi, and Hinglish terms farmers commonly use. Be very thorough. Separate with commas.
2. "aliases" — all possible names, spellings, misspellings, Hindi/Hinglish names farmers might use. Separate with commas.

Product:
Name: ${product.product_name}
Category: ${product.category || ''}
Species: ${product.species || ''}
Salt/Composition: ${product.salt_ingredient || ''}
Description: ${product.description || ''}

Respond ONLY with valid JSON:
{"indication": "...", "aliases": "..."}`

  const response = await openai.chat.completions.create({
    model:       'gpt-4o-mini',
    messages:    [{ role: 'user', content: prompt }],
    temperature: 0.3,
    max_tokens:  600,
  })

  const text  = response.choices[0]?.message?.content?.trim() ?? ''
  const clean = text.replace(/```json|```/g, '').trim()
  const parsed = JSON.parse(clean)

  return {
    indication: parsed.indication ?? '',
    aliases:    parsed.aliases    ?? '',
  }
}

async function main() {
  console.log('Fetching all products...')
  const { data: products, error } = await supabase
    .from('products_enriched')
    .select('*')

  if (error || !products) {
    console.error('Failed to fetch products:', error)
    process.exit(1)
  }

  console.log(`Found ${products.length} products. Enriching...`)

  for (const product of products) {
    try {
      console.log(`Enriching: ${product.product_name}`)
      const enriched = await enrichProduct(product)

      const { error: updateError } = await supabase
        .from('products_enriched')
        .update({
          indication: enriched.indication,
          aliases:    enriched.aliases,
          updated_at: new Date().toISOString(),
        })
        .eq('id', product.id)

      if (updateError) {
        console.error(`Failed to update ${product.product_name}:`, updateError)
      } else {
        console.log(`✅ Done: ${product.product_name}`)
      }

      // Small delay to avoid rate limits
      await new Promise(r => setTimeout(r, 500))
    } catch (err) {
      console.error(`❌ Error enriching ${product.product_name}:`, err)
    }
  }

  console.log('\n✅ All products enriched!')
}

main()
