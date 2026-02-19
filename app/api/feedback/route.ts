/*
Run in Supabase SQL Editor first:

CREATE TABLE IF NOT EXISTS chat_feedback (
  id SERIAL PRIMARY KEY,
  rating TEXT NOT NULL,
  message_content TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
*/

import { NextRequest } from 'next/server'
import { getSupabaseClient } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const { messageId, rating, messageContent } = await req.json()

    if (!rating || !['up', 'down'].includes(rating)) {
      return new Response(JSON.stringify({ error: 'Invalid rating' }), { status: 400 })
    }

    const supabase = getSupabaseClient()
    if (supabase) {
      await supabase.from('chat_feedback').insert({
        rating,
        message_content: (messageContent || '').slice(0, 1000), // limit size
      })
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[Feedback error]', err)
    return new Response(JSON.stringify({ success: false }), { status: 500 })
  }
}
