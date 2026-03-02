// lib/semanticSearch.ts
// pgvector semantic search — Layer 0 (highest intelligence)
// Understands meaning, not just keywords
// "gaay sust rehti hai, khana nahi khati" → finds liver tonic / vitamin even without exact words

import OpenAI from 'openai'
import { getSupabaseClient } from './supabase'
import type { MadvetProduct } from './supabase'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// Cache embeddings per query (process lifetime — resets on cold start)
const embeddingCache = new Map<string, number[]>()

// ─────────────────────────────────────────────
// GENERATE EMBEDDING FOR A TEXT STRING
// ─────────────────────────────────────────────
export async function generateEmbedding(text: string): Promise<number[] | null> {
  const cacheKey = text.slice(0, 200).toLowerCase().trim()
  if (embeddingCache.has(cacheKey)) return embeddingCache.get(cacheKey)!

  try {
    const res = await openai.embeddings.create({
      model: 'text-embedding-3-small',  // 1536 dims, cheap ($0.02/1M tokens), fast
      input: text.slice(0, 500),        // limit input length
    })
    const embedding = res.data[0].embedding
    embeddingCache.set(cacheKey, embedding)
    return embedding
  } catch (err) {
    console.error('[SemanticSearch] Embedding failed:', err)
    return null
  }
}

// ─────────────────────────────────────────────
// BUILD RICH SEARCHABLE TEXT FOR A PRODUCT
// This is what gets embedded — more context = better matches
// ─────────────────────────────────────────────
export function buildProductEmbedText(p: MadvetProduct): string {
  const parts = [
    p.product_name ? `Product: ${p.product_name}` : '',
    p.category     ? `Category: ${p.category}` : '',
    p.species      ? `For animals: ${p.species}` : '',
    p.indication   ? `Used for: ${p.indication}` : '',
    p.description  ? `Description: ${p.description}` : '',
    p.usp_benefits ? `Benefits: ${p.usp_benefits}` : '',
    p.aliases      ? `Also called: ${p.aliases}` : '',
    // NOTE: salt_ingredient intentionally excluded from embedding text
  ]
  return parts.filter(Boolean).join('. ')
}

// ─────────────────────────────────────────────
// SEMANTIC SEARCH via Supabase pgvector RPC
// Returns products ranked by semantic similarity
// ─────────────────────────────────────────────
export async function semanticSearchProducts(
  query:           string,
  matchThreshold = 0.45,   // cosine similarity threshold (0–1, higher = stricter)
  matchCount     = 5
): Promise<MadvetProduct[]> {
  const supabase = getSupabaseClient()
  if (!supabase) return []

  const embedding = await generateEmbedding(query)
  if (!embedding) return []

  try {
    const { data, error } = await supabase.rpc('match_madvet_products', {
      query_embedding: embedding,
      match_threshold: matchThreshold,
      match_count:     matchCount,
    })

    if (error) {
      // If pgvector isn't set up yet, fail silently — other search layers still work
      if (error.message.includes('function') || error.message.includes('does not exist')) {
        console.warn('[SemanticSearch] pgvector not set up yet — run the SQL migration')
      } else {
        console.error('[SemanticSearch] RPC error:', error.message)
      }
      return []
    }

    return (data ?? []) as MadvetProduct[]
  } catch (err) {
    console.error('[SemanticSearch] Exception:', err)
    return []
  }
}

// ─────────────────────────────────────────────
// EMBED AND STORE A SINGLE PRODUCT
// Called from save-product route after enrichment
// ─────────────────────────────────────────────
export async function embedAndStoreProduct(
  productId: number,
  product:   MadvetProduct
): Promise<boolean> {
  const supabase = getSupabaseClient()
  if (!supabase) return false

  const text = buildProductEmbedText(product)
  if (!text.trim()) return false

  const embedding = await generateEmbedding(text)
  if (!embedding) return false

  try {
    const { error } = await supabase
      .from('products_enriched')
      .update({ embedding })
      .eq('id', productId)

    if (error) {
      console.error('[SemanticSearch] Store embedding error:', error.message)
      return false
    }

    console.log(`[SemanticSearch] Embedded product: ${product.product_name}`)
    return true
  } catch (err) {
    console.error('[SemanticSearch] Store exception:', err)
    return false
  }
}
