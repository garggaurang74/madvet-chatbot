import { NextRequest } from 'next/server'
import OpenAI from 'openai'
import { getCachedProducts } from '@/lib/productCache'
import { searchProducts, searchComplementary, isFollowUpMessage } from '@/lib/productSearch'
import { semanticSearchProducts } from '@/lib/semanticSearch'
import { expandQuery } from '@/lib/queryExpander'
import { MADVET_SYSTEM_PROMPT } from '@/lib/systemPrompt'
import type { MadvetProduct } from '@/lib/supabase'
import { Redis } from '@upstash/redis'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// ─────────────────────────────────────────────
// RATE LIMITER
// ─────────────────────────────────────────────
const redis = process.env.UPSTASH_REDIS_REST_URL
  ? new Redis({
      url:   process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN ?? '',
    })
  : null

const RATE_LIMIT  = 30
const RATE_WINDOW = 60

export interface Message {
  role:    'user' | 'assistant' | 'system'
  content: string
}

const inMemoryMap = new Map<string, { count: number; resetAt: number }>()

async function checkRateLimit(ip: string): Promise<{ allowed: boolean; remaining: number }> {
  const key = `rate-limit:${ip}`
  const now = Math.floor(Date.now() / 1000)

  if (redis) {
    try {
      const existing = await redis.get(key)
      const count    = existing ? parseInt(String(existing)) : 0
      if (count >= RATE_LIMIT) return { allowed: false, remaining: 0 }
      const newCount = count + 1
      await redis.setex(key, RATE_WINDOW, String(newCount))
      return { allowed: true, remaining: RATE_LIMIT - newCount }
    } catch {
      // fallthrough to in-memory
    }
  }

  const entry = inMemoryMap.get(ip)
  if (!entry || now > entry.resetAt) {
    inMemoryMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW })
    return { allowed: true, remaining: RATE_LIMIT - 1 }
  }
  if (entry.count >= RATE_LIMIT) return { allowed: false, remaining: 0 }
  entry.count++
  return { allowed: true, remaining: RATE_LIMIT - entry.count }
}

// ─────────────────────────────────────────────
// SMART PRODUCT MERGING
// Combines semantic + keyword results, deduplicates, preserves ranking
// ─────────────────────────────────────────────
function mergeProductResults(
  semantic:  MadvetProduct[],
  keyword:   MadvetProduct[],
  topK:      number
): MadvetProduct[] {
  const seen     = new Set<string>()
  const combined: MadvetProduct[] = []

  const key = (p: MadvetProduct) =>
    `${(p.product_name ?? '').toLowerCase()}||${(p.category ?? '').toLowerCase()}`

  // Semantic results first (highest confidence) — give them priority
  for (const p of semantic) {
    const k = key(p)
    if (!seen.has(k)) { seen.add(k); combined.push(p) }
  }
  // Then keyword results that weren't already found
  for (const p of keyword) {
    const k = key(p)
    if (!seen.has(k)) { seen.add(k); combined.push(p) }
  }

  return combined.slice(0, topK)
}

// ─────────────────────────────────────────────
// PRODUCT CONTEXT BUILDER
// Primary + Complementary sections — no salt/composition
// ─────────────────────────────────────────────
function formatProduct(p: MadvetProduct, index: number): string {
  const parts: string[] = [`[Product ${index + 1}]`]
  if (p.product_name) parts.push(`Name: ${p.product_name}`)
  if (p.category)     parts.push(`Category: ${p.category}`)
  if (p.species)      parts.push(`For Species: ${p.species}`)
  if (p.indication)   parts.push(`Used For: ${p.indication}`)
  if (p.packaging)    parts.push(`Packing: ${p.packaging}`)
  if (p.description)  parts.push(`Details: ${p.description}`)
  if (p.usp_benefits) parts.push(`Benefits: ${p.usp_benefits}`)
  if (p.aliases)      parts.push(`Also known as: ${p.aliases}`)
  // NO salt_ingredient / composition — never exposed to bot
  return parts.join('\n')
}

function formatProductContext(
  primary:       MadvetProduct[],
  complementary: MadvetProduct[]
): string {
  const sections: string[] = []

  if (primary.length > 0) {
    sections.push(
      '## MADVET PRIMARY PRODUCTS\n',
      primary.map((p, i) => formatProduct(p, i)).join('\n\n---\n\n')
    )
  } else {
    sections.push('## MADVET PRIMARY PRODUCTS\nNO_PRODUCTS_FOUND')
  }

  if (complementary.length > 0) {
    sections.push(
      '\n\n## MADVET COMPLEMENTARY PRODUCTS\n(Suggest when clinically relevant for recovery, immunity, or enhanced results)\n',
      complementary.map((p, i) => formatProduct(p, i)).join('\n\n---\n\n')
    )
  }

  sections.push('\n\nOnly recommend products listed above.')
  return sections.join('')
}

// ─────────────────────────────────────────────
// HISTORY MANAGEMENT
// ─────────────────────────────────────────────
const MAX_HISTORY  = 30
const SLIDING_LAST = 20

