"use client"

import { useCallback, useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import type { PlatformAlerts } from "@/types/admin"
import Link from "next/link"
import {
  AlertTriangle,
  Radio,
  UserX,
  Wifi,
  WifiOff,
  ChevronDown,
  ChevronUp,
} from "lucide-react"
import { cn } from "@/lib/utils"

export function AdminAlertsPanel() {
  const [alerts, setAlerts] = useState<PlatformAlerts | null>(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)

  const load = useCallback(async () => {
    const db = createClient()
    try {
      const { data, error } = await db.rpc("get_platform_alerts")
      if (error) {
        console.error("[admin] alerts failed:", error)
      } else {
        setAlerts(data as unknown as PlatformAlerts)
      }
    } catch (err) {
      console.error("[admin] alerts error:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="mb-4 h-5 w-40 animate-pulse rounded bg-muted" />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      </div>
    )
  }

  if (!alerts) return null

  const alertGroups = [
    {
      key: "disconnected_whatsapp",
      label: "Disconnected WhatsApp",
      icon: WifiOff,
      color: "text-red-500 bg-red-500/10",
      items: alerts.disconnected_whatsapp,
      count: alerts.disconnected_whatsapp.length,
    },
    {
      key: "inactive_accounts",
      label: "Inactive >30 Days",
      icon: UserX,
      color: "text-amber-500 bg-amber-500/10",
      items: alerts.inactive_accounts,
      count: alerts.inactive_accounts.length,
    },
    {
      key: "failed_broadcasts",
      label: "Failed Broadcasts (7d)",
      icon: Radio,
      color: "text-red-500 bg-red-500/10",
      items: alerts.failed_broadcasts,
      count: alerts.failed_broadcasts.length,
    },
    {
      key: "approaching_limits",
      label: "Approaching Limits",
      icon: AlertTriangle,
      color: "text-amber-500 bg-amber-500/10",
      items: alerts.approaching_limits,
      count: alerts.approaching_limits.length,
    },
  ]

  const totalAlerts = alertGroups.reduce((s, g) => s + g.count, 0)

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">System Alerts</h3>
          <p className="text-xs text-muted-foreground">
            {totalAlerts} active {totalAlerts === 1 ? "alert" : "alerts"}
          </p>
        </div>
        {totalAlerts > 0 && (
          <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-red-500/10 px-2 text-xs font-bold text-red-500">
            {totalAlerts}
          </span>
        )}
      </div>

      {totalAlerts === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10">
            <Wifi className="h-5 w-5 text-emerald-500" />
          </div>
          <p className="text-sm font-medium text-foreground">All systems healthy</p>
          <p className="text-xs text-muted-foreground">No alerts at this time</p>
        </div>
      ) : (
        <div className="space-y-2">
          {alertGroups.map((group) => {
            if (group.count === 0) return null
            const isExpanded = expanded === group.key

            return (
              <div key={group.key} className="rounded-lg border border-border">
                <button
                  type="button"
                  onClick={() => setExpanded(isExpanded ? null : group.key)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50"
                >
                  <div
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                      group.color,
                    )}
                  >
                    <group.icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">
                      {group.label}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {group.count} {group.count === 1 ? "account" : "accounts"}
                    </p>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>

                {isExpanded && (
                  <div className="border-t border-border px-4 py-2">
                    <ul className="divide-y divide-border">
                      {group.items.slice(0, 10).map((item, idx) => (
                        <li key={idx} className="py-2">
                          <Link
                            href={`/admin/accounts/${(item as { account_id: string }).account_id}`}
                            className="flex items-center justify-between text-sm hover:text-amber-500 transition-colors"
                          >
                            <span className="font-medium text-foreground">
                              {(item as { account_name: string }).account_name}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              View →
                            </span>
                          </Link>
                        </li>
                      ))}
                      {group.count > 10 && (
                        <li className="py-2 text-xs text-muted-foreground">
                          +{group.count - 10} more
                        </li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
