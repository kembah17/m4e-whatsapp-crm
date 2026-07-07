"use client"

import { useCallback, useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { AdminMetricCard } from "@/components/admin/admin-metric-card"
import {
  BarChart3,
  TrendingUp,
  Lightbulb,
  Calendar,
  FileText,
  RefreshCw,
  Plus,
  Save,
  ChevronRight,
  CheckCircle,
  Clock,
  AlertTriangle,
  Users,
  Target,
} from "lucide-react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import type {
  ExecutionMetric,
  AggregatedMetric,
  ImprovementLogEntry,
  ImprovementLogType,
  ImprovementSource,
  ImpactAssessment,
  ActionItem,
  MetricType,
  RetrospectiveForm,
  PackageConfig,
} from "@/types/packages"

type Tab = "trends" | "benchmarks" | "improvements" | "retrospectives" | "reports"

const tabs: { id: Tab; label: string; icon: typeof BarChart3 }[] = [
  { id: "trends", label: "Performance Trends", icon: TrendingUp },
  { id: "benchmarks", label: "Benchmarks", icon: BarChart3 },
  { id: "improvements", label: "Improvement Log", icon: Lightbulb },
  { id: "retrospectives", label: "Retrospectives", icon: Calendar },
  { id: "reports", label: "Reports", icon: FileText },
]

const formatNaira = (amount: number) =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", minimumFractionDigits: 0 }).format(amount)

const impactColors: Record<string, string> = {
  high: "bg-red-500/10 text-red-500",
  medium: "bg-yellow-500/10 text-yellow-500",
  low: "bg-blue-500/10 text-blue-500",
}

const sourceColors: Record<string, string> = {
  post_project_retro: "bg-purple-500/10 text-purple-400",
  monthly_review: "bg-blue-500/10 text-blue-500",
  quarterly_review: "bg-amber-500/10 text-amber-500",
  client_feedback: "bg-emerald-500/10 text-emerald-500",
  system_alert: "bg-red-500/10 text-red-500",
}

const logTypeColors: Record<string, string> = {
  retrospective: "bg-purple-500/10 text-purple-400",
  process_improvement: "bg-blue-500/10 text-blue-500",
  template_update: "bg-cyan-500/10 text-cyan-500",
  timeline_adjustment: "bg-amber-500/10 text-amber-500",
  pricing_validation: "bg-emerald-500/10 text-emerald-500",
  feature_request: "bg-pink-500/10 text-pink-500",
  competitor_intel: "bg-red-500/10 text-red-500",
}

