"use client"

import { useState, useEffect, useCallback } from 'react'
import {
  Loader2, Search, Filter, ChevronDown, ChevronUp,
  ArrowUpRight, Phone, Clock, Target, Zap, AlertTriangle,
  Calendar, X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AIConversationLog } from '@/types/ai'

interface LogEntry extends AIConversationLog {
  contact?: { id: string; name: string | null; phone: string } | null
}

export function AILogsViewer() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const limit = 25

  // Filters
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [intentFilter, setIntentFilter] = useState('')
  const [handoffFilter, setHandoffFilter] = useState<'all' | 'true' | 'false'>('all')

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        limit: String(limit),
        offset: String(offset),
      })
      if (dateFrom) params.set('from', new Date(dateFrom).toISOString())
      if (dateTo) params.set('to', new Date(dateTo + 'T23:59:59').toISOString())
      if (intentFilter) params.set('intent', intentFilter)
      if (handoffFilter !== 'all') params.set('handoff', handoffFilter)

      const res = await fetch(`/api/ai/logs?${params}`)
      if (!res.ok) throw new Error('Failed to load logs')
      const data = await res.json()
      setLogs(data.logs)
      setTotal(data.total)
    } catch (err) {
      console.error('Failed to load logs:', err)
    } finally {
      setLoading(false)
    }
  }, [offset, dateFrom, dateTo, intentFilter, handoffFilter])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  const clearFilters = () => {
    setDateFrom('')
    setDateTo('')
    setIntentFilter('')
    setHandoffFilter('all')
    setOffset(0)
  }

  const hasFilters = dateFrom || dateTo || intentFilter || handoffFilter !== 'all'

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white border rounded-lg p-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setOffset(0) }}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">To</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setOffset(0) }}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Intent</label>
            <input
              type="text"
              value={intentFilter}
              onChange={(e) => { setIntentFilter(e.target.value); setOffset(0) }}
              placeholder="e.g. product_inquiry"
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm w-40"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
            <select
              value={handoffFilter}
              onChange={(e) => { setHandoffFilter(e.target.value as 'all' | 'true' | 'false'); setOffset(0) }}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
            >
              <option value="all">All</option>
              <option value="false">Auto-replied</option>
              <option value="true">Handed off</option>
            </select>
          </div>
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700"
            >
              <X className="h-4 w-4" /> Clear
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p className="text-lg font-medium">No logs found</p>
          <p className="text-sm mt-1">
            {hasFilters ? 'Try adjusting your filters' : 'AI conversation logs will appear here once the chatbot starts responding'}
          </p>
        </div>
      ) : (
        <div className="bg-white border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Time</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Contact</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Message</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Intent</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Confidence</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Status</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Latency</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {logs.map((log) => (
                  <>
                    <tr
                      key={log.id}
                      onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                      className="hover:bg-gray-50 cursor-pointer"
                    >
                      <td className="px-4 py-3 whitespace-nowrap text-gray-500">
                        {new Date(log.created_at).toLocaleString('en-NG', {
                          month: 'short', day: 'numeric',
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Phone className="h-3.5 w-3.5 text-gray-400" />
                          <span className="font-medium text-gray-900 truncate max-w-[120px]">
                            {log.contact?.name || log.contact?.phone || 'Unknown'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 max-w-[200px]">
                        <p className="truncate text-gray-700">{log.inbound_message}</p>
                      </td>
                      <td className="px-4 py-3">
                        {log.detected_intent ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">
                            <Target className="h-3 w-3" />
                            {log.detected_intent}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {log.confidence != null ? (
                          <span className={cn(
                            'inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium',
                            Number(log.confidence) >= 0.7 ? 'bg-green-50 text-green-700' :
                            Number(log.confidence) >= 0.5 ? 'bg-yellow-50 text-yellow-700' :
                            'bg-red-50 text-red-700',
                          )}>
                            {(Number(log.confidence) * 100).toFixed(0)}%
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {log.was_handed_off ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-50 text-orange-700 rounded text-xs">
                            <ArrowUpRight className="h-3 w-3" /> Handoff
                          </span>
                        ) : log.was_auto_replied ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-700 rounded text-xs">
                            <Zap className="h-3 w-3" /> Auto
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-500">
                        {log.latency_ms != null ? `${log.latency_ms}ms` : '—'}
                      </td>
                    </tr>

                    {/* Expanded Row */}
                    {expandedId === log.id && (
                      <tr key={`${log.id}-expanded`}>
                        <td colSpan={7} className="px-4 py-4 bg-gray-50">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div>
                              <h4 className="font-medium text-gray-700 mb-1">Inbound Message</h4>
                              <p className="bg-white p-3 rounded border text-gray-800 whitespace-pre-wrap">
                                {log.inbound_message}
                              </p>
                            </div>
                            <div>
                              <h4 className="font-medium text-gray-700 mb-1">AI Response</h4>
                              <p className="bg-white p-3 rounded border text-gray-800 whitespace-pre-wrap">
                                {log.response_text || '(no response sent)'}
                              </p>
                            </div>
                            <div className="md:col-span-2">
                              <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                                {log.model_used && <span>Model: {log.model_used}</span>}
                                {log.tokens_used != null && <span>Tokens: {log.tokens_used}</span>}
                                {log.handoff_reason && (
                                  <span className="text-orange-600">
                                    Handoff reason: {log.handoff_reason}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-t">
            <span className="text-sm text-gray-500">
              Showing {offset + 1}–{Math.min(offset + limit, total)} of {total}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setOffset(Math.max(0, offset - limit))}
                disabled={offset === 0}
                className="px-3 py-1 text-sm border rounded hover:bg-white disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setOffset(offset + limit)}
                disabled={offset + limit >= total}
                className="px-3 py-1 text-sm border rounded hover:bg-white disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
