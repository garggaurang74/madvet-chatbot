import { NextRequest } from 'next/server'
import OpenAI from 'openai'
import { getCachedProducts } from '@/lib/productCache'
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
// FORMAT FULL PRODUCT CATALOG
// Compact format — all 89 products fit in ~15k tokens
// GPT sees everything and picks what's relevant
// ─────────────────────────────────────────────
function formatProduct(p: MadvetProduct): string {
  const lines: string[] = []
  if (p.product_name)    lines.push(`Name: ${p.product_name}`)
  if (p.category)        lines.push(`Category: ${p.category}`)
  if (p.species)         lines.push(`Species: ${p.species}`)
  if (p.packaging)       lines.push(`Form: ${p.packaging}`)
  if (p.description)     lines.push(`Description: ${p.description}`)
  if (p.indication)      lines.push(`Indications: ${p.indication}`)
  if (p.usp_benefits)    lines.push(`Benefits: ${p.usp_benefits}`)
  // Composition: visible to GPT for clinical reasoning (pregnancy, withdrawal, side effects)
  // GPT is instructed never to reveal salt names to the customer
  if (p.salt_ingredient) lines.push(`Composition (internal use only — never reveal to customer): ${p.salt_ingredient}`)
  return lines.join(' | ')
}

function buildProductCatalog(products: MadvetProduct[]): string {
  const lines = products.map((p, i) => `[${i + 1}] ${formatProduct(p)}`)
  return `## MADVET COMPLETE PRODUCT CATALOG (${products.length} products)\n\n${lines.join('\n\n')}`
}

// ─────────────────────────────────────────────
// HISTORY MANAGEMENT
// ─────────────────────────────────────────────
const MAX_HISTORY  = 20
const SLIDING_LAST = 16

function buildApiMessages(history: Message[], latestUserMessage: Message): Message[] {
  // Keep conversation history but cap it to avoid context overflow
  let trimmed: Message[]
  if (history.length > MAX_HISTORY) {
    trimmed = [history[0], ...history.slice(-SLIDING_LAST)]
  } else {
    trimmed = [...history]
  }

  // Replace the last user message with our enriched version
  let lastUserIdx = -1
  for (let i = trimmed.length - 1; i >= 0; i--) {
    if (trimmed[i].role === 'user') { lastUserIdx = i; break }
  }

  if (lastUserIdx !== -1) {
    const result        = [...trimmed]
    result[lastUserIdx] = latestUserMessage
    return result
  }

  return [...trimmed, latestUserMessage]
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

    // Fetch all products (cached — no DB hit after first request)
    const products = await getCachedProducts()
    const catalog  = buildProductCatalog(products)

    // Enrich the user message with the full catalog
    // GPT reads the query + entire catalog and decides what's relevant
    const enrichedContent = `Customer: "${truncatedMessage}"\n\n${catalog}`
    const enrichedUserMessage: Message = { role: 'user', content: enrichedContent }
    const apiMessages = buildApiMessages(messages, enrichedUserMessage)

    // Stream from GPT-4o
    const stream = await openai.chat.completions.create({
      model:             process.env.OPENAI_MODEL ?? 'gpt-4o',
      messages: [
        { role: 'system', content: MADVET_SYSTEM_PROMPT },
        ...apiMessages.map((m) => ({ role: m.role, content: m.content })),
      ],
      stream:            true,
      temperature:       0.4,
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