/* ------------------------------------------------------------------ */
/*  Tab 1 – Performance Trends                                        */
/* ------------------------------------------------------------------ */
function PerformanceTrendsTab() {
  const [loading, setLoading] = useState(true)
  const [metrics, setMetrics] = useState<ExecutionMetric[]>([])
  const [metricFilter, setMetricFilter] = useState<string>("all")

  const fetchMetrics = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/insights/metrics?period_days=30")
      const json = await res.json()
      setMetrics(json.metrics ?? [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchMetrics()
  }, [fetchMetrics])

  // Compute summary cards
  const satisfactionMetrics = metrics.filter((m) => m.metric_type === "satisfaction_score")
  const reactivationMetrics = metrics.filter((m) => m.metric_type === "reactivation_rate")
  const revenueMetrics = metrics.filter((m) => m.metric_type === "revenue_recovered")
  const uniqueAccounts = new Set(metrics.map((m) => m.account_id)).size

  const avgSatisfaction = satisfactionMetrics.length > 0
    ? (satisfactionMetrics.reduce((s, m) => s + m.metric_value, 0) / satisfactionMetrics.length).toFixed(1)
    : "N/A"
  const avgReactivation = reactivationMetrics.length > 0
    ? (reactivationMetrics.reduce((s, m) => s + m.metric_value, 0) / reactivationMetrics.length * 100).toFixed(1) + "%"
    : "N/A"
  const totalRevenue = revenueMetrics.reduce((s, m) => s + m.metric_value, 0)

  // Chart data
  const filteredMetrics = metricFilter === "all" ? metrics : metrics.filter((m) => m.metric_type === metricFilter)
  const chartData = filteredMetrics
    .sort((a, b) => a.period_start.localeCompare(b.period_start))
    .map((m) => ({
      date: new Date(m.period_start).toLocaleDateString("en-NG", { month: "short", day: "numeric" }),
      value: m.metric_value,
      type: m.metric_type,
    }))

  const metricTypes: MetricType[] = [
    "campaign_performance", "reactivation_rate", "satisfaction_score",
    "revenue_recovered", "import_success", "chatbot_resolution", "sentiment_trend", "ban_risk",
  ]

  if (loading) return <LoadingSkeleton rows={4} />

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <AdminMetricCard title="Avg Satisfaction" value={avgSatisfaction} icon={Target} accent="amber" subtitle="Last 30 days" />
        <AdminMetricCard title="Avg Reactivation" value={avgReactivation} icon={TrendingUp} accent="green" subtitle="Last 30 days" />
        <AdminMetricCard title="Revenue Recovered" value={formatNaira(totalRevenue)} icon={BarChart3} accent="blue" subtitle="Last 30 days" />
        <AdminMetricCard title="Active Clients" value={uniqueAccounts} icon={Users} accent="purple" subtitle="With metrics" />
      </div>

      {/* Filter + Chart */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium">Metric Trends</h3>
          <select value={metricFilter} onChange={(e) => setMetricFilter(e.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs focus:border-amber-500 focus:outline-none">
            <option value="all">All Metrics</option>
            {metricTypes.map((t) => (
              <option key={t} value={t}>{t.replace(/_/g, " ")}</option>
            ))}
          </select>
        </div>
        {chartData.length > 0 ? (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <Line type="monotone" dataKey="value" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyState message="No metric data available for the selected period." />
        )}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Tab 2 – Benchmarks                                                */
/* ------------------------------------------------------------------ */
function BenchmarksTab() {
  const [loading, setLoading] = useState(true)
  const [aggregated, setAggregated] = useState<AggregatedMetric[]>([])

  const fetchBenchmarks = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/insights?time_range_days=30")
      const json = await res.json()
      setAggregated(json.metrics ?? [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchBenchmarks()
  }, [fetchBenchmarks])

  if (loading) return <LoadingSkeleton rows={5} />
  if (!aggregated.length) return <EmptyState message="No benchmark data available." />

  const getRowColor = (avg: number, key: string) => {
    if (key.includes("satisfaction") || key.includes("reactivation")) {
      return avg >= 0.7 ? "text-emerald-500" : avg >= 0.4 ? "text-yellow-500" : "text-red-500"
    }
    return ""
  }

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left p-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Metric Group</th>
              <th className="text-left p-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Avg Value</th>
              <th className="text-left p-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Min</th>
              <th className="text-left p-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Max</th>
              <th className="text-left p-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Count</th>
              <th className="text-left p-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Accounts</th>
            </tr>
          </thead>
          <tbody>
            {aggregated.map((row, i) => (
              <tr key={i} className="border-b border-border/50 hover:bg-muted/20">
                <td className="p-3 font-medium">{row.group_key.replace(/_/g, " ")}</td>
                <td className={cn("p-3 font-mono font-medium", getRowColor(row.avg_value, row.group_key))}>{row.avg_value.toFixed(2)}</td>
                <td className="p-3 font-mono text-muted-foreground">{row.min_value.toFixed(2)}</td>
                <td className="p-3 font-mono text-muted-foreground">{row.max_value.toFixed(2)}</td>
                <td className="p-3">{row.count}</td>
                <td className="p-3">{row.accounts_count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Tab 3 – Improvement Log                                           */
/* ------------------------------------------------------------------ */
function ImprovementLogTab() {
  const [loading, setLoading] = useState(true)
  const [entries, setEntries] = useState<ImprovementLogEntry[]>([])
  const [filterType, setFilterType] = useState<string>("all")
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)

  // Form state
  const [formType, setFormType] = useState<ImprovementLogType>("process_improvement")
  const [formTitle, setFormTitle] = useState("")
  const [formDesc, setFormDesc] = useState("")
  const [formImpact, setFormImpact] = useState<ImpactAssessment>("medium")
  const [formSource, setFormSource] = useState<ImprovementSource>("monthly_review")

  const fetchEntries = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/insights/improvements")
      const json = await res.json()
      setEntries(json.improvements ?? [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchEntries()
  }, [fetchEntries])

  const handleSubmit = async () => {
    if (!formTitle.trim()) return
    setSaving(true)
    try {
      await fetch("/api/admin/insights/improvements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          log_type: formType,
          title: formTitle,
          description: formDesc,
          impact_assessment: formImpact,
          source: formSource,
          action_items: [],
        }),
      })
      setShowForm(false)
      setFormTitle("")
      setFormDesc("")
      await fetchEntries()
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const filtered = filterType === "all" ? entries : entries.filter((e) => e.log_type === filterType)

  const logTypes: ImprovementLogType[] = [
    "retrospective", "process_improvement", "template_update",
    "timeline_adjustment", "pricing_validation", "feature_request", "competitor_intel",
  ]
  const sources: ImprovementSource[] = [
    "post_project_retro", "monthly_review", "quarterly_review", "client_feedback", "system_alert",
  ]
  const impacts: ImpactAssessment[] = ["high", "medium", "low"]

  if (loading) return <LoadingSkeleton rows={4} />

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)}
          className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs focus:border-amber-500 focus:outline-none">
          <option value="all">All Types</option>
          {logTypes.map((t) => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
        </select>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-medium text-black hover:bg-amber-400">
          <Plus className="h-3.5 w-3.5" /> Add Entry
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="rounded-xl border border-amber-500/20 bg-card p-5 space-y-4">
          <h4 className="text-sm font-medium text-amber-500">New Improvement Entry</h4>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Type</label>
              <select value={formType} onChange={(e) => setFormType(e.target.value as ImprovementLogType)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-amber-500 focus:outline-none">
                {logTypes.map((t) => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Source</label>
              <select value={formSource} onChange={(e) => setFormSource(e.target.value as ImprovementSource)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-amber-500 focus:outline-none">
                {sources.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Title</label>
            <input type="text" value={formTitle} onChange={(e) => setFormTitle(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-amber-500 focus:outline-none" placeholder="Brief title" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Description</label>
            <textarea value={formDesc} onChange={(e) => setFormDesc(e.target.value)} rows={3}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-amber-500 focus:outline-none resize-none" placeholder="Detailed description..." />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Impact</label>
            <select value={formImpact} onChange={(e) => setFormImpact(e.target.value as ImpactAssessment)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-amber-500 focus:outline-none">
              {impacts.map((i) => <option key={i} value={i}>{i}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <button onClick={handleSubmit} disabled={saving || !formTitle.trim()}
              className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-black hover:bg-amber-400 disabled:opacity-40">
              <Save className="h-4 w-4" /> Save
            </button>
            <button onClick={() => setShowForm(false)}
              className="rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground hover:text-foreground">Cancel</button>
          </div>
        </div>
      )}

      {/* Entries list */}
      {filtered.length === 0 ? (
        <EmptyState message="No improvement log entries found." />
      ) : (
        <div className="space-y-3">
          {filtered.map((entry) => (
            <div key={entry.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-medium text-foreground">{entry.title}</h4>
                    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", logTypeColors[entry.log_type] || "bg-muted text-muted-foreground")}>
                      {entry.log_type.replace(/_/g, " ")}
                    </span>
                    {entry.impact_assessment && (
                      <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", impactColors[entry.impact_assessment])}>
                        {entry.impact_assessment}
                      </span>
                    )}
                    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", sourceColors[entry.source] || "bg-muted text-muted-foreground")}>
                      {entry.source.replace(/_/g, " ")}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{entry.description}</p>
                </div>
                {entry.action_items.length > 0 && (
                  <button onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                    className="shrink-0 text-muted-foreground hover:text-foreground">
                    <ChevronRight className={cn("h-4 w-4 transition-transform", expandedId === entry.id && "rotate-90")} />
                  </button>
                )}
              </div>
              {expandedId === entry.id && entry.action_items.length > 0 && (
                <div className="mt-3 border-t border-border/50 pt-3">
                  <h5 className="text-xs font-medium text-muted-foreground mb-2">Action Items</h5>
                  <ul className="space-y-1.5">
                    {entry.action_items.map((item, i) => (
                      <li key={i} className="flex items-center gap-2 text-xs">
                        <CheckCircle className={cn("h-3.5 w-3.5", item.status === "completed" ? "text-emerald-500" : "text-muted-foreground")} />
                        <span className={item.status === "completed" ? "line-through text-muted-foreground" : ""}>{item.description}</span>
                        {item.assignee && <span className="text-muted-foreground">({item.assignee})</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="mt-2 text-xs text-muted-foreground">
                {new Date(entry.created_at).toLocaleDateString("en-NG", { year: "numeric", month: "short", day: "numeric" })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Tab 4 – Retrospectives                                            */
/* ------------------------------------------------------------------ */
const retroQuestions: { key: keyof RetrospectiveForm; label: string }[] = [
  { key: "what_went_well", label: "1. What went well?" },
  { key: "what_didnt_work", label: "2. What didn't go well?" },
  { key: "what_surprised_us", label: "3. What surprised us?" },
  { key: "client_feedback", label: "4. Client feedback summary?" },
  { key: "process_bottlenecks", label: "5. Process bottlenecks?" },
  { key: "template_effectiveness", label: "6. Template effectiveness?" },
  { key: "time_accuracy", label: "7. Time accuracy?" },
  { key: "communication_quality", label: "8. Communication quality?" },
  { key: "tool_effectiveness", label: "9. Tool effectiveness?" },
  { key: "key_learning", label: "10. Key learning?" },
]

function RetrospectivesTab() {
  const [packages, setPackages] = useState<PackageConfig[]>([])
  const [accountId, setAccountId] = useState("")
  const [selectedPkgId, setSelectedPkgId] = useState("")
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [form, setForm] = useState<RetrospectiveForm>({
    what_went_well: "", what_didnt_work: "", what_surprised_us: "",
    client_feedback: "", process_bottlenecks: "", template_effectiveness: "",
    time_accuracy: "", communication_quality: "", tool_effectiveness: "", key_learning: "",
  })

  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch("/api/admin/packages")
        const json = await res.json()
        setPackages(json.packages ?? [])
      } catch (err) {
        console.error(err)
      }
    })()
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    try {
      const description = retroQuestions
        .map((q) => `**${q.label}**\n${form[q.key] || "(no response)"}`)
        .join("\n\n")

      await fetch("/api/admin/insights/improvements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          account_id: accountId || undefined,
          package_config_id: selectedPkgId || undefined,
          log_type: "retrospective" as const,
          title: `Retrospective – ${new Date().toLocaleDateString("en-NG")}`,
          description,
          source: "post_project_retro" as const,
          impact_assessment: "medium" as const,
          action_items: [],
        }),
      })
      setSaved(true)
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3">
        <div className="flex-1 min-w-[200px]">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Account ID (optional)</label>
          <input type="text" value={accountId} onChange={(e) => setAccountId(e.target.value)} placeholder="Enter account UUID"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/30" />
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Package (optional)</label>
          <select value={selectedPkgId} onChange={(e) => setSelectedPkgId(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/30">
            <option value="">Select package</option>
            {packages.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      </div>

      <div className="space-y-4">
        {retroQuestions.map((q) => (
          <div key={q.key} className="rounded-xl border border-border bg-card p-4">
            <label className="mb-2 block text-sm font-medium text-foreground">{q.label}</label>
            <textarea
              value={form[q.key]} onChange={(e) => setForm({ ...form, [q.key]: e.target.value })}
              rows={3} placeholder="Your response..."
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/30 resize-none"
            />
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-black hover:bg-amber-400 disabled:opacity-40">
          <Save className="h-4 w-4" /> {saving ? "Saving..." : "Save Retrospective"}
        </button>
        {saved && <span className="text-sm text-emerald-500">✓ Saved successfully</span>}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Tab 5 – Reports                                                   */
/* ------------------------------------------------------------------ */
function ReportsTab() {
  const [reportContent, setReportContent] = useState("")
  const [loading, setLoading] = useState(false)

  const generateMonthlyReport = async () => {
    setLoading(true)
    try {
      const [metricsRes, insightsRes] = await Promise.all([
        fetch("/api/admin/insights/metrics?period_days=30"),
        fetch("/api/admin/insights?time_range_days=30"),
      ])
      const metricsJson = await metricsRes.json()
      const insightsJson = await insightsRes.json()
      const metrics: ExecutionMetric[] = metricsJson.metrics ?? []
      const aggregated: AggregatedMetric[] = insightsJson.metrics ?? []
      const improvements: ImprovementLogEntry[] = insightsJson.improvements ?? []

      const uniqueAccounts = new Set(metrics.map((m) => m.account_id)).size
      const totalMetrics = metrics.length

      const report = `# Monthly Performance Report
**Generated:** ${new Date().toLocaleDateString("en-NG", { year: "numeric", month: "long", day: "numeric" })}
**Period:** Last 30 days

---

## Executive Summary
- **Active Clients:** ${uniqueAccounts}
- **Total Metrics Recorded:** ${totalMetrics}
- **Improvement Entries:** ${improvements.length}

## Aggregated Benchmarks
${aggregated.length > 0 ? aggregated.map((a) => `- **${a.group_key.replace(/_/g, " ")}**: avg ${a.avg_value.toFixed(2)} (min ${a.min_value.toFixed(2)}, max ${a.max_value.toFixed(2)}) across ${a.accounts_count} accounts`).join("\n") : "No benchmark data available."}

## Recent Improvements
${improvements.length > 0 ? improvements.slice(0, 5).map((i) => `- **${i.title}** (${i.log_type.replace(/_/g, " ")}) – ${i.description.slice(0, 100)}...`).join("\n") : "No recent improvements logged."}

---
*Report generated by M4E Package Execution System*`

      setReportContent(report)
    } catch (err) {
      console.error(err)
      setReportContent("Error generating report. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const generateQuarterlyReview = async () => {
    setLoading(true)
    try {
      const [metricsRes, insightsRes] = await Promise.all([
        fetch("/api/admin/insights/metrics?period_days=90"),
        fetch("/api/admin/insights?time_range_days=90"),
      ])
      const metricsJson = await metricsRes.json()
      const insightsJson = await insightsRes.json()
      const metrics: ExecutionMetric[] = metricsJson.metrics ?? []
      const aggregated: AggregatedMetric[] = insightsJson.metrics ?? []
      const improvements: ImprovementLogEntry[] = insightsJson.improvements ?? []

      const uniqueAccounts = new Set(metrics.map((m) => m.account_id)).size
      const retros = improvements.filter((i) => i.log_type === "retrospective")

      const report = `# Quarterly Business Review
**Generated:** ${new Date().toLocaleDateString("en-NG", { year: "numeric", month: "long", day: "numeric" })}
**Period:** Last 90 days

---

## Quarter Overview
- **Active Clients:** ${uniqueAccounts}
- **Total Metrics:** ${metrics.length}
- **Retrospectives Completed:** ${retros.length}
- **Improvement Actions:** ${improvements.length}

## Performance Benchmarks
${aggregated.length > 0 ? aggregated.map((a) => `| ${a.group_key.replace(/_/g, " ")} | ${a.avg_value.toFixed(2)} | ${a.min_value.toFixed(2)} | ${a.max_value.toFixed(2)} | ${a.count} |`).join("\n") : "No data available."}

## Key Learnings
${retros.length > 0 ? retros.slice(0, 3).map((r) => `### ${r.title}\n${r.description.slice(0, 200)}...`).join("\n\n") : "No retrospectives completed this quarter."}

## Recommendations
1. Continue monitoring client satisfaction scores
2. Review and update campaign templates based on performance data
3. Schedule quarterly strategy sessions with all active clients

---
*Report generated by M4E Package Execution System*`

      setReportContent(report)
    } catch (err) {
      console.error(err)
      setReportContent("Error generating report. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <button onClick={generateMonthlyReport} disabled={loading}
          className="flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-black hover:bg-amber-400 disabled:opacity-40">
          <FileText className="h-4 w-4" /> Generate Monthly Report
        </button>
        <button onClick={generateQuarterlyReview} disabled={loading}
          className="flex items-center gap-2 rounded-lg border border-amber-500/30 px-4 py-2 text-sm font-medium text-amber-500 hover:bg-amber-500/10 disabled:opacity-40">
          <Calendar className="h-4 w-4" /> Generate Quarterly Review
        </button>
      </div>

      {loading && <LoadingSkeleton rows={6} />}

      {reportContent && (
        <div className="rounded-xl border border-border bg-card p-6">
          <pre className="whitespace-pre-wrap font-mono text-sm text-foreground leading-relaxed">{reportContent}</pre>
        </div>
      )}

      {!reportContent && !loading && (
        <EmptyState message="Click a button above to generate a report." />
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Shared                                                             */
/* ------------------------------------------------------------------ */
function LoadingSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-12 animate-pulse rounded-lg bg-muted/40" />
      ))}
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-12">
      <Lightbulb className="h-10 w-10 text-muted-foreground/40 mb-3" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */
export default function InsightsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("trends")

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Insights & Analytics</h1>
        <p className="text-sm text-muted-foreground mt-1">Performance trends, benchmarks, improvement tracking, and reporting.</p>
      </div>

      <div className="flex gap-1 rounded-lg border border-border bg-muted/30 p-1">
        {tabs.map((tab) => {
          const Icon = tab.icon
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                activeTab === tab.id
                  ? "bg-background text-amber-500 shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}>
              <Icon className="h-4 w-4" />{tab.label}
            </button>
          )
        })}
      </div>

      {activeTab === "trends" && <PerformanceTrendsTab />}
      {activeTab === "benchmarks" && <BenchmarksTab />}
      {activeTab === "improvements" && <ImprovementLogTab />}
      {activeTab === "retrospectives" && <RetrospectivesTab />}
      {activeTab === "reports" && <ReportsTab />}
    </div>
  )
}
