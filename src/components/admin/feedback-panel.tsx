"use client"

import { useCallback, useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  BarChart3,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Eye,
  FlaskConical,
  Info,
  Lightbulb,
  Loader2,
  Minus,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  XCircle,
  Zap,
} from "lucide-react"
import type {
  FeedbackSummary,
  OptimizationInsight,
  InsightSeverity,
  ABTest,
} from "@/types/optimization-feedback"

// ============================================================
// Severity Styling
// ============================================================
const severityConfig: Record<
  InsightSeverity,
  { bg: string; text: string; icon: typeof AlertTriangle; label: string }
> = {
  critical: {
    bg: "bg-red-500/10",
    text: "text-red-500",
    icon: XCircle,
    label: "Critical",
  },
  warning: {
    bg: "bg-amber-500/10",
    text: "text-amber-500",
    icon: AlertTriangle,
    label: "Warning",
  },
  info: {
    bg: "bg-blue-500/10",
    text: "text-blue-500",
    icon: Info,
    label: "Info",
  },
  success: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-500",
    icon: CheckCircle,
    label: "Success",
  },
}

const insightTypeIcons: Record<string, typeof Lightbulb> = {
  performance_gap: BarChart3,
  trend_decline: TrendingDown,
  trend_improvement: TrendingUp,
  ab_result: FlaskConical,
  suggestion: Lightbulb,
  anomaly: Zap,
  benchmark_comparison: Eye,
}

