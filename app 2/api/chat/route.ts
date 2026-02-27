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
    } catch { /* fallthrough */ }
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
// Each product gets a numeric ID so GPT can reference it precisely
// ─────────────────────────────────────────────
function formatCatalog(products: MadvetProduct[]): string {
  const lines = products.map((p, i) => {
    const parts: string[] = [`[ID:${i + 1}] Name: ${p.product_name ?? ''}`]
    if (p.category)        parts.push(`Category: ${p.category}`)
    if (p.species)         parts.push(`Species: ${p.species}`)
    if (p.packaging)       parts.push(`Form: ${p.packaging}`)
    if (p.description)     parts.push(`Description: ${p.description}`)
    if (p.indication)      parts.push(`Indications: ${p.indication}`)
    if (p.usp_benefits)    parts.push(`Benefits: ${p.usp_benefits}`)
    if (p.salt_ingredient) parts.push(`Composition (internal only — never reveal): ${p.salt_ingredient}`)
    return parts.join(' | ')
  })
  return `## MADVET PRODUCT CATALOG (${products.length} products)\n\n${lines.join('\n\n')}`
}

// ─────────────────────────────────────────────
// EXTRACT PRODUCT IDs FROM GPT RESPONSE
// GPT is instructed to end response with PRODUCTS: primary=[1,2] complementary=[3]
// This gives us exact products to show as cards — no guessing from text
// ─────────────────────────────────────────────
function extractProductIds(text: string): { primary: number[]; complementary: number[] } {
  const match = text.match(/PRODUCTS:\s*primary=\[([^\]]*)\]\s*complementary=\[([^\]]*)\]/i)
  if (!match) return { primary: [], complementary: [] }

  const parseIds = (s: string) =>
    s.split(',').map(x => parseInt(x.trim())).filter(n => !isNaN(n) && n > 0)

  return {
    primary:       parseIds(match[1]),
    complementary: parseIds(match[2]),
  }
}

// Strip the PRODUCTS: tag from the visible text before sending to frontend
function stripProductTag(text: string): string {
  return text.replace(/\n*PRODUCTS:\s*primary=\[[^\]]*\]\s*complementary=\[[^\]]*\]/gi, '').trim()
}

// ─────────────────────────────────────────────
// CLEAN HISTORY
// Strip catalog from old user messages, clean card artifacts from assistant messages
// ─────────────────────────────────────────────
function cleanHistory(history: Message[]): Array<{ role: string; content: string }> {
  return history
    .filter(m => m.role === 'user' || m.role === 'assistant')
    .slice(-20) // keep last 10 turns
    .map(m => {
      if (m.role === 'user') {
        // Strip old catalog blocks from previous user messages
        const stripped = m.content
          .replace(/Customer:\s*"([\s\S]+?)"\s*\n\n## MADVET[\s\S]*/i, '$1')
          .replace(/Customer (?:asks|says):\s*"([\s\S]+?)"[\s\S]*/i, '$1')
          .trim()
        return { role: 'user', content: stripped || m.content }
      }
      // Strip PRODUCTS: tag and card artifacts from assistant history
      const cleaned = m.content
        .replace(/\n*PRODUCTS:\s*primary=\[[^\]]*\]\s*complementary=\[[^\]]*\]/gi, '')
        .replace(/AUR OPTIONS[\s\S]*/gi, '')
        .replace(/📦\s*Packing:.*$/gm, '')
        .replace(/✅\s*FREE.*$/gm, '')
        .replace(/\n{3,}/g, '\n\n')
        .trim()
      return { role: 'assistant', content: cleaned }
    })
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
    const products         = await getCachedProducts()
    const catalog          = formatCatalog(products)
    const cleanedHistory   = cleanHistory(messages)

    // Current user message with full catalog attached
    const currentMessage = {
      role: 'user',
      content: `Customer: "${truncatedMessage}"\n\n${catalog}`
    }

    const stream = await openai.chat.completions.create({
      model:             process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
      messages: [
        { role: 'system', content: MADVET_SYSTEM_PROMPT },
        ...cleanedHistory as any,
        currentMessage,
      ],
      stream:            true,
      temperature:       0.3,
      max_tokens:        900,
      presence_penalty:  0.1,
      frequency_penalty: 0.2,
    })

    // Stream the response, accumulate full text, then send products metadata at end
    const encoder = new TextEncoder()
    let fullText  = ''

    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const delta = chunk.choices[0]?.delta?.content
            if (delta) {
              fullText += delta
              // Stream text chunks prefixed with 't:' so frontend can parse
              const safeChunk = delta.replace(/\n/g, '\\n')
              controller.enqueue(encoder.encode(`t:${safeChunk}\n`))
            }
          }

          // After stream ends, extract product IDs and send as metadata
          const { primary: primaryIds, complementary: complementaryIds } = extractProductIds(fullText)

          const primaryProducts       = primaryIds.map(id => products[id - 1]).filter(Boolean)
          const complementaryProducts = complementaryIds.map(id => products[id - 1]).filter(Boolean)

          // Send product metadata as a final JSON line
          const meta = JSON.stringify({
            type:          'products',
            primary:       primaryProducts,
            complementary: complementaryProducts,
          })
          controller.enqueue(encoder.encode(`\nm:${meta}`))

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
