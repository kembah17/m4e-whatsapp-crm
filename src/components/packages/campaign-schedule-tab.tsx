"use client"

import { useCallback, useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import {
  Loader2, CheckCircle2, Clock, Play, AlertTriangle,
  ArrowRight, Zap, Radio, RefreshCw, Eye, SkipForward,
  Calendar, Rocket, Bot, Target, ChevronDown, ChevronRight,
  ExternalLink,
} from "lucide-react"

/* ================================================================ */
/*  Types                                                            */
/* ================================================================ */

interface ScheduleEntry {
  id: string
  account_id: string
  package_config_id: string
  campaign_template_id: string | null
  package_slug: string
  template_slug: string | null
  campaign_name: string
  sequence_order: number
  scheduled_week: number
  status: "pending" | "created" | "active" | "completed" | "skipped" | "failed"
  campaign_id: string | null
  trigger_id: string | null
  auto_activate: boolean
  activation_delay_hours: number
  notes: string | null
  error_message: string | null
  created_at: string
  updated_at: string
}

interface CampaignScheduleData {
  account_id: string
  package_config_id: string
  package_name: string
  total_campaigns: number
  pending: number
  created: number
  active: number
  completed: number
  skipped: number
  failed: number
  current_week: number
  schedule: ScheduleEntry[]
}

interface AccountSummary {
  account_id: string
  business_name: string
  subscription_tier: string
  industry: string
  active_package: {
    package_config_id: string
    package_key: string
    package_name: string
    progress_percent: number
    current_week: number
  } | null
}

interface CampaignScheduleTabProps {
  account: AccountSummary | null
  accounts: AccountSummary[]
  searchQuery: string
  setSearchQuery: (q: string) => void
  onSelectAccount: (id: string) => void
}

/* ================================================================ */
/*  Helpers                                                          */
/* ================================================================ */

const statusConfig: Record<string, { color: string; icon: typeof Clock; label: string }> = {
  pending: { color: "bg-neutral-500/10 text-neutral-400 border-neutral-500/20", icon: Clock, label: "Pending" },
  created: { color: "bg-blue-500/10 text-blue-400 border-blue-500/20", icon: Target, label: "Created" },
  active: { color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", icon: Play, label: "Active" },
  completed: { color: "bg-green-500/10 text-green-400 border-green-500/20", icon: CheckCircle2, label: "Completed" },
  skipped: { color: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20", icon: SkipForward, label: "Skipped" },
  failed: { color: "bg-red-500/10 text-red-400 border-red-500/20", icon: AlertTriangle, label: "Failed" },
}

const formatDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" }) : "\u2014"

/* ================================================================ */
/*  Account Sidebar (reusable pattern)                               */
/* ================================================================ */

function AccountSidebar({
  accounts, searchQuery, setSearchQuery, selectedId, onSelect,
}: {
  accounts: AccountSummary[]
  searchQuery: string
  setSearchQuery: (q: string) => void
  selectedId: string | null
  onSelect: (id: string) => void
}) {
  const filtered = accounts.filter(a =>
    a.active_package && a.business_name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="w-full md:w-72 shrink-0 space-y-3">
      <input
        type="text"
        placeholder="Search clients..."
        value={searchQuery}
        onChange={e => setSearchQuery(e.target.value)}
        className="w-full px-3 py-2 text-sm bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent-500"
      />
      <div className="space-y-1 max-h-[60vh] overflow-y-auto">
        {filtered.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-4">No clients with active packages</p>
        )}
        {filtered.map(acct => (
          <button
            key={acct.account_id}
            onClick={() => onSelect(acct.account_id)}
            className={cn(
              "w-full text-left px-3 py-2.5 rounded-lg transition-colors text-sm",
              selectedId === acct.account_id
                ? "bg-accent-500/10 border border-accent-500/30 text-accent-500"
                : "bg-card/50 border border-transparent hover:bg-card hover:border-border text-foreground"
            )}
          >
            <p className="font-medium truncate">{acct.business_name}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {acct.active_package?.package_name ?? "No package"}
            </p>
          </button>
        ))}
      </div>
    </div>
  )
}

/* ================================================================ */
/*  Main Component                                                   */
/* ================================================================ */

export default function CampaignScheduleTab({
  account, accounts, searchQuery, setSearchQuery, onSelectAccount,
}: CampaignScheduleTabProps) {
  const [scheduleData, setScheduleData] = useState<CampaignScheduleData | null>(null)
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [expandedRow, setExpandedRow] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  /* ---- Fetch schedule ---- */
  const fetchSchedule = useCallback(async (accountId: string) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/packages/management", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "get_campaign_schedule", account_id: accountId }),
      })
      const json = await res.json()
      if (json.success) {
        setScheduleData(json.schedule)
      } else {
        setError(json.error ?? "Failed to load schedule")
        setScheduleData(null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error")
      setScheduleData(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (account?.account_id) {
      fetchSchedule(account.account_id)
    } else {
      setScheduleData(null)
    }
  }, [account?.account_id, fetchSchedule])

  /* ---- Actions ---- */
  const handleOrchestrate = async () => {
    if (!account?.active_package) return
    setActionLoading("orchestrate")
    try {
      const res = await fetch("/api/packages/management", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "orchestrate_campaigns",
          account_id: account.account_id,
          package_config_id: account.active_package.package_config_id,
        }),
      })
      const json = await res.json()
      if (json.success) {
        await fetchSchedule(account.account_id)
      } else {
        setError(json.warnings?.join(", ") ?? json.error ?? "Orchestration failed")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error")
    } finally {
      setActionLoading(null)
    }
  }

  const handleActivate = async (week?: number) => {
    if (!account) return
    const targetWeek = week ?? scheduleData?.current_week ?? 1
    setActionLoading("activate")
    try {
      const res = await fetch("/api/packages/management", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "activate_campaigns",
          account_id: account.account_id,
          week: targetWeek,
        }),
      })
      const json = await res.json()
      if (json.success) {
        await fetchSchedule(account.account_id)
      } else {
        setError(json.error ?? "Activation failed")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error")
    } finally {
      setActionLoading(null)
    }
  }

  /* ---- Group schedule by week ---- */
  const weekGroups = scheduleData?.schedule.reduce<Record<number, ScheduleEntry[]>>((acc, entry) => {
    const week = entry.scheduled_week
    if (!acc[week]) acc[week] = []
    acc[week].push(entry)
    return acc
  }, {}) ?? {}

  const sortedWeeks = Object.keys(weekGroups).map(Number).sort((a, b) => a - b)

  /* ---- Render ---- */
  return (
    <div className="flex flex-col md:flex-row gap-6">
      {/* Left: Account Selector */}
      <AccountSidebar
        accounts={accounts}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        selectedId={account?.account_id ?? null}
        onSelect={onSelectAccount}
      />

      {/* Right: Campaign Schedule Content */}
      <div className="flex-1 min-w-0">
        {!account ? (
          <div className="flex items-center justify-center min-h-[40vh]">
            <div className="text-center space-y-2">
              <Bot className="h-10 w-10 text-muted-foreground mx-auto" />
              <p className="text-sm text-muted-foreground">Select a client to view their campaign schedule</p>
            </div>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center min-h-[40vh]">
            <Loader2 className="h-6 w-6 animate-spin text-accent-500" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h3 className="font-semibold text-foreground">{account.business_name}</h3>
                <p className="text-xs text-muted-foreground">
                  {account.active_package?.package_name ?? "No package"}
                  {scheduleData && ` \u2022 Week ${scheduleData.current_week}`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleOrchestrate}
                  disabled={actionLoading !== null}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-accent-500/10 text-accent-500 border border-accent-500/20 rounded-lg hover:bg-accent-500/20 transition-colors disabled:opacity-50"
                >
                  {actionLoading === "orchestrate" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Rocket className="h-3.5 w-3.5" />}
                  Orchestrate
                </button>
                <button
                  onClick={() => handleActivate()}
                  disabled={actionLoading !== null || !scheduleData}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
                >
                  {actionLoading === "activate" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
                  Activate Due
                </button>
                <button
                  onClick={() => account && fetchSchedule(account.account_id)}
                  disabled={loading}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-card border border-border rounded-lg hover:bg-muted transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
                  Refresh
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                {error}
                <button onClick={() => setError(null)} className="ml-auto text-red-300 hover:text-red-200">Dismiss</button>
              </div>
            )}

            {/* Stats Summary */}
            {scheduleData && (
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {([
                  { label: "Total", value: scheduleData.total_campaigns, color: "text-foreground" },
                  { label: "Pending", value: scheduleData.pending, color: "text-neutral-400" },
                  { label: "Created", value: scheduleData.created, color: "text-blue-400" },
                  { label: "Active", value: scheduleData.active, color: "text-emerald-400" },
                  { label: "Completed", value: scheduleData.completed, color: "text-green-400" },
                  { label: "Failed", value: scheduleData.failed, color: "text-red-400" },
                ] as const).map(stat => (
                  <div key={stat.label} className="bg-card border border-border rounded-lg px-3 py-2 text-center">
                    <p className={cn("text-lg font-bold", stat.color)}>{stat.value}</p>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                  </div>
                ))}
              </div>
            )}

            {/* No Schedule */}
            {!scheduleData && !loading && !error && (
              <div className="flex flex-col items-center justify-center min-h-[30vh] space-y-3">
                <Calendar className="h-10 w-10 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">No campaign schedule found</p>
                <p className="text-xs text-muted-foreground max-w-sm text-center">
                  Click &quot;Orchestrate&quot; to create a campaign schedule based on the assigned package.
                </p>
              </div>
            )}

            {/* Week-by-Week Timeline */}
            {sortedWeeks.length > 0 && (
              <div className="space-y-3">
                {sortedWeeks.map(week => {
                  const entries = weekGroups[week]
                  const isCurrentWeek = week === (scheduleData?.current_week ?? 0)
                  const isPastWeek = week < (scheduleData?.current_week ?? 0)

                  return (
                    <div
                      key={week}
                      className={cn(
                        "border rounded-lg overflow-hidden",
                        isCurrentWeek
                          ? "border-accent-500/30 bg-accent-500/5"
                          : isPastWeek
                            ? "border-border/50 bg-card/50"
                            : "border-border bg-card"
                      )}
                    >
                      {/* Week Header */}
                      <div className={cn(
                        "flex items-center justify-between px-4 py-2.5",
                        isCurrentWeek ? "bg-accent-500/10" : "bg-muted/30"
                      )}>
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold",
                            isCurrentWeek
                              ? "bg-accent-500 text-white"
                              : isPastWeek
                                ? "bg-emerald-500/20 text-emerald-400"
                                : "bg-muted text-muted-foreground"
                          )}>
                            {week}
                          </span>
                          <span className="text-sm font-medium text-foreground">
                            Week {week}
                          </span>
                          {isCurrentWeek && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-accent-500/20 text-accent-500 font-medium">
                              Current
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {entries.length} campaign{entries.length !== 1 ? "s" : ""}
                        </span>
                      </div>

                      {/* Campaign Entries */}
                      <div className="divide-y divide-border/50">
                        {entries.map(entry => {
                          const sc = statusConfig[entry.status] ?? statusConfig.pending
                          const StatusIcon = sc.icon
                          const isExpanded = expandedRow === entry.id

                          return (
                            <div key={entry.id} className="px-4 py-3">
                              <div
                                className="flex items-center gap-3 cursor-pointer"
                                onClick={() => setExpandedRow(isExpanded ? null : entry.id)}
                              >
                                {/* Status Icon */}
                                <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center border", sc.color)}>
                                  <StatusIcon className="h-4 w-4" />
                                </div>

                                {/* Campaign Info */}
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-foreground truncate">
                                    {entry.campaign_name}
                                  </p>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <span className={cn("text-xs px-1.5 py-0.5 rounded border", sc.color)}>
                                      {sc.label}
                                    </span>
                                    {entry.auto_activate && (
                                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                                        <Zap className="h-3 w-3" /> Auto
                                      </span>
                                    )}
                                    {entry.notes?.includes("Event-based") && (
                                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                                        <Radio className="h-3 w-3" /> Event
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* Expand Arrow */}
                                {isExpanded
                                  ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                  : <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                }
                              </div>

                              {/* Expanded Details */}
                              {isExpanded && (
                                <div className="mt-3 ml-11 space-y-2 text-xs">
                                  <div className="grid grid-cols-2 gap-2">
                                    <div>
                                      <span className="text-muted-foreground">Package Slug:</span>{" "}
                                      <span className="text-foreground font-mono">{entry.package_slug}</span>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">Template Slug:</span>{" "}
                                      <span className="text-foreground font-mono">{entry.template_slug ?? "\u2014"}</span>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">Sequence:</span>{" "}
                                      <span className="text-foreground">#{entry.sequence_order}</span>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">Created:</span>{" "}
                                      <span className="text-foreground">{formatDate(entry.created_at)}</span>
                                    </div>
                                  </div>

                                  {entry.notes && (
                                    <p className="text-muted-foreground italic">{entry.notes}</p>
                                  )}

                                  {entry.error_message && (
                                    <div className="flex items-start gap-1.5 px-2 py-1.5 bg-red-500/10 border border-red-500/20 rounded text-red-400">
                                      <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                                      {entry.error_message}
                                    </div>
                                  )}

                                  {/* Action Links */}
                                  <div className="flex items-center gap-3 pt-1">
                                    {entry.campaign_id && (
                                      <a
                                        href={`/campaigns?id=${entry.campaign_id}`}
                                        className="flex items-center gap-1 text-accent-500 hover:underline"
                                      >
                                        <Eye className="h-3 w-3" /> View Campaign
                                      </a>
                                    )}
                                    {entry.status === "pending" && (
                                      <button
                                        onClick={(e) => { e.stopPropagation(); handleActivate(entry.scheduled_week) }}
                                        className="flex items-center gap-1 text-emerald-400 hover:underline"
                                      >
                                        <Zap className="h-3 w-3" /> Activate Now
                                      </button>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