function buildApiMessages(history: Message[], enrichedUserMessage: Message): Message[] {
  let trimmed: Message[]
  if (history.length > MAX_HISTORY) {
    trimmed = [history[0], ...history.slice(-SLIDING_LAST)]
  } else {
    trimmed = [...history]
  }

  let lastUserIdx = -1
  for (let i = trimmed.length - 1; i >= 0; i--) {
    if (trimmed[i].role === 'user') { lastUserIdx = i; break }
  }

  if (lastUserIdx !== -1) {
    const result        = [...trimmed]
    result[lastUserIdx] = enrichedUserMessage
    return result
  }

  return [...trimmed, enrichedUserMessage]
}

function getPreviousQuery(messages: Message[]): string | null {
  const userMessages = messages
    .filter((m): m is Message & { role: 'user' } => m.role === 'user')
    .reverse()
  for (const m of userMessages) {
    const raw = m.content.replace(/Customer (?:says|asks): "(.+?)"[\s\S]*/, '$1').trim()
    if (raw && !isFollowUpMessage(raw) && raw.length > 3) return raw
  }
  return null
}

// ─────────────────────────────────────────────
// MAIN HANDLER
// ─────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      req.headers.get('x-real-ip') ??
      'unknown'

    const { allowed, remaining: remainingCount } = await checkRateLimit(ip)
    if (!allowed) {
      return Response.json(
        { error: 'Bahut zyada requests. Ek minute baad try karein 🙏' },
        { status: 429, headers: { 'Retry-After': '60' } }
      )
    }

    const body                = await req.json()
    const messages: Message[] = Array.isArray(body.messages) ? body.messages : []
    const latestMessage       = typeof body.latestMessage === 'string' ? body.latestMessage : ''

    if (!latestMessage.trim()) {
      return Response.json({ error: 'Message empty hai' }, { status: 400 })
    }

    const truncatedMessage = latestMessage.slice(0, 2000)
    const isFollowUp       = isFollowUpMessage(truncatedMessage)
    const searchQuery      = isFollowUp
      ? (getPreviousQuery(messages) ?? truncatedMessage)
      : truncatedMessage

    // ── PARALLEL: products + LLM query expansion + semantic search ──
    // All three fire at the same time — total latency = slowest of the three
    const [products, expanded, semanticResults] = await Promise.all([
      getCachedProducts(),
      expandQuery(searchQuery),
      // Semantic search on the raw user query — finds products by meaning, not keywords
      // Falls back silently if pgvector not set up yet
      semanticSearchProducts(searchQuery, 0.40, 5),
    ])

    const effectivelyFollowUp = isFollowUp || expanded.isFollowUp
    const isCategory = /konsa|kaunsa|kya (dein|use|lagayein|dete|deta|doon)|which product|koi dawa|koi dawai|batao|suggest|recommend|best|sahi|kaun si|kaun sa|kya karein|kya karun|kya lagaun/i.test(truncatedMessage)

    // ── KEYWORD SEARCH (existing 3-layer system) ──
    const keywordResults = searchProducts(
      products,
      searchQuery,
      expanded,
      isCategory ? 6 : 5
    )

    // ── SMART MERGE: Semantic + Keyword ──
    // Semantic gets priority (it understands meaning)
    // Keyword fills in what semantic might miss (exact name matches, new products without embeddings)
    const primaryMatched = mergeProductResults(semanticResults, keywordResults, isCategory ? 6 : 5)

    // ── COMPLEMENTARY SEARCH ──
    const isSpecificProductQuery =
      primaryMatched.length === 1 &&
      truncatedMessage.toLowerCase().includes(
        (primaryMatched[0].product_name ?? '').toLowerCase().split(' ')[0]
      )

    const complementaryMatched =
      !effectivelyFollowUp && !isSpecificProductQuery
        ? searchComplementary(products, primaryMatched, expanded)
        : []

    const context = formatProductContext(primaryMatched, complementaryMatched)

    const enrichedContent = effectivelyFollowUp
      ? `Customer says: "${truncatedMessage}"\n\n[FOLLOW-UP — build on previous answer]\n${context}`
      : `Customer asks: "${truncatedMessage}"\n\n[NEW QUERY]\n${context}`

    const enrichedUserMessage: Message = { role: 'user', content: enrichedContent }
    const apiMessages = buildApiMessages(messages, enrichedUserMessage)

    // ── STREAM FROM GPT-4o ──
    const stream = await openai.chat.completions.create({
      model:             process.env.OPENAI_MODEL ?? 'gpt-4o',
      messages: [
        { role: 'system', content: MADVET_SYSTEM_PROMPT },
        ...apiMessages.map((m) => ({ role: m.role, content: m.content })),
      ],
      stream:            true,
      temperature:       0.5,
      max_tokens:        1400,
      presence_penalty:  0.1,
      frequency_penalty: 0.2,
    })

    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const delta = chunk.choices[0]?.delta?.content
            if (delta) controller.enqueue(encoder.encode(delta))
          }
        } catch (e) {
          console.error('[Madvet] Stream error:', e)
        } finally {
          controller.close()
        }
      },
    })

    return new Response(readable, {
      headers: {
        'Content-Type':          'text/event-stream',
        'Cache-Control':         'no-cache, no-store',
        'Connection':            'keep-alive',
        'X-RateLimit-Remaining': String(remainingCount),
      },
    })
  } catch (err) {
    console.error('[Madvet] Chat API error:', err)
    return Response.json(
      {
        error: 'Technical issue — please dobara try karein 🙏',
        ...(process.env.NODE_ENV === 'development' && {
          debug: err instanceof Error ? err.message : String(err),
        }),
      },
      { status: 500 }
    )
  }
}
