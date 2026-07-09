"use client"

import { useCallback, useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import {
  Brain,
  ChevronDown,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  ArrowRight,
  RefreshCw,
  Sparkles,
  TrendingUp,
  BarChart3,
} from "lucide-react"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Learning {
  parameter: string
  old_value: string
  new_value: string
  clients_tested: number
  positive_outcomes: number
  negative_outcomes: number
  avg_improvement_pct: number
  confidence: "high" | "medium" | "low" | "insufficient"
  recommendation: string
}

interface ChangeEntry {
  id: string
  funnel_config_id: string
  parameter_name: string
  old_value: string | null
  new_value: string | null
  change_reason: string | null
  outcome_classification: string | null
  baseline_value: number | null
  outcome_value: number | null
  changed_at: string
  changed_by: string | null
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const INDUSTRIES = [
  { value: "restaurant", label: "Restaurant & Food" },
  { value: "retail", label: "Retail & E-commerce" },
  { value: "professional_services", label: "Professional Services" },
  { value: "real_estate", label: "Real Estate" },
  { value: "health_beauty", label: "Health & Beauty" },
]

const confidenceConfig: Record<string, { color: string; bg: string; label: string }> = {
  high: { color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20", label: "HIGH" },
  medium: { color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/20", label: "MEDIUM" },
  low: { color: "text-slate-400", bg: "bg-slate-500/10 border-slate-500/20", label: "LOW" },
  insufficient: { color: "text-slate-500", bg: "bg-slate-500/5 border-slate-500/10", label: "NO DATA" },
}

const outcomeConfig: Record<string, { color: string; icon: typeof CheckCircle; label: string }> = {
  positive: { color: "text-emerald-400", icon: CheckCircle, label: "Positive" },
  negative: { color: "text-red-400", icon: XCircle, label: "Negative" },
  mixed: { color: "text-yellow-400", icon: AlertTriangle, label: "Mixed" },
  too_early: { color: "text-blue-400", icon: Clock, label: "Too Early" },
  insufficient_data: { color: "text-slate-400", icon: Clock, label: "No Data" },
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AdminLearningPage() {
  const [industry, setIndustry] = useState("restaurant")
  const [learnings, setLearnings] = useState<Learning[]>([])
  const [changes, setChanges] = useState<ChangeEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [applying, setApplying] = useState<string | null>(null)
  const [evaluating, setEvaluating] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // -----------------------------------------------------------------------
  // Fetch learnings
  // -----------------------------------------------------------------------

  const fetchLearnings = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/learning?industry=${industry}`)
      if (!res.ok) throw new Error("Failed to fetch learnings")
      const data = await res.json()
      setLearnings(data.learnings ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }, [industry])

  // Fetch change history
  const fetchChanges = useCallback(async () => {
    try {
      const res = await fetch(`/api/funnel/config`)
      if (!res.ok) return
      // We need to get changes from the preset_change_log
      // For now, we show learnings only — changes come from the aggregation
    } catch {
      // Ignore
    }
  }, [])

  useEffect(() => {
    fetchLearnings()
    fetchChanges()
  }, [fetchLearnings, fetchChanges])

  // -----------------------------------------------------------------------
  // Apply recommendation
  // -----------------------------------------------------------------------

  const handleApply = async (learning: Learning) => {
    const key = `${learning.parameter}::${learning.new_value}`
    setApplying(key)
    try {
      const res = await fetch("/api/admin/learning/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          industry_preset: industry,
          parameter: learning.parameter,
          new_value: learning.new_value,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? "Failed to apply")
      }
      // Refresh
      await fetchLearnings()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to apply")
    } finally {
      setApplying(null)
    }
  }

  // -----------------------------------------------------------------------
  // Evaluate a change
  // -----------------------------------------------------------------------

  const handleEvaluate = async (changeId: string) => {
    setEvaluating(changeId)
    try {
      const res = await fetch("/api/admin/learning/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ change_id: changeId }),
      })
      if (!res.ok) throw new Error("Failed to evaluate")
      const data = await res.json()
      // Update the change in local state
      setChanges(prev =>
        prev.map(c =>
          c.id === changeId
            ? { ...c, outcome_classification: data.classification }
            : c,
        ),
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to evaluate")
    } finally {
      setEvaluating(null)
    }
  }

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  const highConfidence = learnings.filter(l => l.confidence === "high")
  const mediumConfidence = learnings.filter(l => l.confidence === "medium")
  const lowConfidence = learnings.filter(l => l.confidence === "low" || l.confidence === "insufficient")

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Brain className="h-7 w-7 text-[#D4AF37]" />
            Adaptive Learning
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Cross-client insights that improve funnel performance over time
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Industry selector */}
          <div className="relative">
            <select
              value={industry}
              onChange={e => setIndustry(e.target.value)}
              className="appearance-none rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 pr-8 text-sm text-white focus:border-[#D4AF37] focus:outline-none focus:ring-1 focus:ring-[#D4AF37]"
            >
              {INDUSTRIES.map(ind => (
                <option key={ind.value} value={ind.value}>
                  {ind.label}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          </div>

          <button
            onClick={fetchLearnings}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-white hover:bg-slate-700 disabled:opacity-50"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            Refresh
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin text-[#D4AF37]" />
        </div>
      )}

      {/* No data */}
      {!loading && learnings.length === 0 && (
        <div className="rounded-xl border border-slate-700/50 bg-slate-800/50 p-12 text-center">
          <Brain className="mx-auto h-12 w-12 text-slate-600" />
          <h3 className="mt-4 text-lg font-medium text-white">No learnings yet</h3>
          <p className="mt-2 text-sm text-slate-400">
            Learnings appear when clients in the{" "}
            <span className="text-[#D4AF37]">
              {INDUSTRIES.find(i => i.value === industry)?.label}
            </span>{" "}
            industry make parameter changes and outcomes are measured.
          </p>
        </div>
      )}

      {/* Recommended Preset Updates (HIGH confidence) */}
      {!loading && highConfidence.length > 0 && (
        <section>
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
            <Sparkles className="h-5 w-5 text-emerald-400" />
            Recommended Preset Updates
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {highConfidence.map(l => (
              <LearningCard
                key={`${l.parameter}::${l.new_value}`}
                learning={l}
                applying={applying === `${l.parameter}::${l.new_value}`}
                onApply={() => handleApply(l)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Moderate Evidence */}
      {!loading && mediumConfidence.length > 0 && (
        <section>
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
            <TrendingUp className="h-5 w-5 text-yellow-400" />
            Moderate Evidence
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {mediumConfidence.map(l => (
              <LearningCard
                key={`${l.parameter}::${l.new_value}`}
                learning={l}
                applying={applying === `${l.parameter}::${l.new_value}`}
                onApply={() => handleApply(l)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Early / Insufficient Data */}
      {!loading && lowConfidence.length > 0 && (
        <section>
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
            <BarChart3 className="h-5 w-5 text-slate-400" />
            Needs More Data
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {lowConfidence.map(l => (
              <LearningCardCompact
                key={`${l.parameter}::${l.new_value}`}
                learning={l}
              />
            ))}
          </div>
        </section>
      )}

      {/* Change History */}
      {!loading && changes.length > 0 && (
        <section>
          <h2 className="mb-4 text-lg font-semibold text-white">Change History</h2>
          <div className="overflow-x-auto rounded-xl border border-slate-700/50">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700/50 bg-slate-800/50">
                  <th className="px-4 py-3 text-left font-medium text-slate-400">Parameter</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-400">Change</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-400">Date</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-400">Outcome</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-400">Action</th>
                </tr>
              </thead>
              <tbody>
                {changes.map(change => {
                  const outcome = change.outcome_classification
                    ? outcomeConfig[change.outcome_classification] ?? outcomeConfig.insufficient_data
                    : outcomeConfig.insufficient_data
                  const OutcomeIcon = outcome.icon

                  return (
                    <tr key={change.id} className="border-b border-slate-700/30">
                      <td className="px-4 py-3 font-medium text-white">
                        {change.parameter_name}
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        <span className="text-slate-500">{change.old_value ?? "(none)"}</span>
                        <ArrowRight className="mx-1 inline h-3 w-3 text-slate-600" />
                        <span className="text-white">{change.new_value ?? "(none)"}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        {new Date(change.changed_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn("flex items-center gap-1", outcome.color)}>
                          <OutcomeIcon className="h-4 w-4" />
                          {outcome.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {!change.outcome_classification && (
                          <button
                            onClick={() => handleEvaluate(change.id)}
                            disabled={evaluating === change.id}
                            className="rounded-md bg-slate-700 px-3 py-1 text-xs text-white hover:bg-slate-600 disabled:opacity-50"
                          >
                            {evaluating === change.id ? "Evaluating..." : "Evaluate"}
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Cross-Industry Insights */}
      {!loading && learnings.length > 0 && (
        <section className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-6">
          <h2 className="mb-3 text-lg font-semibold text-white">Cross-Industry Insights</h2>
          <p className="text-sm text-slate-400">
            Patterns that appear across multiple industries will be highlighted here
            as more data is collected. Currently tracking{" "}
            <span className="font-medium text-white">{learnings.length}</span> parameter
            variations across the{" "}
            <span className="text-[#D4AF37]">
              {INDUSTRIES.find(i => i.value === industry)?.label}
            </span>{" "}
            industry.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <MiniStat
              label="Total Changes"
              value={learnings.reduce((s, l) => s + l.clients_tested, 0)}
            />
            <MiniStat
              label="Positive Outcomes"
              value={learnings.reduce((s, l) => s + l.positive_outcomes, 0)}
              color="text-emerald-400"
            />
            <MiniStat
              label="Negative Outcomes"
              value={learnings.reduce((s, l) => s + l.negative_outcomes, 0)}
              color="text-red-400"
            />
            <MiniStat
              label="Avg Improvement"
              value={`${(
                learnings.reduce((s, l) => s + l.avg_improvement_pct, 0) /
                Math.max(learnings.length, 1)
              ).toFixed(1)}%`}
              color="text-[#D4AF37]"
            />
          </div>
        </section>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function LearningCard({
  learning,
  applying,
  onApply,
}: {
  learning: Learning
  applying: boolean
  onApply: () => void
}) {
  const conf = confidenceConfig[learning.confidence]

  return (
    <div className="rounded-xl border border-slate-700/50 bg-slate-800/50 p-5">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-medium text-white">{learning.parameter}</h3>
          <p className="mt-1 text-sm text-slate-400">
            <span className="text-slate-500">{learning.old_value || "(default)"}</span>
            <ArrowRight className="mx-1 inline h-3 w-3 text-slate-600" />
            <span className="font-medium text-white">{learning.new_value}</span>
          </p>
        </div>
        <span
          className={cn(
            "rounded-full border px-2.5 py-0.5 text-xs font-medium",
            conf.bg,
            conf.color,
          )}
        >
          {conf.label}
        </span>
      </div>

      {/* Evidence */}
      <div className="mt-4 flex items-center gap-4 text-sm">
        <span className="text-slate-400">
          <span className="font-medium text-white">{learning.clients_tested}</span> clients tested
        </span>
        <span className="text-emerald-400">
          {learning.positive_outcomes} positive
        </span>
        <span className="text-red-400">
          {learning.negative_outcomes} negative
        </span>
      </div>

      {learning.avg_improvement_pct !== 0 && (
        <div className="mt-2 text-sm">
          <span className={learning.avg_improvement_pct > 0 ? "text-emerald-400" : "text-red-400"}>
            {learning.avg_improvement_pct > 0 ? "+" : ""}
            {learning.avg_improvement_pct}% avg improvement
          </span>
        </div>
      )}

      {/* Recommendation */}
      <p className="mt-3 text-sm text-slate-300">{learning.recommendation}</p>

      {/* Actions */}
      {learning.confidence === "high" && (
        <div className="mt-4 flex gap-2">
          <button
            onClick={onApply}
            disabled={applying}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            {applying ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle className="h-4 w-4" />
            )}
            Apply to All Clients
          </button>
          <button className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-300 hover:bg-slate-700">
            Dismiss
          </button>
        </div>
      )}
    </div>
  )
}

function LearningCardCompact({ learning }: { learning: Learning }) {
  const conf = confidenceConfig[learning.confidence]

  return (
    <div className="rounded-xl border border-slate-700/30 bg-slate-800/30 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-white">{learning.parameter}</h3>
        <span
          className={cn(
            "rounded-full border px-2 py-0.5 text-[10px] font-medium",
            conf.bg,
            conf.color,
          )}
        >
          {conf.label}
        </span>
      </div>
      <p className="mt-1 text-xs text-slate-400">
        {learning.old_value || "(default)"}
        <ArrowRight className="mx-1 inline h-2.5 w-2.5 text-slate-600" />
        {learning.new_value}
      </p>
      <p className="mt-2 text-xs text-slate-500">
        {learning.clients_tested} client{learning.clients_tested !== 1 ? "s" : ""} tested
      </p>
    </div>
  )
}

function MiniStat({
  label,
  value,
  color = "text-white",
}: {
  label: string
  value: string | number
  color?: string
}) {
  return (
    <div className="rounded-lg border border-slate-700/30 bg-slate-800/50 p-3 text-center">
      <p className={cn("text-xl font-bold", color)}>{value}</p>
      <p className="mt-1 text-xs text-slate-400">{label}</p>
    </div>
  )
}
