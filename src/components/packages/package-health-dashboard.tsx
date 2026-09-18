"use client"

import React from "react"
import { cn } from "@/lib/utils"
import {
  BarChart3, Users, AlertTriangle, CheckCircle2, Clock,
  ChevronRight, Activity, TrendingUp, AlertCircle, Eye,
  MessageSquare, Flag,
} from "lucide-react"

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface AccountSummary {
  account_id: string
  business_name: string
  subscription_tier: string
  industry: string
  created_at: string
  active_package: {
    package_config_id: string
    package_key: string
    package_name: string
    price_naira: number
    duration_weeks: number
    total_milestones: number
    completed: number
    in_progress: number
    pending: number
    blocked: number
    skipped: number
    progress_percent: number
    current_week: number
    current_milestone: string | null
    started_at: string | null
    last_activity: string | null
    estimated_end: string | null
  } | null
  campaign_stats: { total: number; active: number; draft: number }
  automation_stats: { total: number; active: number }
  contact_count: number
}

interface PackageHealthDashboardProps {
  accounts: AccountSummary[]
  onSelectAccount: (id: string) => void
  onViewDetails?: (id: string) => void
  onSendUpdate?: (id: string) => void
  onFlagIssue?: (id: string) => void
}

/* ------------------------------------------------------------------ */
/*  RAG Status Logic                                                   */
/* ------------------------------------------------------------------ */
type RagStatus = "green" | "amber" | "red"

function getRagStatus(acct: AccountSummary): RagStatus {
  const pkg = acct.active_package
  if (!pkg) return "red"

  const now = new Date()
  const lastActivity = pkg.last_activity ? new Date(pkg.last_activity) : null
  const daysSinceActivity = lastActivity
    ? Math.floor((now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24))
    : 999

  // Expected progress based on current week
  const expectedProgress = Math.min(
    100,
    Math.round((pkg.current_week / pkg.duration_weeks) * 100)
  )
  const progressDelta = pkg.progress_percent - expectedProgress

  // Red conditions
  if (pkg.blocked > 0) return "red"
  if (daysSinceActivity >= 7) return "red"
  if (progressDelta <= -30) return "red"

  // Amber conditions
  if (daysSinceActivity >= 5) return "amber"
  if (progressDelta <= -15) return "amber"
  if (pkg.in_progress === 0 && pkg.pending > 0) return "amber"

  return "green"
}

function getRagLabel(status: RagStatus): string {
  switch (status) {
    case "green": return "On Track"
    case "amber": return "At Risk"
    case "red": return "Behind"
  }
}

function getRagColor(status: RagStatus): string {
  switch (status) {
    case "green": return "text-emerald-400"
    case "amber": return "text-amber-400"
    case "red": return "text-red-400"
  }
}

function getRagBg(status: RagStatus): string {
  switch (status) {
    case "green": return "bg-emerald-500/10 border-emerald-500/30"
    case "amber": return "bg-amber-500/10 border-amber-500/30"
    case "red": return "bg-red-500/10 border-red-500/30"
  }
}

function getRagDot(status: RagStatus): string {
  switch (status) {
    case "green": return "bg-emerald-400"
    case "amber": return "bg-amber-400"
    case "red": return "bg-red-400"
  }
}

function getAlerts(acct: AccountSummary): string[] {
  const alerts: string[] = []
  const pkg = acct.active_package
  if (!pkg) return ["No package assigned"]

  const now = new Date()
  const lastActivity = pkg.last_activity ? new Date(pkg.last_activity) : null
  const daysSinceActivity = lastActivity
    ? Math.floor((now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24))
    : null

  if (pkg.blocked > 0) {
    alerts.push(`${pkg.blocked} milestone(s) blocked`)
  }
  if (daysSinceActivity !== null && daysSinceActivity >= 7) {
    alerts.push(`No activity in ${daysSinceActivity} days`)
  } else if (daysSinceActivity !== null && daysSinceActivity >= 5) {
    alerts.push(`No activity in ${daysSinceActivity} days`)
  }

  const expectedProgress = Math.min(
    100,
    Math.round((pkg.current_week / pkg.duration_weeks) * 100)
  )
  if (pkg.progress_percent < expectedProgress - 15) {
    alerts.push(`Progress ${pkg.progress_percent}% vs expected ${expectedProgress}%`)
  }

  return alerts
}

