// Run in Supabase SQL Editor:
// CREATE TABLE chat_feedback (
//   id SERIAL PRIMARY KEY,
//   rating TEXT,
//   message_content TEXT,
//   created_at TIMESTAMPTZ DEFAULT NOW()
// );

import { NextRequest } from 'next/server'
import { getSupabaseClient } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { messageId, rating, messageContent } = body

    const supabase = getSupabaseClient()
    if (!supabase) {
      return new Response(JSON.stringify({ ok: false }), { status: 500 })
    }

    const { error } = await supabase.from('chat_feedback').insert({
      rating: rating === 'up' ? 'up' : 'down',
      message_content: messageContent ?? '',
    })

    if (error) {
      console.error('[Madvet] Feedback insert error:', error)
      return new Response(JSON.stringify({ ok: false }), { status: 500 })
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch {
    return new Response(JSON.stringify({ ok: false }), { status: 500 })
  }
}
