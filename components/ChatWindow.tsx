'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import MessageBubble from './MessageBubble'
import InputBar from './InputBar'
import TypingIndicator from './TypingIndicator'
import QuickReplies from './QuickReplies'
import Sidebar from './Sidebar'
import { extractMentionedProducts } from '@/lib/extractProducts'
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
  products?: MadvetProduct[]
}

async function fetchProducts(): Promise<MadvetProduct[]> {
  const res = await fetch('/api/products')
  if (!res.ok) return []
  const data = await res.json()
  return data.products ?? []
}

export default function ChatWindow() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [products, setProducts] = useState<MadvetProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [showQuickReplies, setShowQuickReplies] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const activeConvIdRef = useRef<string | null>(null)

  useEffect(() => {
    activeConvIdRef.current = activeConversationId
  }, [activeConversationId])

  useEffect(() => {
    Promise.all([fetchProducts(), loadConversations()])
      .then(([p, c]) => { setProducts(p); setConversations(c) })
      .finally(() => setLoading(false))
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
      id: m.id,
      role: m.role as 'user' | 'assistant',
      content: m.content,
      products: m.role === 'assistant' ? extractMentionedProducts(m.content, products) : undefined
    }))
    setMessages(chatMessages)
    setActiveConversationId(id)
    setShowQuickReplies(false)
    setSidebarOpen(false)
  }, [products])

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

    const userMsg: ChatMessage = { id: Math.random().toString(36).substring(2, 15), role: 'user', content: text.trim() }
    setMessages(prev => [...prev, userMsg])
    setSending(true)

    // Create conversation if new
    let convId = activeConvIdRef.current
    if (!convId) {
      convId = await createConversation(text.trim())
      if (convId) {
        setActiveConversationId(convId)
        const updated = await loadConversations()
        setConversations(updated)
      }
    }

    // Save user message
    if (convId) await saveMessage(convId, 'user', text.trim())

    // FIX: CRITICAL - Send clean history WITHOUT current user message
    // route.ts will add enriched version, so we don't include latest message twice
    const cleanHistory = messages.map(m => ({ role: m.role, content: m.content }))

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          messages: cleanHistory, 
          latestMessage: text.trim() 
        }),
      })

      if (!res.ok) throw new Error('Request failed')

      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      let full = ''
      const assistantId = Math.random().toString(36).substring(2, 15)

      setMessages(prev => [...prev, { id: assistantId, role: 'assistant', content: '', products: [] }])

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          full += decoder.decode(value, { stream: true })
          setMessages(prev => prev.map(m => m.id === assistantId
            ? { ...m, content: full, products: extractMentionedProducts(full, products) }
            : m
          ))
        }
      }

      // Save assistant message
      if (convId && full) await saveMessage(convId, 'assistant', full)
    } catch (error) {
      console.error('[ChatWindow] Error sending message:', error)
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(), role: 'assistant',
        content: 'Thoda technical issue aa gaya, please dobara try karein 🙏'
      }])
    } finally {
      setSending(false)
      const updated = await loadConversations()
      setConversations(updated)
    }
  }, [messages, sending, products])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#212121]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-white/60 text-sm">Madvet products load ho rahe hain...</p>
        </div>
      </div>
    )
  }

  const isEmpty = messages.length === 0

  return (
    <div className="flex h-screen bg-[#212121] text-white overflow-hidden">
      
      {/* Sidebar */}
      <Sidebar
        conversations={conversations}
        activeId={activeConversationId}
        onSelect={selectConversation}
        onNewChat={startNewChat}
        onDelete={handleDelete}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(prev => !prev)}
      />

      {/* Main Chat Area */}
      <div className="flex flex-col flex-1 min-w-0 relative">
        
        {/* Top Bar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(prev => !prev)}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <span className="font-semibold text-sm">Dr. Madvet Assistant</span>
          </div>
          <div className="flex items-center gap-1">
            {/* Glossary button */}
            <a
              href="/madvet-product-glossary-dynamic.html"
              target="_blank"
              rel="noopener noreferrer"
              title="Product Glossary"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-white/10 transition-colors text-xs font-medium text-white/70 hover:text-white"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <span className="hidden sm:inline">Glossary</span>
            </a>
            {/* New Chat button */}
            <button
              onClick={startNewChat}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              title="New Chat"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          
          {/* Empty state — like ChatGPT welcome screen */}
          {isEmpty && (
            <div className="flex flex-col items-center justify-center h-full px-4 text-center">
              <div className="w-16 h-16 rounded-full bg-green-600 flex items-center justify-center mb-4 text-2xl">
                🐄
              </div>
              <h1 className="text-2xl font-semibold mb-2">Dr. Madvet Assistant</h1>
              <p className="text-white/50 text-sm mb-8 max-w-sm">
                Apne janwar ki koi bhi health problem puchein — Hindi, English, ya Hinglish mein
              </p>
              <QuickReplies onSelect={sendMessage} visible={showQuickReplies} dark={true} />
            </div>
          )}

          {/* Message list */}
          {!isEmpty && (
            <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
              {messages.map(m => (
                <MessageBubble
                  key={m.id}
                  messageId={m.id}
                  role={m.role}
                  content={m.content}
                  products={m.products}
                  showFeedback={m.role === 'assistant' && m.content.length > 0}
                  dark={true}
                />
              ))}
              {sending && messages[messages.length - 1]?.role === 'user' && (
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-sm font-bold flex-shrink-0">
                    M
                  </div>
                  <div className="pt-1">
                    <TypingIndicator />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="flex-shrink-0 px-4 pb-4 pt-2 max-w-3xl mx-auto w-full">
          {!isEmpty && (
            <QuickReplies onSelect={sendMessage} visible={showQuickReplies} dark={true} />
          )}
          <InputBar onSend={sendMessage} disabled={sending} dark={true} />
          <p className="text-center text-white/25 text-xs mt-2">
            Dr. Madvet Assistant medical advice replace nahi karta — serious cases mein vet se milein
          </p>
        </div>
      </div>
    </div>
  )
}
