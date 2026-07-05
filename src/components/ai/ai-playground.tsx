"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Bot,
  Send,
  Settings2,
  Trash2,
  User,
  Loader2,
  Sparkles,
} from "lucide-react"

interface Message {
  role: "user" | "assistant"
  content: string
  timestamp: string
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number }
}

interface PlaygroundConfig {
  model: string
  temperature: number
  maxTokens: number
  systemPrompt: string
  knowledgeContext: string
}

const DEFAULT_CONFIG: PlaygroundConfig = {
  model: "google/gemini-2.0-flash-001",
  temperature: 0.7,
  maxTokens: 1024,
  systemPrompt: "You are a helpful business assistant for a Nigerian company. Be friendly, professional, and concise.",
  knowledgeContext: "",
}

const AVAILABLE_MODELS = [
  { value: "google/gemini-2.0-flash-001", label: "Gemini 2.0 Flash" },
  { value: "google/gemini-2.5-flash-preview", label: "Gemini 2.5 Flash" },
  { value: "anthropic/claude-3.5-haiku", label: "Claude 3.5 Haiku" },
  { value: "openai/gpt-4o-mini", label: "GPT-4o Mini" },
]

export function AIPlayground({ accountId }: { accountId: string }) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [showConfig, setShowConfig] = useState(false)
  const [config, setConfig] = useState<PlaygroundConfig>(DEFAULT_CONFIG)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  const sendMessage = async () => {
    if (!input.trim() || loading) return

    const userMessage: Message = {
      role: "user",
      content: input.trim(),
      timestamp: new Date().toISOString(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setLoading(true)

    try {
      const res = await fetch("/api/ai/playground", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId,
          message: userMessage.content,
          model: config.model,
          temperature: config.temperature,
          maxTokens: config.maxTokens,
          systemPrompt: config.systemPrompt,
          knowledgeContext: config.knowledgeContext || undefined,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Failed to get response")
      }

      const assistantMessage: Message = {
        role: "assistant",
        content: data.reply,
        timestamp: new Date().toISOString(),
        usage: data.usage,
      }

      setMessages((prev) => [...prev, assistantMessage])
    } catch (err) {
      const errorMessage: Message = {
        role: "assistant",
        content: `Error: ${err instanceof Error ? err.message : "Unknown error"}`,
        timestamp: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold">AI Playground</h2>
          <p className="text-muted-foreground text-sm">
            Test AI responses with different models and knowledge base entries
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowConfig(!showConfig)}
          >
            <Settings2 className="mr-2 h-4 w-4" />
            Config
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setMessages([])}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Clear
          </Button>
        </div>
      </div>

      {/* Config Panel */}
      {showConfig && (
        <Card className="mb-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium">Model</label>
                <select
                  className="w-full mt-1 rounded-md border bg-background px-3 py-2 text-sm"
                  value={config.model}
                  onChange={(e) =>
                    setConfig({ ...config, model: e.target.value })
                  }
                >
                  {AVAILABLE_MODELS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium">
                  Temperature ({config.temperature})
                </label>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.1"
                  value={config.temperature}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      temperature: parseFloat(e.target.value),
                    })
                  }
                  className="w-full mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-medium">Max Tokens</label>
                <Input
                  type="number"
                  value={config.maxTokens}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      maxTokens: parseInt(e.target.value) || 1024,
                    })
                  }
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium">System Prompt</label>
              <textarea
                className="w-full mt-1 rounded-md border bg-background px-3 py-2 text-sm min-h-[60px]"
                value={config.systemPrompt}
                onChange={(e) =>
                  setConfig({ ...config, systemPrompt: e.target.value })
                }
              />
            </div>
            <div>
              <label className="text-xs font-medium">
                Knowledge Context (optional)
              </label>
              <textarea
                className="w-full mt-1 rounded-md border bg-background px-3 py-2 text-sm min-h-[60px]"
                placeholder="Paste knowledge base entries here to test context-aware responses..."
                value={config.knowledgeContext}
                onChange={(e) =>
                  setConfig({ ...config, knowledgeContext: e.target.value })
                }
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto rounded-lg border bg-muted/30 p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <Sparkles className="h-12 w-12 mb-4 opacity-50" />
            <p className="text-lg font-medium">Start a conversation</p>
            <p className="text-sm">
              Test how the AI responds to customer messages
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {msg.role === "assistant" && (
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Bot className="h-4 w-4 text-primary" />
              </div>
            )}
            <div
              className={`max-w-[70%] rounded-lg px-4 py-2 ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-background border"
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              {msg.usage && (
                <div className="mt-1 flex gap-2">
                  <Badge variant="outline" className="text-[10px]">
                    {msg.usage.total_tokens} tokens
                  </Badge>
                </div>
              )}
            </div>
            {msg.role === "user" && (
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                <User className="h-4 w-4" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Bot className="h-4 w-4 text-primary" />
            </div>
            <div className="bg-background border rounded-lg px-4 py-2">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex gap-2 mt-4">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
          placeholder="Type a customer message to test..."
          disabled={loading}
          className="flex-1"
        />
        <Button onClick={sendMessage} disabled={loading || !input.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
