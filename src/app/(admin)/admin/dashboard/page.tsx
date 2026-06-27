"use client"

import { useCallback, useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import type {
  PlatformMetrics,
  PlatformAccountRow,
  PlatformGrowthPoint,
} from "@/types/admin"
import {
  Building2,
  MessageSquare,
  Radio,
  Users,
  UserPlus,
  Wifi,
  Zap,
  TrendingUp,
} from "lucide-react"
import {
  AdminMetricCard,
  AdminMetricSkeleton,
} from "@/components/admin/admin-metric-card"
import { AdminGrowthChart } from "@/components/admin/admin-growth-chart"
import { AdminOnboardingTracker } from "@/components/admin/admin-onboarding-tracker"
import Link from "next/link"

export default function AdminDashboardPage() {
  const [metrics, setMetrics] = useState<PlatformMetrics | null>(null)
  const [metricsLoading, setMetricsLoading] = useState(true)

  const [growth, setGrowth] = useState<PlatformGrowthPoint[] | null>(null)
  const [growthLoading, setGrowthLoading] = useState(true)

  const [accounts, setAccounts] = useState<PlatformAccountRow[] | null>(null)
  const [accountsLoading, setAccountsLoading] = useState(true)

  const loadAll = useCallback(async () => {
    const db = createClient()

    // Load platform metrics
    try {
      const { data, error } = await db.rpc("get_platform_metrics")
      if (error) {
        console.error("[admin] metrics failed:", error)
      } else {
        setMetrics(data as unknown as PlatformMetrics)
      }
    } catch (err) {
      console.error("[admin] metrics error:", err)
    } finally {
      setMetricsLoading(false)
    }

    // Load growth series
    try {
      const { data, error } = await db.rpc("get_platform_growth_series", { p_days: 30 })
      if (error) {
        console.error("[admin] growth failed:", error)
      } else {
        setGrowth(data as unknown as PlatformGrowthPoint[])
      }
    } catch (err) {
      console.error("[admin] growth error:", err)
    } finally {
      setGrowthLoading(false)
    }

    // Load accounts for onboarding tracker
    try {
      const { data, error } = await db.rpc("get_platform_accounts_overview", {
        p_sort_by: "created_at",
        p_sort_dir: "desc",
        p_limit: 100,
        p_offset: 0,
      })
      if (error) {
        console.error("[admin] accounts failed:", error)
      } else {
        setAccounts(data as unknown as PlatformAccountRow[])
      }
    } catch (err) {
      console.error("[admin] accounts error:", err)
    } finally {
      setAccountsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Platform Overview</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Real-time metrics across all customer accounts on the M4E platform.
        </p>
      </div>

      {/* Primary metric cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metricsLoading || !metrics ? (
          Array.from({ length: 8 }).map((_, i) => <AdminMetricSkeleton key={i} />)
        ) : (
          <>
            <AdminMetricCard
              title="Total Accounts"
              value={metrics.total_accounts}
              icon={Building2}
              accent="amber"
              trend={{
                value: metrics.accounts_last_7d,
                label: "new this week",
              }}
            />
            <AdminMetricCard
              title="Total Users"
              value={metrics.total_users}
              icon={UserPlus}
              accent="blue"
              subtitle={`Across ${metrics.total_accounts} accounts`}
            />
            <AdminMetricCard
              title="Total Contacts"
              value={metrics.total_contacts}
              icon={Users}
              accent="green"
              trend={{
                value: metrics.contacts_last_7d,
                label: "new this week",
              }}
            />
            <AdminMetricCard
              title="Total Conversations"
              value={metrics.total_conversations}
              icon={MessageSquare}
              accent="purple"
              subtitle={`${metrics.total_messages.toLocaleString()} messages total`}
            />
            <AdminMetricCard
              title="WhatsApp Connected"
              value={metrics.whatsapp_connected_accounts}
              icon={Wifi}
              accent="green"
              subtitle={`of ${metrics.total_accounts} accounts`}
            />
            <AdminMetricCard
              title="Broadcasts Sent"
              value={metrics.total_broadcasts}
              icon={Radio}
              accent="blue"
              trend={{
                value: metrics.broadcasts_sent_last_30d,
                label: "last 30 days",
              }}
            />
            <AdminMetricCard
              title="Active Automations"
              value={metrics.active_automations}
              icon={Zap}
              accent="purple"
              subtitle={`of ${metrics.total_automations} total`}
            />
            <AdminMetricCard
              title="Messages (30d)"
              value={metrics.messages_last_30d}
              icon={TrendingUp}
              accent="amber"
              trend={{
                value: metrics.messages_last_7d,
                label: "last 7 days",
              }}
            />
          </>
        )}
      </div>

      {/* Growth chart + Onboarding tracker */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <AdminGrowthChart data={growth} loading={growthLoading} />
        </div>
        <div className="lg:col-span-2">
          <AdminOnboardingTracker
            accounts={accounts}
            loading={accountsLoading}
          />
        </div>
      </div>

      {/* Recent accounts table */}
      <div className="rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              Recent Accounts
            </h3>
            <p className="text-xs text-muted-foreground">
              Latest customer signups
            </p>
          </div>
          <Link
            href="/admin/accounts"
            className="text-xs font-medium text-amber-500 hover:text-amber-400 transition-colors"
          >
            View all →
          </Link>
        </div>

        {accountsLoading || !accounts ? (
          <div className="p-5">
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-12 animate-pulse rounded bg-muted" />
              ))}
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Account
                  </th>
                  <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Owner
                  </th>
                  <th className="hidden px-5 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground sm:table-cell">
                    Contacts
                  </th>
                  <th className="hidden px-5 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground md:table-cell">
                    Conversations
                  </th>
                  <th className="hidden px-5 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground lg:table-cell">
                    WhatsApp
                  </th>
                  <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Signed Up
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {accounts.slice(0, 10).map((account) => (
                  <tr
                    key={account.account_id}
                    className="transition-colors hover:bg-muted/50"
                  >
                    <td className="px-5 py-3">
                      <Link
                        href={`/admin/accounts/${account.account_id}`}
                        className="text-sm font-medium text-foreground hover:text-amber-500 transition-colors"
                      >
                        {account.account_name || "Unnamed"}
                      </Link>
                    </td>
                    <td className="px-5 py-3">
                      <div>
                        <p className="text-sm text-foreground">
                          {account.owner_name || "—"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {account.owner_email || ""}
                        </p>
                      </div>
                    </td>
                    <td className="hidden px-5 py-3 text-sm text-foreground sm:table-cell">
                      {account.contact_count.toLocaleString()}
                    </td>
                    <td className="hidden px-5 py-3 text-sm text-foreground md:table-cell">
                      {account.conversation_count.toLocaleString()}
                    </td>
                    <td className="hidden px-5 py-3 lg:table-cell">
                      {account.whatsapp_connected ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-500">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          Connected
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                          <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                          Not connected
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-xs text-muted-foreground">
                      {new Date(account.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
