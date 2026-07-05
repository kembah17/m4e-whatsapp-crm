"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import {
  Merge,
  Search,
  Loader2,
  AlertTriangle,
  CheckCircle,
  User,
} from "lucide-react"

interface Contact {
  id: string
  name: string
  phone: string | null
  email: string | null
  bsuid: string | null
  whatsapp_username: string | null
  tags: string[]
  status: string
  account_id: string
}

interface ContactStats {
  conversations: number
  messages: number
  deals: number
}

interface MergePreview {
  primary: Contact | null
  secondary: Contact | null
  primaryStats: ContactStats | null
  secondaryStats: ContactStats | null
}

export function ContactMergeTool() {
  const [primarySearch, setPrimarySearch] = useState('')
  const [secondarySearch, setSecondarySearch] = useState('')
  const [primaryResults, setPrimaryResults] = useState<Contact[]>([])
  const [secondaryResults, setSecondaryResults] = useState<Contact[]>([])
  const [preview, setPreview] = useState<MergePreview>({
    primary: null,
    secondary: null,
    primaryStats: null,
    secondaryStats: null,
  })
  const [searching, setSearching] = useState<'primary' | 'secondary' | null>(null)
  const [merging, setMerging] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const searchContacts = async (query: string, target: 'primary' | 'secondary') => {
    if (query.length < 2) return
    try {
      setSearching(target)
      const res = await fetch(`/api/admin/contacts/search?q=${encodeURIComponent(query)}`)
      if (!res.ok) throw new Error('Search failed')
      const { contacts } = await res.json()
      if (target === 'primary') setPrimaryResults(contacts)
      else setSecondaryResults(contacts)
    } catch {
      toast.error('Failed to search contacts')
    } finally {
      setSearching(null)
    }
  }

  const selectContact = async (contact: Contact, target: 'primary' | 'secondary') => {
    try {
      const res = await fetch(`/api/admin/contacts/stats?id=${contact.id}`)
      const stats: ContactStats = res.ok
        ? await res.json()
        : { conversations: 0, messages: 0, deals: 0 }
      setPreview(prev => ({
        ...prev,
        [target]: contact,
        [`${target}Stats`]: stats,
      }))
      if (target === 'primary') {
        setPrimaryResults([])
        setPrimarySearch(contact.name || contact.phone || '')
      } else {
        setSecondaryResults([])
        setSecondarySearch(contact.name || contact.phone || '')
      }
    } catch {
      setPreview(prev => ({
        ...prev,
        [target]: contact,
        [`${target}Stats`]: { conversations: 0, messages: 0, deals: 0 },
      }))
    }
  }

  const handleMerge = async () => {
    if (!preview.primary || !preview.secondary) return
    if (preview.primary.account_id !== preview.secondary.account_id) {
      toast.error('Cannot merge contacts from different accounts')
      return
    }
    try {
      setMerging(true)
      const res = await fetch('/api/admin/contacts/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          primaryContactId: preview.primary.id,
          secondaryContactId: preview.secondary.id,
          accountId: preview.primary.account_id,
        }),
      })
      if (!res.ok) {
        const { error } = await res.json()
        throw new Error(error || 'Merge failed')
      }
      const { summary } = await res.json()
      toast.success(
        `Merge complete: ${summary.conversations_moved} conversations, ${summary.messages_moved} messages, ${summary.deals_moved} deals moved`
      )
      setPreview({ primary: null, secondary: null, primaryStats: null, secondaryStats: null })
      setPrimarySearch('')
      setSecondarySearch('')
      setShowConfirm(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Merge failed')
    } finally {
      setMerging(false)
    }
  }

  const renderContactCard = (contact: Contact | null, stats: ContactStats | null, type: 'primary' | 'secondary') => {
    if (!contact) return null
    const borderColor = type === 'primary' ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-red-500/30 bg-red-500/5'
    const iconColor = type === 'primary' ? 'text-emerald-500' : 'text-red-500'
    return (
      <div className={cn('rounded-lg border p-3', borderColor)}>
        <div className="flex items-center gap-2">
          <User className={cn('h-4 w-4', iconColor)} />
          <span className="text-sm font-medium text-foreground">{contact.name}</span>
          {type === 'secondary' && (
            <span className="text-[10px] text-red-500 font-medium">WILL BE DELETED</span>
          )}
        </div>
        <div className="mt-1 text-xs text-muted-foreground space-y-0.5">
          {contact.phone && <p>Phone: {contact.phone}</p>}
          {contact.email && <p>Email: {contact.email}</p>}
          {contact.bsuid && <p>BSUID: {contact.bsuid}</p>}
          {contact.whatsapp_username && <p>Username: {contact.whatsapp_username}</p>}
          {stats && (
            <p>{stats.conversations} conversations &middot; {stats.messages} messages &middot; {stats.deals} deals</p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/10">
            <Merge className="h-5 w-5 text-orange-500" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Contact Merge Tool</h3>
            <p className="text-xs text-muted-foreground">Merge duplicate contacts into one. All data moves to the primary contact.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Primary Contact */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Primary Contact (keep)</label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={primarySearch}
                onChange={(e) => {
                  setPrimarySearch(e.target.value)
                  searchContacts(e.target.value, 'primary')
                }}
                placeholder="Search by name, phone, or email..."
                className="w-full rounded-lg border border-border bg-background pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              />
              {searching === 'primary' && <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />}
            </div>
            {primaryResults.length > 0 && (
              <div className="max-h-40 overflow-y-auto rounded-lg border border-border bg-background">
                {primaryResults.map(c => (
                  <button
                    key={c.id}
                    onClick={() => selectContact(c, 'primary')}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors"
                  >
                    <span className="font-medium text-foreground">{c.name}</span>
                    <span className="ml-2 text-xs text-muted-foreground">{c.phone || c.email || c.id.slice(0, 8)}</span>
                  </button>
                ))}
              </div>
            )}
            {renderContactCard(preview.primary, preview.primaryStats, 'primary')}
          </div>

          {/* Secondary Contact */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Secondary Contact (merge &amp; delete)</label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={secondarySearch}
                onChange={(e) => {
                  setSecondarySearch(e.target.value)
                  searchContacts(e.target.value, 'secondary')
                }}
                placeholder="Search by name, phone, or email..."
                className="w-full rounded-lg border border-border bg-background pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              />
              {searching === 'secondary' && <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />}
            </div>
            {secondaryResults.length > 0 && (
              <div className="max-h-40 overflow-y-auto rounded-lg border border-border bg-background">
                {secondaryResults.map(c => (
                  <button
                    key={c.id}
                    onClick={() => selectContact(c, 'secondary')}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors"
                  >
                    <span className="font-medium text-foreground">{c.name}</span>
                    <span className="ml-2 text-xs text-muted-foreground">{c.phone || c.email || c.id.slice(0, 8)}</span>
                  </button>
                ))}
              </div>
            )}
            {renderContactCard(preview.secondary, preview.secondaryStats, 'secondary')}
          </div>
        </div>

        {/* Merge Button */}
        {preview.primary && preview.secondary && (
          <div className="mt-4">
            {!showConfirm ? (
              <button
                onClick={() => setShowConfirm(true)}
                className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-400 transition-colors"
              >
                <Merge className="h-4 w-4" />
                Merge Contacts
              </button>
            ) : (
              <div className="rounded-lg border border-orange-500/30 bg-orange-500/5 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                  <span className="text-sm font-medium text-foreground">Confirm Merge</span>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  This will move all data from <strong>{preview.secondary.name}</strong> to <strong>{preview.primary.name}</strong> and permanently delete the secondary contact. This cannot be undone.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleMerge}
                    disabled={merging}
                    className="inline-flex items-center gap-2 rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-400 transition-colors"
                  >
                    {merging ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                    Confirm Merge
                  </button>
                  <button
                    onClick={() => setShowConfirm(false)}
                    className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
