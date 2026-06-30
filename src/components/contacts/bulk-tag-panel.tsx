"use client"

import { useState, useEffect } from "react"
import { Sparkles, Check, X, Loader2, Tag, AlertCircle } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { useAuth } from "@/hooks/use-auth"

interface TagSuggestion {
  contactId: string
  contactName: string | null
  suggestedTags: string[]
  confidence: number
  reasoning: string
}

export interface BulkTagPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  contactIds: string[]
  onTagsApplied?: () => void
}

export function BulkTagPanel({ open, onOpenChange, contactIds, onTagsApplied }: BulkTagPanelProps) {
  const { accountId } = useAuth()
  const [loading, setLoading] = useState(false)
  const [applying, setApplying] = useState(false)
  const [suggestions, setSuggestions] = useState<TagSuggestion[]>([])
  const [accepted, setAccepted] = useState<Set<string>>(new Set())
  const [rejected, setRejected] = useState<Set<string>>(new Set())
  const [progress, setProgress] = useState(0)

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setSuggestions([])
      setAccepted(new Set())
      setRejected(new Set())
      setProgress(0)
    }
  }, [open])

  const handleSuggest = async () => {
    if (!accountId || contactIds.length === 0) return
    setLoading(true)
    setProgress(0)
    setSuggestions([])
    setAccepted(new Set())
    setRejected(new Set())

    try {
      const res = await fetch("/api/contacts/bulk-tag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactIds }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Request failed" }))
        throw new Error(err.error || "Failed to get suggestions")
      }

      const data = await res.json()
      setSuggestions(data.suggestions || [])
      // Auto-accept high confidence suggestions
      const autoAccept = new Set<string>()
      for (const s of data.suggestions || []) {
        if (s.confidence >= 0.8) autoAccept.add(s.contactId)
      }
      setAccepted(autoAccept)
      setProgress(100)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to get AI suggestions")
    } finally {
      setLoading(false)
    }
  }

  const toggleAccept = (contactId: string) => {
    const next = new Set(accepted)
    const nextRej = new Set(rejected)
    if (next.has(contactId)) {
      next.delete(contactId)
    } else {
      next.add(contactId)
      nextRej.delete(contactId)
    }
    setAccepted(next)
    setRejected(nextRej)
  }

  const toggleReject = (contactId: string) => {
    const next = new Set(rejected)
    const nextAcc = new Set(accepted)
    if (next.has(contactId)) {
      next.delete(contactId)
    } else {
      next.add(contactId)
      nextAcc.delete(contactId)
    }
    setRejected(next)
    setAccepted(nextAcc)
  }

  const acceptAll = () => {
    setAccepted(new Set(suggestions.map((s) => s.contactId)))
    setRejected(new Set())
  }

  const handleApply = async () => {
    const toApply = suggestions.filter((s) => accepted.has(s.contactId))
    if (toApply.length === 0) {
      toast.error("No suggestions accepted")
      return
    }

    setApplying(true)
    try {
      const res = await fetch("/api/contacts/bulk-tag", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignments: toApply.map((s) => ({
            contactId: s.contactId,
            tags: s.suggestedTags,
          })),
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Apply failed" }))
        throw new Error(err.error || "Failed to apply tags")
      }

      const data = await res.json()
      toast.success(`Tags applied to ${data.applied || toApply.length} contacts`)
      onTagsApplied?.()
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to apply tags")
    } finally {
      setApplying(false)
    }
  }

  const confidenceColor = (c: number) => {
    if (c >= 0.8) return "text-green-500"
    if (c >= 0.5) return "text-yellow-500"
    return "text-red-500"
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-popover border-border text-popover-foreground sm:max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-popover-foreground">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Bulk Tagging
            <Badge variant="secondary">{contactIds.length} contacts</Badge>
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            AI will analyze selected contacts and suggest relevant tags.
          </DialogDescription>
        </DialogHeader>

        {/* Content */}
        <div className="flex-1 overflow-y-auto py-4">
          {suggestions.length === 0 && !loading ? (
            <div className="py-8 text-center">
              <Sparkles className="mx-auto h-12 w-12 text-muted-foreground/30" />
              <h3 className="mt-3 text-sm font-medium">AI Tag Suggestions</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                AI will analyze {contactIds.length} selected contacts and suggest relevant tags
                based on their names, messages, notes, and existing tags.
              </p>
              <Button className="mt-4" onClick={handleSuggest} disabled={loading}>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate Suggestions
              </Button>
            </div>
          ) : loading ? (
            <div className="py-8 text-center">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
              <p className="mt-3 text-sm text-muted-foreground">
                Analyzing {contactIds.length} contacts...
              </p>
              <div className="mx-auto mt-3 h-2 w-48 rounded-full bg-muted">
                <div
                  className="h-2 rounded-full bg-primary transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Bulk actions */}
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  {accepted.size} accepted, {rejected.size} rejected,{" "}
                  {suggestions.length - accepted.size - rejected.size} pending
                </p>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={acceptAll}>
                    Accept All
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={handleSuggest}>
                    Re-analyze
                  </Button>
                </div>
              </div>

              {/* Suggestion cards */}
              {suggestions.map((suggestion) => {
                const isAccepted = accepted.has(suggestion.contactId)
                const isRejected = rejected.has(suggestion.contactId)

                return (
                  <Card
                    key={suggestion.contactId}
                    className={`p-3 transition-colors ${
                      isAccepted
                        ? "border-green-500/30 bg-green-500/5"
                        : isRejected
                          ? "border-red-500/30 bg-red-500/5 opacity-60"
                          : ""
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">
                            {suggestion.contactName || "Unknown Contact"}
                          </span>
                          <span
                            className={`text-xs font-mono ${confidenceColor(suggestion.confidence)}`}
                          >
                            {Math.round(suggestion.confidence * 100)}%
                          </span>
                        </div>
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {suggestion.suggestedTags.map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-[10px]">
                              <Tag className="mr-0.5 h-2.5 w-2.5" />
                              {tag}
                            </Badge>
                          ))}
                        </div>
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          {suggestion.reasoning}
                        </p>
                      </div>
                      <div className="ml-3 flex shrink-0 gap-1">
                        <Button
                          size="sm"
                          variant={isAccepted ? "default" : "outline"}
                          className="h-7 w-7 p-0"
                          onClick={() => toggleAccept(suggestion.contactId)}
                        >
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant={isRejected ? "destructive" : "outline"}
                          className="h-7 w-7 p-0"
                          onClick={() => toggleReject(suggestion.contactId)}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {suggestions.length > 0 && !loading && (
          <div className="flex items-center justify-between border-t border-border pt-4">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <AlertCircle className="h-3.5 w-3.5" />
              AI suggestions may not be perfect. Review before applying.
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleApply}
                disabled={applying || accepted.size === 0}
              >
                {applying ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Tag className="mr-1.5 h-3.5 w-3.5" />
                )}
                Apply Tags ({accepted.size})
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
