"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Phone,
  Wifi,
  WifiOff,
  ShieldCheck,
  ShieldAlert,
  RefreshCw,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Unplug,
  MessageSquare,
  History,
  User,
  ShieldOff,
} from "lucide-react"
import { toast } from "sonner"
import { AdminMetricCard, AdminMetricSkeleton } from "@/components/admin/admin-metric-card"
import { WhatsAppDisconnectDialog } from "@/components/admin/whatsapp-disconnect-dialog"

// ── Types ──────────────────────────────────────────────────
interface WhatsAppConfig {
  id: string
  account_id: string
  phone_number_id: string | null
  waba_id: string | null
  status: "connected" | "disconnected"
  business_name: string | null
  display_phone_number: string | null
  quality_rating: string | null
  messaging_limit: string | null
  phone_verified: boolean
  setup_method: string | null
  connected_at: string | null
  registered_at: string | null
  subscribed_apps_at: string | null
  token_expires_at: string | null
  last_registration_error: string | null
  created_at: string
  updated_at: string
  // Enriched fields
  account_name: string
  subscription_tier: string | null
  subscription_status: string | null
}

interface Summary {
  total: number
  connected: number
  disconnected: number
  verified: number
  unverified: number
  embeddedSignup: number
  manual: number
  tokenExpiringSoon: number
  registrationErrors: number
}

interface DisconnectHistoryEntry {
  id: string
  account_id: string
  account_name: string
  disconnected_by: string
  disconnected_by_name: string
  disconnect_type: "owner" | "super_admin"
  reason: string | null
  waba_id: string | null
  phone_number_id: string | null
  actions_taken: string[]
  actions_failed: string[]
  created_at: string
}

type StatusFilter = "" | "connected" | "disconnected"
type TabId = "management" | "history"

// ── Helpers ────────────────────────────────────────────────
function formatDate(iso: string | null): string {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

function formatDateTime(iso: string | null): string {
  if (!iso) return "—"
  return new Date(iso).toLocaleString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function qualityBadge(rating: string | null) {
  if (!rating) return null
  const colors: Record<string, string> = {
    GREEN: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    YELLOW: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    RED: "bg-red-500/10 text-red-500 border-red-500/20",
    UNKNOWN: "bg-muted text-muted-foreground border-border",
  }
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${
        colors[rating] || colors.UNKNOWN
      }`}
    >
      {rating}
    </span>
  )
}

function statusBadge(status: string) {
  if (status === "connected") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-500">
        <Wifi className="h-3 w-3" />
        Connected
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-red-500/20 bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-500">
      <WifiOff className="h-3 w-3" />
      Disconnected
    </span>
  )
}

function tierBadge(tier: string | null) {
  if (!tier) return null
  const colors: Record<string, string> = {
    starter: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    professional: "bg-purple-500/10 text-purple-500 border-purple-500/20",
    business: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    enterprise: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  }
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${
        colors[tier.toLowerCase()] || "bg-muted text-muted-foreground border-border"
      }`}
    >
      {tier.charAt(0).toUpperCase() + tier.slice(1)}
    </span>
  )
}

function disconnectTypeBadge(type: string) {
  if (type === "super_admin") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-red-500/20 bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-500">
        <ShieldOff className="h-3 w-3" />
        Super Admin
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-blue-500/20 bg-blue-500/10 px-2 py-0.5 text-xs font-medium text-blue-500">
      <User className="h-3 w-3" />
      Owner
    </span>
  )
}

