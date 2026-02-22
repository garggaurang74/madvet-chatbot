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
// All 89 products in compact format ~15k tokens
// GPT sees everything and picks what's relevant
// ─────────────────────────────────────────────
function formatProduct(p: MadvetProduct): string {
  const parts: string[] = []
  if (p.product_name)    parts.push(`Name: ${p.product_name}`)
  if (p.category)        parts.push(`Category: ${p.category}`)
  if (p.species)         parts.push(`Species: ${p.species}`)
  if (p.packaging)       parts.push(`Form: ${p.packaging}`)
  if (p.description)     parts.push(`Description: ${p.description}`)
  if (p.indication)      parts.push(`Indications: ${p.indication}`)
  if (p.usp_benefits)    parts.push(`Benefits: ${p.usp_benefits}`)
  // Composition: for GPT clinical reasoning only (pregnancy, withdrawal, side effects)
  // GPT is instructed never to reveal this to the customer
  if (p.salt_ingredient) parts.push(`Composition (internal reasoning only — never reveal to customer): ${p.salt_ingredient}`)
  return parts.join(' | ')
}

function buildProductCatalog(products: MadvetProduct[]): string {
  const formatted = products.map((p, i) => `[${i + 1}] ${formatProduct(p)}`).join('\n\n')
  return `## MADVET COMPLETE PRODUCT CATALOG (${products.length} products)\n\n${formatted}`
}

// ─────────────────────────────────────────────
// CLEAN ASSISTANT MESSAGES
// Strips old card-format UI artifacts from history
// so GPT doesn't copy that style in new responses
// ─────────────────────────────────────────────
function cleanAssistantMessage(content: string): string {
  return content
    // Remove product card header lines like "ProductName\nCategory\nDescription"
    .replace(/^.+\n(Antibiotic|Anthelmintic|Vitamin|Probiotic|Ectoparasiticide|Antidiarrheal|Dermatological|Anti-inflammatory|Reproductive|Antihistamine|Udder Care)\n.+$/gm, '')
    // Remove packing lines
    .replace(/📦\s*Packing:.*$/gm, '')
    // Remove "AUR OPTIONS" and everything after it
    .replace(/AUR OPTIONS[\s\S]*/g, '')
    // Remove "FREE syringe" style lines
    .replace(/✅\s*FREE.*$/gm, '')
    // Clean up extra blank lines left behind
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

// ─────────────────────────────────────────────
// HISTORY MANAGEMENT
// Keeps last N turns, strips catalog from old user messages,
// cleans card-format artifacts from old assistant messages
// ─────────────────────────────────────────────
const MAX_TURNS = 10 // keep last 10 conversation turns (20 messages)

function buildApiMessages(history: Message[], currentUserMessage: string, catalog: string): Array<{ role: string; content: string }> {
  // Filter to only user/assistant messages (no system)
  const conversational = history.filter(m => m.role === 'user' || m.role === 'assistant')

  // Keep last MAX_TURNS turns
  const recent = conversational.slice(-(MAX_TURNS * 2))

  const cleaned = recent.map(m => {
    if (m.role === 'assistant') {
      // Clean old card-format artifacts from assistant history
      return { role: 'assistant', content: cleanAssistantMessage(m.content) }
    }
    if (m.role === 'user') {
      // Strip old catalog from previous user messages — only current message needs it
      // Old format was: Customer asks: "..." \n\n## MADVET...
      const stripped = m.content
        .replace(/Customer (?:asks|says):\s*"(.+?)"[\s\S]*/s, '$1')
        .trim()
      return { role: 'user', content: stripped || m.content }
    }
    return m
  })

  // Add current user message WITH catalog attached
  cleaned.push({
    role: 'user',
    content: `Customer: "${currentUserMessage}"\n\n${catalog}`
  })

  return cleaned
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

    // Fetch all products — cached after first DB call
    const products = await getCachedProducts()
    const catalog  = buildProductCatalog(products)

    // Build clean message history + attach catalog to current message only
    const apiMessages = buildApiMessages(messages, truncatedMessage, catalog)

    // Stream from GPT
    const stream = await openai.chat.completions.create({
      model:             process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
      messages: [
        { role: 'system', content: MADVET_SYSTEM_PROMPT },
        ...apiMessages as any,
      ],
      stream:            true,
      temperature:       0.3,  // lower = more consistent, less hallucination
      max_tokens:        800,  // keep responses concise and mobile-friendly
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
