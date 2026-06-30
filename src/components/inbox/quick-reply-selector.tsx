'use client'

import { useState, useMemo, useEffect } from 'react'
import { Zap, Search, Settings, Clock, Hash } from 'lucide-react'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/hooks/use-auth'
import { createClient } from '@/lib/supabase/client'
import {
  type QuickReply,
  QUICK_REPLY_TEMPLATES,
  getTemplatesForIndustry,
  searchTemplates,
} from '@/lib/quick-replies/templates'

interface QuickReplySelectorProps {
  onInsert: (message: string) => void
  disabled?: boolean
}

interface CustomQuickReply {
  id: string
  title: string
  message: string
  category: string
  shortcut: string | null
  use_count: number
}

export function QuickReplySelector({ onInsert, disabled }: QuickReplySelectorProps) {
  const { account } = useAuth()
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<string>('all')
  const [customReplies, setCustomReplies] = useState<CustomQuickReply[]>([])

  // Load custom quick replies
  useEffect(() => {
    if (!open || !account?.id) return
    const supabase = createClient()
    supabase
      .from('custom_quick_replies')
      .select('id, title, message, category, shortcut, use_count')
      .eq('account_id', account.id)
      .order('use_count', { ascending: false })
      .then(({ data }) => {
        if (data) setCustomReplies(data)
      })
  }, [open, account?.id])

  // Get industry from account (fallback to 'general')
  const industry = (account as unknown as Record<string, unknown>)?.industry as string || 'general'

  // Merge built-in + custom replies
  const allReplies = useMemo(() => {
    const builtIn = getTemplatesForIndustry(industry)
    const custom: QuickReply[] = customReplies.map((c) => ({
      id: `custom-${c.id}`,
      title: c.title,
      message: c.message,
      category: c.category || 'general',
      industry: 'general',
      shortcut: c.shortcut || undefined,
    }))
    return [...custom, ...builtIn]
  }, [industry, customReplies])

  // Filter by search and category
  const filtered = useMemo(() => {
    let results = allReplies
    if (activeCategory !== 'all') {
      results = results.filter((r) => r.category === activeCategory)
    }
    if (search.trim()) {
      results = searchTemplates(results, search.trim())
    }
    return results
  }, [allReplies, search, activeCategory])

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set(allReplies.map((r) => r.category))
    return ['all', ...Array.from(cats)]
  }, [allReplies])

  const handleSelect = async (reply: QuickReply) => {
    onInsert(reply.message)
    setOpen(false)
    setSearch('')

    // Increment use_count for custom replies
    if (reply.id.startsWith('custom-')) {
      const realId = reply.id.replace('custom-', '')
      const supabase = createClient()
      try {
        const { error } = await supabase.rpc('increment_quick_reply_use_count', { reply_id: realId })
        if (error) {
          // Fallback: direct update
          await supabase
            .from('custom_quick_replies')
            .update({ use_count: (customReplies.find((c) => c.id === realId)?.use_count || 0) + 1 })
            .eq('id', realId)
        }
      } catch {
        // Silently ignore use_count tracking errors
      }
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        disabled={disabled}
        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md p-0 text-muted-foreground hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
        title="Quick replies"
      >
        <Zap className="h-4 w-4" />
      </PopoverTrigger>
      <PopoverContent side="top" align="start" className="w-80 p-0">
        {/* Header */}
        <div className="border-b border-border p-3">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium">Quick Replies</h4>
            <a
              href="/settings?tab=quick-replies"
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              <Settings className="h-3 w-3" />
              Manage
            </a>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search replies or type /shortcut..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 pl-8 text-xs"
            />
          </div>
        </div>

        {/* Category tabs */}
        <div className="flex gap-1 overflow-x-auto border-b border-border px-3 py-1.5">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs transition-colors ${
                activeCategory === cat
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              {cat === 'all' ? 'All' : cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>
          ))}
        </div>

        {/* Reply list */}
        <div className="max-h-64 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="p-4 text-center text-xs text-muted-foreground">
              No quick replies found
            </div>
          ) : (
            filtered.map((reply) => (
              <button
                key={reply.id}
                onClick={() => handleSelect(reply)}
                className="flex w-full flex-col gap-0.5 border-b border-border/50 px-3 py-2 text-left transition-colors hover:bg-muted last:border-0"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-foreground">
                    {reply.title}
                  </span>
                  {reply.id.startsWith('custom-') && (
                    <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                      Custom
                    </Badge>
                  )}
                  {reply.shortcut && (
                    <span className="ml-auto flex items-center gap-0.5 text-[10px] text-muted-foreground">
                      <Hash className="h-2.5 w-2.5" />
                      {reply.shortcut}
                    </span>
                  )}
                </div>
                <span className="line-clamp-2 text-[11px] text-muted-foreground">
                  {reply.message}
                </span>
              </button>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border px-3 py-1.5">
          <p className="text-[10px] text-muted-foreground">
            {filtered.length} replies • Type <kbd className="rounded bg-muted px-1">/</kbd> in composer for shortcuts
          </p>
        </div>
      </PopoverContent>
    </Popover>
  )
}
