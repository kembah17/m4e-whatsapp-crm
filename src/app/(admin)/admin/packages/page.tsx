"use client"

import { useCallback, useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { AdminMetricCard } from "@/components/admin/admin-metric-card"
import {
  Package,
  TrendingUp,
  Target,
  CheckCircle,
  Clock,
  AlertTriangle,
  RefreshCw,
  ChevronRight,
  Eye,
  Users,
  ArrowRight,
} from "lucide-react"
import type {
  PackageConfig,
  PackageMilestone,
  TransitionRecommendation,
  PackageValidation,
  MilestoneStatus,
  TransitionRecommendationLevel,
  TransitionDecision,
  ValidationStatus,
  ValidationType,
} from "@/types/packages"

type Tab = "configs" | "progress" | "transitions" | "validations"

const tabs: { id: Tab; label: string; icon: typeof Package }[] = [
  { id: "configs", label: "Package Configs", icon: Package },
  { id: "progress", label: "Client Progress", icon: TrendingUp },
  { id: "transitions", label: "Transitions", icon: ArrowRight },
  { id: "validations", label: "Validations", icon: CheckCircle },
]

const formatNaira = (amount: number) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 0,
  }).format(amount)

const statusColors: Record<string, string> = {
  pending: "bg-gray-500/10 text-gray-400",
  in_progress: "bg-blue-500/10 text-blue-500",
  completed: "bg-emerald-500/10 text-emerald-500",
  skipped: "bg-yellow-500/10 text-yellow-500",
  blocked: "bg-red-500/10 text-red-500",
  not_started: "bg-gray-500/10 text-gray-400",
  failed: "bg-red-500/10 text-red-500",
}

const recommendationColors: Record<string, string> = {
  strong_recommend: "bg-emerald-500/10 text-emerald-500",
  recommend: "bg-blue-500/10 text-blue-500",
  maintain: "bg-gray-500/10 text-gray-400",
  extend: "bg-yellow-500/10 text-yellow-500",
  escalate: "bg-red-500/10 text-red-500",
  no_transition_rules: "bg-gray-500/10 text-gray-400",
}

