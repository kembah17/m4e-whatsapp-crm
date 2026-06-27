"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import type {
  SystemAlert,
  SystemHealthSummary,
  ApiMetricsHourly,
  ErrorTrend,
  MonitoringTimeRange,
} from "@/lib/monitoring/types"
import {
  Activity,
  AlertTriangle,
  BarChart3,
  FileText,
  RefreshCw,
  Shield,
} from "lucide-react"
import { SystemHealthCard } from "@/components/admin/monitoring/system-health-card"
import { AlertsList } from "@/components/admin/monitoring/alerts-list"
import { LogViewer } from "@/components/admin/monitoring/log-viewer"
import { SecurityPanel } from "@/components/admin/monitoring/security-panel"
import { PerformanceCharts } from "@/components/admin/monitoring/performance-charts"
import { MonitoringMetricCard } from "@/components/admin/monitoring/metric-card"

type Tab = "overview" | "alerts" | "logs" | "security" | "performance"

const tabs: { id: Tab; label: string; icon: typeof Activity }[] = [
  { id: "overview", label: "Overview", icon: Activity },
  { id: "alerts", label: "Alerts", icon: AlertTriangle },
  { id: "logs", label: "Logs", icon: FileText },
  { id: "security", label: "Security", icon: Shield },
  { id: "performance", label: "Performance", icon: BarChart3 },
]

const timeRanges: MonitoringTimeRange[] = ["1h", "6h", "24h", "7d"]

export default function MonitoringPage() {
  const [activeTab, setActiveTab] = useState<Tab>("overview")
  const [timeRange, setTimeRange] = useState<MonitoringTimeRange>("24h")
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [loading, setLoading] = useState(true)

  // Data state
  const [health, setHealth] = useState<SystemHealthSummary | null>(null)
  const [alerts, setAlerts] = useState<SystemAlert[]>([])
  const [errorTrends, setErrorTrends] = useState<ErrorTrend[]>([])
  const [metrics, setMetrics] = useState<ApiMetricsHourly[]>([])

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(
        `/api/admin/monitoring?timeRange=${timeRange}`
      )
      if (!res.ok) throw new Error("Failed to fetch")
      const data = await res.json()

      setHealth(data.health ?? null)
      setAlerts(data.alerts ?? [])
      setErrorTrends(data.errorTrends ?? [])
      setMetrics(data.metrics ?? [])
    } catch (err) {
      console.error("Failed to fetch monitoring data:", err)
    } finally {
      setLoading(false)
    }
  }, [timeRange])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  // Auto-refresh
  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(() => {
        void fetchData()
      }, 30_000)
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [autoRefresh, fetchData])

  function handleAlertResolved(alertId: string) {
    setAlerts((prev) => prev.filter((a) => a.id !== alertId))
  }

  // Compute overview metrics
  const totalRequests = metrics.reduce((s, m) => s + m.total_requests, 0)
  const totalErrors = metrics.reduce((s, m) => s + m.error_count, 0)
  const errorRate =
    totalRequests > 0
      ? Math.round((totalErrors / totalRequests) * 10000) / 100
      : 0
  const avgResponseTime =
    metrics.length > 0
      ? Math.round(
          metrics.reduce((s, m) => s + Number(m.avg_duration_ms ?? 0), 0) /
            metrics.length
        )
      : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">System Monitoring</h1>
          <p className="text-sm text-muted-foreground">
            Real-time system health, logs, and security monitoring
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Time range selector */}
          <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-1">
            {timeRanges.map((tr) => (
              <button
                key={tr}
                type="button"
                onClick={() => setTimeRange(tr)}
                className={cn(
                  "rounded-md px-3 py-1 text-xs font-medium transition-colors",
                  timeRange === tr
                    ? "bg-amber-500/10 text-amber-500"
                    : "text-muted-foreground hover:bg-muted",
                )}
              >
                {tr}
              </button>
            ))}
          </div>

          {/* Auto-refresh toggle */}
          <button
            type="button"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={cn(
              "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
              autoRefresh
                ? "border-amber-500/30 bg-amber-500/10 text-amber-500"
                : "border-border text-muted-foreground hover:bg-muted",
            )}
          >
            <RefreshCw
              className={cn("h-3 w-3", autoRefresh && "animate-spin")}
            />
            Auto
          </button>

          {/* Manual refresh */}
          <button
            type="button"
            onClick={() => void fetchData()}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted disabled:opacity-50"
          >
            <RefreshCw className={cn("h-3 w-3", loading && "animate-spin")} />
            Refresh
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap",
                activeTab === tab.id
                  ? "bg-amber-500/10 text-amber-500"
                  : "text-muted-foreground hover:bg-muted",
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
              {tab.id === "alerts" && alerts.length > 0 && (
                <span className="ml-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500/10 px-1.5 text-[10px] font-bold text-red-500">
                  {alerts.length}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Tab content */}
      {activeTab === "overview" && (
        <div className="space-y-5">
          {/* Health card */}
          <SystemHealthCard health={health} loading={loading} />

          {/* Metric cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MonitoringMetricCard
              title="Total Requests"
              value={totalRequests.toLocaleString()}
              subtitle={`in last ${timeRange}`}
              icon={Activity}
              color="blue"
            />
            <MonitoringMetricCard
              title="Error Rate"
              value={`${errorRate}%`}
              subtitle={`${totalErrors} errors`}
              icon={AlertTriangle}
              color={errorRate > 5 ? "red" : errorRate > 1 ? "amber" : "green"}
            />
            <MonitoringMetricCard
              title="Avg Response Time"
              value={`${avgResponseTime}ms`}
              subtitle="across all endpoints"
              icon={BarChart3}
              color={
                avgResponseTime > 2000
                  ? "red"
                  : avgResponseTime > 500
                    ? "amber"
                    : "green"
              }
            />
            <MonitoringMetricCard
              title="Active Alerts"
              value={alerts.length}
              subtitle={
                alerts.filter((a) => a.severity === "critical").length > 0
                  ? `${alerts.filter((a) => a.severity === "critical").length} critical`
                  : "none critical"
              }
              icon={Shield}
              color={alerts.length > 0 ? "amber" : "green"}
            />
          </div>

          {/* Charts */}
          <PerformanceCharts
            metrics={metrics}
            errorTrends={errorTrends}
            loading={loading}
          />

          {/* Recent alerts */}
          {alerts.length > 0 && (
            <div>
              <h2 className="mb-3 text-sm font-semibold text-foreground">
                Active Alerts
              </h2>
              <AlertsList
                alerts={alerts.slice(0, 5)}
                loading={loading}
                onResolve={handleAlertResolved}
              />
            </div>
          )}
        </div>
      )}

      {activeTab === "alerts" && (
        <AlertsList
          alerts={alerts}
          loading={loading}
          onResolve={handleAlertResolved}
        />
      )}

      {activeTab === "logs" && <LogViewer timeRange={timeRange} />}

      {activeTab === "security" && <SecurityPanel timeRange={timeRange} />}

      {activeTab === "performance" && (
        <PerformanceCharts
          metrics={metrics}
          errorTrends={errorTrends}
          loading={loading}
        />
      )}
    </div>
  )
}
