"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import type { PlatformCampaignAnalytics } from "@/types/admin"
import { AdminExportButton } from "./admin-export-button"
import { BarChart3, MessageSquare, Megaphone } from "lucide-react"
import { cn } from "@/lib/utils"

interface Props {
  days?: number
}

export function AdminCampaignAnalytics({ days = 30 }: Props) {
  const [data, setData] = useState<PlatformCampaignAnalytics | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const db = createClient()
    try {
      const { data: result, error } = await db.rpc(
        "get_platform_campaign_analytics",
        { p_days: days },
      )
      if (error) {
        console.error("[admin] campaign analytics failed:", error)
      } else {
        setData(result as unknown as PlatformCampaignAnalytics)
      }
    } catch (err) {
      console.error("[admin] campaign analytics error:", err)
    } finally {
      setLoading(false)
    }
  }, [days])

  useEffect(() => {
    void load()
  }, [load])

  const templateExport = useMemo(
    () =>
      (data?.template_performance ?? []).map((t) => ({
        Template: t.template_name,
        Category: t.template_category,
        Campaigns: t.campaign_count,
        Sent: t.total_sent,
        "Open Rate": `${t.open_rate}%`,
        "Reply Rate": `${t.reply_rate}%`,
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

  const maxVolume = Math.max(
    ...data.volume_over_time.map((v) => v.messages_sent),
    1,
  )

  const totalChannels = Object.values(data.channel_distribution).reduce(
    (s, v) => s + v,
    0,
  )

  const channelColors: Record<string, string> = {
    whatsapp: "bg-emerald-500",
    email: "bg-blue-500",
    sms: "bg-orange-500",
    auto: "bg-purple-500",
  }

  return (
    <div className="space-y-6">
      {/* Template Performance */}
      <div className="rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2">
            <Megaphone className="h-4 w-4 text-amber-500" />
            <h3 className="text-sm font-semibold text-foreground">
              Template Performance
            </h3>
          </div>
          <AdminExportButton
            data={templateExport as unknown as Record<string, unknown>[]}
            filename="template-performance"
          />
        </div>

        {data.template_performance.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-center">
            <Megaphone className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No campaign data in the last {days} days
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-5 py-3 text-left font-medium text-muted-foreground">
                    Template
                  </th>
                  <th className="px-5 py-3 text-left font-medium text-muted-foreground">
                    Category
                  </th>
                  <th className="px-5 py-3 text-right font-medium text-muted-foreground">
                    Campaigns
                  </th>
                  <th className="px-5 py-3 text-right font-medium text-muted-foreground">
                    Sent
                  </th>
                  <th className="px-5 py-3 text-right font-medium text-muted-foreground">
                    Open %
                  </th>
                  <th className="px-5 py-3 text-right font-medium text-muted-foreground">
                    Reply %
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.template_performance.map((t, i) => (
                  <tr key={i} className="transition-colors hover:bg-muted/30">
                    <td className="px-5 py-3 font-medium text-foreground">
                      {t.template_name}
                    </td>
                    <td className="px-5 py-3 text-xs capitalize text-muted-foreground">
                      {t.template_category}
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-muted-foreground">
                      {t.campaign_count}
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-muted-foreground">
                      {t.total_sent.toLocaleString()}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="h-1.5 w-16 rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-amber-500"
                            style={{ width: `${Math.min(t.open_rate, 100)}%` }}
                          />
                        </div>
                        <span className="font-mono text-foreground">
                          {t.open_rate}%
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="h-1.5 w-16 rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-emerald-500"
                            style={{ width: `${Math.min(t.reply_rate, 100)}%` }}
                          />
                        </div>
                        <span className="font-mono text-foreground">
                          {t.reply_rate}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Volume Over Time */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="mb-4 flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-amber-500" />
          <h3 className="text-sm font-semibold text-foreground">
            Campaign Volume ({days}d)
          </h3>
        </div>

        {data.volume_over_time.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No data available
          </p>
        ) : (
          <div className="flex items-end gap-px" style={{ height: 160 }}>
            {data.volume_over_time.map((v, i) => {
              const h = maxVolume > 0 ? (v.messages_sent / maxVolume) * 100 : 0
              return (
                <div
                  key={i}
                  className="group relative flex-1"
                  title={`${v.day}: ${v.messages_sent} msgs, ${v.campaigns_created} campaigns`}
                >
                  <div
                    className="w-full rounded-t bg-amber-500/80 transition-colors group-hover:bg-amber-500"
                    style={{ height: `${Math.max(h, 2)}%` }}
                  />
                  <div className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-foreground px-2 py-1 text-xs text-background opacity-0 transition-opacity group-hover:opacity-100">
                    {v.messages_sent} msgs
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <div className="mt-2 flex justify-between text-xs text-muted-foreground">
          <span>
            {data.volume_over_time[0]?.day
              ? new Date(data.volume_over_time[0].day).toLocaleDateString(
                  "en-GB",
                  { month: "short", day: "numeric" },
                )
              : ""}
          </span>
          <span>
            {data.volume_over_time[data.volume_over_time.length - 1]?.day
              ? new Date(
                  data.volume_over_time[data.volume_over_time.length - 1].day,
                ).toLocaleDateString("en-GB", {
                  month: "short",
                  day: "numeric",
                })
              : ""}
          </span>
        </div>
      </div>

      {/* Channel Distribution */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="mb-4 flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-amber-500" />
          <h3 className="text-sm font-semibold text-foreground">
            Channel Distribution
          </h3>
        </div>

        {totalChannels === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No campaigns in this period
          </p>
        ) : (
          <div className="space-y-3">
            {/* Stacked bar */}
            <div className="flex h-6 overflow-hidden rounded-full bg-muted">
              {Object.entries(data.channel_distribution).map(([ch, count]) => {
                if (count === 0) return null
                const pct = (count / totalChannels) * 100
                return (
                  <div
                    key={ch}
                    className={cn("transition-all", channelColors[ch] || "bg-zinc-500")}
                    style={{ width: `${pct}%` }}
                    title={`${ch}: ${count} (${pct.toFixed(1)}%)`}
                  />
                )
              })}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-4">
              {Object.entries(data.channel_distribution).map(([ch, count]) => (
                <div key={ch} className="flex items-center gap-2">
                  <div
                    className={cn(
                      "h-3 w-3 rounded-full",
                      channelColors[ch] || "bg-zinc-500",
                    )}
                  />
                  <span className="text-xs capitalize text-muted-foreground">
                    {ch}: {count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
