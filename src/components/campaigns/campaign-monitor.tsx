"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { cn } from "@/lib/utils"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Send,
  CheckCircle2,
  Eye,
  MessageSquare,
  AlertTriangle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Activity,
} from "lucide-react"
import type { CampaignReport } from "@/lib/campaigns/report-generator"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CampaignMonitorProps {
  campaignId: string
  campaignStatus: string
  campaignName: string
}

interface MonitorStats {
  sent: number
  delivered: number
  read: number
  replied: number
  failed: number
  total_recipients: number
  delivery_rate: number
  read_rate: number
  reply_rate: number
  hourly_breakdown: Array<{ hour: string; sent: number; delivered: number; read: number }>
  errors: Array<{ phone: string; error: string; timestamp: string }>
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatHourLabel(hourStr: string): string {
  try {
    const d = new Date(hourStr)
    const h = d.getHours()
    const ampm = h >= 12 ? "pm" : "am"
    const h12 = h % 12 || 12
    return `${h12}${ampm}`
  } catch {
    return hourStr
  }
}

function rateColor(rate: number): string {
  if (rate >= 0.95) return "text-emerald-600"
  if (rate >= 0.85) return "text-yellow-600"
  return "text-red-600"
}

function rateBgColor(rate: number): string {
  if (rate >= 0.95) return "bg-emerald-50 border-emerald-200"
  if (rate >= 0.85) return "bg-yellow-50 border-yellow-200"
  return "bg-red-50 border-red-200"
}

function formatTimeAgo(seconds: number): string {
  if (seconds < 5) return "just now"
  if (seconds < 60) return `${seconds}s ago`
  const mins = Math.floor(seconds / 60)
  return `${mins}m ago`
}

function formatErrorTime(timestamp: string): string {
  try {
    return new Date(timestamp).toLocaleTimeString("en-NG", {
      hour: "2-digit",
      minute: "2-digit",
    })
  } catch {
    return timestamp
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CampaignMonitor({
  campaignId,
  campaignStatus,
  campaignName,
}: CampaignMonitorProps) {
  const [stats, setStats] = useState<MonitorStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<number>(0)
  const [secondsAgo, setSecondsAgo] = useState(0)
  const [errorsExpanded, setErrorsExpanded] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // -----------------------------------------------------------------------
  // Fetch report data
  // -----------------------------------------------------------------------

  const fetchReport = useCallback(async () => {
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/report`)
      if (!res.ok) return
      const data = await res.json()
      const report: CampaignReport = data.report
      setStats({
        sent: report.sent,
        delivered: report.delivered,
        read: report.read,
        replied: report.replied,
        failed: report.failed,
        total_recipients: report.total_recipients,
        delivery_rate: report.delivery_rate,
        read_rate: report.read_rate,
        reply_rate: report.reply_rate,
        hourly_breakdown: report.hourly_breakdown,
        errors: report.errors,
      })
      setLastUpdated(Date.now())
      setSecondsAgo(0)
    } catch {
      // Silently fail on poll
    } finally {
      setLoading(false)
    }
  }, [campaignId])

  // -----------------------------------------------------------------------
  // Initial load
  // -----------------------------------------------------------------------

  useEffect(() => {
    fetchReport()
  }, [fetchReport])

  // -----------------------------------------------------------------------
  // Auto-refresh every 30s while active
  // -----------------------------------------------------------------------

  useEffect(() => {
    if (campaignStatus === "active") {
      pollRef.current = setInterval(fetchReport, 30000)
    }
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current)
        pollRef.current = null
      }
    }
  }, [campaignStatus, fetchReport])

  // -----------------------------------------------------------------------
  // Tick "seconds ago" counter
  // -----------------------------------------------------------------------

  useEffect(() => {
    tickRef.current = setInterval(() => {
      if (lastUpdated > 0) {
        setSecondsAgo(Math.floor((Date.now() - lastUpdated) / 1000))
      }
    }, 1000)
    return () => {
      if (tickRef.current) {
        clearInterval(tickRef.current)
        tickRef.current = null
      }
    }
  }, [lastUpdated])

  // -----------------------------------------------------------------------
  // Loading state
  // -----------------------------------------------------------------------

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Activity className="h-4 w-4 animate-pulse" />
            <span className="text-sm">Loading campaign monitor...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!stats) return null

  // -----------------------------------------------------------------------
  // Chart calculations
  // -----------------------------------------------------------------------

  const hourly = stats.hourly_breakdown
  const maxHourlyValue = hourly.length > 0
    ? Math.max(...hourly.map((h) => Math.max(h.sent, h.delivered, h.read)), 1)
    : 1

  const errorCount = stats.errors.length
  const displayErrors = stats.errors.slice(0, 50)

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4 text-muted-foreground" />
            Campaign Monitor
            {campaignStatus === "active" && (
              <span className="flex items-center gap-1 text-xs text-emerald-600">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                Live
              </span>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              Updated {formatTimeAgo(secondsAgo)}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchReport}
              className="h-7 w-7 p-0"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* ============================================================= */}
        {/* Live Stats Bar                                                 */}
        {/* ============================================================= */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {[
            {
              label: "Sent",
              value: stats.sent,
              total: stats.total_recipients,
              icon: Send,
              color: "text-blue-600",
              bg: "bg-blue-50 border-blue-200",
            },
            {
              label: "Delivered",
              value: stats.delivered,
              total: stats.sent,
              icon: CheckCircle2,
              color: rateColor(stats.delivery_rate),
              bg: rateBgColor(stats.delivery_rate),
            },
            {
              label: "Read",
              value: stats.read,
              total: stats.delivered,
              icon: Eye,
              color: "text-teal-600",
              bg: "bg-teal-50 border-teal-200",
            },
            {
              label: "Replied",
              value: stats.replied,
              total: stats.delivered,
              icon: MessageSquare,
              color: "text-emerald-600",
              bg: "bg-emerald-50 border-emerald-200",
            },
            {
              label: "Failed",
              value: stats.failed,
              total: stats.total_recipients,
              icon: AlertTriangle,
              color: stats.failed > 0 ? "text-red-600" : "text-muted-foreground",
              bg: stats.failed > 0 ? "bg-red-50 border-red-200" : "bg-muted/50 border-border",
            },
          ].map((stat) => {
            const StatIcon = stat.icon
            const pct = stat.total > 0 ? ((stat.value / stat.total) * 100).toFixed(1) : "0.0"
            return (
              <div
                key={stat.label}
                className={cn(
                  "rounded-lg border p-3 text-center",
                  stat.bg
                )}
              >
                <StatIcon className={cn("h-4 w-4 mx-auto mb-1", stat.color)} />
                <p className="text-lg font-bold tabular-nums">
                  {stat.value.toLocaleString()}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {stat.label}
                </p>
                <p className={cn("text-xs font-medium tabular-nums", stat.color)}>
                  {pct}%
                </p>
              </div>
            )
          })}
        </div>

        {/* ============================================================= */}
        {/* Timeline Chart (CSS-only)                                      */}
        {/* ============================================================= */}
        {hourly.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-3">Hourly Activity</h4>
            <div className="rounded-lg border bg-muted/30 p-4">
              {/* Legend */}
              <div className="flex items-center gap-4 mb-3 text-xs">
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm bg-blue-500" />
                  Sent
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" />
                  Delivered
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm bg-teal-400" />
                  Read
                </span>
              </div>

              {/* Chart */}
              <div className="flex items-end gap-1 overflow-x-auto pb-1" style={{ minHeight: 120 }}>
                {hourly.map((h, i) => (
                  <div key={i} className="flex flex-col items-center gap-0.5 min-w-[40px] flex-1">
                    {/* Bars container */}
                    <div className="flex items-end gap-px w-full justify-center" style={{ height: 100 }}>
                      {/* Sent bar */}
                      <div
                        className="w-2.5 rounded-t bg-blue-500 transition-all duration-500"
                        style={{
                          height: `${Math.max((h.sent / maxHourlyValue) * 100, 2)}%`,
                        }}
                        title={`Sent: ${h.sent}`}
                      />
                      {/* Delivered bar */}
                      <div
                        className="w-2.5 rounded-t bg-emerald-500 transition-all duration-500"
                        style={{
                          height: `${Math.max((h.delivered / maxHourlyValue) * 100, 2)}%`,
                        }}
                        title={`Delivered: ${h.delivered}`}
                      />
                      {/* Read bar */}
                      <div
                        className="w-2.5 rounded-t bg-teal-400 transition-all duration-500"
                        style={{
                          height: `${Math.max((h.read / maxHourlyValue) * 100, 2)}%`,
                        }}
                        title={`Read: ${h.read}`}
                      />
                    </div>
                    {/* Hour label */}
                    <span className="text-[10px] text-muted-foreground mt-1 tabular-nums">
                      {formatHourLabel(h.hour)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ============================================================= */}
        {/* Error Log (collapsible)                                        */}
        {/* ============================================================= */}
        {errorCount > 0 && (
          <div className="rounded-lg border border-red-200 bg-red-50/50">
            <button
              type="button"
              onClick={() => setErrorsExpanded(!errorsExpanded)}
              className="flex w-full items-center justify-between px-4 py-3 text-left"
            >
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <span className="text-sm font-medium">Error Log</span>
                <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                  {errorCount}
                </Badge>
              </div>
              {errorsExpanded ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </button>

            {errorsExpanded && (
              <div className="border-t border-red-200 px-4 py-3">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-muted-foreground">
                        <th className="pb-2 pr-4 font-medium">Phone</th>
                        <th className="pb-2 pr-4 font-medium">Error</th>
                        <th className="pb-2 font-medium">Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-red-100">
                      {displayErrors.map((err, i) => (
                        <tr key={i}>
                          <td className="py-1.5 pr-4 font-mono text-xs">
                            {err.phone}
                          </td>
                          <td className="py-1.5 pr-4 text-xs text-red-700 max-w-[200px] truncate">
                            {err.error}
                          </td>
                          <td className="py-1.5 text-xs text-muted-foreground whitespace-nowrap">
                            {formatErrorTime(err.timestamp)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {errorCount > 50 && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Showing 50 of {errorCount} errors. Download the full report for complete details.
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