// ============================================================
// Insight Card Component
// ============================================================
function InsightCard({
  insight,
  onStatusChange,
}: {
  insight: OptimizationInsight
  onStatusChange: (id: string, status: "acknowledged" | "applied" | "dismissed") => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [updating, setUpdating] = useState(false)
  const sev = severityConfig[insight.severity]
  const TypeIcon = insightTypeIcons[insight.insight_type] || Lightbulb

  const handleAction = async (status: "acknowledged" | "applied" | "dismissed") => {
    setUpdating(true)
    try {
      await onStatusChange(insight.id, status)
    } finally {
      setUpdating(false)
    }
  }

  return (
    <div
      className={cn(
        "rounded-lg border border-white/5 bg-white/[0.02] overflow-hidden transition-all",
        insight.severity === "critical" && "border-red-500/20",
        insight.severity === "warning" && "border-amber-500/20"
      )}
    >
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-start gap-3 p-4 text-left hover:bg-white/[0.02] transition-colors"
      >
        <div className={cn("mt-0.5 rounded-md p-1.5", sev.bg)}>
          <TypeIcon className={cn("h-4 w-4", sev.text)} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={cn("text-[10px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded", sev.bg, sev.text)}>
              {sev.label}
            </span>
            <span className="text-[10px] text-gray-500">
              {new Date(insight.created_at).toLocaleDateString()}
            </span>
          </div>
          <p className="text-sm font-medium text-white/90 leading-snug">
            {insight.title}
          </p>
        </div>
        {expanded ? (
          <ChevronDown className="h-4 w-4 text-gray-500 mt-1 shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 text-gray-500 mt-1 shrink-0" />
        )}
      </button>

      {/* Expanded Content */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-white/5">
          <p className="text-xs text-gray-400 leading-relaxed pt-3">
            {insight.description}
          </p>

          {/* Metrics */}
          {insight.metrics && Object.keys(insight.metrics).length > 0 && (
            <div className="flex flex-wrap gap-2">
              {insight.metrics.expected != null && (
                <div className="text-[10px] bg-white/5 rounded px-2 py-1">
                  <span className="text-gray-500">Expected:</span>{" "}
                  <span className="text-white/80">
                    {typeof insight.metrics.expected === "number" && insight.metrics.expected < 1
                      ? `${(insight.metrics.expected * 100).toFixed(1)}%`
                      : String(insight.metrics.expected)}
                  </span>
                </div>
              )}
              {insight.metrics.actual != null && (
                <div className="text-[10px] bg-white/5 rounded px-2 py-1">
                  <span className="text-gray-500">Actual:</span>{" "}
                  <span className="text-white/80">
                    {typeof insight.metrics.actual === "number" && insight.metrics.actual < 1
                      ? `${(insight.metrics.actual * 100).toFixed(1)}%`
                      : String(insight.metrics.actual)}
                  </span>
                </div>
              )}
              {insight.metrics.gap_pct != null && (
                <div className={cn(
                  "text-[10px] rounded px-2 py-1 flex items-center gap-1",
                  Number(insight.metrics.gap_pct) > 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
                )}>
                  {Number(insight.metrics.gap_pct) > 0 ? (
                    <ArrowUp className="h-3 w-3" />
                  ) : (
                    <ArrowDown className="h-3 w-3" />
                  )}
                  {Math.abs(Number(insight.metrics.gap_pct)).toFixed(1)}% gap
                </div>
              )}
              {insight.metrics.trend_pct != null && (
                <div className={cn(
                  "text-[10px] rounded px-2 py-1 flex items-center gap-1",
                  insight.metrics.trend_direction === "up" ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
                )}>
                  {insight.metrics.trend_direction === "up" ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  {Math.abs(Number(insight.metrics.trend_pct)).toFixed(1)}% over {insight.metrics.period_days}d
                </div>
              )}
            </div>
          )}

          {/* Suggested Action */}
          {insight.suggested_action && (
            <div className="bg-blue-500/5 border border-blue-500/10 rounded-lg p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Lightbulb className="h-3.5 w-3.5 text-blue-400" />
                <span className="text-[10px] font-medium text-blue-400 uppercase tracking-wider">
                  Suggested Action
                </span>
              </div>
              <p className="text-xs text-gray-300 leading-relaxed">
                {insight.suggested_action}
              </p>
            </div>
          )}

          {/* Config Change Suggestion */}
          {insight.suggested_config_change && (
            <div className="bg-purple-500/5 border border-purple-500/10 rounded-lg p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Zap className="h-3.5 w-3.5 text-purple-400" />
                <span className="text-[10px] font-medium text-purple-400 uppercase tracking-wider">
                  Config Change
                </span>
              </div>
              <div className="text-xs text-gray-300 space-y-1">
                <p><span className="text-gray-500">Field:</span> {insight.suggested_config_change.field}</p>
                <p><span className="text-gray-500">Suggestion:</span> {insight.suggested_config_change.suggestion}</p>
                {insight.suggested_config_change.expected_impact && (
                  <p><span className="text-gray-500">Expected Impact:</span> {insight.suggested_config_change.expected_impact}</p>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={() => handleAction("applied")}
              disabled={updating}
              className="text-[11px] px-3 py-1.5 rounded-md bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
            >
              {updating ? <Loader2 className="h-3 w-3 animate-spin" /> : "Mark Applied"}
            </button>
            <button
              onClick={() => handleAction("acknowledged")}
              disabled={updating}
              className="text-[11px] px-3 py-1.5 rounded-md bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors disabled:opacity-50"
            >
              Acknowledge
            </button>
            <button
              onClick={() => handleAction("dismissed")}
              disabled={updating}
              className="text-[11px] px-3 py-1.5 rounded-md bg-gray-500/10 text-gray-400 hover:bg-gray-500/20 transition-colors disabled:opacity-50"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================
// Mini Trend Chart (CSS-based sparkline)
// ============================================================
function MiniTrendChart({ data, metric }: { data: { value: number | null }[]; metric: string }) {
  const values = data.map((d) => d.value).filter((v): v is number => v != null)
  if (values.length < 2) return <span className="text-[10px] text-gray-500">No trend data</span>

  const max = Math.max(...values)
  const min = Math.min(...values)
  const range = max - min || 1

  const first = values[0]
  const last = values[values.length - 1]
  const change = first > 0 ? ((last - first) / first) * 100 : 0
  const isUp = change > 0

  return (
    <div className="flex items-end gap-[2px] h-8">
      {values.slice(-12).map((v, i) => (
        <div
          key={i}
          className={cn(
            "w-1.5 rounded-t-sm transition-all",
            isUp ? "bg-emerald-500/40" : "bg-red-500/40",
            i === values.slice(-12).length - 1 && (isUp ? "bg-emerald-500" : "bg-red-500")
          )}
          style={{ height: `${Math.max(4, ((v - min) / range) * 28)}px` }}
          title={`${metric}: ${(v * 100).toFixed(1)}%`}
        />
      ))}
      <span className={cn(
        "text-[10px] ml-1 font-medium",
        isUp ? "text-emerald-400" : "text-red-400"
      )}>
        {isUp ? "+" : ""}{change.toFixed(1)}%
      </span>
    </div>
  )
}

// ============================================================
// A/B Test Card
// ============================================================
function ABTestCard({ test }: { test: ABTest }) {
  const statusColors: Record<string, string> = {
    draft: "bg-gray-500/10 text-gray-400",
    running: "bg-blue-500/10 text-blue-500",
    completed: "bg-emerald-500/10 text-emerald-500",
    inconclusive: "bg-amber-500/10 text-amber-500",
    cancelled: "bg-red-500/10 text-red-500",
  }

  return (
    <div className="rounded-lg border border-white/5 bg-white/[0.02] p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <FlaskConical className="h-4 w-4 text-purple-400" />
          <span className="text-sm font-medium text-white/90">{test.name}</span>
        </div>
        <span className={cn(
          "text-[10px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded",
          statusColors[test.status] || statusColors.draft
        )}>
          {test.status}
        </span>
      </div>
      <div className="flex items-center gap-4 text-xs text-gray-400">
        <span>Metric: {test.primary_metric.replace(/_/g, " ")}</span>
        {test.winner && (
          <span className="text-emerald-400">
            Winner: {test.winner === "a" ? test.variant_a_label : test.variant_b_label}
          </span>
        )}
        {test.lift_percentage != null && (
          <span className={test.lift_percentage > 0 ? "text-emerald-400" : "text-red-400"}>
            {test.lift_percentage > 0 ? "+" : ""}{test.lift_percentage.toFixed(1)}% lift
          </span>
        )}
      </div>
      {test.result_summary && (
        <p className="text-xs text-gray-500 mt-2">{test.result_summary}</p>
      )}
    </div>
  )
}

// ============================================================
// Main FeedbackPanel Component
// ============================================================
export interface FeedbackPanelProps {
  entityType: "package_config" | "campaign_template"
  entityId: string
  entityName: string
}

export function FeedbackPanel({ entityType, entityId, entityName }: FeedbackPanelProps) {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [summary, setSummary] = useState<FeedbackSummary | null>(null)
  const [abTests, setAbTests] = useState<ABTest[]>([])
  const [activeSection, setActiveSection] = useState<"insights" | "trends" | "ab_tests">("insights")

  const fetchSummary = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        entity_type: entityType,
        entity_id: entityId,
        entity_name: entityName,
        action: "summary",
      })
      const res = await fetch(`/api/admin/optimization-feedback?${params}`)
      const json = await res.json()
      if (json.summary) setSummary(json.summary)
    } catch (err) {
      console.error("Failed to fetch feedback summary:", err)
    }
  }, [entityType, entityId, entityName])

  const fetchABTests = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        entity_type: entityType,
        entity_id: entityId,
        action: "ab_tests",
      })
      const res = await fetch(`/api/admin/optimization-feedback?${params}`)
      const json = await res.json()
      if (json.ab_tests) setAbTests(json.ab_tests)
    } catch (err) {
      console.error("Failed to fetch A/B tests:", err)
    }
  }, [entityType, entityId])

  useEffect(() => {
    setLoading(true)
    Promise.all([fetchSummary(), fetchABTests()]).finally(() => setLoading(false))
  }, [fetchSummary, fetchABTests])

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      const params = new URLSearchParams({
        entity_type: entityType,
        entity_id: entityId,
        entity_name: entityName,
        action: "refresh",
      })
      await fetch(`/api/admin/optimization-feedback?${params}`)
      await fetchSummary()
      toast.success("Insights refreshed")
    } catch {
      toast.error("Failed to refresh insights")
    } finally {
      setRefreshing(false)
    }
  }

  const handleInsightStatusChange = async (
    insightId: string,
    status: "acknowledged" | "applied" | "dismissed"
  ) => {
    try {
      const res = await fetch("/api/admin/optimization-feedback", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_insight", insight_id: insightId, status }),
      })
      if (!res.ok) throw new Error("Failed to update")
      toast.success(`Insight ${status}`)
      await fetchSummary()
    } catch {
      toast.error("Failed to update insight")
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
      </div>
    )
  }

  if (!summary) {
    return (
      <div className="text-center py-12 text-gray-500">
        <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No feedback data available yet.</p>
        <p className="text-xs mt-1">Run campaigns to generate performance insights.</p>
      </div>
    )
  }

  const sections = [
    { id: "insights" as const, label: "Insights", count: summary.open_insights },
    { id: "trends" as const, label: "Trends", count: summary.performance_trend.length },
    { id: "ab_tests" as const, label: "A/B Tests", count: abTests.length },
  ]

  return (
    <div className="space-y-4">
      {/* Summary Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold text-white/90">Performance Feedback</h3>
          <div className="flex items-center gap-1.5">
            {summary.critical_insights > 0 && (
              <span className="flex items-center gap-1 text-[10px] bg-red-500/10 text-red-400 px-1.5 py-0.5 rounded">
                <XCircle className="h-3 w-3" />
                {summary.critical_insights}
              </span>
            )}
            {summary.warning_insights > 0 && (
              <span className="flex items-center gap-1 text-[10px] bg-amber-500/10 text-amber-400 px-1.5 py-0.5 rounded">
                <AlertTriangle className="h-3 w-3" />
                {summary.warning_insights}
              </span>
            )}
            {summary.success_insights > 0 && (
              <span className="flex items-center gap-1 text-[10px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded">
                <CheckCircle className="h-3 w-3" />
                {summary.success_insights}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-1.5 text-[11px] text-gray-400 hover:text-white/80 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
          Refresh
        </button>
      </div>

      {/* Section Tabs */}
      <div className="flex gap-1 bg-white/[0.02] rounded-lg p-1">
        {sections.map((s) => (
          <button
            key={s.id}
            onClick={() => setActiveSection(s.id)}
            className={cn(
              "flex-1 text-[11px] py-1.5 px-3 rounded-md transition-all flex items-center justify-center gap-1.5",
              activeSection === s.id
                ? "bg-white/10 text-white font-medium"
                : "text-gray-500 hover:text-gray-300"
            )}
          >
            {s.label}
            {s.count > 0 && (
              <span className={cn(
                "text-[9px] px-1 py-0.5 rounded-full min-w-[16px] text-center",
                activeSection === s.id ? "bg-white/10" : "bg-white/5"
              )}>
                {s.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Insights Section */}
      {activeSection === "insights" && (
        <div className="space-y-2">
          {summary.top_insights.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <CheckCircle className="h-6 w-6 mx-auto mb-2 opacity-50" />
              <p className="text-xs">No open insights. Everything looks good!</p>
            </div>
          ) : (
            summary.top_insights.map((insight) => (
              <InsightCard
                key={insight.id}
                insight={insight}
                onStatusChange={handleInsightStatusChange}
              />
            ))
          )}
        </div>
      )}

      {/* Trends Section */}
      {activeSection === "trends" && (
        <div className="space-y-4">
          {summary.performance_trend.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <TrendingUp className="h-6 w-6 mx-auto mb-2 opacity-50" />
              <p className="text-xs">No trend data yet. Performance snapshots will appear after campaigns run.</p>
            </div>
          ) : (
            <>
              {/* Metric Trend Cards */}
              <div className="grid grid-cols-2 gap-3">
                {(["read_rate", "reply_rate", "conversion_rate", "delivery_rate"] as const).map((metric) => {
                  const data = summary.performance_trend.map((t) => ({
                    value: t[metric as keyof typeof t] as number | null,
                  }))
                  const hasData = data.some((d) => d.value != null)
                  if (!hasData) return null

                  return (
                    <div key={metric} className="rounded-lg border border-white/5 bg-white/[0.02] p-3">
                      <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">
                        {metric.replace(/_/g, " ")}
                      </p>
                      <MiniTrendChart data={data} metric={metric} />
                    </div>
                  )
                })}
              </div>

              {/* Revenue Trend */}
              {summary.performance_trend.some((t) => t.revenue > 0) && (
                <div className="rounded-lg border border-white/5 bg-white/[0.02] p-3">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Revenue</p>
                  <div className="flex items-end gap-[3px] h-10">
                    {summary.performance_trend.slice(-12).map((t, i) => {
                      const maxRev = Math.max(...summary.performance_trend.map((p) => p.revenue))
                      const height = maxRev > 0 ? (t.revenue / maxRev) * 36 : 0
                      return (
                        <div
                          key={i}
                          className="w-2 rounded-t-sm bg-amber-500/40 hover:bg-amber-500/60 transition-colors"
                          style={{ height: `${Math.max(2, height)}px` }}
                          title={`₦${t.revenue.toLocaleString()}`}
                        />
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Latest Snapshot Summary */}
              {summary.latest_snapshot && (
                <div className="rounded-lg border border-white/5 bg-white/[0.02] p-4">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-3">Latest Snapshot</p>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <p className="text-lg font-semibold text-white/90">
                        {summary.latest_snapshot.total_sent.toLocaleString()}
                      </p>
                      <p className="text-[10px] text-gray-500">Messages Sent</p>
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-white/90">
                        {summary.latest_snapshot.reply_rate != null
                          ? `${(summary.latest_snapshot.reply_rate * 100).toFixed(1)}%`
                          : "—"}
                      </p>
                      <p className="text-[10px] text-gray-500">Reply Rate</p>
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-white/90">
                        ₦{summary.latest_snapshot.total_revenue.toLocaleString()}
                      </p>
                      <p className="text-[10px] text-gray-500">Revenue</p>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* A/B Tests Section */}
      {activeSection === "ab_tests" && (
        <div className="space-y-2">
          {abTests.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FlaskConical className="h-6 w-6 mx-auto mb-2 opacity-50" />
              <p className="text-xs">No A/B tests yet.</p>
              <p className="text-[10px] mt-1">Create a test from the Version History to compare config changes.</p>
            </div>
          ) : (
            abTests.map((test) => <ABTestCard key={test.id} test={test} />)
          )}
        </div>
      )}
    </div>
  )
}

// ============================================================
// Compact Feedback Badge (for list views)
// ============================================================
export function FeedbackBadge({
  entityType,
  entityId,
  entityName,
}: {
  entityType: "package_config" | "campaign_template"
  entityId: string
  entityName: string
}) {
  const [counts, setCounts] = useState<{ critical: number; warning: number; success: number } | null>(null)

  useEffect(() => {
    const params = new URLSearchParams({
      entity_type: entityType,
      entity_id: entityId,
      entity_name: entityName,
      action: "summary",
    })
    fetch(`/api/admin/optimization-feedback?${params}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.summary) {
          setCounts({
            critical: json.summary.critical_insights,
            warning: json.summary.warning_insights,
            success: json.summary.success_insights,
          })
        }
      })
      .catch(() => {})
  }, [entityType, entityId, entityName])

  if (!counts || (counts.critical === 0 && counts.warning === 0 && counts.success === 0)) {
    return null
  }

  return (
    <div className="flex items-center gap-1">
      {counts.critical > 0 && (
        <span className="flex items-center gap-0.5 text-[9px] bg-red-500/10 text-red-400 px-1 py-0.5 rounded">
          <XCircle className="h-2.5 w-2.5" />
          {counts.critical}
        </span>
      )}
      {counts.warning > 0 && (
        <span className="flex items-center gap-0.5 text-[9px] bg-amber-500/10 text-amber-400 px-1 py-0.5 rounded">
          <AlertTriangle className="h-2.5 w-2.5" />
          {counts.warning}
        </span>
      )}
      {counts.success > 0 && (
        <span className="flex items-center gap-0.5 text-[9px] bg-emerald-500/10 text-emerald-400 px-1 py-0.5 rounded">
          <CheckCircle className="h-2.5 w-2.5" />
          {counts.success}
        </span>
      )}
    </div>
  )
}
