"use client"

import { useCallback, useEffect, useState } from 'react'
import { History, ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface ImportSession {
  id: string
  account_id: string
  status: string
  collected_contacts: Record<string, unknown>[] | null
  validation_summary: Record<string, unknown> | null
  source_types: string[] | null
  created_at: string
}

const STATUS_COLORS: Record<string, string> = {
  completed: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30',
  processing: 'bg-blue-500/10 text-blue-500 border-blue-500/30',
  failed: 'bg-red-500/10 text-red-500 border-red-500/30',
  pending: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30',
}

export default function ImportHistoryPage() {
  const [sessions, setSessions] = useState<ImportSession[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const limit = 20

  const fetchSessions = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) })
      if (statusFilter !== 'all') params.set('status', statusFilter)

      const res = await fetch(`/api/imports/history?${params}`)
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setSessions(data.sessions)
      setTotal(data.total)
    } catch (err) {
      console.error('[import-history] fetch failed:', err)
    } finally {
      setLoading(false)
    }
  }, [page, statusFilter])

  useEffect(() => {
    fetchSessions()
  }, [fetchSessions])

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <History className="h-6 w-6" /> Import History
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          View past contact import sessions and their results.
        </p>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1) }}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="processing">Processing</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="py-3 px-4 text-left font-medium text-muted-foreground w-8"></th>
              <th className="py-3 px-4 text-left font-medium text-muted-foreground">Date</th>
              <th className="py-3 px-4 text-left font-medium text-muted-foreground">Status</th>
              <th className="py-3 px-4 text-left font-medium text-muted-foreground">Contacts</th>
              <th className="py-3 px-4 text-left font-medium text-muted-foreground">Sources</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-border/50">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <td key={j} className="py-3 px-4">
                      <div className="h-4 w-20 animate-pulse rounded bg-muted" />
                    </td>
                  ))}
                </tr>
              ))
            ) : sessions.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-muted-foreground">
                  <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  No import sessions found.
                </td>
              </tr>
            ) : (
              sessions.map((session) => {
                const contactCount = Array.isArray(session.collected_contacts)
                  ? session.collected_contacts.length
                  : 0
                const isExpanded = expandedId === session.id

                return (
                  <>
                    <tr
                      key={session.id}
                      className="border-b border-border/50 hover:bg-muted/30 cursor-pointer"
                      onClick={() => setExpandedId(isExpanded ? null : session.id)}
                    >
                      <td className="py-3 px-4">
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                      </td>
                      <td className="py-3 px-4 text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(session.created_at).toLocaleString()}
                      </td>
                      <td className="py-3 px-4">
                        <Badge
                          variant="outline"
                          className={STATUS_COLORS[session.status] || STATUS_COLORS.pending}
                        >
                          {session.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">{contactCount}</td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {(session.source_types || []).map((src, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {src}
                            </Badge>
                          ))}
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr key={`${session.id}-detail`} className="border-b border-border/50">
                        <td colSpan={5} className="py-4 px-8">
                          <div className="space-y-3">
                            {session.validation_summary && (
                              <div>
                                <h4 className="text-xs font-semibold text-muted-foreground mb-1">Validation Summary</h4>
                                <pre className="text-xs bg-muted/50 rounded p-3 overflow-x-auto">
                                  {JSON.stringify(session.validation_summary, null, 2)}
                                </pre>
                              </div>
                            )}
                            {contactCount > 0 && (
                              <div>
                                <h4 className="text-xs font-semibold text-muted-foreground mb-1">
                                  Contacts Preview (first 5)
                                </h4>
                                <div className="overflow-x-auto">
                                  <table className="w-full text-xs">
                                    <thead>
                                      <tr className="border-b border-border">
                                        <th className="py-1 px-2 text-left">Name</th>
                                        <th className="py-1 px-2 text-left">Phone</th>
                                        <th className="py-1 px-2 text-left">Email</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {(session.collected_contacts || []).slice(0, 5).map((c: Record<string, unknown>, i: number) => (
                                        <tr key={i} className="border-b border-border/30">
                                          <td className="py-1 px-2">{String(c.name || c.full_name || '—')}</td>
                                          <td className="py-1 px-2 font-mono">{String(c.phone || c.phone_number || '—')}</td>
                                          <td className="py-1 px-2">{String(c.email || '—')}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm">{page} / {totalPages}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