/* ------------------------------------------------------------------ */
/*  Tab 1 – Package Configs                                           */
/* ------------------------------------------------------------------ */
function PackageConfigsTab() {
  const [loading, setLoading] = useState(true)
  const [packages, setPackages] = useState<PackageConfig[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const fetchPackages = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/packages")
      const json = await res.json()
      setPackages(json.packages ?? [])
    } catch (err) {
      console.error("Failed to fetch packages:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPackages()
  }, [fetchPackages])

  if (loading) return <LoadingSkeleton rows={5} />
  if (!packages.length) return <EmptyState message="No package configurations found." />

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">
          {packages.length} package{packages.length !== 1 ? "s" : ""} configured
        </h3>
        <button onClick={fetchPackages} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left p-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Name</th>
              <th className="text-left p-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Package Key</th>
              <th className="text-left p-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Price</th>
              <th className="text-left p-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Duration</th>
              <th className="text-left p-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Tier</th>
              <th className="text-left p-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Campaigns</th>
              <th className="text-left p-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Status</th>
              <th className="text-left p-3 text-xs font-medium uppercase tracking-wider text-muted-foreground"></th>
            </tr>
          </thead>
          <tbody>
            {packages.map((pkg) => (
              <>
                <tr key={pkg.id} className="border-b border-border hover:bg-muted/20 transition-colors">
                  <td className="p-3 font-medium text-foreground">{pkg.name}</td>
                  <td className="p-3"><code className="rounded bg-muted px-1.5 py-0.5 text-xs">{pkg.package_key}</code></td>
                  <td className="p-3 text-amber-500 font-medium">{formatNaira(pkg.price_naira)}</td>
                  <td className="p-3">{pkg.duration_weeks} weeks</td>
                  <td className="p-3">
                    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-amber-500/10 text-amber-500">
                      Tier {pkg.tier}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-1">
                      {pkg.campaign_slugs.slice(0, 3).map((slug) => (
                        <span key={slug} className="inline-flex items-center rounded-full px-2 py-0.5 text-xs bg-muted text-muted-foreground">
                          {slug}
                        </span>
                      ))}
                      {pkg.campaign_slugs.length > 3 && (
                        <span className="text-xs text-muted-foreground">+{pkg.campaign_slugs.length - 3}</span>
                      )}
                    </div>
                  </td>
                  <td className="p-3">
                    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", pkg.is_active ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500")}>
                      {pkg.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="p-3">
                    <button onClick={() => setExpandedId(expandedId === pkg.id ? null : pkg.id)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-amber-500">
                      <Eye className="h-3.5 w-3.5" />
                      <ChevronRight className={cn("h-3.5 w-3.5 transition-transform", expandedId === pkg.id && "rotate-90")} />
                    </button>
                  </td>
                </tr>
                {expandedId === pkg.id && (
                  <tr key={`${pkg.id}-detail`}>
                    <td colSpan={8} className="bg-muted/10 p-4">
                      <div className="grid gap-4 md:grid-cols-3">
                        <div>
                          <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">Description</h4>
                          <p className="text-sm text-foreground">{pkg.description || "No description"}</p>
                        </div>
                        <div>
                          <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">Retainer Options</h4>
                          <div className="flex flex-wrap gap-1.5">
                            {pkg.retainer_options.length > 0 ? pkg.retainer_options.map((r, i) => (
                              <span key={i} className="inline-flex items-center rounded-full px-2 py-0.5 text-xs bg-purple-500/10 text-purple-400">
                                {r.name} – {formatNaira(r.price)}
                              </span>
                            )) : <span className="text-xs text-muted-foreground">None</span>}
                          </div>
                        </div>
                        <div>
                          <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">Milestones</h4>
                          <p className="text-sm">{pkg.milestone_template.length} milestone{pkg.milestone_template.length !== 1 ? "s" : ""} defined</p>
                          <h4 className="mt-2 text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">Automations</h4>
                          <div className="flex flex-wrap gap-1">
                            {pkg.automation_types.map((a) => (
                              <span key={a} className="inline-flex items-center rounded-full px-2 py-0.5 text-xs bg-blue-500/10 text-blue-400">{a}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Tab 2 – Client Progress                                           */
/* ------------------------------------------------------------------ */
function ClientProgressTab() {
  const [packages, setPackages] = useState<PackageConfig[]>([])
  const [accountId, setAccountId] = useState("")
  const [selectedPkgId, setSelectedPkgId] = useState("")
  const [milestones, setMilestones] = useState<PackageMilestone[]>([])
  const [loading, setLoading] = useState(false)
  const [pkgLoading, setPkgLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch("/api/admin/packages")
        const json = await res.json()
        setPackages(json.packages ?? [])
      } catch (err) {
        console.error(err)
      } finally {
        setPkgLoading(false)
      }
    })()
  }, [])

  const fetchMilestones = useCallback(async () => {
    if (!accountId || !selectedPkgId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/packages/${selectedPkgId}/milestones?account_id=${accountId}`)
      const json = await res.json()
      setMilestones(json.milestones ?? [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [accountId, selectedPkgId])

  const completed = milestones.filter((m) => m.status === "completed").length
  const total = milestones.length
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0

  return (
    <div className="space-y-6">
      {/* Selectors */}
      <div className="flex flex-wrap gap-3">
        <div className="flex-1 min-w-[200px]">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Account ID</label>
          <input
            type="text" value={accountId} onChange={(e) => setAccountId(e.target.value)}
            placeholder="Enter account UUID"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/30"
          />
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Package</label>
          <select
            value={selectedPkgId} onChange={(e) => setSelectedPkgId(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/30"
          >
            <option value="">{pkgLoading ? "Loading..." : "Select package"}</option>
            {packages.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        <div className="flex items-end">
          <button
            onClick={fetchMilestones}
            disabled={!accountId || !selectedPkgId}
            className="flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-black hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Target className="h-4 w-4" /> Load Progress
          </button>
        </div>
      </div>

      {loading && <LoadingSkeleton rows={4} />}

      {!loading && milestones.length > 0 && (
        <>
          {/* Progress bar */}
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Overall Progress</span>
              <span className="text-sm font-medium text-amber-500">{pct}%</span>
            </div>
            <div className="h-3 w-full rounded-full bg-muted">
              <div className="h-3 rounded-full bg-amber-500 transition-all" style={{ width: `${pct}%` }} />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{completed} of {total} milestones completed</p>
          </div>

          {/* Timeline */}
          <div className="space-y-0">
            {milestones
              .sort((a, b) => a.week_number - b.week_number)
              .map((m, idx) => (
                <div key={m.id} className="relative flex gap-4">
                  {/* Vertical line */}
                  <div className="flex flex-col items-center">
                    <div className={cn("h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold", statusColors[m.status] || statusColors.pending)}>
                      W{m.week_number}
                    </div>
                    {idx < milestones.length - 1 && <div className="w-px flex-1 bg-border" />}
                  </div>
                  {/* Content */}
                  <div className="flex-1 pb-6">
                    <div className="rounded-xl border border-border bg-card p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-medium text-foreground">{m.name}</h4>
                          <p className="text-xs text-muted-foreground mt-0.5">{m.description}</p>
                        </div>
                        <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium shrink-0", statusColors[m.status] || statusColors.pending)}>
                          {m.status.replace("_", " ")}
                        </span>
                      </div>
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <div>
                          <span className="text-xs text-muted-foreground">Hours: </span>
                          <span className="text-xs">{m.actual_hours}/{m.planned_hours}h</span>
                        </div>
                      </div>
                      {m.deliverables.length > 0 && (
                        <div className="mt-3">
                          <h5 className="text-xs font-medium text-muted-foreground mb-1">Deliverables</h5>
                          <ul className="space-y-1">
                            {m.deliverables.map((d, i) => (
                              <li key={i} className="flex items-center gap-2 text-xs">
                                <CheckCircle className={cn("h-3.5 w-3.5", d.status === "completed" ? "text-emerald-500" : "text-muted-foreground")} />
                                <span className={d.status === "completed" ? "line-through text-muted-foreground" : ""}>{d.name}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {m.criteria.length > 0 && (
                        <div className="mt-3">
                          <h5 className="text-xs font-medium text-muted-foreground mb-1">Criteria</h5>
                          <ul className="space-y-1">
                            {m.criteria.map((c, i) => (
                              <li key={i} className="flex items-center gap-2 text-xs">
                                <CheckCircle className={cn("h-3.5 w-3.5", c.met ? "text-emerald-500" : "text-muted-foreground")} />
                                <span>{c.name}{c.value != null ? ` (${c.value}${c.threshold ? `/${c.threshold}` : ""})` : ""}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </>
      )}

      {!loading && !milestones.length && accountId && selectedPkgId && (
        <EmptyState message="No milestones found for this account and package combination." />
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Tab 3 – Transitions                                               */
/* ------------------------------------------------------------------ */
function TransitionsTab() {
  const [packages, setPackages] = useState<PackageConfig[]>([])
  const [accountId, setAccountId] = useState("")
  const [selectedPkgId, setSelectedPkgId] = useState("")
  const [recommendation, setRecommendation] = useState<TransitionRecommendation | null>(null)
  const [loading, setLoading] = useState(false)
  const [deciding, setDeciding] = useState(false)
  const [pkgLoading, setPkgLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch("/api/admin/packages")
        const json = await res.json()
        setPackages(json.packages ?? [])
      } catch (err) {
        console.error(err)
      } finally {
        setPkgLoading(false)
      }
    })()
  }, [])

  const generateRecommendation = useCallback(async () => {
    if (!accountId || !selectedPkgId) return
    setLoading(true)
    setRecommendation(null)
    try {
      const res = await fetch(`/api/admin/packages/${selectedPkgId}/transition?account_id=${accountId}`)
      const json = await res.json()
      setRecommendation(json)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [accountId, selectedPkgId])

  const handleDecision = async (decision: TransitionDecision) => {
    if (!selectedPkgId) return
    setDeciding(true)
    try {
      await fetch(`/api/admin/packages/${selectedPkgId}/transition`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          account_id: accountId,
          from_package_id: selectedPkgId,
          transition_type: "upgrade" as const,
          recommendation: recommendation?.recommendation ?? "maintain",
          decision,
        }),
      })
      setRecommendation(null)
    } catch (err) {
      console.error(err)
    } finally {
      setDeciding(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3">
        <div className="flex-1 min-w-[200px]">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Account ID</label>
          <input type="text" value={accountId} onChange={(e) => setAccountId(e.target.value)} placeholder="Enter account UUID"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/30" />
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Package</label>
          <select value={selectedPkgId} onChange={(e) => setSelectedPkgId(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/30">
            <option value="">{pkgLoading ? "Loading..." : "Select package"}</option>
            {packages.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div className="flex items-end">
          <button onClick={generateRecommendation} disabled={!accountId || !selectedPkgId || loading}
            className="flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-black hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed">
            <TrendingUp className="h-4 w-4" /> Generate Recommendation
          </button>
        </div>
      </div>

      {loading && <LoadingSkeleton rows={3} />}

      {recommendation && (
        <div className="space-y-4">
          {/* Recommendation badge */}
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-muted-foreground">Recommendation:</span>
              <span className={cn("inline-flex items-center rounded-full px-3 py-1 text-sm font-medium", recommendationColors[recommendation.recommendation] || recommendationColors.maintain)}>
                {recommendation.recommendation.replace("_", " ")}
              </span>
            </div>
            {recommendation.message && <p className="mt-2 text-sm text-muted-foreground">{recommendation.message}</p>}
            {recommendation.next_packages && recommendation.next_packages.length > 0 && (
              <div className="mt-3">
                <span className="text-xs text-muted-foreground">Suggested next: </span>
                {recommendation.next_packages.map((np) => (
                  <span key={np} className="ml-1 inline-flex items-center rounded-full px-2 py-0.5 text-xs bg-blue-500/10 text-blue-500">{np}</span>
                ))}
              </div>
            )}
          </div>

          {/* Quantitative results */}
          {recommendation.quantitative_results && recommendation.quantitative_results.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-5">
              <h4 className="text-sm font-medium mb-3">Quantitative Results ({recommendation.quantitative_passed}/{recommendation.quantitative_total} passed)</h4>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Metric</th>
                    <th className="text-left p-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Value</th>
                    <th className="text-left p-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Threshold</th>
                    <th className="text-left p-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Result</th>
                  </tr>
                </thead>
                <tbody>
                  {recommendation.quantitative_results.map((r, i) => (
                    <tr key={i} className="border-b border-border/50">
                      <td className="p-2">{r.metric}</td>
                      <td className="p-2 font-mono">{r.value.toFixed(2)}</td>
                      <td className="p-2 font-mono text-muted-foreground">{r.threshold}</td>
                      <td className="p-2">
                        <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", r.passed ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500")}>
                          {r.passed ? "Pass" : "Fail"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Qualitative criteria */}
          {recommendation.qualitative_criteria && recommendation.qualitative_criteria.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-5">
              <h4 className="text-sm font-medium mb-3">Qualitative Criteria</h4>
              <ul className="space-y-2">
                {recommendation.qualitative_criteria.map((c, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 mt-0.5 text-muted-foreground" />
                    <div>
                      <span className="text-sm font-medium">{c.key}</span>
                      <p className="text-xs text-muted-foreground">{c.description}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Decision buttons */}
          <div className="flex gap-3">
            <button onClick={() => handleDecision("accepted")} disabled={deciding}
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-40">
              <CheckCircle className="h-4 w-4" /> Accept
            </button>
            <button onClick={() => handleDecision("declined")} disabled={deciding}
              className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500 disabled:opacity-40">
              <AlertTriangle className="h-4 w-4" /> Decline
            </button>
            <button onClick={() => handleDecision("deferred")} disabled={deciding}
              className="flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-40">
              <Clock className="h-4 w-4" /> Defer
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Tab 4 – Validations                                               */
/* ------------------------------------------------------------------ */
function ValidationsTab() {
  const [loading, setLoading] = useState(true)
  const [validations, setValidations] = useState<PackageValidation[]>([])
  const [packages, setPackages] = useState<PackageConfig[]>([])
  const [starting, setStarting] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [vRes, pRes] = await Promise.all([
        fetch("/api/admin/validations"),
        fetch("/api/admin/packages"),
      ])
      const vJson = await vRes.json()
      const pJson = await pRes.json()
      setValidations(vJson.validations ?? [])
      setPackages(pJson.packages ?? [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const startValidation = async (packageConfigId: string, validationType: ValidationType) => {
    setStarting(true)
    try {
      await fetch("/api/admin/validations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ package_config_id: packageConfigId, validation_type: validationType }),
      })
      await fetchData()
    } catch (err) {
      console.error(err)
    } finally {
      setStarting(false)
    }
  }

  const pkgName = (id: string) => packages.find((p) => p.id === id)?.name ?? id.slice(0, 8)

  if (loading) return <LoadingSkeleton rows={4} />

  // Group by package
  const grouped = packages.map((pkg) => ({
    pkg,
    vals: validations.filter((v) => v.package_config_id === pkg.id),
  }))

  return (
    <div className="space-y-6">
      {grouped.map(({ pkg, vals }) => (
        <div key={pkg.id} className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-medium text-foreground">{pkg.name}</h4>
            {vals.length === 0 && (
              <button onClick={() => startValidation(pkg.id, "self_execution")} disabled={starting}
                className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-medium text-black hover:bg-amber-400 disabled:opacity-40">
                Start Validation
              </button>
            )}
          </div>
          {vals.length === 0 ? (
            <p className="text-sm text-muted-foreground">No validations yet.</p>
          ) : (
            <div className="space-y-3">
              {vals.map((v) => (
                <div key={v.id} className="rounded-lg border border-border/50 bg-muted/10 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{v.validation_type.replace("_", " ")}</span>
                      <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", statusColors[v.status] || statusColors.not_started)}>
                        {v.status.replace("_", " ")}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {v.started_at ? `Started: ${new Date(v.started_at).toLocaleDateString()}` : "Not started"}
                      {v.completed_at && ` • Completed: ${new Date(v.completed_at).toLocaleDateString()}`}
                    </div>
                  </div>
                  {v.findings.length > 0 && (
                    <div className="mt-3 space-y-1.5">
                      <h5 className="text-xs font-medium text-muted-foreground">Findings</h5>
                      {v.findings.map((f, i) => {
                        const sevColor: Record<string, string> = {
                          critical: "bg-red-500/10 text-red-500",
                          major: "bg-orange-500/10 text-orange-500",
                          minor: "bg-yellow-500/10 text-yellow-500",
                          info: "bg-blue-500/10 text-blue-500",
                        }
                        return (
                          <div key={i} className="flex items-start gap-2 text-xs">
                            <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 font-medium shrink-0", sevColor[f.severity] || sevColor.info)}>
                              {f.severity}
                            </span>
                            <span>{f.finding}</span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Shared components                                                  */
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
      <Package className="h-10 w-10 text-muted-foreground/40 mb-3" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */
export default function PackagesPage() {
  const [activeTab, setActiveTab] = useState<Tab>("configs")

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Package Management</h1>
        <p className="text-sm text-muted-foreground mt-1">Configure packages, track client progress, manage transitions and validations.</p>
      </div>

      {/* Tab bar */}
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

      {/* Tab content */}
      {activeTab === "configs" && <PackageConfigsTab />}
      {activeTab === "progress" && <ClientProgressTab />}
      {activeTab === "transitions" && <TransitionsTab />}
      {activeTab === "validations" && <ValidationsTab />}
    </div>
  )
}
