import { NextRequest } from 'next/server'
import OpenAI from 'openai'
import { fetchAllProducts } from '@/lib/supabase'
import { searchProducts } from '@/lib/productSearch'
import { MADVET_SYSTEM_PROMPT } from '@/lib/systemPrompt'
import type { MadvetProduct } from '@/lib/supabase'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export interface Message {
  role: 'user' | 'assistant' | 'system'
  content: string
}

const MAX_HISTORY = 25
const SLIDING_LAST = 20

// Simple in-memory rate limiter (resets on cold start — good enough for serverless)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT = 30        // max requests
const RATE_WINDOW = 60_000   // per 60 seconds

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW })
    return true
  }
  if (entry.count >= RATE_LIMIT) return false
  entry.count++
  return true
}

function formatProductContext(products: MadvetProduct[]): string {
  if (products.length === 0) return 'No Madvet products available.'
  return products
    .map((p, i) => {
      const lines: string[] = [`[Product ${i + 1}]`]
      if (p.product_name)                    lines.push(`Name: ${p.product_name}`)
      if (p.salt_ingredient)                   lines.push(`Composition: ${p.salt_ingredient}`)
      if (p.category)                        lines.push(`Category: ${p.category}`)
      if (p.species)                         lines.push(`For Species: ${p.species}`)
      if (p.indication)                      lines.push(`Used For: ${p.indication}`)
      if (p.packaging)                        lines.push(`Packing: ${p.packaging}`)
      if (p.dosage)                          lines.push(`Dosage: ${p.dosage}`)
      if (p.description)                     lines.push(`Details: ${p.description}`)
      if (p.usp_benefits)                    lines.push(`Benefits: ${p.usp_benefits}`)
      if (p.aliases)                         lines.push(`Also known as: ${p.aliases}`)
      return lines.join('\n')
    })
    .join('\n\n---\n\n')
}

function truncate(text: string, maxLen: number): string {
  return text.length <= maxLen ? text : text.slice(0, maxLen) + '...'
}

export async function POST(req: NextRequest) {
  try {
    // Rate limiting
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 
               req.headers.get('x-real-ip') ?? 
               'unknown'
    
    if (!checkRateLimit(ip)) {
      return new Response(
        JSON.stringify({ error: 'Bahut zyada requests aa gayi hain. Thoda wait karein 🙏' }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const body = await req.json()
    const messages: Message[] = body.messages ?? []
    const latestMessage: string = body.latestMessage ?? ''

    if (!latestMessage.trim()) {
      return new Response(
        JSON.stringify({ error: 'Message empty hai' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const truncatedMessage = truncate(latestMessage, 2000)

    const products = await fetchAllProducts()
    const matched = searchProducts(products, truncatedMessage, 5)

    // Matched products first, then remaining — AI always has full catalog
    const matchedKeys = new Set(
      matched.map((p) => (p.product_name || '') + (p.salt_ingredient || ''))
    )
    const remaining = products.filter(
      (p) => !matchedKeys.has((p.product_name || '') + (p.salt_ingredient || ''))
    )
    const toInject = [...matched, ...remaining]
    const productBlock = formatProductContext(toInject)

    // Detect if it's a follow-up (short message, no product name, references previous)
    const isFollowUp = truncatedMessage.length < 60 && (
      /^(aur|dose|kitna|kab|kaise|theek|haan|nahi|ok|acha|samajh|batao|explain|details)/i.test(truncatedMessage) ||
      /^(और|खुराक|कितना|कब|कैसे|ठीक|हाँ|नहीं|ओके|अच्छा|बताओ)/u.test(truncatedMessage)
    )

    const injectedContent = isFollowUp
      ? `"""
MADVET PRODUCT CONTEXT (for reference — customer is asking a follow-up):
${productBlock}

FOLLOW-UP MESSAGE: ${truncatedMessage}
(This is a follow-up — respond concisely building on previous answer, do not repeat full product intro)
"""`
      : `"""
MADVET PRODUCT CONTEXT — ALL Madvet products listed below. Use clinical knowledge to pick the most relevant for this query:

${productBlock}

CUSTOMER MESSAGE: ${truncatedMessage}
"""`

    const userMessageForApi: Message = {
      role: 'user',
      content: injectedContent,
    }

    // Sliding window context management
    let apiMessages: Message[] = []
    if (messages.length > MAX_HISTORY) {
      const first = messages[0]
      const rest = messages.slice(-SLIDING_LAST)
      apiMessages = [first, ...rest]
    } else {
      apiMessages = [...messages]
    }

    // Replace last user message with enriched version
    const lastIdx = apiMessages.length - 1
    const last = apiMessages[lastIdx]
    if (last?.role === 'user' && last.content === latestMessage) {
      apiMessages[lastIdx] = userMessageForApi
    } else {
      apiMessages.push(userMessageForApi)
    }

    const openaiMessages = apiMessages.map((m) => ({
      role: m.role as 'user' | 'assistant' | 'system',
      content: m.content,
    }))

    const model = process.env.OPENAI_MODEL || 'gpt-4o'

    const stream = await openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: MADVET_SYSTEM_PROMPT },
        ...openaiMessages,
      ],
      stream: true,
      temperature: 0.7,     // slight creativity for natural responses
      max_tokens: 600,      // keep responses concise for mobile
    })

    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
          const delta = chunk.choices[0]?.delta?.content
          if (delta) {
            controller.enqueue(encoder.encode(delta))
          }
        }
        controller.close()
      },
    })

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[Madvet] Chat API error:', err)
    const isDev = process.env.NODE_ENV === 'development'
    return new Response(
      JSON.stringify({
        error: 'Thoda technical issue aa gaya, please dobara try karein 🙏',
        ...(isDev && { debug: message }),
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
