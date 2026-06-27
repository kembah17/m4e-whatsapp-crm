"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import type { PlatformGrowthPoint } from "@/types/admin"

type MetricKey = "new_accounts" | "new_contacts" | "new_conversations" | "messages_sent"

const metricConfig: Record<MetricKey, { label: string; color: string; bgColor: string }> = {
  new_accounts: { label: "Accounts", color: "bg-amber-500", bgColor: "bg-amber-500/10" },
  new_contacts: { label: "Contacts", color: "bg-blue-500", bgColor: "bg-blue-500/10" },
  new_conversations: { label: "Conversations", color: "bg-emerald-500", bgColor: "bg-emerald-500/10" },
  messages_sent: { label: "Messages", color: "bg-purple-500", bgColor: "bg-purple-500/10" },
}

interface AdminGrowthChartProps {
  data: PlatformGrowthPoint[] | null
  loading: boolean
}

export function AdminGrowthChart({ data, loading }: AdminGrowthChartProps) {
  const [activeMetric, setActiveMetric] = useState<MetricKey>("new_contacts")

  if (loading || !data) {
    return (
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="mb-4 h-5 w-40 animate-pulse rounded bg-muted" />
        <div className="h-48 animate-pulse rounded bg-muted" />
      </div>
    )
  }

  const config = metricConfig[activeMetric]
  const values = data.map((d) => d[activeMetric])
  const maxVal = Math.max(...values, 1)
  const total = values.reduce((a, b) => a + b, 0)

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Platform Growth</h3>
          <p className="text-xs text-muted-foreground">Last {data.length} days</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(Object.entries(metricConfig) as [MetricKey, typeof config][]).map(
            ([key, cfg]) => (
              <button
                key={key}
                type="button"
                onClick={() => setActiveMetric(key)}
                className={cn(
                  "rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors",
                  activeMetric === key
                    ? `${cfg.bgColor} text-foreground`
                    : "text-muted-foreground hover:bg-muted",
                )}
              >
                {cfg.label}
              </button>
            ),
          )}
        </div>
      </div>

      {/* Summary */}
      <div className="mb-4 flex items-baseline gap-2">
        <span className="text-2xl font-bold text-foreground">
          {total.toLocaleString()}
        </span>
        <span className="text-xs text-muted-foreground">
          total {config.label.toLowerCase()} in period
        </span>
      </div>

      {/* Bar chart */}
      <div className="flex h-40 items-end gap-[2px]">
        {data.map((point, i) => {
          const height = maxVal > 0 ? (point[activeMetric] / maxVal) * 100 : 0
          const date = new Date(point.day)
          const label = date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          })

          return (
            <div
              key={point.day}
              className="group relative flex flex-1 flex-col items-center"
            >
              {/* Tooltip */}
              <div className="pointer-events-none absolute -top-10 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded bg-popover px-2 py-1 text-[10px] text-popover-foreground opacity-0 shadow-lg ring-1 ring-border transition-opacity group-hover:opacity-100">
                {label}: {point[activeMetric].toLocaleString()}
              </div>
              {/* Bar */}
              <div
                className={cn(
                  "w-full min-h-[2px] rounded-t transition-all",
                  config.color,
                  "opacity-70 group-hover:opacity-100",
                )}
                style={{ height: `${Math.max(height, 1)}%` }}
              />
            </div>
          )
        })}
      </div>

      {/* X-axis labels (show every 5th) */}
      <div className="mt-1 flex gap-[2px]">
        {data.map((point, i) => (
          <div key={point.day} className="flex-1 text-center">
            {i % 5 === 0 ? (
              <span className="text-[9px] text-muted-foreground">
                {new Date(point.day).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </span>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  )
}
