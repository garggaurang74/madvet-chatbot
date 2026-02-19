import { getSupabaseClient } from './supabase'

export interface Conversation {
  id: string
  title: string
  created_at: string
  updated_at: string
}

export interface StoredMessage {
  id: string
  conversation_id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

/*
Run this in Supabase SQL Editor if not already done:

CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
*/

// Generate title from first user message
export function generateTitle(firstMessage: string): string {
  return firstMessage.slice(0, 40) + (firstMessage.length > 40 ? '...' : '')
}

export async function createConversation(firstMessage: string): Promise<string | null> {
  const supabase = getSupabaseClient()
  if (!supabase) return null
  const { data, error } = await supabase
    .from('conversations')
    .insert({ title: generateTitle(firstMessage) })
    .select('id')
    .single()
  if (error) { console.error(error); return null }
  return data.id
}

export async function saveMessage(
  conversationId: string,
  role: 'user' | 'assistant',
  content: string
): Promise<void> {
  const supabase = getSupabaseClient()
  if (!supabase) return
  await supabase.from('messages').insert({ conversation_id: conversationId, role, content })
  await supabase.from('conversations').update({ updated_at: new Date().toISOString() })
    .eq('id', conversationId)
}

export async function loadConversations(): Promise<Conversation[]> {
  const supabase = getSupabaseClient()
  if (!supabase) return []
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(50)
  if (error) return []
  return data || []
}

export async function loadMessages(conversationId: string): Promise<StoredMessage[]> {
  const supabase = getSupabaseClient()
  if (!supabase) return []
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
  if (error) return []
  return data || []
}

export async function deleteConversation(conversationId: string): Promise<void> {
  const supabase = getSupabaseClient()
  if (!supabase) return
  await supabase.from('messages').delete().eq('conversation_id', conversationId)
  await supabase.from('conversations').delete().eq('id', conversationId)
}
