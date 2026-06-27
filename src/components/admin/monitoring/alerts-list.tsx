"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import type { SystemAlert } from "@/lib/monitoring/types"
import { AlertTriangle, Bell, CheckCircle2, XOctagon } from "lucide-react"
import { toast } from "sonner"

interface AlertsListProps {
  alerts: SystemAlert[]
  loading?: boolean
  onResolve?: (alertId: string) => void
}

const severityConfig = {
  info: {
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
    icon: Bell,
    label: "Info",
  },
  warning: {
    color: "text-amber-500",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
    icon: AlertTriangle,
    label: "Warning",
  },
  critical: {
    color: "text-red-500",
    bg: "bg-red-500/10",
    border: "border-red-500/20",
    icon: XOctagon,
    label: "Critical",
  },
} as const

export function AlertsList({ alerts, loading, onResolve }: AlertsListProps) {
  const [resolvingIds, setResolvingIds] = useState<Set<string>>(new Set())

  async function handleResolve(alertId: string) {
    setResolvingIds((prev) => new Set(prev).add(alertId))

    try {
      const res = await fetch("/api/admin/monitoring/alerts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alertId, resolved: true }),
      })

      if (!res.ok) {
        throw new Error("Failed to resolve alert")
      }

      toast.success("Alert resolved")
      onResolve?.(alertId)
    } catch {
      toast.error("Failed to resolve alert")
    } finally {
      setResolvingIds((prev) => {
        const next = new Set(prev)
        next.delete(alertId)
        return next
      })
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-20 animate-pulse rounded-xl bg-muted"
          />
        ))}
      </div>
    )
  }

  if (alerts.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center">
        <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500/50" />
        <p className="mt-3 text-sm font-medium text-foreground">
          No active alerts
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          All systems are operating normally.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {alerts.map((alert) => {
        const config =
          severityConfig[alert.severity as keyof typeof severityConfig] ??
          severityConfig.info
        const SeverityIcon = config.icon
        const isResolving = resolvingIds.has(alert.id)

        return (
          <div
            key={alert.id}
            className={cn(
              "rounded-xl border bg-card p-4 transition-colors",
              config.border,
            )}
          >
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                  config.bg,
                )}
              >
                <SeverityIcon className={cn("h-4 w-4", config.color)} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                      config.bg,
                      config.color,
                    )}
                  >
                    {config.label}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {alert.category}
                  </span>
                </div>
                <h4 className="mt-1 text-sm font-semibold text-foreground">
                  {alert.title}
                </h4>
                {alert.description && (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {alert.description}
                  </p>
                )}
                <p className="mt-1 text-xs text-muted-foreground">
                  {new Date(alert.created_at).toLocaleString()}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleResolve(alert.id)}
                disabled={isResolving}
                className={cn(
                  "shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                  "border border-border bg-background text-foreground",
                  "hover:bg-muted",
                  isResolving && "cursor-not-allowed opacity-50",
                )}
              >
                {isResolving ? "Resolving..." : "Resolve"}
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