// ── Page Component ─────────────────────────────────────────
export default function AdminWhatsAppPage() {
  const [activeTab, setActiveTab] = useState<TabId>("management")
  const [configs, setConfigs] = useState<WhatsAppConfig[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("")
  const [expandedRow, setExpandedRow] = useState<string | null>(null)

  // Disconnect dialog state
  const [disconnectTarget, setDisconnectTarget] = useState<{
    accountId: string
    accountName: string
    phoneNumber?: string
  } | null>(null)

  // Disconnect history state
  const [historyEntries, setHistoryEntries] = useState<DisconnectHistoryEntry[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [expandedHistoryRow, setExpandedHistoryRow] = useState<string | null>(null)

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)

    try {
      const params = new URLSearchParams()
      if (statusFilter) params.set("status", statusFilter)
      if (searchQuery.trim()) params.set("search", searchQuery.trim())

      const res = await fetch(`/api/admin/whatsapp-management?${params}`)
      if (!res.ok) throw new Error("Failed to fetch")

      const data = await res.json()
      setConfigs(data.configs || [])
      setSummary(data.summary || null)
    } catch {
      toast.error("Failed to load WhatsApp configurations")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [statusFilter, searchQuery])

  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true)
    try {
      const res = await fetch("/api/admin/whatsapp-disconnect/history")
      if (!res.ok) throw new Error("Failed to fetch history")
      const data = await res.json()
      setHistoryEntries(data.entries || [])
    } catch {
      toast.error("Failed to load disconnect history")
    } finally {
      setHistoryLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    if (activeTab === "history" && historyEntries.length === 0 && !historyLoading) {
      fetchHistory()
    }
  }, [activeTab, historyEntries.length, historyLoading, fetchHistory])

  // ── Filtered configs ──
  const filteredConfigs = configs

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">WhatsApp Management</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Monitor and manage all client WhatsApp Business connections
          </p>
        </div>
        <button
          onClick={() => activeTab === "management" ? fetchData(true) : fetchHistory()}
          disabled={refreshing || historyLoading}
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing || historyLoading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg border border-border bg-muted/50 p-1">
        <button
          onClick={() => setActiveTab("management")}
          className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "management"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Phone className="h-4 w-4" />
          Management
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "history"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <History className="h-4 w-4" />
          Disconnect History
        </button>
      </div>

      {/* ── Management Tab ── */}
      {activeTab === "management" && (
        <>
          {/* Summary Cards */}
          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <AdminMetricSkeleton key={i} />
              ))}
            </div>
          ) : summary ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <AdminMetricCard
                title="Total Configs"
                value={summary.total}
                icon={Phone}
                subtitle={`${summary.embeddedSignup} embedded, ${summary.manual} manual`}
                accent="blue"
              />
              <AdminMetricCard
                title="Connected"
                value={summary.connected}
                icon={Wifi}
                subtitle={`${summary.disconnected} disconnected`}
                accent="green"
              />
              <AdminMetricCard
                title="Verified"
                value={summary.verified}
                icon={ShieldCheck}
                subtitle={summary.unverified > 0 ? `${summary.unverified} unverified` : "All verified"}
                accent="purple"
              />
              <AdminMetricCard
                title="Needs Attention"
                value={summary.tokenExpiringSoon + summary.registrationErrors}
                icon={AlertTriangle}
                subtitle={`${summary.tokenExpiringSoon} expiring tokens, ${summary.registrationErrors} reg errors`}
                accent={summary.tokenExpiringSoon + summary.registrationErrors > 0 ? "red" : "amber"}
              />
            </div>
          ) : null}

          {/* Filters */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by business name, phone number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-border bg-card py-2 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/50"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:border-amber-500/50 focus:outline-none"
              >
                <option value="">All Status</option>
                <option value="connected">Connected</option>
                <option value="disconnected">Disconnected</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Account</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Phone</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Quality</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Tier</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Connected</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i}>
                        {Array.from({ length: 7 }).map((_, j) => (
                          <td key={j} className="px-4 py-3">
                            <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : filteredConfigs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                        <MessageSquare className="mx-auto mb-2 h-8 w-8 opacity-50" />
                        <p>No WhatsApp configurations found</p>
                        {(searchQuery || statusFilter) && (
                          <button
                            onClick={() => {
                              setSearchQuery("")
                              setStatusFilter("")
                            }}
                            className="mt-2 text-sm text-amber-500 hover:underline"
                          >
                            Clear filters
                          </button>
                        )}
                      </td>
                    </tr>
                  ) : (
                    filteredConfigs.map((config) => (
                      <>
                        <tr
                          key={config.id}
                          className="transition-colors hover:bg-muted/30 cursor-pointer"
                          onClick={() =>
                            setExpandedRow(expandedRow === config.id ? null : config.id)
                          }
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {expandedRow === config.id ? (
                                <ChevronUp className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                              )}
                              <div>
                                <p className="font-medium text-foreground">
                                  {config.account_name}
                                </p>
                                {config.business_name &&
                                  config.business_name !== config.account_name && (
                                    <p className="text-xs text-muted-foreground">
                                      {config.business_name}
                                    </p>
                                  )}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-foreground">
                            {config.display_phone_number || "—"}
                          </td>
                          <td className="px-4 py-3">{statusBadge(config.status)}</td>
                          <td className="px-4 py-3">
                            {qualityBadge(config.quality_rating)}
                          </td>
                          <td className="px-4 py-3">
                            {tierBadge(config.subscription_tier)}
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">
                            {formatDate(config.connected_at)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {config.status === "connected" && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setDisconnectTarget({
                                    accountId: config.account_id,
                                    accountName: config.account_name,
                                    phoneNumber: config.display_phone_number || undefined,
                                  })
                                }}
                                className="inline-flex items-center gap-1 rounded-md border border-orange-500/20 bg-orange-500/10 px-2.5 py-1 text-xs font-medium text-orange-500 transition-colors hover:bg-orange-500/20"
                              >
                                <Unplug className="h-3 w-3" />
                                Disconnect
                              </button>
                            )}
                          </td>
                        </tr>

                        {/* Expanded details row */}
                        {expandedRow === config.id && (
                          <tr key={`${config.id}-details`}>
                            <td colSpan={7} className="bg-muted/20 px-4 py-4">
                              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                                <div>
                                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                    WABA ID
                                  </p>
                                  <p className="mt-1 font-mono text-xs text-foreground">
                                    {config.waba_id || "—"}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                    Phone Number ID
                                  </p>
                                  <p className="mt-1 font-mono text-xs text-foreground">
                                    {config.phone_number_id || "—"}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                    Setup Method
                                  </p>
                                  <p className="mt-1 text-xs text-foreground">
                                    {config.setup_method === "embedded_signup"
                                      ? "Embedded Signup"
                                      : "Manual"}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                    Messaging Limit
                                  </p>
                                  <p className="mt-1 text-xs text-foreground">
                                    {config.messaging_limit || "—"}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                    Phone Verified
                                  </p>
                                  <p className="mt-1 flex items-center gap-1 text-xs">
                                    {config.phone_verified ? (
                                      <>
                                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                                        <span className="text-emerald-500">Yes</span>
                                      </>
                                    ) : (
                                      <>
                                        <XCircle className="h-3.5 w-3.5 text-red-500" />
                                        <span className="text-red-500">No</span>
                                      </>
                                    )}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                    Registered At
                                  </p>
                                  <p className="mt-1 text-xs text-foreground">
                                    {formatDateTime(config.registered_at)}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                    Token Expires
                                  </p>
                                  <p className="mt-1 text-xs text-foreground">
                                    {config.token_expires_at ? (
                                      <span
                                        className={
                                          new Date(config.token_expires_at) <=
                                          new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                                            ? "text-red-500"
                                            : ""
                                        }
                                      >
                                        {formatDateTime(config.token_expires_at)}
                                      </span>
                                    ) : (
                                      "—"
                                    )}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                    Last Error
                                  </p>
                                  <p className="mt-1 text-xs text-red-400">
                                    {config.last_registration_error || "None"}
                                  </p>
                                </div>
                              </div>
                              <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                Created {formatDateTime(config.created_at)}
                                {" · "}
                                Updated {formatDateTime(config.updated_at)}
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            {!loading && filteredConfigs.length > 0 && (
              <div className="border-t border-border px-4 py-3 text-xs text-muted-foreground">
                Showing {filteredConfigs.length} of {summary?.total || 0} configurations
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Disconnect History Tab ── */}
      {activeTab === "history" && (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Account</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Disconnected By</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Type</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Reason</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {historyLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 6 }).map((_, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : historyEntries.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                      <History className="mx-auto mb-2 h-8 w-8 opacity-50" />
                      <p>No disconnect events recorded</p>
                    </td>
                  </tr>
                ) : (
                  historyEntries.map((entry) => (
                    <>
                      <tr
                        key={entry.id}
                        className="transition-colors hover:bg-muted/30 cursor-pointer"
                        onClick={() =>
                          setExpandedHistoryRow(
                            expandedHistoryRow === entry.id ? null : entry.id,
                          )
                        }
                      >
                        <td className="px-4 py-3 text-xs text-foreground">
                          <div className="flex items-center gap-2">
                            {expandedHistoryRow === entry.id ? (
                              <ChevronUp className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            )}
                            {formatDateTime(entry.created_at)}
                          </div>
                        </td>
                        <td className="px-4 py-3 font-medium text-foreground">
                          {entry.account_name}
                        </td>
                        <td className="px-4 py-3 text-foreground">
                          {entry.disconnected_by_name}
                        </td>
                        <td className="px-4 py-3">
                          {disconnectTypeBadge(entry.disconnect_type)}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground max-w-[200px] truncate">
                          {entry.reason || "—"}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            {entry.actions_taken.length > 0 && (
                              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-500">
                                <CheckCircle2 className="h-3 w-3" />
                                {entry.actions_taken.length}
                              </span>
                            )}
                            {entry.actions_failed.length > 0 && (
                              <span className="inline-flex items-center gap-1 rounded-full border border-red-500/20 bg-red-500/10 px-2 py-0.5 text-xs text-red-500">
                                <XCircle className="h-3 w-3" />
                                {entry.actions_failed.length}
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* Expanded details */}
                      {expandedHistoryRow === entry.id && (
                        <tr key={`${entry.id}-details`}>
                          <td colSpan={6} className="bg-muted/20 px-4 py-4">
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                              <div>
                                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                  WABA ID
                                </p>
                                <p className="mt-1 font-mono text-xs text-foreground">
                                  {entry.waba_id || "—"}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                  Phone Number ID
                                </p>
                                <p className="mt-1 font-mono text-xs text-foreground">
                                  {entry.phone_number_id || "—"}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                  Reason
                                </p>
                                <p className="mt-1 text-xs text-foreground">
                                  {entry.reason || "Not specified"}
                                </p>
                              </div>
                            </div>

                            {entry.actions_taken.length > 0 && (
                              <div className="mt-3">
                                <p className="text-xs font-medium uppercase tracking-wider text-emerald-500">
                                  Actions Taken
                                </p>
                                <div className="mt-1 flex flex-wrap gap-1">
                                  {entry.actions_taken.map((action, i) => (
                                    <span
                                      key={i}
                                      className="inline-flex items-center gap-1 rounded-md border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-500"
                                    >
                                      <CheckCircle2 className="h-3 w-3" />
                                      {action}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {entry.actions_failed.length > 0 && (
                              <div className="mt-3">
                                <p className="text-xs font-medium uppercase tracking-wider text-red-500">
                                  Actions Failed
                                </p>
                                <div className="mt-1 flex flex-wrap gap-1">
                                  {entry.actions_failed.map((action, i) => (
                                    <span
                                      key={i}
                                      className="inline-flex items-center gap-1 rounded-md border border-red-500/20 bg-red-500/10 px-2 py-0.5 text-xs text-red-500"
                                    >
                                      <XCircle className="h-3 w-3" />
                                      {action}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          {!historyLoading && historyEntries.length > 0 && (
            <div className="border-t border-border px-4 py-3 text-xs text-muted-foreground">
              Showing {historyEntries.length} disconnect events
            </div>
          )}
        </div>
      )}

      {/* Disconnect Dialog */}
      {disconnectTarget && (
        <WhatsAppDisconnectDialog
          open={!!disconnectTarget}
          onOpenChange={(open) => {
            if (!open) setDisconnectTarget(null)
          }}
          accountId={disconnectTarget.accountId}
          accountName={disconnectTarget.accountName}
          phoneNumber={disconnectTarget.phoneNumber}
          onDisconnected={() => {
            setDisconnectTarget(null)
            fetchData(true)
          }}
        />
      )}
    </div>
  )
}
