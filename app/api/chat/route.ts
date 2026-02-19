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

function formatProductContext(products: MadvetProduct[]): string {
  if (products.length === 0) return 'No Madvet products available.'
  return products
    .map((p, i) => {
      const lines: string[] = [`[Product ${i + 1}]`]
      if (p.product_name) lines.push(`Name: ${p.product_name}`)
      if (p.salt_ingredient || p.salt) lines.push(`Composition: ${p.salt_ingredient || p.salt}`)
      if (p.category) lines.push(`Category: ${p.category}`)
      if (p.species) lines.push(`For Species: ${p.species}`)
      if (p.indication) lines.push(`Used For: ${p.indication}`)
      if (p.packaging || p.packing) lines.push(`Packing: ${p.packaging || p.packing}`)
      if (p.dosage) lines.push(`Dosage: ${p.dosage}`)
      if (p.description) lines.push(`Details: ${p.description}`)
      if (p.usp_benefits) lines.push(`Benefits: ${p.usp_benefits}`)
      if (p.aliases) lines.push(`Also known as: ${p.aliases}`)
      return lines.join('\n')
    })
    .join('\n\n---\n\n')
}

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text
  return text.slice(0, maxLen) + '...'
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const messages: Message[] = body.messages ?? []
    const latestMessage: string = body.latestMessage ?? ''

    const truncatedMessage = truncate(latestMessage, 2000)

    const products = await fetchAllProducts()
    const matched = searchProducts(products, truncatedMessage, 5)

    // ALWAYS inject all products as base context so AI never lacks product knowledge
    // Matched products go first (most relevant), then remaining products after
    const matchedKeys = new Set(matched.map((p) => (p.product_name || '') + (p.salt || '')))
    const remaining = products.filter(
      (p) => !matchedKeys.has((p.product_name || '') + (p.salt || ''))
    )
    const toInject = [...matched, ...remaining]
    const productBlock = formatProductContext(toInject)

    const injectedContent = `"""
MADVET PRODUCT CONTEXT — these are ALL Madvet products. Use your clinical knowledge 
to pick the most relevant ones for the customer's query. Always search this list 
before answering:

${productBlock}

CUSTOMER MESSAGE: ${truncatedMessage}
"""`

    const userMessageForApi: Message = {
      role: 'user',
      content: injectedContent,
    }

    let apiMessages: Message[] = []
    if (messages.length > MAX_HISTORY) {
      const first = messages[0]
      const rest = messages.slice(-SLIDING_LAST)
      apiMessages = [first, ...rest]
    } else {
      apiMessages = [...messages]
    }

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

    const stream = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: MADVET_SYSTEM_PROMPT },
        ...openaiMessages,
      ],
      stream: true,
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
