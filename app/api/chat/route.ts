import { NextRequest } from 'next/server'
import OpenAI from 'openai'
import { getCachedProducts } from '@/lib/productCache'
import { searchProducts, isFollowUpMessage } from '@/lib/productSearch'
import { MADVET_SYSTEM_PROMPT } from '@/lib/systemPrompt'
import type { MadvetProduct } from '@/lib/supabase'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────
export interface Message {
  role: 'user' | 'assistant' | 'system'
  content: string
}

// ─────────────────────────────────────────────
// RATE LIMITER
// ─────────────────────────────────────────────
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT  = 30
const RATE_WINDOW = 60_000 // 1 minute

function checkRateLimit(ip: string): { allowed: boolean; remaining: number } {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW })
    return { allowed: true, remaining: RATE_LIMIT - 1 }
  }

  if (entry.count >= RATE_LIMIT) {
    return { allowed: false, remaining: 0 }
  }

  entry.count++
  return { allowed: true, remaining: RATE_LIMIT - entry.count }
}

// ─────────────────────────────────────────────
// PRODUCT CONTEXT BUILDER
// FIX: Removed remaining catalog — send only matched products
// Saves ~10,000+ tokens per request at scale
// ─────────────────────────────────────────────
const MAX_REMAINING_PRODUCTS = 12 // safety cap if needed in future

function formatProductContext(matched: MadvetProduct[]): string {
  if (matched.length === 0) {
    return 'No Madvet products found matching this query.'
  }

  const formatOne = (p: MadvetProduct, i: number): string => {
    const lines: string[] = [`[Product ${i + 1}]`]
    if (p.product_name)                        lines.push(`Name: ${p.product_name}`)
    if (p.category)                            lines.push(`Category: ${p.category}`)
    if (p.species)                             lines.push(`For Species: ${p.species}`)
    if (p.indication)                          lines.push(`Used For: ${p.indication}`)
    if (p.packaging || (p as any).packing)     lines.push(`Packing: ${p.packaging || (p as any).packing}`)
    if (p.description)                         lines.push(`Details: ${p.description}`)
    if (p.usp_benefits)                        lines.push(`Benefits: ${p.usp_benefits}`)
    if (p.aliases)                             lines.push(`Also known as: ${p.aliases}`)
    // ❌ No salt / composition / dosage
    return lines.join('\n')
  }

  return [
    '## MADVET MATCHED PRODUCTS\n',
    matched.map((p, i) => formatOne(p, i + 1)).join('\n\n---\n\n'),
    '\n\nIMPORTANT: Only recommend products listed above. If none match, say no product is available.',
  ].join('')
}

// ─────────────────────────────────────────────
// CONVERSATION HISTORY MANAGEMENT  
// ─────────────────────────────────────────────
const MAX_HISTORY  = 30
const SLIDING_LAST = 20

function buildApiMessages(
  history: Message[],
  enrichedUserMessage: Message
): Message[] {
  let trimmed: Message[]

  // Trim history if too long
  if (history.length > MAX_HISTORY) {
    const first  = history[0]
    const recent = history.slice(-SLIDING_LAST)
    trimmed = [first, ...recent]
  } else {
    trimmed = [...history]
  }

  // FIX: Find and replace the LAST user message specifically
  // Don't blindly replace last item — it may be an assistant message
  const lastUserIdx = [...trimmed]
    .map((m, i) => ({ m, i }))
    .filter(({ m }) => m.role === 'user')
    .at(-1)?.i ?? -1

  if (lastUserIdx !== -1) {
    // Replace the last user message with enriched version
    const result = [...trimmed]
    result[lastUserIdx] = enrichedUserMessage
    return result
  }

  // No user message found — append
  return [...trimmed, enrichedUserMessage]
}

// ─────────────────────────────────────────────
// MAIN HANDLER
// ─────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    // ── Rate limit ──────────────────────────
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      req.headers.get('x-real-ip') ??
      'unknown'

    const { allowed, remaining: remainingCount } = checkRateLimit(ip)

    if (!allowed) {
      return Response.json(
        { error: 'Bahut zyada requests aa gayi hain. Ek minute baad dobara try karein 🙏' },
        {
          status: 429,
          headers: { 'Retry-After': '60', 'X-RateLimit-Remaining': '0' },
        }
      )
    }

    // ── Parse body ──────────────────────────
    const body = await req.json()
    const messages: Message[] = Array.isArray(body.messages) ? body.messages : []
    const latestMessage: string = typeof body.latestMessage === 'string'
      ? body.latestMessage
      : ''

    if (!latestMessage.trim()) {
      return Response.json(
        { error: 'Message empty hai' },
        { status: 400 }
      )
    }

    // Truncate to prevent abuse
    const truncatedMessage = latestMessage.slice(0, 2000)

    // ── Product search ──────────────────────
    const products = await getCachedProducts()
    const matched  = searchProducts(products, truncatedMessage, 6)

    // FIX: Only send matched products — no remaining catalog
    const productContext = formatProductContext(matched)

    // ── Build enriched user message ───────────
    const isFollowUp = isFollowUpMessage(truncatedMessage)

    const enrichedContent = isFollowUp
      ? `[FOLLOW-UP MESSAGE]
MADVET PRODUCT CONTEXT (for reference):
${productContext}

Customer says: "${truncatedMessage}"

Respond concisely. Build on previous answer. Do not repeat full product intro.`
      : `[NEW QUERY]
MADVET PRODUCT CONTEXT — Recommend a single most relevant product:

${productContext}

Customer asks: "${truncatedMessage}"`

    const enrichedUserMessage: Message = {
      role:    'user',
      content: enrichedContent,
    }

    // ── Build final message array ─────────────
    // FIX: Pass history WITHOUT the latest raw message
    // The latest message is already inside enrichedUserMessage
    const historyWithoutLatest = messages.slice(0, -1)
    const apiMessages = buildApiMessages(historyWithoutLatest, enrichedUserMessage)

    // ── OpenAI streaming call ───────────────
    const model = process.env.OPENAI_MODEL ?? 'gpt-4o'

    const stream = await openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: MADVET_SYSTEM_PROMPT },
        ...apiMessages.map((m) => ({
          role: m.role as 'user' | 'assistant' | 'system',
          content: m.content,
        })),
      ],
      stream: true,
      temperature: 0.65,   // slightly creative but grounded
      max_tokens: 700,     // concise for mobile
      presence_penalty: 0.1,
      frequency_penalty: 0.1,
    })

    // ── Stream response ─────────────────────
    const encoder = new TextEncoder()

    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const delta = chunk.choices[0]?.delta?.content
            if (delta) {
              controller.enqueue(encoder.encode(delta))
            }
          }
        } catch (streamErr) {
          console.error('[Madvet] Stream error:', streamErr)
        } finally {
          controller.close()
        }
      },
    })

    return new Response(readable, {
      headers: {
        'Content-Type':            'text/event-stream',
        'Cache-Control':           'no-cache, no-store',
        'Connection':              'keep-alive',
        'X-RateLimit-Remaining':   String(remainingCount),
      },
    })

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[Madvet] Chat API error:', err)

    const isDev = process.env.NODE_ENV === 'development'

    return Response.json(
      {
        error: 'Thoda technical issue aa gaya — please dobara try karein 🙏',
        ...(isDev && { debug: message }),
      },
      { status: 500 }
    )
  }
}
