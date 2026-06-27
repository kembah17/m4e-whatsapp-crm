"use client"

import { useState, useRef, useEffect } from 'react'
import { Send, Trash2, Loader2, Bot, User, Info, Zap, Target, BookOpen } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TestMessage {
  id: string
  role: 'user' | 'ai'
  text: string
  meta?: {
    intent?: string
    confidence?: number
    knowledgeMatch?: { question: string; answer: string } | null
    model?: string
    latencyMs?: number
    tokensUsed?: number
    meetsThreshold?: boolean
  }
}

export function AITestChat() {
  const [messages, setMessages] = useState<TestMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [contactName, setContactName] = useState('Test Customer')
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSend = async () => {
    const text = input.trim()
    if (!text || loading) return

    const userMsg: TestMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text,
    }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/ai/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, contactName }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Test failed')
      }

      const data = await res.json()
      const aiMsg: TestMessage = {
        id: `ai-${Date.now()}`,
        role: 'ai',
        text: data.response || '(no response)',
        meta: {
          intent: data.intent,
          confidence: data.confidence,
          knowledgeMatch: data.knowledgeMatch,
          model: data.model,
          latencyMs: data.latencyMs,
          tokensUsed: data.tokensUsed,
          meetsThreshold: data.meetsThreshold,
        },
      }
      setMessages(prev => [...prev, aiMsg])
    } catch (err) {
      const errMsg: TestMessage = {
        id: `err-${Date.now()}`,
        role: 'ai',
        text: `Error: ${err instanceof Error ? err.message : 'Unknown error'}`,
      }
      setMessages(prev => [...prev, errMsg])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="max-w-3xl space-y-4">
      {/* Info Banner */}
      <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800">
          <p className="font-medium">Test Mode</p>
          <p>Messages here are processed by the AI but <strong>no WhatsApp messages are sent</strong>. Use this to test your system prompt, knowledge base, and confidence threshold.</p>
        </div>
      </div>

      {/* Contact Name */}
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-gray-700">Test as:</label>
        <input
          type="text"
          value={contactName}
          onChange={(e) => setContactName(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm w-48 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
        />
      </div>

      {/* Chat Area */}
      <div className="bg-white border rounded-lg overflow-hidden">
        {/* Chat Messages */}
        <div
          ref={scrollRef}
          className="h-[500px] overflow-y-auto p-4 space-y-4 bg-gray-50"
        >
          {messages.length === 0 && (
            <div className="flex items-center justify-center h-full text-gray-400">
              <div className="text-center">
                <Bot className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="font-medium">Send a message to test the AI</p>
                <p className="text-sm mt-1">Try asking about your products, pricing, or shipping</p>
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <div key={msg.id} className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
              <div className={cn('max-w-[80%] space-y-2', msg.role === 'user' ? 'items-end' : 'items-start')}>
                {/* Message Bubble */}
                <div className={cn(
                  'flex items-start gap-2',
                  msg.role === 'user' ? 'flex-row-reverse' : 'flex-row',
                )}>
                  <div className={cn(
                    'w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0',
                    msg.role === 'user' ? 'bg-purple-100' : 'bg-green-100',
                  )}>
                    {msg.role === 'user'
                      ? <User className="h-4 w-4 text-purple-600" />
                      : <Bot className="h-4 w-4 text-green-600" />
                    }
                  </div>
                  <div className={cn(
                    'px-4 py-2.5 rounded-2xl text-sm whitespace-pre-wrap',
                    msg.role === 'user'
                      ? 'bg-purple-600 text-white rounded-tr-sm'
                      : 'bg-white border text-gray-800 rounded-tl-sm shadow-sm',
                  )}>
                    {msg.text}
                  </div>
                </div>

                {/* AI Meta Info */}
                {msg.role === 'ai' && msg.meta && (
                  <div className="ml-9 flex flex-wrap gap-2">
                    {msg.meta.intent && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">
                        <Target className="h-3 w-3" />
                        {msg.meta.intent}
                      </span>
                    )}
                    {msg.meta.confidence != null && (
                      <span className={cn(
                        'inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs',
                        msg.meta.meetsThreshold
                          ? 'bg-green-50 text-green-700'
                          : 'bg-red-50 text-red-700',
                      )}>
                        <Zap className="h-3 w-3" />
                        {(msg.meta.confidence * 100).toFixed(0)}%
                        {msg.meta.meetsThreshold ? ' ✓' : ' ✗ below threshold'}
                      </span>
                    )}
                    {msg.meta.knowledgeMatch && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-50 text-purple-700 rounded text-xs">
                        <BookOpen className="h-3 w-3" />
                        KB match
                      </span>
                    )}
                    {msg.meta.latencyMs != null && (
                      <span className="text-xs text-gray-400">
                        {msg.meta.latencyMs}ms · {msg.meta.tokensUsed} tokens
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="flex items-start gap-2">
                <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-green-600" />
                </div>
                <div className="px-4 py-3 bg-white border rounded-2xl rounded-tl-sm shadow-sm">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="border-t p-3 bg-white">
          <div className="flex items-end gap-2">
            <button
              onClick={() => setMessages([])}
              className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-gray-50"
              title="Clear chat"
            >
              <Trash2 className="h-5 w-5" />
            </button>
            <div className="flex-1 relative">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a message to test the AI..."
                rows={1}
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm resize-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 pr-12"
              />
            </div>
            <button
              onClick={handleSend}
              disabled={!input.trim() || loading}
              className="p-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
