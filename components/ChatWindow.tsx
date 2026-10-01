'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import MessageBubble from './MessageBubble'
import InputBar from './InputBar'
import TypingIndicator from './TypingIndicator'
import QuickReplies from './QuickReplies'
import Sidebar from './Sidebar'
import SiteNav from './SiteNav'
import {
  createConversation, saveMessage, loadConversations,
  loadMessages, deleteConversation
} from '@/lib/chatHistory'
import type { MadvetProduct } from '@/lib/supabase'
import type { Conversation } from '@/lib/chatHistory'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  primaryProducts?:       MadvetProduct[]
  complementaryProducts?: MadvetProduct[]
  lang?: 'HINDI' | 'ENGLISH'
  isError?: boolean
  retryText?: string
  logId?: string
}

export default function ChatWindow() {
  const [messages, setMessages]             = useState<ChatMessage[]>([])
  const [sending, setSending]               = useState(false)
  const [showQuickReplies, setShowQuickReplies] = useState(true)
  const [sidebarOpen, setSidebarOpen]       = useState(false)
  const [conversations, setConversations]   = useState<Conversation[]>([])
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const activeConvIdRef = useRef<string | null>(null)

  useEffect(() => { activeConvIdRef.current = activeConversationId }, [activeConversationId])

  useEffect(() => {
    let mounted = true
    const timer = setTimeout(() => {
      if (mounted) {
        loadConversations()
          .then(c => {
            if (mounted) setConversations(c)
          })
          .catch(err => {
            console.error('Failed to load conversations:', err)
            if (mounted) setConversations([])
          })
      }
    }, 100) // Small delay to prevent blocking

    return () => {
      mounted = false
      clearTimeout(timer)
    }
  }, [])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, sending])

  const startNewChat = useCallback(() => {
    setMessages([])
    setActiveConversationId(null)
    setShowQuickReplies(true)
    setSidebarOpen(false)
  }, [])

  const selectConversation = useCallback(async (id: string) => {
    const stored = await loadMessages(id)
    const chatMessages: ChatMessage[] = stored.map(m => ({
      id:      m.id,
      role:    m.role as 'user' | 'assistant',
      content: m.content,
    }))
    setMessages(chatMessages)
    setActiveConversationId(id)
    setShowQuickReplies(false)
    setSidebarOpen(false)
  }, [])

  const handleDelete = useCallback(async (id: string) => {
    await deleteConversation(id)
    setConversations(prev => prev.filter(c => c.id !== id))
    if (activeConversationId === id) startNewChat()
  }, [activeConversationId, startNewChat])

  const handleDeleteClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    if (confirmDeleteId === id) {
      handleDelete(id)
      setConfirmDeleteId(null)
    } else {
      setConfirmDeleteId(id)
      setTimeout(() => setConfirmDeleteId(null), 3000)
    }
  }

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || sending) return
    setShowQuickReplies(false)

    const userMsg: ChatMessage = {
      id:      Math.random().toString(36).substring(2, 15),
      role:    'user',
      content: text.trim(),
    }
    setMessages(prev => [...prev, userMsg])
    setSending(true)

    // Create conversation if new — sidebar refresh is non-blocking
    let convId = activeConvIdRef.current
    if (!convId) {
      convId = await createConversation(text.trim())
      if (convId) {
        setActiveConversationId(convId)
        loadConversations().then(c => setConversations(c)).catch(() => {})
      }
    }
    // Save user message — fire-and-forget, don't block API call
    if (convId) saveMessage(convId, 'user', text.trim()).catch(() => {})

    // Build clean history for API (content only, no product objects)
    const cleanHistory = messages.map(m => ({ role: m.role, content: m.content }))

    // 55-second abort — just under Vercel's 60s maxDuration
    const controller = new AbortController()
    const abortTimer = setTimeout(() => controller.abort(), 55000)

    // Show 'pehli baar thoda waqt lagta hai' hint if no response after 6s
    const assistantId = Math.random().toString(36).substring(2, 15)
    setMessages(prev => [...prev, {
      id: assistantId, role: 'assistant', content: '',
      primaryProducts: [], complementaryProducts: [],
    }])
    const slowHintTimer = setTimeout(() => {
      setMessages(prev => prev.map(m =>
        m.id === assistantId && m.content === ''
          ? { ...m, content: '⏳ Looking through the catalogue — one moment…' }
          : m
      ))
    }, 6000)

    try {
      const res = await fetch('/api/chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ messages: cleanHistory, latestMessage: text.trim() }),
        signal:  controller.signal,
      })

      if (res.status === 429) {
        clearTimeout(slowHintTimer)
        setMessages(prev => prev.map(m =>
          m.id === assistantId
            ? { ...m, content: 'Too many questions in a short time — please wait a minute and try again.', isError: true, retryText: text.trim() }
            : m
        ))
        return
      }

      if (!res.ok) {
        clearTimeout(slowHintTimer)
        let errMsg = 'Something went wrong on our side. Please try again.'
        try { const d = await res.json(); if (d?.error) errMsg = d.error } catch {}
        setMessages(prev => prev.map(m =>
          m.id === assistantId
            ? { ...m, content: errMsg, isError: true, retryText: text.trim() }
            : m
        ))
        return
      }

      const reader  = res.body?.getReader()
      const decoder = new TextDecoder()
      let   fullText = ''
      let   buffer   = ''
      clearTimeout(slowHintTimer)
      // Clear slow hint if shown, reset content to empty for streaming
      setMessages(prev => prev.map(m =>
        m.id === assistantId ? { ...m, content: '' } : m
      ))

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() ?? '' // keep incomplete last line

          for (const line of lines) {
            if (line.startsWith('t:')) {
              // Text chunk
              const chunk = line.slice(2).replace(/\\n/g, '\n')
              fullText += chunk
              setMessages(prev => prev.map(m =>
                m.id === assistantId ? { ...m, content: fullText } : m
              ))
            } else if (line.startsWith('m:')) {
              // Product metadata
              try {
                const meta = JSON.parse(line.slice(2))
                if (meta.type === 'products') {
                  setMessages(prev => prev.map(m =>
                    m.id === assistantId
                      ? { ...m, primaryProducts: meta.primary ?? [], complementaryProducts: meta.complementary ?? [], lang: meta.lang ?? 'ENGLISH', logId: meta.logId }
                      : m
                  ))
                }
              } catch { /* ignore parse errors */ }
            }
          }
        }

        // Process any remaining buffer
        if (buffer.startsWith('m:')) {
          try {
            const meta = JSON.parse(buffer.slice(2))
            if (meta.type === 'products') {
              setMessages(prev => prev.map(m =>
                m.id === assistantId
                  ? { ...m, primaryProducts: meta.primary ?? [], complementaryProducts: meta.complementary ?? [], lang: meta.lang ?? 'ENGLISH', logId: meta.logId }
                  : m
              ))
            }
          } catch {}
        }
      }

      // Clean display text — strip PRODUCTS tag (backup for route.ts),
      // and any stray card-artifact lines GPT occasionally emits
      const displayText = fullText
        .replace(/\n*PRODUCTS:\s*primary=\[[^\]]*\]\s*complementary=\[[^\]]*\]/gi, '')
        .replace(/^📦\s*Packing:.*$/gm, '')
        .replace(/^✅\s*FREE.*$/gm, '')
        .replace(/^AUR OPTIONS.*$/gim, '')
        .replace(/\n{3,}/g, '\n\n')
        .replace(/\\n/g, '\n')
        .trim()

      // Apply cleaned text to the final rendered message (was dead code before!)
      setMessages(prev => prev.map(m =>
        m.id === assistantId ? { ...m, content: displayText } : m
      ))

      if (convId && displayText) saveMessage(convId, 'assistant', displayText).catch(() => {})

    } catch (error: any) {
      clearTimeout(slowHintTimer)
      clearTimeout(abortTimer)
      const isAbort = error?.name === 'AbortError'
      const errMsg = isAbort
        ? 'The connection timed out. Please check your internet and try again.'
        : 'Could not reach the server. Please check your internet and try again.'
      console.error('[ChatWindow] Error:', error)
      setMessages(prev => {
        // Update the existing assistant bubble if it exists, else add new
        const hasAssistant = prev.some(m => m.id === assistantId)
        if (hasAssistant) {
          return prev.map(m => m.id === assistantId
            ? { ...m, content: errMsg, isError: true, retryText: text.trim() }
            : m
          )
        }
        return [...prev, { id: crypto.randomUUID(), role: 'assistant', content: errMsg, isError: true, retryText: text.trim() }]
      })
    } finally {
      clearTimeout(slowHintTimer)
      clearTimeout(abortTimer)
      setSending(false)
      // Defer sidebar refresh — non-blocking
      loadConversations().then(c => setConversations(c)).catch(() => {})
    }
  }, [messages, sending])


  const isEmpty = messages.length === 0

  return (
    <div className="flex flex-col h-[100dvh] bg-[#f5f0e8] text-[#1c2b22]" style={{ fontFamily: "'DM Sans', 'Noto Sans Devanagari', sans-serif" }}>
      {/* The site's own header (client, 30 Sep: "why can't Ask AI work like
          other pages and why its header options changing"). */}
      <SiteNav active="assistant" />

      <div className="flex flex-1 min-h-0 relative">
        <Sidebar
          conversations={conversations}
          activeId={activeConversationId}
          onSelect={selectConversation}
          onNewChat={startNewChat}
          onDelete={handleDelete}
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen(prev => !prev)}
        />

        <div className="flex flex-col flex-1 min-w-0 relative">
          <div className="flex items-center justify-between gap-2 px-3 sm:px-5 py-2 border-b border-[#1a3a2a]/10 flex-shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <button
                onClick={() => setSidebarOpen(prev => !prev)}
                className="p-2 rounded-lg hover:bg-[#1a3a2a]/10 transition-colors"
                aria-label="Previous chats"
                title="Previous chats"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <span className="font-semibold text-sm whitespace-nowrap">Ask Madvet</span>
              <span className="hidden sm:inline text-xs text-[#1c2b22]/50 truncate">· answers from our own product catalogue</span>
            </div>
            <button
              onClick={startNewChat}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#1a3a2a] text-[#f5f0e8] hover:bg-[#264d39] transition-colors whitespace-nowrap"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New chat
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto">
            {isEmpty && (
              <div className="flex flex-col items-center justify-center min-h-full px-4 py-8 text-center">
                <img src="/icon.png?v=3" alt="" width={72} height={72} className="mb-5 rounded-2xl shadow-sm" />
                <h1 className="text-3xl sm:text-4xl mb-3 text-[#1a3a2a]" style={{ fontFamily: "'DM Serif Display', serif" }}>Ask about any Madvet product</h1>
                <p className="text-[#1c2b22]/60 text-[15px] mb-7 max-w-md leading-relaxed">
                  Composition, indications, schemes, or which product suits a problem — ask in English or हिंदी. Answers come from our own catalogue.
                </p>
                <QuickReplies onSelect={sendMessage} visible={showQuickReplies} />
              </div>
            )}

            {!isEmpty && (
              <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
                {messages.map(m => (
                  <div key={m.id}>
                    <MessageBubble
                      messageId={m.id}
                      role={m.role}
                      content={m.content}
                      primaryProducts={m.primaryProducts}
                      complementaryProducts={m.complementaryProducts}
                      lang={m.lang}
                      logId={m.logId}
                      showFeedback={m.role === 'assistant' && m.content.length > 0 && !m.isError}
                    />
                    {m.isError && m.retryText && (
                      <div className="flex justify-start mt-2 ml-12">
                        <button
                          onClick={() => sendMessage(m.retryText!)}
                          disabled={sending}
                          className="text-xs px-3 py-1.5 rounded-lg bg-[#1a3a2a]/10 hover:bg-[#1a3a2a]/20 text-[#1a3a2a] transition-colors disabled:opacity-40"
                        >
                          ↻ Try again
                        </button>
                      </div>
                    )}
                  </div>
                ))}
                {sending && messages[messages.length - 1]?.role === 'user' && (
                  <div className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-[#1a3a2a] text-[#f5f0e8] flex items-center justify-center text-sm font-bold flex-shrink-0">M</div>
                    <div className="pt-1"><TypingIndicator /></div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Input */}
          <div className="flex-shrink-0 px-3 sm:px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-2 max-w-3xl mx-auto w-full">
            {!isEmpty && <QuickReplies onSelect={sendMessage} visible={showQuickReplies} />}
            <InputBar onSend={sendMessage} disabled={sending} />
            <p className="text-center text-[#1c2b22]/40 text-[11px] mt-2">
              Answers come from the Madvet catalogue. For a sick animal, always consult a veterinarian.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
