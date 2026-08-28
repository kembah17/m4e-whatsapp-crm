"use client"

import { useCallback, useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import {
  Package, CheckCircle2, Clock, AlertTriangle, ArrowRight,
  TrendingUp, Target, FileText, Download, RefreshCw,
  ChevronDown, ChevronRight, Loader2, BarChart3, Award,
  Calendar, Milestone as MilestoneIcon,
} from "lucide-react"

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface PackageConfig {
  id: string
  package_key: string
  name: string
  description: string
  price_naira: number
  duration_weeks: number
  tier: number
  retainer_options: Array<{ name: string; price: number; monitoring_level: string; intervention_frequency: string }>
}

interface MilestoneData {
  id: string
  milestone_key: string
  name: string
  description: string
  week_number: number
  status: string
  started_at: string | null
  completed_at: string | null
  planned_hours: number
  actual_hours: number
  deliverables: Array<string>
  criteria: Array<string>
  notes: string | null
}

interface PackageProgress {
  package: PackageConfig
  milestones: MilestoneData[]
  completed: number
  inProgress: number
  total: number
  progressPercent: number
  currentMilestone: MilestoneData | null
  nextMilestones: MilestoneData[]
}

interface TransitionData {
  id: string
  transition_type: string
  recommendation: string
  recommendation_text: string | null
  quantitative_scores: Record<string, unknown>
  qualitative_scores: Record<string, unknown>
  decision: string | null
  created_at: string
}

interface MetricData {
  id: string
  metric_type: string
  metric_key: string
  metric_value: number
  metric_unit: string
  period_start: string
  period_end: string
}

interface OutcomeData {
  id: string
  outcome_type: string
  outcome_key: string
  outcome_value: number | null
  outcome_text: string | null
  measured_at: string
}

interface ProgressResponse {
  account: { id: string; business_name: string; subscription_tier: string; industry: string; created_at: string } | null
  packageProgress: PackageProgress[]
  allPackages: PackageConfig[]
  transitions: TransitionData[]
  metrics: MetricData[]
  outcomes: OutcomeData[]
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
const formatNaira = (n: number) =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", minimumFractionDigits: 0 }).format(n)

const formatDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" }) : "—"

const statusConfig: Record<string, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  completed: { label: "Completed", color: "bg-emerald-500/10 text-emerald-600 border-emerald-200", icon: CheckCircle2 },
  in_progress: { label: "In Progress", color: "bg-blue-500/10 text-blue-600 border-blue-200", icon: Clock },
  pending: { label: "Upcoming", color: "bg-gray-100 text-gray-500 border-gray-200", icon: Clock },
  skipped: { label: "Skipped", color: "bg-yellow-500/10 text-yellow-600 border-yellow-200", icon: AlertTriangle },
  blocked: { label: "Blocked", color: "bg-red-500/10 text-red-600 border-red-200", icon: AlertTriangle },
}

const recommendationLabels: Record<string, { label: string; color: string }> = {
  strong_recommend: { label: "Strongly Recommended", color: "text-emerald-600 bg-emerald-50" },
  recommend: { label: "Recommended", color: "text-blue-600 bg-blue-50" },
  maintain: { label: "Maintain Current", color: "text-gray-600 bg-gray-50" },
  extend: { label: "Extend Package", color: "text-yellow-600 bg-yellow-50" },
  escalate: { label: "Needs Attention", color: "text-red-600 bg-red-50" },
}

/* ------------------------------------------------------------------ */
/*  Milestone Card                                                     */
/* ------------------------------------------------------------------ */
function MilestoneCard({ milestone, index, isLast }: { milestone: MilestoneData; index: number; isLast: boolean }) {
  const [expanded, setExpanded] = useState(milestone.status === "in_progress")
  const cfg = statusConfig[milestone.status] ?? statusConfig.pending
  const Icon = cfg.icon

  return (
    <div className="flex gap-4">
      {/* Timeline connector */}
      <div className="flex flex-col items-center">
        <div className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2",
          milestone.status === "completed" ? "border-emerald-500 bg-emerald-50" :
          milestone.status === "in_progress" ? "border-blue-500 bg-blue-50" :
          "border-gray-300 bg-gray-50"
        )}>
          {milestone.status === "completed" ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          ) : milestone.status === "in_progress" ? (
            <div className="h-3 w-3 rounded-full bg-blue-500 animate-pulse" />
          ) : (
            <span className="text-xs font-bold text-gray-400">{index + 1}</span>
          )}
        </div>
        {!isLast && (
          <div className={cn(
            "w-0.5 flex-1 min-h-[2rem]",
            milestone.status === "completed" ? "bg-emerald-300" : "bg-gray-200"
          )} />
        )}
      </div>

      {/* Card */}
      <div className={cn(
        "flex-1 rounded-xl border p-4 mb-3 transition-all",
        milestone.status === "in_progress" ? "border-blue-200 bg-blue-50/30 shadow-sm" :
        milestone.status === "completed" ? "border-emerald-100 bg-emerald-50/20" :
        "border-gray-200 bg-white"
      )}>
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex w-full items-start justify-between text-left"
        >
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-medium text-muted-foreground">Week {milestone.week_number}</span>
              <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium border", cfg.color)}>
                <Icon className="h-3 w-3" />
                {cfg.label}
              </span>
            </div>
            <h4 className="font-semibold text-foreground">{milestone.name}</h4>
            {milestone.description && (
              <p className="text-sm text-muted-foreground mt-0.5">{milestone.description}</p>
            )}
          </div>
          {expanded ? <ChevronDown className="h-4 w-4 text-muted-foreground mt-1" /> : <ChevronRight className="h-4 w-4 text-muted-foreground mt-1" />}
        </button>

        {expanded && (
          <div className="mt-4 space-y-3 border-t pt-3">
            {/* Dates */}
            <div className="flex gap-6 text-sm">
              <div>
                <span className="text-muted-foreground">Started:</span>{" "}
                <span className="font-medium">{formatDate(milestone.started_at)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Completed:</span>{" "}
                <span className="font-medium">{formatDate(milestone.completed_at)}</span>
              </div>
            </div>

            {/* Deliverables */}
            {Array.isArray(milestone.deliverables) && milestone.deliverables.length > 0 && (
              <div>
                <h5 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Deliverables</h5>
                <ul className="space-y-1">
                  {milestone.deliverables.map((d, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className={cn("h-3.5 w-3.5", milestone.status === "completed" ? "text-emerald-500" : "text-gray-300")} />
                      <span>{typeof d === "string" ? d : JSON.stringify(d)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Success Criteria */}
            {Array.isArray(milestone.criteria) && milestone.criteria.length > 0 && (
              <div>
                <h5 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Success Criteria</h5>
                <ul className="space-y-1">
                  {milestone.criteria.map((c, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm">
                      <Target className={cn("h-3.5 w-3.5", milestone.status === "completed" ? "text-emerald-500" : "text-gray-300")} />
                      <span>{typeof c === "string" ? c : JSON.stringify(c)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Notes */}
            {milestone.notes && (
              <div className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
                <strong>Notes:</strong> {milestone.notes}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Empty State                                                        */
/* ------------------------------------------------------------------ */
function EmptyPackageState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-4">
        <Package className="h-8 w-8 text-primary" />
      </div>
      <h3 className="text-lg font-semibold mb-2">No Active Package</h3>
      <p className="text-sm text-muted-foreground max-w-md">
        Your package progress will appear here once your Marketing4Effect engagement begins.
        Contact your account manager to get started.
      </p>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */
export default function MyPackagePage() {
  const [data, setData] = useState<ProgressResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchProgress = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/packages/progress")
      if (!res.ok) throw new Error("Failed to load package progress")
      const json: ProgressResponse = await res.json()
      setData(json)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchProgress() }, [fetchProgress])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertTriangle className="h-8 w-8 text-destructive mb-2" />
        <p className="text-sm text-destructive">{error}</p>
        <button onClick={fetchProgress} className="mt-4 text-sm text-primary hover:underline">Try again</button>
      </div>
    )
  }

  const hasProgress = data && data.packageProgress.length > 0

  return (
    <div className="space-y-6 p-4 md:p-6 lg:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Package Progress</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {data?.account?.business_name ? `${data.account.business_name} — ` : ""}
            Track your milestones, deliverables, and outcomes
          </p>
        </div>
        <button
          onClick={fetchProgress}
          className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm hover:bg-muted transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </button>
      </div>

      {!hasProgress ? (
        <EmptyPackageState />
      ) : (
        <>
          {/* Package Cards */}
          {data.packageProgress.map((pp) => (
            <div key={pp.package.id} className="space-y-6">
              {/* Package Overview Card */}
              <div className="rounded-2xl border bg-card p-6 shadow-sm">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Package className="h-5 w-5 text-primary" />
                      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Package {pp.package.tier}
                      </span>
                    </div>
                    <h2 className="text-xl font-bold">{pp.package.name}</h2>
                    <p className="text-sm text-muted-foreground mt-1">{pp.package.description}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-primary">{pp.progressPercent}%</div>
                    <div className="text-xs text-muted-foreground">Complete</div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="relative h-3 rounded-full bg-muted overflow-hidden mb-4">
                  <div
                    className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-primary to-primary/70 transition-all duration-500"
                    style={{ width: `${pp.progressPercent}%` }}
                  />
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="rounded-xl bg-emerald-50 p-3 text-center">
                    <div className="text-lg font-bold text-emerald-700">{pp.completed}</div>
                    <div className="text-xs text-emerald-600">Completed</div>
                  </div>
                  <div className="rounded-xl bg-blue-50 p-3 text-center">
                    <div className="text-lg font-bold text-blue-700">{pp.inProgress}</div>
                    <div className="text-xs text-blue-600">In Progress</div>
                  </div>
                  <div className="rounded-xl bg-gray-50 p-3 text-center">
                    <div className="text-lg font-bold text-gray-700">{pp.total - pp.completed - pp.inProgress}</div>
                    <div className="text-xs text-gray-600">Upcoming</div>
                  </div>
                  <div className="rounded-xl bg-primary/5 p-3 text-center">
                    <div className="text-lg font-bold text-primary">{pp.package.duration_weeks}w</div>
                    <div className="text-xs text-muted-foreground">Duration</div>
                  </div>
                </div>
              </div>

              {/* Current Milestone Highlight */}
              {pp.currentMilestone && (
                <div className="rounded-2xl border-2 border-blue-200 bg-blue-50/30 p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-2.5 w-2.5 rounded-full bg-blue-500 animate-pulse" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-blue-600">Current Milestone</span>
                  </div>
                  <h3 className="text-lg font-bold">Week {pp.currentMilestone.week_number}: {pp.currentMilestone.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{pp.currentMilestone.description}</p>
                </div>
              )}

              {/* Milestone Timeline */}
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  Milestone Timeline
                </h3>
                <div className="space-y-0">
                  {pp.milestones.map((m, i) => (
                    <MilestoneCard
                      key={m.id}
                      milestone={m}
                      index={i}
                      isLast={i === pp.milestones.length - 1}
                    />
                  ))}
                </div>
              </div>
            </div>
          ))}

          {/* Metrics Section */}
          {data.metrics.length > 0 && (
            <div className="rounded-2xl border bg-card p-6 shadow-sm">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-muted-foreground" />
                Performance Metrics
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {data.metrics.slice(0, 8).map((m) => (
                  <div key={m.id} className="rounded-xl border p-3">
                    <div className="text-xs text-muted-foreground capitalize">
                      {m.metric_key.replace(/_/g, " ")}
                    </div>
                    <div className="text-lg font-bold mt-1">
                      {m.metric_unit === "percent" ? `${(m.metric_value * 100).toFixed(1)}%` :
                       m.metric_unit === "naira" ? formatNaira(m.metric_value) :
                       m.metric_value.toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatDate(m.period_start)} – {formatDate(m.period_end)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Outcomes Section */}
          {data.outcomes.length > 0 && (
            <div className="rounded-2xl border bg-card p-6 shadow-sm">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Award className="h-5 w-5 text-muted-foreground" />
                Outcomes
              </h3>
              <div className="space-y-3">
                {data.outcomes.slice(0, 10).map((o) => (
                  <div key={o.id} className="flex items-center justify-between rounded-xl border p-3">
                    <div>
                      <div className="font-medium capitalize">{o.outcome_key.replace(/_/g, " ")}</div>
                      <div className="text-xs text-muted-foreground">{formatDate(o.measured_at)}</div>
                    </div>
                    <div className="text-right">
                      {o.outcome_value !== null && (
                        <div className="text-lg font-bold">{o.outcome_value.toLocaleString()}</div>
                      )}
                      {o.outcome_text && (
                        <div className="text-sm text-muted-foreground">{o.outcome_text}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Transition Recommendations */}
          {data.transitions.length > 0 && (
            <div className="rounded-2xl border bg-card p-6 shadow-sm">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
                Transition Recommendations
              </h3>
              <div className="space-y-3">
                {data.transitions.map((t) => {
                  const rec = recommendationLabels[t.recommendation] ?? { label: t.recommendation, color: "text-gray-600 bg-gray-50" }
                  return (
                    <div key={t.id} className="rounded-xl border p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className={cn("inline-flex rounded-full px-3 py-1 text-xs font-medium", rec.color)}>
                          {rec.label}
                        </span>
                        <span className="text-xs text-muted-foreground">{formatDate(t.created_at)}</span>
                      </div>
                      {t.recommendation_text && (
                        <p className="text-sm text-muted-foreground">{t.recommendation_text}</p>
                      )}
                      {t.decision && (
                        <div className="mt-2 text-sm">
                          <span className="text-muted-foreground">Decision:</span>{" "}
                          <span className="font-medium capitalize">{t.decision}</span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Available Packages (for upsell/next steps) */}
          {data.allPackages.length > 0 && (
            <div className="rounded-2xl border bg-card p-6 shadow-sm">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-muted-foreground" />
                All Packages
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {data.allPackages.filter(p => ["pkg1_reactivation", "pkg2_online_presence", "pkg3_growth_engine"].includes(p.package_key)).map((pkg) => {
                  const isActive = data.packageProgress.some(pp => pp.package.id === pkg.id)
                  return (
                    <div key={pkg.id} className={cn(
                      "rounded-xl border p-4 transition-all",
                      isActive ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "hover:border-primary/30"
                    )}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                          Package {pkg.tier}
                        </span>
                        {isActive && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                            <CheckCircle2 className="h-3 w-3" /> Active
                          </span>
                        )}
                      </div>
                      <h4 className="font-semibold">{pkg.name}</h4>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{pkg.description}</p>
                      <div className="mt-3 flex items-baseline gap-1">
                        <span className="text-lg font-bold">{formatNaira(pkg.price_naira)}</span>
                        <span className="text-xs text-muted-foreground">/ {pkg.duration_weeks} weeks</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
