/**
 * retryFailedTranslations.ts
 * Retries translation for specific IDs that failed in the first run.
 * Usage: npx tsx --env-file=.env.local scripts/retryFailedTranslations.ts
 */

import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'

const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY   = process.env.SUPABASE_SERVICE_ROLE_KEY!
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY!
const TABLE         = process.env.NEXT_PUBLIC_SUPABASE_TABLE || 'products_enriched'

if (!SUPABASE_URL || !SERVICE_KEY || !ANTHROPIC_KEY) {
  console.error('❌  Missing env vars')
  process.exit(1)
}

const supabase  = createClient(SUPABASE_URL, SERVICE_KEY)
const anthropic = new Anthropic({ apiKey: ANTHROPIC_KEY })

async function translateBothFields(name: string, description: string, usp: string) {
  const prompt = `You are a veterinary Hindi translator for Indian field sales reps.
Translate the following two fields for the veterinary product "${name}" into clear, simple Hindi (Devanagari script).

Rules:
- Keep product names, drug names, and brand names in English
- Use simple Hindi that a rural field rep can understand
- Return ONLY valid JSON — no explanation, no markdown

Input:
{
  "description": ${JSON.stringify(description)},
  "usp_benefits": ${JSON.stringify(usp)}
}

Output format (JSON only):
{
  "description_hi": "...",
  "usp_benefits_hi": "..."
}`

  const response = await anthropic.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  })

  const raw     = (response.content[0] as { text: string }).text.trim()
  const cleaned = raw.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim()
  const parsed  = JSON.parse(cleaned)
  return {
    description_hi:  (parsed.description_hi  || '').trim(),
    usp_benefits_hi: (parsed.usp_benefits_hi || '').trim(),
  }
}

async function main() {
  // Fetch all rows where description_hi is still empty (the ones that failed)
  const { data: rows, error } = await supabase
    .from(TABLE)
    .select('id, product_name, description, usp_benefits, description_hi')
    .or('description_hi.is.null,description_hi.eq.')
    .order('id', { ascending: true })

  if (error || !rows) {
    console.error('❌  Fetch error:', error)
    process.exit(1)
  }

  if (rows.length === 0) {
    console.log('✅  All products already have Hindi translations!')
    return
  }

  console.log(`🔁  Found ${rows.length} products missing Hindi translations\n`)

  let updated = 0, failed = 0

  for (const row of rows) {
    const desc = (row.description  || '').trim()
    const usp  = (row.usp_benefits || '').trim()

    if (!desc && !usp) {
      console.log(`[ID ${row.id}] ${row.product_name} — ⏭️  skipped (no English content)`)
      continue
    }

    let retries = 3
    while (retries > 0) {
      try {
        const { description_hi, usp_benefits_hi } = await translateBothFields(row.product_name, desc, usp)

        const { error: updateErr } = await supabase
          .from(TABLE)
          .update({ description_hi, usp_benefits_hi })
          .eq('id', row.id)

        if (updateErr) throw new Error(updateErr.message)

        console.log(`[ID ${row.id}] ${row.product_name} ✅`)
        console.log(`  description_hi:  ${description_hi.slice(0, 80)}...`)
        updated++
        break
      } catch (err: unknown) {
        retries--
        if (retries === 0) {
          console.error(`[ID ${row.id}] ${row.product_name} ❌  ${(err as Error).message}`)
          failed++
        } else {
          console.warn(`[ID ${row.id}] Retry ${3 - retries}/3...`)
          await new Promise(r => setTimeout(r, 2000))
        }
      }
    }

    await new Promise(r => setTimeout(r, 500))
  }

  console.log('\n─────────────────────────────')
  console.log(`✅  Updated : ${updated}`)
  console.log(`❌  Failed  : ${failed}`)
}

main()
