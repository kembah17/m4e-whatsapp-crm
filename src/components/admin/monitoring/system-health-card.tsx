"use client"

import { cn } from "@/lib/utils"
import type { SystemHealthSummary } from "@/lib/monitoring/types"
import { Activity, CheckCircle2, AlertTriangle, XCircle } from "lucide-react"

interface SystemHealthCardProps {
  health: SystemHealthSummary | null
  loading?: boolean
}

const statusConfig = {
  healthy: {
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    icon: CheckCircle2,
    label: "Healthy",
  },
  degraded: {
    color: "text-amber-500",
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    icon: AlertTriangle,
    label: "Degraded",
  },
  unhealthy: {
    color: "text-red-500",
    bg: "bg-red-500/10",
    border: "border-red-500/30",
    icon: XCircle,
    label: "Unhealthy",
  },
  unknown: {
    color: "text-muted-foreground",
    bg: "bg-muted",
    border: "border-border",
    icon: Activity,
    label: "Unknown",
  },
} as const

export function SystemHealthCard({ health, loading }: SystemHealthCardProps) {
  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 animate-pulse rounded-lg bg-muted" />
          <div className="space-y-2">
            <div className="h-5 w-32 animate-pulse rounded bg-muted" />
            <div className="h-4 w-48 animate-pulse rounded bg-muted" />
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      </div>
    )
  }

  const statusKey = (health?.status ?? "unknown") as keyof typeof statusConfig
  const config = statusConfig[statusKey] ?? statusConfig.unknown
  const StatusIcon = config.icon

  const checks = Array.isArray(health?.checks)
    ? (health.checks as Array<{ name: string; status: string; message: string; duration_ms: number }>)
    : []

  return (
    <div
      className={cn(
        "rounded-xl border bg-card p-6 transition-colors",
        config.border,
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex h-12 w-12 items-center justify-center rounded-lg",
              config.bg,
            )}
          >
            <StatusIcon className={cn("h-6 w-6", config.color)} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              System Status
            </h3>
            <p className={cn("text-lg font-bold", config.color)}>
              {config.label}
            </p>
          </div>
        </div>
        {health?.last_check && (
          <p className="text-xs text-muted-foreground">
            Last checked:{" "}
            {new Date(health.last_check).toLocaleTimeString()}
          </p>
        )}
      </div>

      {/* Individual checks */}
      {checks.length > 0 && (
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {checks.map((check) => {
            const checkStatus =
              check.status === "pass"
                ? { color: "text-emerald-500", bg: "bg-emerald-500/10" }
                : check.status === "warn"
                  ? { color: "text-amber-500", bg: "bg-amber-500/10" }
                  : { color: "text-red-500", bg: "bg-red-500/10" }

            return (
              <div
                key={check.name}
                className="flex items-center gap-3 rounded-lg border border-border bg-background/50 p-3"
              >
                <div
                  className={cn(
                    "h-2.5 w-2.5 rounded-full",
                    checkStatus.bg,
                    check.status === "pass" && "bg-emerald-500",
                    check.status === "warn" && "bg-amber-500",
                    check.status === "fail" && "bg-red-500",
                  )}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium capitalize text-foreground">
                    {check.name}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {check.message}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground">
                  {check.duration_ms}ms
                </span>
              </div>
            )
          })}
        </div>
      )}

      {/* Summary stats */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg bg-background/50 p-3">
          <p className="text-xs text-muted-foreground">Response Time</p>
          <p className="text-sm font-semibold text-foreground">
            {health?.response_time_ms ?? "—"}ms
          </p>
        </div>
        <div className="rounded-lg bg-background/50 p-3">
          <p className="text-xs text-muted-foreground">Memory</p>
          <p className="text-sm font-semibold text-foreground">
            {health?.memory_used_mb ? `${health.memory_used_mb}MB` : "—"}
          </p>
        </div>
        <div className="rounded-lg bg-background/50 p-3">
          <p className="text-xs text-muted-foreground">Error Rate (1h)</p>
          <p className="text-sm font-semibold text-foreground">
            {health?.error_rate_1h ?? 0}%
          </p>
        </div>
        <div className="rounded-lg bg-background/50 p-3">
          <p className="text-xs text-muted-foreground">Active Alerts</p>
          <p className="text-sm font-semibold text-foreground">
            {health?.active_alerts ?? 0}
          </p>
        </div>
      </div>
    </div>
  )
}
