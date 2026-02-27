/**
 * scripts/bulkUpdateFromCSV.ts
 *
 * Reads the fixed products CSV and updates description, usp_benefits,
 * category, formulation, and salt_ingredient in Supabase for each product.
 *
 * ── HOW TO RUN ───────────────────────────────────────────────────────────────
 *  1. Place this file in:  /scripts/bulkUpdateFromCSV.ts
 *  2. Place the CSV at:    /scripts/products_final.csv
 *  3. Make sure your .env has NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
 *  4. Run:
 *       npx ts-node --project tsconfig.json scripts/bulkUpdateFromCSV.ts
 *
 * ── WHAT IT UPDATES ──────────────────────────────────────────────────────────
 *   - description     (cleaned clinical description)
 *   - usp_benefits    (proper clinical benefits, not label warnings)
 *   - salt_ingredient (typo fixes)
 *   - category        (corrected where wrong)
 *   - formulation     (corrected where wrong)
 *   - updated_at      (timestamp)
 *
 * ── SAFETY ───────────────────────────────────────────────────────────────────
 *   - Updates by ID only — no accidental row mismatches
 *   - Dry-run mode: set DRY_RUN=true to preview without writing
 *   - Only updates fields that changed — skips unchanged rows
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import { parse } from 'csv-parse/sync'

// ── Config ────────────────────────────────────────────────────────────────────
const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY   = process.env.SUPABASE_SERVICE_ROLE_KEY!   // Use service role for updates
const TABLE         = process.env.NEXT_PUBLIC_SUPABASE_TABLE ?? 'products_enriched'
const CSV_PATH      = path.join(__dirname, 'products_final.csv')
const DRY_RUN       = process.env.DRY_RUN === 'true'

// Fields we will update (safe subset — won't touch image_url, video_url, aliases, indication, embedding)
const UPDATE_FIELDS = [
  'description',
  'usp_benefits',
  'salt_ingredient',
  'category',
  'formulation',
] as const

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error('❌  Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env')
    process.exit(1)
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

  // Read CSV
  const csvContent = fs.readFileSync(CSV_PATH, 'utf-8')
  const rows: Record<string, string>[] = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
  })

  console.log(`📄 Loaded ${rows.length} rows from CSV`)
  console.log(DRY_RUN ? '🔍 DRY RUN — no writes will happen\n' : '🚀 LIVE RUN — writing to Supabase\n')

  // Fetch existing rows from Supabase for comparison
  const { data: existing, error: fetchErr } = await supabase
    .from(TABLE)
    .select('id, description, usp_benefits, salt_ingredient, category, formulation')
    .limit(500)

  if (fetchErr || !existing) {
    console.error('❌  Could not fetch existing products:', fetchErr?.message)
    process.exit(1)
  }

  const dbMap = new Map(existing.map((r: any) => [Number(r.id), r]))

  let updated = 0, skipped = 0, notFound = 0

  for (const row of rows) {
    const id    = Number(row.id)
    const dbRow = dbMap.get(id)

    if (!dbRow) {
      console.warn(`⚠️   ID ${id} (${row.product_name}) — not found in DB, skipping`)
      notFound++
      continue
    }

    // Build update payload — only fields that actually changed
    const payload: Record<string, string> = {}
    for (const field of UPDATE_FIELDS) {
      const csvVal = (row[field] ?? '').trim()
      const dbVal  = (dbRow[field]  ?? '').trim()
      if (csvVal && csvVal !== dbVal) {
        payload[field] = csvVal
      }
    }

    if (Object.keys(payload).length === 0) {
      skipped++
      continue
    }

    payload['updated_at'] = new Date().toISOString()

    console.log(`\n[ID ${id}] ${row.product_name}`)
    for (const [k, v] of Object.entries(payload)) {
      if (k === 'updated_at') continue
      console.log(`  ${k}:`)
      console.log(`    OLD: ${(dbRow[k] ?? '').substring(0, 90)}`)
      console.log(`    NEW: ${v.substring(0, 90)}`)
    }

    if (!DRY_RUN) {
      const { error: updateErr } = await supabase
        .from(TABLE)
        .update(payload)
        .eq('id', id)

      if (updateErr) {
        console.error(`  ❌ Update failed: ${updateErr.message}`)
        continue
      }

      // Throttle to avoid rate limits
      await new Promise(r => setTimeout(r, 100))
    }

    updated++
  }

  console.log('\n─────────────────────────────')
  console.log(`✅  Updated : ${updated}`)
  console.log(`⏭️   Skipped : ${skipped} (no changes)`)
  console.log(`⚠️   Missing : ${notFound} (ID not in DB)`)
  if (DRY_RUN) {
    console.log('\n🔍 DRY RUN complete — run without DRY_RUN=true to write changes')
  } else {
    console.log('\n✅  All updates written to Supabase!')
  }
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
