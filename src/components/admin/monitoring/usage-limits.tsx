"use client"

import { useCallback, useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import type {
  AccountLimitUsage,
  ApproachingLimit,
  UsageLimitData,
} from "@/lib/monitoring/types"
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Gauge,
  Search,
  Users,
} from "lucide-react"

interface LimitItem {
  label: string
  current: number
  max: number
  period?: string
}

function getLimitsForAccount(a: AccountLimitUsage): LimitItem[] {
  return [
    { label: "Contacts", current: a.current_contacts, max: a.max_contacts },
    { label: "Team Members", current: a.current_team_members, max: a.max_team_members },
    { label: "Branches", current: a.current_branches, max: a.max_branches },
    { label: "Pipelines", current: a.current_pipelines, max: a.max_pipelines },
    { label: "Products", current: a.current_products, max: a.max_products },
    { label: "Broadcasts", current: a.current_broadcasts_this_month, max: a.max_broadcasts_per_month, period: "/mo" },
    { label: "Campaigns", current: a.current_campaigns, max: a.max_campaigns },
    { label: "Automations", current: a.current_automations, max: a.max_automations },
    { label: "WhatsApp Flows", current: a.current_whatsapp_flows, max: a.max_whatsapp_flows },
    { label: "AI Chatbot Msgs", current: a.current_ai_chatbot_msgs_this_month, max: a.max_ai_chatbot_msgs_per_month, period: "/mo" },
    { label: "AI Queries", current: a.current_ai_queries_today, max: a.max_ai_queries_per_day, period: "/day" },
    { label: "Invoices", current: a.current_invoices_this_month, max: a.max_invoices_per_month, period: "/mo" },
  ]
}

function getPercentage(current: number, max: number): number {
  if (max >= 999999) return 0
  if (max === 0) return current > 0 ? 100 : 0
  return Math.min(Math.round((current / max) * 100), 100)
}

function getBarColor(pct: number, max: number): string {
  if (max >= 999999) return "bg-emerald-500/40"
  if (pct >= 90) return "bg-red-500"
  if (pct >= 80) return "bg-orange-500"
  if (pct >= 60) return "bg-amber-500"
  return "bg-emerald-500"
}

function getTextColor(pct: number, max: number): string {
  if (max >= 999999) return "text-emerald-400"
  if (pct >= 90) return "text-red-400"
  if (pct >= 80) return "text-orange-400"
  if (pct >= 60) return "text-amber-400"
  return "text-emerald-400"
}

function formatLimit(value: number): string {
  if (value >= 999999) return "Unlimited"
  return value.toLocaleString()
}

function tierBadgeColor(tier: string): string {
  switch (tier) {
    case "starter":
      return "text-blue-400 bg-blue-500/10 border-blue-500/30"
    case "professional":
      return "text-[#C9A84C] bg-[#C9A84C]/10 border-[#C9A84C]/30"
    case "business":
      return "text-emerald-400 bg-emerald-500/10 border-emerald-500/30"
    case "enterprise":
      return "text-purple-400 bg-purple-500/10 border-purple-500/30"
    default:
      return "text-muted-foreground bg-muted border-border"
  }
}

