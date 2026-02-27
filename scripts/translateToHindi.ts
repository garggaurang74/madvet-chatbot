/**
 * translateToHindi.ts
 * Translates description and usp_benefits for all products to Hindi
 * and writes description_hi + usp_benefits_hi back to Supabase.
 *
 * Usage:
 *   DRY_RUN=true  npx tsx --env-file=.env.local scripts/translateToHindi.ts
 *   npx tsx --env-file=.env.local scripts/translateToHindi.ts
 */

import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'

const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY   = process.env.SUPABASE_SERVICE_ROLE_KEY!
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY!
const TABLE         = process.env.NEXT_PUBLIC_SUPABASE_TABLE || 'products_enriched'
const DRY_RUN       = process.env.DRY_RUN === 'true'

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌  Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}
if (!ANTHROPIC_KEY) {
  console.error('❌  Missing ANTHROPIC_API_KEY in .env.local')
  process.exit(1)
}

const supabase  = createClient(SUPABASE_URL, SERVICE_KEY)
const anthropic = new Anthropic({ apiKey: ANTHROPIC_KEY })

// ── Translation helper ────────────────────────────────────────────────────────

async function translateBothFields(
  productName: string,
  description: string,
  usp: string
): Promise<{ description_hi: string; usp_benefits_hi: string }> {

  const prompt = `You are a veterinary Hindi translator for Indian field sales reps.
Translate the following two fields for the veterinary product "${productName}" into clear, simple Hindi (Devanagari script).

Rules:
- Keep product names, drug names, and brand names in English
- Use simple Hindi that a rural field rep can understand
- Do NOT use overly technical medical Hindi — prefer everyday language
- Keep the same meaning and structure as the English original
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

  const raw = (response.content[0] as { text: string }).text.trim()
  // Strip any accidental markdown fences
  const cleaned = raw.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim()
  const parsed = JSON.parse(cleaned)
  return {
    description_hi:  (parsed.description_hi  || '').trim(),
    usp_benefits_hi: (parsed.usp_benefits_hi || '').trim(),
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`📄  Fetching all products from ${TABLE}...`)

  const { data: rows, error } = await supabase
    .from(TABLE)
    .select('id, product_name, description, usp_benefits')
    .order('id', { ascending: true })

  if (error || !rows) {
    console.error('❌  Supabase fetch error:', error)
    process.exit(1)
  }

  console.log(`✅  Fetched ${rows.length} products\n`)
  if (DRY_RUN) console.log('🔍  DRY RUN — translations will be shown but NOT saved\n')

  let updated = 0
  let skipped = 0
  let failed  = 0

  for (const row of rows) {
    const desc = (row.description  || '').trim()
    const usp  = (row.usp_benefits || '').trim()

    if (!desc && !usp) {
      console.log(`[ID ${row.id}] ${row.product_name} — ⏭️  skipped (no English content)`)
      skipped++
      continue
    }

    try {
      const { description_hi, usp_benefits_hi } = await translateBothFields(
        row.product_name, desc, usp
      )

      console.log(`[ID ${row.id}] ${row.product_name}`)
      console.log(`  description_hi:  ${description_hi.slice(0, 80)}...`)
      console.log(`  usp_benefits_hi: ${usp_benefits_hi.slice(0, 80)}...`)

      if (!DRY_RUN) {
        const { error: updateErr } = await supabase
          .from(TABLE)
          .update({ description_hi, usp_benefits_hi })
          .eq('id', row.id)

        if (updateErr) {
          console.error(`  ❌  DB update failed:`, updateErr.message)
          failed++
        } else {
          updated++
        }
      } else {
        updated++
      }

      // Small delay to avoid rate limits
      await new Promise(r => setTimeout(r, 300))

    } catch (err: unknown) {
      console.error(`  ❌  Translation failed for ID ${row.id}:`, (err as Error).message)
      failed++
    }
  }

  console.log('\n─────────────────────────────')
  console.log(`✅  ${DRY_RUN ? 'Would update' : 'Updated'} : ${updated}`)
  console.log(`⏭️   Skipped                  : ${skipped}`)
  console.log(`❌  Failed                   : ${failed}`)
  if (DRY_RUN) console.log('\n🔍  DRY RUN complete — run without DRY_RUN=true to save')
}

main()
