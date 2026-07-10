"use client"

import { useCallback, useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import {
  HardDrive,
  Database,
  MessageSquare,
  Users,
  Server,
  Archive,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  TrendingUp,
  Shield,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface InfraMetrics {
  databaseSizeBytes: number
  messageCount: number
  contactCount: number
  fileStorageBytes: number
  connectionCount: number
  accountCount: number
}

interface InfraAlert {
  level: "info" | "warning" | "critical"
  metric: string
  current: number
  threshold: number
  recommendation: string
}

interface ArchivalStatus {
  enabled: boolean
  retentionDays: number
  lastRun: string | null
  lastRunCount: number
  totalArchived: number
}

interface InfraSnapshot {
  id: string
  database_size_bytes: number
  message_count: number
  contact_count: number
  file_storage_bytes: number
  connection_count: number
  account_count: number
  snapshot_at: string
}

interface InfraData {
  metrics: InfraMetrics
  alerts: InfraAlert[]
  archival: ArchivalStatus
  tier: string
  snapshots: InfraSnapshot[]
  generatedAt: string
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B"
  const units = ["B", "KB", "MB", "GB", "TB"]
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  const value = bytes / Math.pow(1024, i)
  return `${value.toFixed(i > 0 ? 1 : 0)} ${units[i]}`
}

function formatNumber(n: number): string {
  return n.toLocaleString("en-US")
}

function formatDate(iso: string | null): string {
  if (!iso) return "Never"
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

const alertColors: Record<string, { bg: string; text: string; border: string }> = {
  critical: {
    bg: "bg-red-500/10",
    text: "text-red-400",
    border: "border-red-500/30",
  },
  warning: {
    bg: "bg-amber-500/10",
    text: "text-amber-400",
    border: "border-amber-500/30",
  },
  info: {
    bg: "bg-blue-500/10",
    text: "text-blue-400",
    border: "border-blue-500/30",
  },
}

/* ------------------------------------------------------------------ */
/*  Metric Card (inline, matches monitoring pattern)                    */
/* ------------------------------------------------------------------ */

function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color = "blue",
}: {
  title: string
  value: string
  subtitle?: string
  icon: typeof Database
  color?: "green" | "amber" | "red" | "blue"
}) {
  const colorMap = {
    green: { bg: "bg-emerald-500/10", text: "text-emerald-500" },
    amber: { bg: "bg-amber-500/10", text: "text-amber-500" },
    red: { bg: "bg-red-500/10", text: "text-red-500" },
    blue: { bg: "bg-blue-500/10", text: "text-blue-500" },
  }
  const colors = colorMap[color]

  return (
    <div className="rounded-xl border border-border bg-card p-5 transition-colors hover:border-amber-500/20">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-lg",
              colors.bg,
            )}
          >
            <Icon className={cn("h-5 w-5", colors.text)} />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{title}</p>
            <p className="text-xl font-semibold text-foreground">{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Page Component                                                     */
/* ------------------------------------------------------------------ */

export default function InfrastructurePage() {
  const [data, setData] = useState<InfraData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    setError(null)

    try {
      const res = await fetch("/api/admin/infrastructure")
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = (await res.json()) as InfraData
      setData(json)
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to fetch"
      setError(msg)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  /* ---- Loading state ---- */
  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
          <p className="text-sm text-muted-foreground">
            Loading infrastructure data...
          </p>
        </div>
      </div>
    )
  }

  /* ---- Error state ---- */
  if (error) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4">
        <AlertTriangle className="h-10 w-10 text-red-400" />
        <p className="text-sm text-muted-foreground">{error}</p>
        <button
          onClick={() => void fetchData()}
          className="rounded-lg bg-amber-500/10 px-4 py-2 text-sm font-medium text-amber-500 transition-colors hover:bg-amber-500/20"
        >
          Retry
        </button>
      </div>
    )
  }

  if (!data) return null

  const { metrics, alerts, archival, tier, snapshots } = data
  const criticalCount = alerts.filter((a) => a.level === "critical").length
  const warningCount = alerts.filter((a) => a.level === "warning").length

  return (
    <div className="space-y-6">
      {/* ---- Header ---- */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Infrastructure</h1>
          <p className="text-sm text-muted-foreground">
            System resources, storage, and archival management
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge
            variant="outline"
            className={cn(
              "uppercase",
              tier === "pro"
                ? "border-emerald-500/30 text-emerald-400"
                : "border-amber-500/30 text-amber-400",
            )}
          >
            {tier} tier
          </Badge>
          <button
            onClick={() => void fetchData(true)}
            disabled={refreshing}
            className="flex items-center gap-2 rounded-lg bg-amber-500/10 px-3 py-2 text-sm font-medium text-amber-500 transition-colors hover:bg-amber-500/20 disabled:opacity-50"
          >
            <RefreshCw
              className={cn("h-4 w-4", refreshing && "animate-spin")}
            />
            Refresh
          </button>
        </div>
      </div>

      {/* ---- Metrics Grid ---- */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <MetricCard
          title="Database Size"
          value={formatBytes(metrics.databaseSizeBytes)}
          subtitle={tier === "free" ? "500 MB limit" : "8 GB limit"}
          icon={Database}
          color={
            metrics.databaseSizeBytes > 400 * 1024 * 1024
              ? "red"
              : metrics.databaseSizeBytes > 250 * 1024 * 1024
                ? "amber"
                : "green"
          }
        />
        <MetricCard
          title="Messages"
          value={formatNumber(metrics.messageCount)}
          subtitle="Active in database"
          icon={MessageSquare}
          color={metrics.messageCount > 100000 ? "amber" : "blue"}
        />
        <MetricCard
          title="Contacts"
          value={formatNumber(metrics.contactCount)}
          icon={Users}
          color="blue"
        />
        <MetricCard
          title="File Storage"
          value={formatBytes(metrics.fileStorageBytes)}
          subtitle={tier === "free" ? "1 GB limit" : "100 GB limit"}
          icon={HardDrive}
          color={
            metrics.fileStorageBytes > 800 * 1024 * 1024
              ? "red"
              : metrics.fileStorageBytes > 500 * 1024 * 1024
                ? "amber"
                : "green"
          }
        />
        <MetricCard
          title="DB Connections"
          value={formatNumber(metrics.connectionCount)}
          subtitle={tier === "free" ? "60 max" : "200 max"}
          icon={Server}
          color={metrics.connectionCount > 48 ? "amber" : "green"}
        />
        <MetricCard
          title="Accounts"
          value={formatNumber(metrics.accountCount)}
          icon={Shield}
          color="blue"
        />
      </div>

      {/* ---- Alerts Section ---- */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Alerts</h2>
          <div className="flex items-center gap-2">
            {criticalCount > 0 && (
              <Badge
                variant="outline"
                className="border-red-500/30 text-red-400"
              >
                {criticalCount} critical
              </Badge>
            )}
            {warningCount > 0 && (
              <Badge
                variant="outline"
                className="border-amber-500/30 text-amber-400"
              >
                {warningCount} warning
              </Badge>
            )}
            {alerts.length === 0 && (
              <Badge
                variant="outline"
                className="border-emerald-500/30 text-emerald-400"
              >
                All clear
              </Badge>
            )}
          </div>
        </div>

        {alerts.length === 0 ? (
          <div className="flex items-center gap-3 rounded-lg bg-emerald-500/5 p-4">
            <CheckCircle className="h-5 w-5 text-emerald-500" />
            <p className="text-sm text-muted-foreground">
              All infrastructure metrics are within healthy limits.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.map((alert, idx) => {
              const colors = alertColors[alert.level] ?? alertColors.info
              return (
                <div
                  key={idx}
                  className={cn(
                    "rounded-lg border p-4",
                    colors.bg,
                    colors.border,
                  )}
                >
                  <div className="flex items-start gap-3">
                    <AlertTriangle
                      className={cn("mt-0.5 h-5 w-5 shrink-0", colors.text)}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn("text-sm font-semibold", colors.text)}
                        >
                          {alert.metric}
                        </span>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] uppercase",
                            colors.border,
                            colors.text,
                          )}
                        >
                          {alert.level}
                        </Badge>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Current: {formatBytes(alert.current)} &middot;
                        Threshold: {formatBytes(alert.threshold)}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {alert.recommendation}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ---- Archival Status ---- */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">
            Message Archival
          </h2>
          <Badge
            variant="outline"
            className={cn(
              archival.enabled
                ? "border-emerald-500/30 text-emerald-400"
                : "border-zinc-500/30 text-zinc-400",
            )}
          >
            {archival.enabled ? "Enabled" : "Disabled"}
          </Badge>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg bg-muted/50 p-4">
            <p className="text-xs text-muted-foreground">Retention Period</p>
            <p className="text-lg font-semibold text-foreground">
              {archival.retentionDays} days
            </p>
          </div>
          <div className="rounded-lg bg-muted/50 p-4">
            <p className="text-xs text-muted-foreground">Last Run</p>
            <p className="text-sm font-medium text-foreground">
              {formatDate(archival.lastRun)}
            </p>
            {archival.lastRunCount > 0 && (
              <p className="text-xs text-muted-foreground">
                {formatNumber(archival.lastRunCount)} messages
              </p>
            )}
          </div>
          <div className="rounded-lg bg-muted/50 p-4">
            <p className="text-xs text-muted-foreground">Total Archived</p>
            <p className="text-lg font-semibold text-foreground">
              {formatNumber(archival.totalArchived)}
            </p>
          </div>
          <div className="rounded-lg bg-muted/50 p-4">
            <p className="text-xs text-muted-foreground">Storage</p>
            <p className="text-sm font-medium text-foreground">
              <Archive className="mr-1 inline h-4 w-4 text-amber-500" />
              {archival.enabled ? "R2 / Local" : "Not configured"}
            </p>
          </div>
        </div>

        {!archival.enabled && (
          <div className="mt-4 rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
            <p className="text-sm text-amber-400">
              <strong>Recommendation:</strong> Enable message archival to
              automatically move old messages to cold storage and keep your
              database lean. Set <code>ARCHIVAL_ENABLED=true</code> and
              configure retention days via{" "}
              <code>ARCHIVAL_RETENTION_DAYS</code>.
            </p>
          </div>
        )}
      </div>

      {/* ---- Trend Snapshots ---- */}
      {snapshots.length > 1 && (
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-amber-500" />
            <h2 className="text-lg font-semibold text-foreground">
              Recent Snapshots
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="pb-2 pr-4">Time</th>
                  <th className="pb-2 pr-4">DB Size</th>
                  <th className="pb-2 pr-4">Messages</th>
                  <th className="pb-2 pr-4">Contacts</th>
                  <th className="pb-2 pr-4">Files</th>
                  <th className="pb-2">Connections</th>
                </tr>
              </thead>
              <tbody>
                {snapshots.slice(0, 10).map((snap) => (
                  <tr
                    key={snap.id}
                    className="border-b border-border/50 text-foreground"
                  >
                    <td className="py-2 pr-4 text-xs text-muted-foreground">
                      {formatDate(snap.snapshot_at)}
                    </td>
                    <td className="py-2 pr-4">
                      {formatBytes(snap.database_size_bytes)}
                    </td>
                    <td className="py-2 pr-4">
                      {formatNumber(snap.message_count)}
                    </td>
                    <td className="py-2 pr-4">
                      {formatNumber(snap.contact_count)}
                    </td>
                    <td className="py-2 pr-4">
                      {formatBytes(snap.file_storage_bytes)}
                    </td>
                    <td className="py-2">
                      {formatNumber(snap.connection_count)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ---- Upgrade Recommendations ---- */}
      {tier === "free" && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5">
          <h2 className="mb-3 text-lg font-semibold text-amber-400">
            Upgrade Recommendations
          </h2>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
              <span>
                <strong className="text-foreground">Supabase Pro ($25/mo):</strong>{" "}
                8 GB database, 100 GB file storage, 200 connections, daily
                backups, and email support.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
              <span>
                <strong className="text-foreground">Cloudflare R2:</strong>{" "}
                Enable message archival to R2 for cost-effective cold storage.
                10 GB free, then $0.015/GB/month.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
              <span>
                <strong className="text-foreground">Message Archival:</strong>{" "}
                Set <code className="rounded bg-muted px-1 py-0.5 text-xs">ARCHIVAL_ENABLED=true</code>{" "}
                to automatically archive messages older than the retention
                period.
              </span>
            </li>
          </ul>
        </div>
      )}

      {/* ---- Footer ---- */}
      <p className="text-xs text-muted-foreground">
        Last updated: {formatDate(data.generatedAt)}
      </p>
    </div>
  )
}
