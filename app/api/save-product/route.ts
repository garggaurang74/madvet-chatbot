import { NextRequest } from 'next/server'
import { getSupabaseClient } from '@/lib/supabase'
import { invalidateProductCache } from '@/lib/productCache'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// ─────────────────────────────────────────────
// AI AUTO-ENRICHMENT
// Generates rich indication + aliases for any new product
// ─────────────────────────────────────────────
async function enrichProduct(product: Record<string, string>): Promise<{
  indication: string
  aliases: string
}> {
  try {
    const prompt = `You are a veterinary product expert for Indian farmers. 
Given this animal healthcare product, generate:
1. "indication" — comprehensive list of conditions, symptoms, diseases this treats. Include English, Hindi, and Hinglish terms farmers commonly use. Separate with commas.
2. "aliases" — all possible names, spellings, misspellings, Hindi names farmers might use to refer to this product or its use. Separate with commas.

Product details:
Name: ${product.product_name}
Category: ${product.category || ''}
Species: ${product.species || ''}
Salt/Composition: ${product.salt_ingredient || ''}
Description: ${product.description || ''}
Current indication: ${product.indication || ''}
Current aliases: ${product.aliases || ''}

Respond ONLY with valid JSON, no explanation:
{"indication": "...", "aliases": "..."}`

    const response = await openai.chat.completions.create({
      model:       'gpt-4o-mini', // cheap, fast, good enough for this task
      messages:    [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens:  600,
    })

    const text = response.choices[0]?.message?.content?.trim() ?? ''
    const clean = text.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean)

    return {
      indication: parsed.indication ?? product.indication ?? '',
      aliases:    parsed.aliases    ?? product.aliases    ?? '',
    }
  } catch (err) {
    console.error('[Enrich] AI enrichment failed, using original values:', err)
    // Fallback — save without enrichment rather than blocking save
    return {
      indication: product.indication ?? '',
      aliases:    product.aliases    ?? '',
    }
  }
}

export async function POST(req: NextRequest) {
  try {
    // FIX: Use ADMIN_SECRET (server-only env) — not NEXT_PUBLIC version
    const authHeader     = req.headers.get('x-admin-secret')
    const expectedSecret = process.env.ADMIN_SECRET

    if (expectedSecret && authHeader !== expectedSecret) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const product  = await req.json()
    const supabase = getSupabaseClient()

    if (!supabase) {
      return Response.json({ error: 'Supabase not configured' }, { status: 500 })
    }

    // Only allow canonical column names — matches DB exactly
    const ALLOWED_FIELDS = [
      'product_name',
      'salt_ingredient',  // FIX: canonical name
      'packaging',        // FIX: canonical name
      'description',
      'category',
      'species',
      'indication',
      'aliases',
      'dosage',
      'usp_benefits',
    ] as const

    const safe: Record<string, string> = {}
    for (const key of ALLOWED_FIELDS) {
      if (product[key] !== undefined && product[key] !== '') {
        safe[key] = String(product[key]).trim()
      }
    }

    if (!safe.product_name) {
      return Response.json({ error: 'product_name is required' }, { status: 400 })
    }

    // AUTO-ENRICH — AI generates rich indication + aliases
    console.log('[Save Product] Enriching product with AI:', safe.product_name)
    const enriched = await enrichProduct(safe)
    safe.indication = enriched.indication
    safe.aliases    = enriched.aliases
    console.log('[Save Product] Enrichment done for:', safe.product_name)

    const { data, error } = await supabase
      .from('products_enriched')
      .insert(safe)
      .select()
      .single()

    if (error) {
      console.error('[Save Product]', error)
      return Response.json({ error: error.message }, { status: 500 })
    }

    // FIX: Invalidate cache so bot picks up new product immediately
    invalidateProductCache()

    return Response.json({ success: true, product: data })
  } catch (err) {
    console.error('[Save Product] Exception:', err)
    return Response.json({ error: String(err) }, { status: 500 })
  }
}