const formatNaira = (n: number) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 0,
  }).format(n)

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */
export function PackageHealthDashboard({
  accounts,
  onSelectAccount,
}: PackageHealthDashboardProps) {
  const activeAccounts = accounts.filter((a) => a.active_package)
  const inactiveAccounts = accounts.filter((a) => !a.active_package)

  // Compute RAG counts
  const ragCounts = { green: 0, amber: 0, red: 0 }
  const accountsWithRag = activeAccounts.map((acct) => {
    const rag = getRagStatus(acct)
    ragCounts[rag]++
    return { acct, rag }
  })

  // Sort: red first, then amber, then green
  const ragOrder: Record<RagStatus, number> = { red: 0, amber: 1, green: 2 }
  accountsWithRag.sort((a, b) => ragOrder[a.rag] - ragOrder[b.rag])

  // Collect all alerts
  const allAlerts = activeAccounts.flatMap((acct) => {
    const alerts = getAlerts(acct)
    return alerts.map((alert) => ({
      accountId: acct.account_id,
      businessName: acct.business_name,
      alert,
    }))
  })

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Activity className="h-4 w-4" />
            <span className="text-xs font-medium">Active Packages</span>
          </div>
          <p className="text-2xl font-bold text-foreground">
            {activeAccounts.length}
          </p>
        </div>
        <div className={cn("rounded-lg p-4 border", ragCounts.green > 0 ? "bg-emerald-500/5 border-emerald-500/20" : "bg-card border-border")}>
          <div className="flex items-center gap-2 text-emerald-400 mb-1">
            <CheckCircle2 className="h-4 w-4" />
            <span className="text-xs font-medium">On Track</span>
          </div>
          <p className="text-2xl font-bold text-foreground">
            {ragCounts.green}
          </p>
        </div>
        <div className={cn("rounded-lg p-4 border", ragCounts.amber > 0 ? "bg-amber-500/5 border-amber-500/20" : "bg-card border-border")}>
          <div className="flex items-center gap-2 text-amber-400 mb-1">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-xs font-medium">At Risk</span>
          </div>
          <p className="text-2xl font-bold text-foreground">
            {ragCounts.amber}
          </p>
        </div>
        <div className={cn("rounded-lg p-4 border", ragCounts.red > 0 ? "bg-red-500/5 border-red-500/20" : "bg-card border-border")}>
          <div className="flex items-center gap-2 text-red-400 mb-1">
            <AlertCircle className="h-4 w-4" />
            <span className="text-xs font-medium">Behind</span>
          </div>
          <p className="text-2xl font-bold text-foreground">
            {ragCounts.red}
          </p>
        </div>
      </div>

      {/* Alerts Section */}
      {allAlerts.length > 0 && (
        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-400" />
            Alerts ({allAlerts.length})
          </h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {allAlerts.map((item, i) => (
              <button
                key={i}
                onClick={() => onSelectAccount(item.accountId)}
                className="w-full text-left flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <AlertCircle className="h-4 w-4 text-amber-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-foreground">
                    {item.businessName}:
                  </span>{" "}
                  <span className="text-sm text-muted-foreground">
                    {item.alert}
                  </span>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Active Package Cards */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">
          Active Packages ({activeAccounts.length})
        </h3>
        <div className="grid gap-3">
          {accountsWithRag.map(({ acct, rag }) => {
            const pkg = acct.active_package!
            const alerts = getAlerts(acct)
            return (
              <div
                key={acct.account_id}
                className={cn(
                  "bg-card border rounded-lg p-4 hover:border-accent-500/30 transition-colors cursor-pointer",
                  rag === "red"
                    ? "border-red-500/30"
                    : rag === "amber"
                      ? "border-amber-500/30"
                      : "border-border"
                )}
                onClick={() => onSelectAccount(acct.account_id)}
              >
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                  {/* RAG Indicator + Client Info */}
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div
                      className={cn(
                        "mt-1 h-3 w-3 rounded-full shrink-0",
                        getRagDot(rag)
                      )}
                      title={getRagLabel(rag)}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-foreground truncate">
                          {acct.business_name}
                        </h4>
                        <span
                          className={cn(
                            "text-xs px-2 py-0.5 rounded-full border",
                            getRagBg(rag),
                            getRagColor(rag)
                          )}
                        >
                          {getRagLabel(rag)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {pkg.package_name} · Week {pkg.current_week}/
                        {pkg.duration_weeks}
                        {pkg.current_milestone && (
                          <> · {pkg.current_milestone}</>
                        )}
                      </p>
                      {alerts.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {alerts.map((a, i) => (
                            <span
                              key={i}
                              className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground"
                            >
                              {a}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Progress */}
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm font-medium text-foreground">
                        {pkg.completed}/{pkg.total_milestones} milestones
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatNaira(pkg.price_naira)}
                      </p>
                    </div>
                    <div className="w-24">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-muted-foreground">
                          {pkg.progress_percent}%
                        </span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all",
                            rag === "red"
                              ? "bg-red-500"
                              : rag === "amber"
                                ? "bg-amber-500"
                                : "bg-emerald-500"
                          )}
                          style={{ width: `${pkg.progress_percent}%` }}
                        />
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Inactive Accounts */}
      {inactiveAccounts.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-3">
            No Package ({inactiveAccounts.length})
          </h3>
          <div className="grid gap-2">
            {inactiveAccounts.map((acct) => (
              <div
                key={acct.account_id}
                className="bg-card border border-border rounded-lg p-3 hover:border-accent-500/30 transition-colors cursor-pointer flex items-center justify-between"
                onClick={() => onSelectAccount(acct.account_id)}
              >
                <div>
                  <h4 className="text-sm font-medium text-foreground">
                    {acct.business_name}
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    {acct.industry} · {acct.contact_count} contacts
                  </p>
                </div>
                <span className="text-xs text-amber-400 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> No package
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
