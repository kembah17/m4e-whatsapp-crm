"use client"

import { useCallback, useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import type { SecurityEvent, SecuritySummary, MonitoringTimeRange } from "@/lib/monitoring/types"
import { Shield, ShieldAlert, ShieldBan, Globe } from "lucide-react"
import { MonitoringMetricCard } from "./metric-card"

interface SecurityPanelProps {
  timeRange: MonitoringTimeRange
}

export function SecurityPanel({ timeRange }: SecurityPanelProps) {
  const [summary, setSummary] = useState<SecuritySummary | null>(null)
  const [events, setEvents] = useState<SecurityEvent[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(
        `/api/admin/monitoring/security?timeRange=${timeRange}`
      )
      const data = await res.json()
      setSummary(data.summary ?? null)
      setEvents(data.events ?? [])
    } catch {
      console.error("Failed to fetch security data")
    } finally {
      setLoading(false)
    }
  }, [timeRange])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-xl bg-muted"
            />
          ))}
        </div>
        <div className="h-64 animate-pulse rounded-xl bg-muted" />
      </div>
    )
  }

  const severityColors: Record<string, string> = {
    low: "bg-blue-500/10 text-blue-500",
    medium: "bg-amber-500/10 text-amber-500",
    high: "bg-orange-500/10 text-orange-500",
    critical: "bg-red-500/10 text-red-500",
  }

  return (
    <div className="space-y-5">
      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MonitoringMetricCard
          title="Total Events"
          value={summary?.total_events ?? 0}
          icon={Shield}
          color="blue"
          subtitle={`in last ${timeRange}`}
        />
        <MonitoringMetricCard
          title="Blocked"
          value={summary?.blocked_count ?? 0}
          icon={ShieldBan}
          color="red"
          subtitle="threats blocked"
        />
        <MonitoringMetricCard
          title="Unique IPs"
          value={summary?.unique_ips ?? 0}
          icon={Globe}
          color="amber"
          subtitle="distinct sources"
        />
      </div>

      {/* Top IPs */}
      {summary?.top_ips && summary.top_ips.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="mb-4 text-sm font-semibold text-foreground">
            Top IP Addresses
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="pb-2 text-left text-xs font-medium text-muted-foreground">
                    IP Address
                  </th>
                  <th className="pb-2 text-right text-xs font-medium text-muted-foreground">
                    Events
                  </th>
                  <th className="pb-2 text-right text-xs font-medium text-muted-foreground">
                    Blocked
                  </th>
                </tr>
              </thead>
              <tbody>
                {summary.top_ips.map((ip) => (
                  <tr
                    key={ip.ip}
                    className="border-b border-border/50 last:border-0"
                  >
                    <td className="py-2 font-mono text-xs text-foreground">
                      {ip.ip}
                    </td>
                    <td className="py-2 text-right text-xs text-foreground">
                      {ip.event_count}
                    </td>
                    <td className="py-2 text-right text-xs">
                      <span
                        className={cn(
                          "inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                          ip.blocked_count > 0
                            ? "bg-red-500/10 text-red-500"
                            : "bg-emerald-500/10 text-emerald-500",
                        )}
                      >
                        {ip.blocked_count}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent events */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="mb-4 text-sm font-semibold text-foreground">
          Recent Security Events
        </h3>
        {events.length === 0 ? (
          <div className="py-8 text-center">
            <ShieldAlert className="mx-auto h-8 w-8 text-muted-foreground/30" />
            <p className="mt-2 text-xs text-muted-foreground">
              No security events in this time range.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {events.slice(0, 20).map((event) => (
              <div
                key={event.id}
                className="flex items-center gap-3 rounded-lg border border-border/50 bg-background/50 p-3"
              >
                <span
                  className={cn(
                    "inline-flex shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium",
                    severityColors[event.severity] ?? severityColors.low,
                  )}
                >
                  {event.severity.toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-foreground">
                    {event.event_type}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {event.path ?? "—"} • {event.ip_address ?? "unknown IP"}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {event.blocked && (
                    <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-medium text-red-500">
                      BLOCKED
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {new Date(event.created_at).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
