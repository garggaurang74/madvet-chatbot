import { NextRequest } from 'next/server'
import OpenAI from 'openai'
import { getCachedProducts } from '@/lib/productCache'
import { searchProducts, isFollowUpMessage } from '@/lib/productSearch'
import { MADVET_SYSTEM_PROMPT } from '@/lib/systemPrompt'
import type { MadvetProduct } from '@/lib/supabase'
import { Redis } from '@upstash/redis'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// ─────────────────────────────────────────────
// RATE LIMITER
// ─────────────────────────────────────────────
const redis = process.env.UPSTASH_REDIS_REST_URL
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
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
      const existing  = await redis.get(key)
      const count     = existing ? parseInt(String(existing)) : 0
      if (count >= RATE_LIMIT) return { allowed: false, remaining: 0 }
      const newCount  = count + 1
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
// PRODUCT CONTEXT BUILDER
// Max 3 products — no salt/composition
// ─────────────────────────────────────────────
function formatProductContext(matched: MadvetProduct[]): string {
  if (matched.length === 0) {
    return 'NO_MADVET_PRODUCTS_FOUND'
  }

  const lines = matched.map((p, i) => {
    const parts: string[] = [`[Product ${i + 1}]`]
    if (p.product_name) parts.push(`Name: ${p.product_name}`)
    if (p.category)     parts.push(`Category: ${p.category}`)
    if (p.species)      parts.push(`For Species: ${p.species}`)
    if (p.indication)   parts.push(`Used For: ${p.indication}`)
    if (p.packaging)    parts.push(`Packing: ${p.packaging}`)
    if (p.description)  parts.push(`Details: ${p.description}`)
    if (p.usp_benefits) parts.push(`Benefits: ${p.usp_benefits}`)
    if (p.aliases)      parts.push(`Also known as: ${p.aliases}`)
    // NO salt_ingredient, NO dosage
    return parts.join('\n')
  })

  return [
    '## MADVET MATCHED PRODUCTS\n',
    lines.join('\n\n---\n\n'),
    '\n\nOnly recommend products listed above.',
  ].join('')
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

// ─────────────────────────────────────────────
// SMART SEARCH QUERY
// For follow-ups, use last substantive query for product search
// ─────────────────────────────────────────────
function getSearchQuery(latestMessage: string, messages: Message[]): string {
  if (!isFollowUpMessage(latestMessage)) return latestMessage

  // Walk back through history to find last real query
  const historyUserMessages = messages
    .filter((m): m is Message & { role: 'user' } => m.role === 'user')
    .reverse()

  for (const m of historyUserMessages) {
    // Strip injected context from stored messages to get raw query
    const raw = m.content
      .replace(/Customer (says|asks): "(.+?)"\n[\s\S]*/, '$2')
      .trim()
    if (raw && !isFollowUpMessage(raw) && raw.length > 3) {
      return raw
    }
  }

  return latestMessage
}

// ─────────────────────────────────────────────
// MAIN HANDLER
// ─────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    // Rate limit
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

    // Parse body
    const body                = await req.json()
    const messages: Message[] = Array.isArray(body.messages) ? body.messages : []
    const latestMessage       = typeof body.latestMessage === 'string' ? body.latestMessage : ''

    if (!latestMessage.trim()) {
      return Response.json({ error: 'Message empty hai' }, { status: 400 })
    }

    const truncatedMessage = latestMessage.slice(0, 2000)

    // Smart product search — uses topic from history for follow-ups
    const products      = await getCachedProducts()
    const searchQuery   = getSearchQuery(truncatedMessage, messages)
    const matched       = searchProducts(products, searchQuery, 3)
    const context       = formatProductContext(matched)

    // Detect follow-up
    const isFollowUp    = isFollowUpMessage(truncatedMessage)

    const enrichedContent = isFollowUp
      ? `Customer says: "${truncatedMessage}"

[FOLLOW-UP — build on previous answer, do not repeat full product info]
${context}`
      : `Customer asks: "${truncatedMessage}"

[NEW QUERY]
${context}`

    const enrichedUserMessage: Message = { role: 'user', content: enrichedContent }
    const apiMessages = buildApiMessages(messages, enrichedUserMessage)

    // Stream from OpenAI
    const stream = await openai.chat.completions.create({
      model:             process.env.OPENAI_MODEL ?? 'gpt-4o',
      messages: [
        { role: 'system', content: MADVET_SYSTEM_PROMPT },
        ...apiMessages.map((m) => ({ role: m.role, content: m.content })),
      ],
      stream:            true,
      temperature:       0.5,      // lower = more consistent, less hallucination
      max_tokens:        1200,     // was 700 — allows complete answers
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