function ProgressBar({ current, max, period }: LimitItem) {
  const pct = getPercentage(current, max)
  const barColor = getBarColor(pct, max)
  const textColor = getTextColor(pct, max)
  const isUnlimited = max >= 999999

  return (
    <div className="space-y-1">
      <div className="h-1.5 w-full rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full transition-all", barColor)}
          style={{ width: isUnlimited ? "2%" : `${Math.max(pct, 2)}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-[10px]">
        <span className={textColor}>
          {current.toLocaleString()} / {formatLimit(max)}
          {period && <span className="text-muted-foreground">{period}</span>}
        </span>
        {!isUnlimited && <span className={textColor}>{pct}%</span>}
        {isUnlimited && <span className="text-emerald-400">∞</span>}
      </div>
    </div>
  )
}

function AccountCard({
  account,
  expanded,
  onToggle,
}: {
  account: AccountLimitUsage
  expanded: boolean
  onToggle: () => void
}) {
  const limits = getLimitsForAccount(account)
  const criticalLimits = limits.filter(
    (l) => l.max < 999999 && getPercentage(l.current, l.max) >= 80
  )

  return (
    <div className="rounded-lg border border-border bg-card">
      {/* Header */}
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between p-4 text-left"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
            <Users className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">
              {account.account_name || "Unnamed Account"}
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              <span
                className={cn(
                  "inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium capitalize",
                  tierBadgeColor(account.current_tier)
                )}
              >
                {account.current_tier}
              </span>
              {criticalLimits.length > 0 && (
                <span className="inline-flex items-center gap-1 text-[10px] text-orange-400">
                  <AlertTriangle className="h-3 w-3" />
                  {criticalLimits.length} limit{criticalLimits.length !== 1 ? "s" : ""} near cap
                </span>
              )}
            </div>
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-border px-4 pb-4 pt-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {limits.map((limit) => (
              <div key={limit.label} className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">
                  {limit.label}
                </p>
                <ProgressBar {...limit} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export function UsageLimits() {
  const [data, setData] = useState<UsageLimitData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/admin/monitoring/usage")
      if (!res.ok) throw new Error("Failed to fetch usage data")
      const json = await res.json()
      setData(json as UsageLimitData)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  function toggleExpanded(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-20 animate-pulse rounded-lg border border-border bg-card"
          />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
        Error loading usage data: {error}
      </div>
    )
  }

  if (!data) return null

  const filtered = data.accounts.filter((a) =>
    (a.account_name || "").toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-5">
      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Users className="h-4 w-4" />
            <span className="text-xs font-medium">Total Accounts</span>
          </div>
          <p className="mt-1 text-2xl font-bold text-foreground">
            {data.summary.total_accounts}
          </p>
        </div>
        <div className="rounded-lg border border-orange-500/30 bg-orange-500/5 p-4">
          <div className="flex items-center gap-2 text-orange-400">
            <Gauge className="h-4 w-4" />
            <span className="text-xs font-medium">Approaching Limits</span>
          </div>
          <p className="mt-1 text-2xl font-bold text-orange-400">
            {data.summary.accounts_approaching_limit}
          </p>
        </div>
        <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-4">
          <div className="flex items-center gap-2 text-red-400">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-xs font-medium">At Limit</span>
          </div>
          <p className="mt-1 text-2xl font-bold text-red-400">
            {data.summary.accounts_at_limit}
          </p>
        </div>
      </div>

      {/* Approaching limits alerts */}
      {data.approaching_limits.length > 0 && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-amber-400">
            <AlertTriangle className="h-4 w-4" />
            Limits Approaching Capacity
          </h3>
          <div className="space-y-2">
            {data.approaching_limits.map((al, i) => (
              <div
                key={`${al.account_id}-${al.limit_name}-${i}`}
                className="flex items-center justify-between rounded-md bg-card/50 px-3 py-2 text-xs"
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground">
                    {al.account_name}
                  </span>
                  <span className="text-muted-foreground">•</span>
                  <span className="text-muted-foreground">
                    {al.limit_name.replace(/_/g, " ")}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "font-mono font-medium",
                      al.percentage >= 100
                        ? "text-red-400"
                        : al.percentage >= 90
                          ? "text-orange-400"
                          : "text-amber-400"
                    )}
                  >
                    {al.current}/{formatLimit(al.max)} ({al.percentage}%)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search accounts..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-border bg-card py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/30"
        />
      </div>

      {/* Account cards */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {search ? "No accounts match your search" : "No accounts found"}
          </p>
        )}
        {filtered.map((account) => (
          <AccountCard
            key={account.account_id}
            account={account}
            expanded={expandedIds.has(account.account_id)}
            onToggle={() => toggleExpanded(account.account_id)}
          />
        ))}
      </div>
    </div>
  )
}
