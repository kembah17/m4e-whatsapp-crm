"use client"

import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { Shield, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

interface SecurityEvent {
  id: string
  created_at: string
  event_type: string
  severity: string
  ip_address: string | null
  user_agent: string | null
  path: string | null
  details: Record<string, unknown> | null
  blocked: boolean
}

const SEVERITY_COLORS: Record<string, string> = {
  critical: 'bg-red-500/10 text-red-500 border-red-500/30',
  high: 'bg-orange-500/10 text-orange-500 border-orange-500/30',
  medium: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30',
  low: 'bg-gray-500/10 text-gray-400 border-gray-500/30',
}

export default function AuditLogPage() {
  const { account } = useAuth()
  const [events, setEvents] = useState<SecurityEvent[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [severity, setSeverity] = useState<string>('all')
  const [eventType, setEventType] = useState<string>('all')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const limit = 20

  const role = account?.role
  const isAdmin = role === 'admin' || role === 'super_admin' || role === 'owner'

  const fetchEvents = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) })
      if (severity !== 'all') params.set('severity', severity)
      if (eventType !== 'all') params.set('event_type', eventType)
      if (fromDate) params.set('from_date', fromDate)
      if (toDate) params.set('to_date', toDate)

      const res = await fetch(`/api/admin/audit-log?${params}`)
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setEvents(data.events)
      setTotal(data.total)
    } catch (err) {
      console.error('[audit-log] fetch failed:', err)
    } finally {
      setLoading(false)
    }
  }, [page, severity, eventType, fromDate, toDate])

  useEffect(() => {
    if (isAdmin) fetchEvents()
  }, [fetchEvents, isAdmin])

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Shield className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-lg font-semibold">Access Restricted</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Only administrators can view the audit log.
        </p>
      </div>
    )
  }

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Shield className="h-6 w-6" /> Audit Log
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Security events and system activity monitoring.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={severity} onValueChange={(v) => { setSeverity(v); setPage(1) }}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Severity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Severities</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>

        <Select value={eventType} onValueChange={(v) => { setEventType(v); setPage(1) }}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Event Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="login">Login</SelectItem>
            <SelectItem value="failed_login">Failed Login</SelectItem>
            <SelectItem value="rate_limit">Rate Limit</SelectItem>
            <SelectItem value="api_error">API Error</SelectItem>
            <SelectItem value="suspicious">Suspicious</SelectItem>
          </SelectContent>
        </Select>

        <Input
          type="date"
          value={fromDate}
          onChange={(e) => { setFromDate(e.target.value); setPage(1) }}
          className="w-[160px]"
          placeholder="From date"
        />
        <Input
          type="date"
          value={toDate}
          onChange={(e) => { setToDate(e.target.value); setPage(1) }}
          className="w-[160px]"
          placeholder="To date"
        />
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="py-3 px-4 text-left font-medium text-muted-foreground">Time</th>
              <th className="py-3 px-4 text-left font-medium text-muted-foreground">Event</th>
              <th className="py-3 px-4 text-left font-medium text-muted-foreground">Severity</th>
              <th className="py-3 px-4 text-left font-medium text-muted-foreground">IP</th>
              <th className="py-3 px-4 text-left font-medium text-muted-foreground">Path</th>
              <th className="py-3 px-4 text-left font-medium text-muted-foreground">Blocked</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-border/50">
                  {Array.from({ length: 6 }).map((_, j) => (
                    <td key={j} className="py-3 px-4">
                      <div className="h-4 w-20 animate-pulse rounded bg-muted" />
                    </td>
                  ))}
                </tr>
              ))
            ) : events.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-muted-foreground">
                  <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  No security events found.
                </td>
              </tr>
            ) : (
              events.map((evt) => (
                <tr key={evt.id} className="border-b border-border/50 hover:bg-muted/30">
                  <td className="py-3 px-4 text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(evt.created_at).toLocaleString()}
                  </td>
                  <td className="py-3 px-4 font-medium">{evt.event_type}</td>
                  <td className="py-3 px-4">
                    <Badge
                      variant="outline"
                      className={SEVERITY_COLORS[evt.severity] || SEVERITY_COLORS.low}
                    >
                      {evt.severity}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-xs text-muted-foreground font-mono">
                    {evt.ip_address || '—'}
                  </td>
                  <td className="py-3 px-4 text-xs text-muted-foreground truncate max-w-[200px]">
                    {evt.path || '—'}
                  </td>
                  <td className="py-3 px-4">
                    {evt.blocked ? (
                      <Badge variant="destructive" className="text-xs">Blocked</Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              ))
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
            <span className="text-sm">
              {page} / {totalPages}
            </span>
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
