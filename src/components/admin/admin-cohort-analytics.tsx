"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import type { PlatformCohortAnalytics } from "@/types/admin"
import { AdminExportButton } from "./admin-export-button"
import {
  CalendarDays,
  Layers,
  MessageSquare,
  Radio,
  Settings2,
  Megaphone,
  Handshake,
  Wifi,
} from "lucide-react"
import { cn } from "@/lib/utils"

export function AdminCohortAnalytics() {
  const [data, setData] = useState<PlatformCohortAnalytics | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const db = createClient()
    try {
      const { data: result, error } = await db.rpc(
        "get_platform_cohort_analytics",
      )
      if (error) {
        console.error("[admin] cohort analytics failed:", error)
      } else {
        setData(result as unknown as PlatformCohortAnalytics)
      }
    } catch (err) {
      console.error("[admin] cohort analytics error:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const retentionExport = useMemo(
    () =>
      (data?.account_retention ?? []).map((r) => ({
        "Cohort Month": r.cohort_month,
        "Total Accounts": r.total_accounts,
        "Active Now": r.active_now,
        "Retention Rate": `${r.retention_rate}%`,
      })),
    [data],
  )

  if (loading) {
    return (
      <div className="space-y-6">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="h-64 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
    )
  }

  if (!data) return null

  const adoption = data.feature_adoption
  const totalAccounts = adoption.total_accounts || 1

  const features = [
    {
      key: "whatsapp",
      label: "WhatsApp Connected",
      count: adoption.using_whatsapp,
      icon: Wifi,
      color: "bg-emerald-500",
    },
    {
      key: "broadcasts",
      label: "Broadcasts Sent",
      count: adoption.using_broadcasts,
      icon: Radio,
      color: "bg-blue-500",
    },
    {
      key: "automations",
      label: "Active Automations",
      count: adoption.using_automations,
      icon: Settings2,
      color: "bg-purple-500",
    },
    {
      key: "campaigns",
      label: "Campaigns Run",
      count: adoption.using_campaigns,
      icon: Megaphone,
      color: "bg-amber-500",
    },
    {
      key: "deals",
      label: "Deals Pipeline",
      count: adoption.using_deals,
      icon: Handshake,
      color: "bg-orange-500",
    },
  ]

  return (
    <div className="space-y-6">
      {/* Account Retention by Cohort */}
      <div className="rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-amber-500" />
            <h3 className="text-sm font-semibold text-foreground">
              Account Retention by Signup Month
            </h3>
          </div>
          <AdminExportButton
            data={retentionExport as unknown as Record<string, unknown>[]}
            filename="cohort-retention"
          />
        </div>

        {data.account_retention.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-center">
            <CalendarDays className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No cohort data available
            </p>
          </div>
        ) : (
          <div className="p-5">
            {/* Chart */}
            <div className="space-y-3">
              {data.account_retention.map((cohort) => {
                const retColor =
                  cohort.retention_rate >= 70
                    ? "bg-emerald-500"
                    : cohort.retention_rate >= 40
                      ? "bg-amber-500"
                      : "bg-red-500"

                return (
                  <div key={cohort.cohort_month} className="flex items-center gap-3">
                    <div className="w-20 shrink-0 text-right">
                      <span className="text-xs font-medium text-muted-foreground">
                        {cohort.cohort_month}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div className="h-6 flex-1 rounded bg-muted">
                          <div
                            className={cn(
                              "flex h-full items-center rounded px-2 text-xs font-medium text-white transition-all",
                              retColor,
                            )}
                            style={{
                              width: `${Math.max(cohort.retention_rate, 3)}%`,
                            }}
                          >
                            {cohort.retention_rate >= 15
                              ? `${cohort.retention_rate}%`
                              : ""}
                          </div>
                        </div>
                        <div className="w-24 shrink-0 text-right">
                          <span className="text-xs text-muted-foreground">
                            {cohort.active_now}/{cohort.total_accounts}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Legend */}
            <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                <span>≥70% retained</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                <span>40-69%</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-red-500" />
                <span>&lt;40%</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Feature Adoption */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="mb-4 flex items-center gap-2">
          <Layers className="h-4 w-4 text-amber-500" />
          <h3 className="text-sm font-semibold text-foreground">
            Feature Adoption
          </h3>
          <span className="text-xs text-muted-foreground">
            ({totalAccounts} total accounts)
          </span>
        </div>

        <div className="space-y-4">
          {features.map((feat) => {
            const pct = Math.round((feat.count / totalAccounts) * 100)

            return (
              <div key={feat.key}>
                <div className="mb-1.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <feat.icon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-foreground">
                      {feat.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {feat.count} accounts
                    </span>
                    <span className="text-sm font-bold text-foreground">
                      {pct}%
                    </span>
                  </div>
                </div>
                <div className="h-2 rounded-full bg-muted">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      feat.color,
                    )}
                    style={{ width: `${Math.max(pct, 1)}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
