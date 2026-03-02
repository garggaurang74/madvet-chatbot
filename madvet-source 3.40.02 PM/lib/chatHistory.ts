import { getSupabaseClient } from './supabase'

export interface Conversation {
  id:         string
  title:      string
  created_at: string
  updated_at: string
}

export interface StoredMessage {
  id:              string
  conversation_id: string
  role:            'user' | 'assistant'
  content:         string
  created_at:      string
}

/*
Run once in Supabase SQL Editor:

CREATE TABLE IF NOT EXISTS conversations (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title      TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  role            TEXT NOT NULL,
  content         TEXT NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS messages_conversation_id_idx 
  ON messages(conversation_id);
*/

export function generateTitle(firstMessage: string): string {
  return firstMessage.slice(0, 50) + (firstMessage.length > 50 ? '...' : '')
}

export async function createConversation(firstMessage: string): Promise<string | null> {
  const supabase = getSupabaseClient()
  if (!supabase) return null

  try {
    const { data, error } = await supabase
      .from('conversations')
      .insert({ title: generateTitle(firstMessage) })
      .select('id')
      .single()

    if (error) { console.error('[chatHistory] createConversation:', error.message); return null }
    return data.id
  } catch (err) {
    console.error('[chatHistory] createConversation exception:', err)
    return null
  }
}

export async function saveMessage(
  conversationId: string,
  role:           'user' | 'assistant',
  content:        string
): Promise<void> {
  const supabase = getSupabaseClient()
  if (!supabase) return

  try {
    // FIX: Save CLEAN content — not enriched content with product context blocks
    // Strip the [NEW QUERY] / [FOLLOW-UP] wrapper if present
    const cleanContent = stripEnrichedWrapper(content)

    await supabase
      .from('messages')
      .insert({ conversation_id: conversationId, role, content: cleanContent })

    await supabase
      .from('conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversationId)
  } catch (err) {
    console.error('[chatHistory] saveMessage exception:', err)
  }
}

export async function loadConversations(): Promise<Conversation[]> {
  const supabase = getSupabaseClient()
  if (!supabase) return []

  try {
    const { data, error } = await supabase
      .from('conversations')
      .select('id, title, created_at, updated_at')
      .order('updated_at', { ascending: false })
      .limit(50)

    if (error) { console.error('[chatHistory] loadConversations:', error.message); return [] }
    return data ?? []
  } catch (err) {
    console.error('[chatHistory] loadConversations exception:', err)
    return []
  }
}

export async function loadMessages(conversationId: string): Promise<StoredMessage[]> {
  const supabase = getSupabaseClient()
  if (!supabase) return []

  try {
    const { data, error } = await supabase
      .from('messages')
      .select('id, conversation_id, role, content, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })

    if (error) { console.error('[chatHistory] loadMessages:', error.message); return [] }
    return data ?? []
  } catch (err) {
    console.error('[chatHistory] loadMessages exception:', err)
    return []
  }
}

export async function deleteConversation(conversationId: string): Promise<void> {
  const supabase = getSupabaseClient()
  if (!supabase) return

  try {
    // Messages cascade delete via FK constraint
    await supabase
      .from('conversations')
      .delete()
      .eq('id', conversationId)
  } catch (err) {
    console.error('[chatHistory] deleteConversation exception:', err)
  }
}

// ─────────────────────────────────────────────
// Strip enriched wrapper before saving to DB
// We save clean user messages — not product context blocks
// ─────────────────────────────────────────────
function stripEnrichedWrapper(content: string): string {
  // Remove [NEW QUERY] block
  const newQueryMatch = content.match(/Customer asks?: "(.+)"$/m)
  if (newQueryMatch) return newQueryMatch[1].trim()

  // Remove [FOLLOW-UP] block
  const followUpMatch = content.match(/Customer says?: "(.+)"$/m)
  if (followUpMatch) return followUpMatch[1].trim()

  return content
}
