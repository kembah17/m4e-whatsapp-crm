"use client"

import { useCallback, useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import type { SystemLog, MonitoringTimeRange } from "@/lib/monitoring/types"
import { ChevronDown, ChevronRight, Search } from "lucide-react"

interface LogViewerProps {
  timeRange: MonitoringTimeRange
}

const levelColors: Record<string, string> = {
  debug: "bg-gray-500/10 text-gray-400",
  info: "bg-blue-500/10 text-blue-500",
  warn: "bg-amber-500/10 text-amber-500",
  error: "bg-red-500/10 text-red-500",
  fatal: "bg-red-500/20 text-red-400 font-bold",
}

const LEVELS = ["all", "debug", "info", "warn", "error", "fatal"] as const
const CATEGORIES = [
  "all",
  "api",
  "auth",
  "webhook",
  "broadcast",
  "automation",
  "flow",
  "ai",
  "ecommerce",
  "payment",
  "system",
  "security",
  "cron",
  "database",
] as const

export function LogViewer({ timeRange }: LogViewerProps) {
  const [logs, setLogs] = useState<SystemLog[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [level, setLevel] = useState<string>("all")
  const [category, setCategory] = useState<string>("all")
  const [search, setSearch] = useState("")
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set())
  const limit = 50

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    params.set("timeRange", timeRange)
    params.set("limit", String(limit))
    params.set("offset", String(offset))
    if (level !== "all") params.set("level", level)
    if (category !== "all") params.set("category", category)
    if (search.trim()) params.set("search", search.trim())

    try {
      const res = await fetch(`/api/admin/monitoring/logs?${params}`)
      const data = await res.json()
      setLogs(data.logs ?? [])
      setTotal(data.total ?? 0)
    } catch {
      console.error("Failed to fetch logs")
    } finally {
      setLoading(false)
    }
  }, [timeRange, offset, level, category, search])

  useEffect(() => {
    void fetchLogs()
  }, [fetchLogs])

  // Reset offset when filters change
  useEffect(() => {
    setOffset(0)
  }, [level, category, search, timeRange])

  function toggleExpand(id: number) {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const totalPages = Math.ceil(total / limit)
  const currentPage = Math.floor(offset / limit) + 1

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={level}
          onChange={(e) => setLevel(e.target.value)}
          className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:border-amber-500/50 focus:outline-none"
        >
          {LEVELS.map((l) => (
            <option key={l} value={l}>
              {l === "all" ? "All Levels" : l.toUpperCase()}
            </option>
          ))}
        </select>

        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:border-amber-500/50 focus:outline-none"
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c === "all" ? "All Categories" : c}
            </option>
          ))}
        </select>

        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search logs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-border bg-background py-1.5 pl-9 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-amber-500/50 focus:outline-none"
          />
        </div>
      </div>

      {/* Log table */}
      <div className="rounded-xl border border-border bg-card">
        {/* Header */}
        <div className="grid grid-cols-[80px_70px_90px_1fr_120px] gap-2 border-b border-border px-4 py-2.5">
          <span className="text-xs font-medium text-muted-foreground">Time</span>
          <span className="text-xs font-medium text-muted-foreground">Level</span>
          <span className="text-xs font-medium text-muted-foreground">Category</span>
          <span className="text-xs font-medium text-muted-foreground">Message</span>
          <span className="text-xs font-medium text-muted-foreground">Request ID</span>
        </div>

        {loading ? (
          <div className="space-y-0">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="h-10 animate-pulse border-b border-border bg-muted/30"
              />
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="px-4 py-8 text-center text-xs text-muted-foreground">
            No logs found for the selected filters.
          </div>
        ) : (
          logs.map((log) => {
            const isExpanded = expandedIds.has(log.id)
            const hasMetadata =
              log.metadata &&
              Object.keys(log.metadata).length > 0

            return (
              <div key={log.id} className="border-b border-border last:border-0">
                <button
                  type="button"
                  onClick={() => hasMetadata && toggleExpand(log.id)}
                  className={cn(
                    "grid w-full grid-cols-[80px_70px_90px_1fr_120px] gap-2 px-4 py-2 text-left transition-colors",
                    hasMetadata && "cursor-pointer hover:bg-muted/30",
                    !hasMetadata && "cursor-default",
                  )}
                >
                  <span className="truncate text-xs text-muted-foreground">
                    {new Date(log.created_at).toLocaleTimeString()}
                  </span>
                  <span>
                    <span
                      className={cn(
                        "inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                        levelColors[log.level] ?? levelColors.info,
                      )}
                    >
                      {log.level.toUpperCase()}
                    </span>
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {log.category}
                  </span>
                  <span className="flex items-center gap-1 truncate text-xs text-foreground">
                    {hasMetadata && (
                      isExpanded ? (
                        <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />
                      )
                    )}
                    {log.message}
                  </span>
                  <span className="truncate text-xs font-mono text-muted-foreground">
                    {log.request_id ? log.request_id.slice(0, 8) : "—"}
                  </span>
                </button>

                {isExpanded && hasMetadata && (
                  <div className="border-t border-border/50 bg-muted/20 px-4 py-3">
                    <pre className="overflow-x-auto text-xs text-muted-foreground">
                      {JSON.stringify(log.metadata, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Showing {offset + 1}–{Math.min(offset + limit, total)} of {total}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setOffset(Math.max(0, offset - limit))}
              disabled={offset === 0}
              className="rounded-lg border border-border px-3 py-1 text-xs text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-xs text-muted-foreground">
              Page {currentPage} of {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setOffset(offset + limit)}
              disabled={offset + limit >= total}
              className="rounded-lg border border-border px-3 py-1 text-xs text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
