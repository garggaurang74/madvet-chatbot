import type { Message } from '@/app/api/chat/route'

// ─────────────────────────────────────────────
// HISTORY SUMMARIZATION - Reduce token usage
// ─────────────────────────────────────────────
const MAX_HISTORY_TOKENS = 1500 // ~6-7 messages

export interface SummarizedHistory {
  messages: Message[]
  summary?: string
  hasSummary: boolean
}

export function summarizeHistory(messages: Message[]): SummarizedHistory {
  if (messages.length <= 6) {
    return { messages, hasSummary: false }
  }

  // Count approximate tokens (rough estimate: 1 token ≈ 4 chars)
  const totalTokens = messages.reduce((sum, msg) => sum + msg.content.length / 4, 0)
  
  if (totalTokens <= MAX_HISTORY_TOKENS) {
    return { messages, hasSummary: false }
  }

  // Split into recent + old messages
  const recentMessages = messages.slice(-4) // Keep last 4 messages
  const oldMessages = messages.slice(0, -4)
  
  // Create summary of old messages
  const summaryText = oldMessages
    .map((msg, i) => `${msg.role === 'user' ? 'User' : 'Bot'} ${i + 1}: ${msg.content.slice(0, 100)}...`)
    .join('\n')
  
  const summary = `Previous conversation summary:\n${summaryText}\n\nRecent messages:`

  return {
    messages: [
      { role: 'system', content: summary },
      ...recentMessages
    ],
    hasSummary: true
  }
}
