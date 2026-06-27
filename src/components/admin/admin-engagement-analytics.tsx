"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import type { PlatformEngagementAnalytics } from "@/types/admin"
import { AdminExportButton } from "./admin-export-button"
import Link from "next/link"
import {
  Activity,
  CheckCircle2,
  Clock,
  MessageSquare,
  TrendingUp,
  Users,
} from "lucide-react"
import { cn } from "@/lib/utils"

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const HOUR_LABELS = Array.from({ length: 24 }, (_, i) =>
  i.toString().padStart(2, "0"),
)

interface Props {
  days?: number
}

export function AdminEngagementAnalytics({ days = 30 }: Props) {
  const [data, setData] = useState<PlatformEngagementAnalytics | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const db = createClient()
    try {
      const { data: result, error } = await db.rpc(
        "get_platform_engagement_analytics",
        { p_days: days },
      )
      if (error) {
        console.error("[admin] engagement analytics failed:", error)
      } else {
        setData(result as unknown as PlatformEngagementAnalytics)
      }
    } catch (err) {
      console.error("[admin] engagement analytics error:", err)
    } finally {
      setLoading(false)
    }
  }, [days])

  useEffect(() => {
    void load()
  }, [load])

  // Build heatmap grid
  const heatmapGrid = useMemo(() => {
    if (!data?.message_heatmap) return null
    const grid: number[][] = Array.from({ length: 7 }, () =>
      Array(24).fill(0),
    )
    let maxCount = 0
    for (const cell of data.message_heatmap) {
      const dow = Math.round(cell.day_of_week)
      const hod = Math.round(cell.hour_of_day)
      if (dow >= 0 && dow < 7 && hod >= 0 && hod < 24) {
        grid[dow][hod] = cell.message_count
        if (cell.message_count > maxCount) maxCount = cell.message_count
      }
    }
    return { grid, maxCount }
  }, [data])

  const topAccountsExport = useMemo(
    () =>
      (data?.top_accounts_by_engagement ?? []).map((a) => ({
        Account: a.account_name,
        Messages: a.message_count,
        Conversations: a.conversation_count,
        Contacts: a.contact_count,
      })),
    [data],
  )

  if (loading) {
    return (
      <div className="space-y-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-48 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
    )
  }

  if (!data) return null

  const resolution = data.conversation_resolution
  const resolutionRate =
    resolution.total_conversations > 0
      ? Math.round(
          (resolution.resolved_conversations / resolution.total_conversations) *
            100,
        )
      : 0

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <MessageSquare className="h-4 w-4" />
            Total Conversations ({days}d)
          </div>
          <p className="mt-2 text-2xl font-bold text-foreground">
            {resolution.total_conversations.toLocaleString()}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <CheckCircle2 className="h-4 w-4" />
            Resolution Rate
          </div>
          <p className="mt-2 text-2xl font-bold text-foreground">
            {resolutionRate}%
          </p>
          <div className="mt-2 h-1.5 rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all"
              style={{ width: `${resolutionRate}%` }}
            />
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Activity className="h-4 w-4" />
            Open Conversations
          </div>
          <p className="mt-2 text-2xl font-bold text-foreground">
            {resolution.open_conversations.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Message Heatmap */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="mb-4 flex items-center gap-2">
          <Clock className="h-4 w-4 text-amber-500" />
          <h3 className="text-sm font-semibold text-foreground">
            Message Volume Heatmap
          </h3>
        </div>

        {!heatmapGrid || heatmapGrid.maxCount === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No message data in this period
          </p>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[600px]">
              {/* Hour labels */}
              <div className="mb-1 flex">
                <div className="w-10 shrink-0" />
                {HOUR_LABELS.map((h, i) => (
                  <div
                    key={i}
                    className="flex-1 text-center text-[10px] text-muted-foreground"
                  >
                    {i % 3 === 0 ? h : ""}
                  </div>
                ))}
              </div>

              {/* Grid rows */}
              {DAY_LABELS.map((dayLabel, dow) => (
                <div key={dow} className="mb-px flex items-center">
                  <div className="w-10 shrink-0 text-right text-[10px] text-muted-foreground pr-2">
                    {dayLabel}
                  </div>
                  {heatmapGrid.grid[dow].map((count, hod) => {
                    const intensity =
                      heatmapGrid.maxCount > 0
                        ? count / heatmapGrid.maxCount
                        : 0
                    return (
                      <div
                        key={hod}
                        className="flex-1 px-px"
                        title={`${dayLabel} ${HOUR_LABELS[hod]}:00 — ${count} messages`}
                      >
                        <div
                          className="aspect-square rounded-sm transition-colors"
                          style={{
                            backgroundColor:
                              count === 0
                                ? "hsl(var(--muted))"
                                : `rgba(245, 158, 11, ${0.15 + intensity * 0.85})`,
                          }}
                        />
                      </div>
                    )
                  })}
                </div>
              ))}

              {/* Legend */}
              <div className="mt-3 flex items-center justify-end gap-2">
                <span className="text-[10px] text-muted-foreground">Less</span>
                {[0, 0.25, 0.5, 0.75, 1].map((intensity) => (
                  <div
                    key={intensity}
                    className="h-3 w-3 rounded-sm"
                    style={{
                      backgroundColor:
                        intensity === 0
                          ? "hsl(var(--muted))"
                          : `rgba(245, 158, 11, ${0.15 + intensity * 0.85})`,
                    }}
                  />
                ))}
                <span className="text-[10px] text-muted-foreground">More</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Response Time Trend */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="mb-4 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-amber-500" />
          <h3 className="text-sm font-semibold text-foreground">
            Avg Response Time (minutes)
          </h3>
        </div>

        {data.response_time_trend.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No response time data available
          </p>
        ) : (
          <>
            <div
              className="flex items-end gap-px"
              style={{ height: 120 }}
            >
              {(() => {
                const maxMins = Math.max(
                  ...data.response_time_trend.map(
                    (r) => r.avg_response_minutes ?? 0,
                  ),
                  1,
                )
                return data.response_time_trend.map((r, i) => {
                  const val = r.avg_response_minutes ?? 0
                  const h = (val / maxMins) * 100
                  return (
                    <div
                      key={i}
                      className="group relative flex-1"
                      title={`${r.day}: ${val} min`}
                    >
                      <div
                        className="w-full rounded-t bg-blue-500/70 transition-colors group-hover:bg-blue-500"
                        style={{ height: `${Math.max(h, 2)}%` }}
                      />
                      <div className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-foreground px-2 py-1 text-xs text-background opacity-0 transition-opacity group-hover:opacity-100">
                        {val}m
                      </div>
                    </div>
                  )
                })
              })()}
            </div>
            <div className="mt-2 flex justify-between text-xs text-muted-foreground">
              <span>
                {data.response_time_trend[0]?.day
                  ? new Date(
                      data.response_time_trend[0].day,
                    ).toLocaleDateString("en-GB", {
                      month: "short",
                      day: "numeric",
                    })
                  : ""}
              </span>
              <span>
                {data.response_time_trend[
                  data.response_time_trend.length - 1
                ]?.day
                  ? new Date(
                      data.response_time_trend[
                        data.response_time_trend.length - 1
                      ].day,
                    ).toLocaleDateString("en-GB", {
                      month: "short",
                      day: "numeric",
                    })
                  : ""}
              </span>
            </div>
          </>
        )}
      </div>

      {/* Top Accounts by Engagement */}
      <div className="rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-amber-500" />
            <h3 className="text-sm font-semibold text-foreground">
              Top Accounts by Engagement
            </h3>
          </div>
          <AdminExportButton
            data={topAccountsExport as unknown as Record<string, unknown>[]}
            filename="top-engaged-accounts"
          />
        </div>

        {data.top_accounts_by_engagement.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-center">
            <Users className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No engagement data</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {data.top_accounts_by_engagement.map((acct, i) => {
              const maxMsgs = data.top_accounts_by_engagement[0]?.message_count ?? 1
              const pct = Math.round((acct.message_count / maxMsgs) * 100)

              return (
                <div
                  key={acct.account_id}
                  className="flex items-center gap-4 px-5 py-3 transition-colors hover:bg-muted/30"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/admin/accounts/${acct.account_id}`}
                      className="text-sm font-medium text-foreground hover:text-amber-500 transition-colors"
                    >
                      {acct.account_name}
                    </Link>
                    <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{acct.conversation_count} convos</span>
                      <span>{acct.contact_count} contacts</span>
                    </div>
                  </div>
                  <div className="w-32 text-right">
                    <p className="text-sm font-mono font-medium text-foreground">
                      {acct.message_count.toLocaleString()}
                    </p>
                    <div className="mt-1 h-1 rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-amber-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
