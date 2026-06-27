"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import type {
  PlatformCampaignsOverview,
  PlatformCampaignRow,
} from "@/types/admin"
import { AdminExportButton } from "./admin-export-button"
import {
  ChevronDown,
  ChevronUp,
  Filter,
  Megaphone,
  Search,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"

const STATUS_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "draft", label: "Draft" },
  { value: "active", label: "Active" },
  { value: "paused", label: "Paused" },
  { value: "completed", label: "Completed" },
]

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-zinc-500/10 text-zinc-400",
  active: "bg-emerald-500/10 text-emerald-500",
  paused: "bg-amber-500/10 text-amber-500",
  completed: "bg-blue-500/10 text-blue-400",
}

const SORT_OPTIONS = [
  { value: "created_at", label: "Date Created" },
  { value: "open_rate", label: "Open Rate" },
  { value: "reply_rate", label: "Reply Rate" },
]

export function AdminCampaignTable() {
  const [data, setData] = useState<PlatformCampaignsOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState("")
  const [search, setSearch] = useState("")
  const [sortBy, setSortBy] = useState("created_at")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const db = createClient()
    try {
      const { data: result, error } = await db.rpc(
        "get_platform_campaigns_overview",
        {
          p_status: statusFilter || null,
          p_account_id: null,
          p_category: null,
          p_sort_by: sortBy,
          p_sort_dir: sortDir,
          p_limit: 100,
          p_offset: 0,
        },
      )
      if (error) {
        console.error("[admin] campaigns failed:", error)
      } else {
        setData(result as unknown as PlatformCampaignsOverview)
      }
    } catch (err) {
      console.error("[admin] campaigns error:", err)
    } finally {
      setLoading(false)
    }
  }, [statusFilter, sortBy, sortDir])

  useEffect(() => {
    void load()
  }, [load])

  const filtered = useMemo(() => {
    if (!data?.campaigns) return []
    if (!search.trim()) return data.campaigns
    const q = search.toLowerCase()
    return data.campaigns.filter(
      (c) =>
        c.campaign_name.toLowerCase().includes(q) ||
        c.account_name.toLowerCase().includes(q) ||
        (c.template_name && c.template_name.toLowerCase().includes(q)),
    )
  }, [data, search])

  const exportData = useMemo(
    () =>
      filtered.map((c) => ({
        Campaign: c.campaign_name,
        Account: c.account_name,
        Template: c.template_name || "-",
        Status: c.status,
        Channel: c.channel,
        Created: c.created_at,
        Audience: c.total_audience,
        Sent: c.total_sent,
        "Open Rate": `${c.open_rate}%`,
        "Reply Rate": `${c.reply_rate}%`,
      })),
    [filtered],
  )

  const toggleSort = (field: string) => {
    if (sortBy === field) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"))
    } else {
      setSortBy(field)
      setSortDir("desc")
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-9 w-32 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search campaigns..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-full rounded-lg border border-border bg-card pl-9 pr-8 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 rounded-lg border border-border bg-card px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="h-9 rounded-lg border border-border bg-card px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setSortDir((d) => (d === "desc" ? "asc" : "desc"))}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground"
          >
            {sortDir === "desc" ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronUp className="h-4 w-4" />
            )}
          </button>
        </div>

        <div className="ml-auto">
          <AdminExportButton
            data={exportData as unknown as Record<string, unknown>[]}
            filename="campaigns"
          />
        </div>
      </div>

      {/* Results count */}
      <p className="text-xs text-muted-foreground">
        {filtered.length} of {data?.total_count ?? 0} campaigns
      </p>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Megaphone className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground">No campaigns found</p>
          <p className="text-xs text-muted-foreground">
            {search || statusFilter
              ? "Try adjusting your filters"
              : "No campaigns have been created yet"}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Campaign
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Account
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Status
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Channel
                </th>
                <th
                  className="cursor-pointer px-4 py-3 text-right font-medium text-muted-foreground hover:text-foreground"
                  onClick={() => toggleSort("open_rate")}
                >
                  Open %
                </th>
                <th
                  className="cursor-pointer px-4 py-3 text-right font-medium text-muted-foreground hover:text-foreground"
                  onClick={() => toggleSort("reply_rate")}
                >
                  Reply %
                </th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                  Sent
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((c) => (
                <CampaignRow
                  key={c.campaign_id}
                  campaign={c}
                  isExpanded={expandedId === c.campaign_id}
                  onToggle={() =>
                    setExpandedId(
                      expandedId === c.campaign_id ? null : c.campaign_id,
                    )
                  }
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function CampaignRow({
  campaign: c,
  isExpanded,
  onToggle,
}: {
  campaign: PlatformCampaignRow
  isExpanded: boolean
  onToggle: () => void
}) {
  return (
    <>
      <tr
        className="cursor-pointer transition-colors hover:bg-muted/30"
        onClick={onToggle}
      >
        <td className="px-4 py-3">
          <div>
            <p className="font-medium text-foreground">{c.campaign_name}</p>
            <p className="text-xs text-muted-foreground">
              {c.template_name || "Custom"}
            </p>
          </div>
        </td>
        <td className="px-4 py-3 text-muted-foreground">{c.account_name}</td>
        <td className="px-4 py-3">
          <span
            className={cn(
              "inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize",
              STATUS_COLORS[c.status] || "bg-muted text-muted-foreground",
            )}
          >
            {c.status}
          </span>
        </td>
        <td className="px-4 py-3 text-xs capitalize text-muted-foreground">
          {c.channel}
        </td>
        <td className="px-4 py-3 text-right font-mono text-foreground">
          {c.open_rate}%
        </td>
        <td className="px-4 py-3 text-right font-mono text-foreground">
          {c.reply_rate}%
        </td>
        <td className="px-4 py-3 text-right font-mono text-muted-foreground">
          {c.total_sent.toLocaleString()}
        </td>
      </tr>
      {isExpanded && (
        <tr>
          <td colSpan={7} className="bg-muted/20 px-4 py-4">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
              <DetailCell label="Audience" value={c.total_audience.toLocaleString()} />
              <DetailCell label="Delivered" value={c.total_delivered.toLocaleString()} />
              <DetailCell label="Read" value={c.total_read.toLocaleString()} />
              <DetailCell label="Replied" value={c.total_replied.toLocaleString()} />
              <DetailCell label="Failed" value={c.total_failed.toLocaleString()} />
              <DetailCell
                label="Created"
                value={new Date(c.created_at).toLocaleDateString()}
              />
              {c.started_at && (
                <DetailCell
                  label="Started"
                  value={new Date(c.started_at).toLocaleDateString()}
                />
              )}
              {c.completed_at && (
                <DetailCell
                  label="Completed"
                  value={new Date(c.completed_at).toLocaleDateString()}
                />
              )}
              {c.template_category && (
                <DetailCell label="Category" value={c.template_category} />
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

function DetailCell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium text-foreground">{value}</p>
    </div>
  )
}
