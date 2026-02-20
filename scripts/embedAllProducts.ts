// scripts/embedAllProducts.ts
// Run ONCE to embed all existing products in Supabase
// After this, new products auto-embed on save via save-product route
//
// Usage:
//   npx ts-node --project tsconfig.json scripts/embedAllProducts.ts
// OR with tsx (recommended):
//   npx tsx scripts/embedAllProducts.ts

import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'

// Load env vars (works without Next.js runtime)
const SUPABASE_URL     = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const SUPABASE_KEY     = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
const OPENAI_API_KEY   = process.env.OPENAI_API_KEY ?? ''
const TABLE            = process.env.NEXT_PUBLIC_SUPABASE_TABLE ?? 'products_enriched'

if (!SUPABASE_URL || !SUPABASE_KEY || !OPENAI_API_KEY) {
  console.error('❌ Missing env vars. Make sure .env.local is loaded.')
  console.error('   Run: export $(cat .env.local | xargs) && npx tsx scripts/embedAllProducts.ts')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
const openai   = new OpenAI({ apiKey: OPENAI_API_KEY })

function buildEmbedText(p: Record<string, any>): string {
  return [
    p.product_name ? `Product: ${p.product_name}` : '',
    p.category     ? `Category: ${p.category}` : '',
    p.species      ? `For animals: ${p.species}` : '',
    p.indication   ? `Used for: ${p.indication}` : '',
    p.description  ? `Description: ${p.description}` : '',
    p.usp_benefits ? `Benefits: ${p.usp_benefits}` : '',
    p.aliases      ? `Also called: ${p.aliases}` : '',
  ].filter(Boolean).join('. ')
}

async function embedProduct(text: string): Promise<number[]> {
  const res = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text.slice(0, 500),
  })
  return res.data[0].embedding
}

async function main() {
  console.log('🐾 Madvet Product Embedder')
  console.log('─────────────────────────')

  // Fetch all products
  const { data: products, error } = await supabase
    .from(TABLE)
    .select('id, product_name, category, species, indication, description, usp_benefits, aliases, embedding')
    .limit(500)

  if (error) {
    console.error('❌ Failed to fetch products:', error.message)
    process.exit(1)
  }

  if (!products || products.length === 0) {
    console.log('⚠️  No products found in table:', TABLE)
    process.exit(0)
  }

  const toEmbed  = products.filter(p => !p.embedding) // skip already embedded
  const already  = products.length - toEmbed.length

  console.log(`📦 Total products: ${products.length}`)
  console.log(`✅ Already embedded: ${already}`)
  console.log(`⏳ Need embedding: ${toEmbed.length}`)
  console.log('')

  if (toEmbed.length === 0) {
    console.log('🎉 All products already embedded! Nothing to do.')
    process.exit(0)
  }

  let success = 0
  let failed  = 0

  for (const product of toEmbed) {
    const text = buildEmbedText(product)
    if (!text.trim()) {
      console.log(`⚠️  Skipping (no text): ${product.product_name}`)
      continue
    }

    try {
      const embedding = await embedProduct(text)

      const { error: updateError } = await supabase
        .from(TABLE)
        .update({ embedding })
        .eq('id', product.id)

      if (updateError) {
        console.error(`❌ Failed to store: ${product.product_name} —`, updateError.message)
        failed++
      } else {
        console.log(`✅ Embedded: ${product.product_name}`)
        success++
      }

      // Rate limit: 500ms between calls to avoid OpenAI throttling
      await new Promise(r => setTimeout(r, 500))

    } catch (err) {
      console.error(`❌ Error embedding: ${product.product_name} —`, err)
      failed++
    }
  }

  console.log('')
  console.log('─────────────────────────')
  console.log(`✅ Success: ${success}`)
  console.log(`❌ Failed:  ${failed}`)
  console.log('🐾 Done!')
}

main()
