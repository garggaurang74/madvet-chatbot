import OpenAI from 'openai'
import { NextRequest } from 'next/server'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json()
    if (!text) return new Response('No text', { status: 400 })

    // Clean text before sending to TTS:
    // Remove markdown symbols, emojis, product context blocks
    const clean = text
      .replace(/[*_~`#]/g, '')
      .replace(/\[.*?\]/g, '')
      .replace(/✅|💊|⚠️|📦/g, '')
      .replace(/\n+/g, '. ')
      .slice(0, 1000) // TTS max length per call

    const mp3 = await openai.audio.speech.create({
      model: 'tts-1',
      voice: 'nova',
      input: clean,
      speed: 0.95,
    })

    const buffer = Buffer.from(await mp3.arrayBuffer())
    return new Response(buffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': buffer.length.toString(),
      },
    })
  } catch (err) {
    console.error('[TTS Error]', err)
    return new Response('TTS failed', { status: 500 })
  }
}
