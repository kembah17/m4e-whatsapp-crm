"use client"

import { useCallback, useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import type { PlatformMetrics, PlatformGrowthPoint } from "@/types/admin"
import { AdminGrowthChart } from "@/components/admin/admin-growth-chart"
import {
  AdminMetricCard,
  AdminMetricSkeleton,
} from "@/components/admin/admin-metric-card"
import { AdminCampaignAnalytics } from "@/components/admin/admin-campaign-analytics"
import { AdminEngagementAnalytics } from "@/components/admin/admin-engagement-analytics"
import { AdminCohortAnalytics } from "@/components/admin/admin-cohort-analytics"
import {
  BarChart3,
  MessageSquare,
  Radio,
  TrendingUp,
  Users,
  Zap,
  Megaphone,
  Activity,
  CalendarDays,
} from "lucide-react"
import { cn } from "@/lib/utils"

type TimeRange = 7 | 14 | 30 | 60 | 90
type AnalyticsTab = "overview" | "campaigns" | "engagement" | "cohorts"

const TABS: { key: AnalyticsTab; label: string; icon: typeof BarChart3 }[] = [
  { key: "overview", label: "Overview", icon: BarChart3 },
  { key: "campaigns", label: "Campaigns", icon: Megaphone },
  { key: "engagement", label: "Engagement", icon: Activity },
  { key: "cohorts", label: "Cohorts", icon: CalendarDays },
]

export default function AdminAnalyticsPage() {
  const [activeTab, setActiveTab] = useState<AnalyticsTab>("overview")
  const [metrics, setMetrics] = useState<PlatformMetrics | null>(null)
  const [metricsLoading, setMetricsLoading] = useState(true)

  const [growth, setGrowth] = useState<PlatformGrowthPoint[] | null>(null)
  const [growthLoading, setGrowthLoading] = useState(true)

  const [timeRange, setTimeRange] = useState<TimeRange>(30)

  const loadMetrics = useCallback(async () => {
    setMetricsLoading(true)
    const db = createClient()
    const { data, error } = await db.rpc("get_platform_metrics")
    if (error) {
      console.error("[admin] analytics metrics failed:", error)
    } else {
      setMetrics(data as unknown as PlatformMetrics)
    }
    setMetricsLoading(false)
  }, [])

  const loadGrowth = useCallback(async () => {
    setGrowthLoading(true)
    const db = createClient()
    const { data, error } = await db.rpc("get_platform_growth_series", {
      p_days: timeRange,
    })
    if (error) {
      console.error("[admin] analytics growth failed:", error)
    } else {
      setGrowth(data as unknown as PlatformGrowthPoint[])
    }
    setGrowthLoading(false)
  }, [timeRange])

  useEffect(() => {
    void loadMetrics()
  }, [loadMetrics])

  useEffect(() => {
    void loadGrowth()
  }, [loadGrowth])

  // Compute averages from growth data
  const avgDaily = growth
    ? {
        contacts:
          growth.length > 0
            ? Math.round(
                growth.reduce((s, d) => s + d.new_contacts, 0) / growth.length,
              )
            : 0,
        conversations:
          growth.length > 0
            ? Math.round(
                growth.reduce((s, d) => s + d.new_conversations, 0) /
                  growth.length,
              )
            : 0,
        messages:
          growth.length > 0
            ? Math.round(
                growth.reduce((s, d) => s + d.messages_sent, 0) / growth.length,
              )
            : 0,
      }
    : null

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Platform Analytics
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Detailed platform usage metrics and growth trends.
          </p>
        </div>

        {/* Time range selector — only show on overview tab */}
        {activeTab === "overview" && (
          <div className="flex rounded-lg border border-border">
            {([7, 14, 30, 60, 90] as TimeRange[]).map((range) => (
              <button
                key={range}
                type="button"
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors first:rounded-l-lg last:rounded-r-lg ${
                  timeRange === range
                    ? "bg-amber-500/10 text-amber-500"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {range}d
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 rounded-lg border border-border bg-muted/30 p-1">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors",
              activeTab === tab.key
                ? "bg-card text-amber-500 shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <tab.icon className="h-4 w-4" />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "overview" && (
        <div className="space-y-5">
          {/* Key metrics */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {metricsLoading || !metrics ? (
              Array.from({ length: 4 }).map((_, i) => (
                <AdminMetricSkeleton key={i} />
              ))
            ) : (
              <>
                <AdminMetricCard
                  title="Messages (7d)"
                  value={metrics.messages_last_7d}
                  icon={MessageSquare}
                  accent="purple"
                  trend={{
                    value: metrics.messages_last_30d,
                    label: "in 30 days",
                  }}
                />
                <AdminMetricCard
                  title="New Contacts (7d)"
                  value={metrics.contacts_last_7d}
                  icon={Users}
                  accent="green"
                  subtitle={`${metrics.total_contacts.toLocaleString()} total`}
                />
                <AdminMetricCard
                  title="Broadcasts (30d)"
                  value={metrics.broadcasts_sent_last_30d}
                  icon={Radio}
                  accent="blue"
                  subtitle={`${metrics.total_broadcasts.toLocaleString()} total`}
                />
                <AdminMetricCard
                  title="Active Automations"
                  value={metrics.active_automations}
                  icon={Zap}
                  accent="amber"
                  subtitle={`of ${metrics.total_automations} total`}
                />
              </>
            )}
          </div>

          {/* Growth chart */}
          <AdminGrowthChart data={growth} loading={growthLoading} />

          {/* Daily averages */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {avgDaily ? (
              <>
                <div className="rounded-xl border border-border bg-card p-5">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10">
                      <Users className="h-4 w-4 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Avg. Daily Contacts
                      </p>
                      <p className="text-lg font-bold text-foreground">
                        {avgDaily.contacts.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="rounded-xl border border-border bg-card p-5">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10">
                      <MessageSquare className="h-4 w-4 text-purple-500" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Avg. Daily Conversations
                      </p>
                      <p className="text-lg font-bold text-foreground">
                        {avgDaily.conversations.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="rounded-xl border border-border bg-card p-5">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10">
                      <TrendingUp className="h-4 w-4 text-emerald-500" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Avg. Daily Messages
                      </p>
                      <p className="text-lg font-bold text-foreground">
                        {avgDaily.messages.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="h-20 animate-pulse rounded-xl bg-muted"
                />
              ))
            )}
          </div>

          {/* Platform health indicators */}
          {metrics && (
            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="mb-4 text-sm font-semibold text-foreground">
                Platform Health
              </h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {/* WhatsApp connection rate */}
                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      WhatsApp Connection Rate
                    </span>
                    <span className="text-xs font-medium text-foreground">
                      {metrics.total_accounts > 0
                        ? Math.round(
                            (metrics.whatsapp_connected_accounts /
                              metrics.total_accounts) *
                              100,
                          )
                        : 0}
                      %
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all"
                      style={{
                        width: `${
                          metrics.total_accounts > 0
                            ? (metrics.whatsapp_connected_accounts /
                                metrics.total_accounts) *
                              100
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>

                {/* Automation adoption */}
                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      Automation Adoption
                    </span>
                    <span className="text-xs font-medium text-foreground">
                      {metrics.total_automations > 0
                        ? Math.round(
                            (metrics.active_automations /
                              metrics.total_automations) *
                              100,
                          )
                        : 0}
                      %
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-amber-500 transition-all"
                      style={{
                        width: `${
                          metrics.total_automations > 0
                            ? (metrics.active_automations /
                                metrics.total_automations) *
                              100
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>

                {/* Avg contacts per account */}
                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      Avg Contacts/Account
                    </span>
                    <span className="text-xs font-medium text-foreground">
                      {metrics.total_accounts > 0
                        ? Math.round(
                            metrics.total_contacts / metrics.total_accounts,
                          ).toLocaleString()
                        : 0}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-blue-500 transition-all"
                      style={{
                        width: `${Math.min(
                          100,
                          metrics.total_accounts > 0
                            ? (metrics.total_contacts /
                                metrics.total_accounts /
                                1000) *
                              100
                            : 0,
                        )}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Avg messages per account */}
                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      Avg Messages/Account
                    </span>
                    <span className="text-xs font-medium text-foreground">
                      {metrics.total_accounts > 0
                        ? Math.round(
                            metrics.total_messages / metrics.total_accounts,
                          ).toLocaleString()
                        : 0}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-purple-500 transition-all"
                      style={{
                        width: `${Math.min(
                          100,
                          metrics.total_accounts > 0
                            ? (metrics.total_messages /
                                metrics.total_accounts /
                                5000) *
                              100
                            : 0,
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "campaigns" && (
        <AdminCampaignAnalytics days={timeRange} />
      )}

      {activeTab === "engagement" && (
        <AdminEngagementAnalytics days={timeRange} />
      )}

      {activeTab === "cohorts" && <AdminCohortAnalytics />}
    </div>
  )
}
