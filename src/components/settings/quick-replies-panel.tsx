'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Pencil, Trash2, Zap, Search, MessageSquare } from 'lucide-react'
import { toast } from 'sonner'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/hooks/use-auth'
import { createClient } from '@/lib/supabase/client'
import {
  QUICK_REPLY_TEMPLATES,
  QUICK_REPLY_CATEGORIES,
  getTemplatesForIndustry,
} from '@/lib/quick-replies/templates'

interface CustomReply {
  id: string
  title: string
  message: string
  category: string
  shortcut: string | null
  use_count: number
}

export function QuickRepliesPanel() {
  const { account } = useAuth()
  const [customReplies, setCustomReplies] = useState<CustomReply[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ title: '', message: '', category: 'general', shortcut: '' })

  const industry = (account as unknown as Record<string, unknown>)?.industry as string || 'general'
  const builtInTemplates = getTemplatesForIndustry(industry)

  const loadReplies = useCallback(async () => {
    if (!account?.id) return
    setLoading(true)
    const supabase = createClient()
    const { data, error } = await supabase
      .from('custom_quick_replies')
      .select('*')
      .eq('account_id', account.id)
      .order('use_count', { ascending: false })
    if (error) {
      toast.error('Failed to load quick replies')
    } else {
      setCustomReplies(data || [])
    }
    setLoading(false)
  }, [account?.id])

  useEffect(() => { loadReplies() }, [loadReplies])

  const resetForm = () => {
    setForm({ title: '', message: '', category: 'general', shortcut: '' })
    setEditingId(null)
    setShowForm(false)
  }

  const handleSave = async () => {
    if (!account?.id || !form.title.trim() || !form.message.trim()) {
      toast.error('Title and message are required')
      return
    }
    const supabase = createClient()
    const payload = {
      account_id: account.id,
      title: form.title.trim(),
      message: form.message.trim(),
      category: form.category,
      shortcut: form.shortcut.trim() || null,
    }

    if (editingId) {
      const { error } = await supabase
        .from('custom_quick_replies')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', editingId)
      if (error) { toast.error('Failed to update'); return }
      toast.success('Quick reply updated')
    } else {
      const { error } = await supabase
        .from('custom_quick_replies')
        .insert(payload)
      if (error) { toast.error('Failed to create'); return }
      toast.success('Quick reply created')
    }
    resetForm()
    loadReplies()
  }

  const handleEdit = (reply: CustomReply) => {
    setForm({
      title: reply.title,
      message: reply.message,
      category: reply.category,
      shortcut: reply.shortcut || '',
    })
    setEditingId(reply.id)
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    const supabase = createClient()
    const { error } = await supabase.from('custom_quick_replies').delete().eq('id', id)
    if (error) { toast.error('Failed to delete'); return }
    toast.success('Quick reply deleted')
    loadReplies()
  }

  const filteredBuiltIn = search.trim()
    ? builtInTemplates.filter(
        (t) =>
          t.title.toLowerCase().includes(search.toLowerCase()) ||
          t.message.toLowerCase().includes(search.toLowerCase())
      )
    : builtInTemplates

  const filteredCustom = search.trim()
    ? customReplies.filter(
        (r) =>
          r.title.toLowerCase().includes(search.toLowerCase()) ||
          r.message.toLowerCase().includes(search.toLowerCase())
      )
    : customReplies

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Zap className="h-5 w-5" />
          Quick Replies
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage quick reply templates for faster responses. Built-in templates are based on your industry ({industry}).
        </p>
      </div>

      {/* Actions bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search quick replies..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={() => { resetForm(); setShowForm(true) }} size="sm">
          <Plus className="mr-1.5 h-4 w-4" />
          Add Custom
        </Button>
      </div>

      {/* Create/Edit form */}
      {showForm && (
        <Card className="p-4 space-y-4">
          <h3 className="text-sm font-medium">
            {editingId ? 'Edit Quick Reply' : 'New Quick Reply'}
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs text-muted-foreground">Title *</label>
              <Input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Welcome greeting"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Shortcut</label>
              <Input
                value={form.shortcut}
                onChange={(e) => setForm((f) => ({ ...f, shortcut: e.target.value }))}
                placeholder="e.g. /hi"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Message *</label>
            <textarea
              value={form.message}
              onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
              placeholder="Type the quick reply message..."
              rows={3}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Category</label>
            <select
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {QUICK_REPLY_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave}>
              {editingId ? 'Update' : 'Create'}
            </Button>
            <Button size="sm" variant="ghost" onClick={resetForm}>
              Cancel
            </Button>
          </div>
        </Card>
      )}

      {/* Custom replies */}
      <div>
        <h3 className="text-sm font-medium text-foreground mb-3">
          Custom Replies ({filteredCustom.length})
        </h3>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : filteredCustom.length === 0 ? (
          <Card className="p-6 text-center">
            <MessageSquare className="mx-auto h-8 w-8 text-muted-foreground/50" />
            <p className="mt-2 text-sm text-muted-foreground">
              {search ? 'No custom replies match your search' : 'No custom replies yet. Click "Add Custom" to create one.'}
            </p>
          </Card>
        ) : (
          <div className="space-y-2">
            {filteredCustom.map((reply) => (
              <Card key={reply.id} className="flex items-start gap-3 p-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{reply.title}</span>
                    <Badge variant="secondary" className="text-[10px]">{reply.category}</Badge>
                    {reply.shortcut && (
                      <span className="text-[10px] text-muted-foreground font-mono">{reply.shortcut}</span>
                    )}
                    <span className="text-[10px] text-muted-foreground ml-auto">
                      Used {reply.use_count}x
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{reply.message}</p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => handleEdit(reply)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => handleDelete(reply.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Built-in templates */}
      <div>
        <h3 className="text-sm font-medium text-foreground mb-3">
          Built-in Templates ({filteredBuiltIn.length})
          <span className="ml-2 text-xs font-normal text-muted-foreground">
            Industry: {industry}
          </span>
        </h3>
        <div className="space-y-2">
          {filteredBuiltIn.map((template) => (
            <Card key={template.id} className="flex items-start gap-3 p-3 opacity-80">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{template.title}</span>
                  <Badge variant="outline" className="text-[10px]">{template.category}</Badge>
                  {template.industry !== 'general' && (
                    <Badge variant="secondary" className="text-[10px]">{template.industry}</Badge>
                  )}
                  {template.shortcut && (
                    <span className="text-[10px] text-muted-foreground font-mono">{template.shortcut}</span>
                  )}
                </div>
                <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{template.message}</p>
              </div>
              <Badge variant="outline" className="shrink-0 text-[10px]">Built-in</Badge>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
