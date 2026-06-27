"use client"

import { cn } from "@/lib/utils"

import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts"
import type { ApiMetricsHourly, ErrorTrend } from "@/lib/monitoring/types"

interface PerformanceChartsProps {
  metrics: ApiMetricsHourly[]
  errorTrends: ErrorTrend[]
  loading?: boolean
}

function formatHour(isoString: string): string {
  try {
    const d = new Date(isoString)
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  } catch {
    return isoString
  }
}

interface VolumePoint {
  hour: string
  requests: number
}

interface ErrorRatePoint {
  hour: string
  errorRate: number
  errors: number
  total: number
}

interface ResponseTimePoint {
  hour: string
  avg: number
  p95: number
}

export function PerformanceCharts({
  metrics,
  errorTrends,
  loading,
}: PerformanceChartsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-72 animate-pulse rounded-xl bg-muted"
          />
        ))}
      </div>
    )
  }

  // Aggregate metrics by hour for volume chart
  const volumeByHour = new Map<string, number>()
  for (const m of metrics) {
    const hour = formatHour(m.hour)
    volumeByHour.set(hour, (volumeByHour.get(hour) ?? 0) + m.total_requests)
  }
  const volumeData: VolumePoint[] = Array.from(volumeByHour.entries()).map(
    ([hour, requests]) => ({ hour, requests })
  )

  // Error rate from error trends
  const errorRateData: ErrorRatePoint[] = (errorTrends ?? []).map((t) => ({
    hour: formatHour(t.hour),
    errorRate:
      t.total > 0
        ? Math.round(((t.errors + t.fatals) / t.total) * 10000) / 100
        : 0,
    errors: t.errors + t.fatals,
    total: t.total,
  }))

  // Response time from metrics
  const responseTimeByHour = new Map<
    string,
    { avgSum: number; p95Max: number; count: number }
  >()
  for (const m of metrics) {
    const hour = formatHour(m.hour)
    const existing = responseTimeByHour.get(hour) ?? {
      avgSum: 0,
      p95Max: 0,
      count: 0,
    }
    existing.avgSum += Number(m.avg_duration_ms ?? 0)
    existing.p95Max = Math.max(existing.p95Max, Number(m.p95_duration_ms ?? 0))
    existing.count++
    responseTimeByHour.set(hour, existing)
  }
  const responseTimeData: ResponseTimePoint[] = Array.from(
    responseTimeByHour.entries()
  ).map(([hour, data]) => ({
    hour,
    avg: Math.round(data.avgSum / data.count),
    p95: Math.round(data.p95Max),
  }))

  const chartCardClass =
    "rounded-xl border border-border bg-card p-5 transition-colors hover:border-amber-500/20"

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      {/* Request Volume */}
      <div className={chartCardClass}>
        <h3 className="mb-4 text-sm font-semibold text-foreground">
          Request Volume
        </h3>
        {volumeData.length === 0 ? (
          <div className="flex h-48 items-center justify-center text-xs text-muted-foreground">
            No data available
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={volumeData}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
              />
              <XAxis
                dataKey="hour"
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                stroke="hsl(var(--border))"
              />
              <YAxis
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                stroke="hsl(var(--border))"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "12px",
                  color: "hsl(var(--foreground))",
                }}
              />
              <Bar
                dataKey="requests"
                fill="hsl(var(--chart-1, 220 70% 50%))"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Error Rate */}
      <div className={chartCardClass}>
        <h3 className="mb-4 text-sm font-semibold text-foreground">
          Error Rate Trend
        </h3>
        {errorRateData.length === 0 ? (
          <div className="flex h-48 items-center justify-center text-xs text-muted-foreground">
            No data available
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={errorRateData}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
              />
              <XAxis
                dataKey="hour"
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                stroke="hsl(var(--border))"
              />
              <YAxis
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                stroke="hsl(var(--border))"
                unit="%"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "12px",
                  color: "hsl(var(--foreground))",
                }}
                formatter={(value) => [`${value}%`, "Error Rate"]}
              />
              <Line
                type="monotone"
                dataKey="errorRate"
                stroke="#ef4444"
                strokeWidth={2}
                dot={{ r: 3, fill: "#ef4444" }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Response Time */}
      <div className={cn(chartCardClass, "lg:col-span-2")}>
        <h3 className="mb-4 text-sm font-semibold text-foreground">
          Response Time (ms)
        </h3>
        {responseTimeData.length === 0 ? (
          <div className="flex h-48 items-center justify-center text-xs text-muted-foreground">
            No data available
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={responseTimeData}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
              />
              <XAxis
                dataKey="hour"
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                stroke="hsl(var(--border))"
              />
              <YAxis
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                stroke="hsl(var(--border))"
                unit="ms"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "12px",
                  color: "hsl(var(--foreground))",
                }}
              />
              <Line
                type="monotone"
                dataKey="avg"
                stroke="#3b82f6"
                strokeWidth={2}
                name="Average"
                dot={{ r: 2 }}
              />
              <Line
                type="monotone"
                dataKey="p95"
                stroke="#f59e0b"
                strokeWidth={2}
                strokeDasharray="5 5"
                name="P95"
                dot={{ r: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
