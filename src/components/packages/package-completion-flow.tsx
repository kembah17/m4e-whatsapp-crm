"use client"

import React, { useState } from "react"
import { cn } from "@/lib/utils"
import {
  CheckCircle2, FileText, ArrowRight, Download, MessageSquare,
  Award, TrendingUp, Clock, Package, Loader2, AlertCircle,
  Star, ChevronRight, Copy, Check,
} from "lucide-react"

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface MilestoneData {
  id: string
  milestone_key: string
  name: string
  description: string | null
  week_number: number
  status: "pending" | "in_progress" | "completed" | "skipped" | "blocked"
  started_at: string | null
  completed_at: string | null
  planned_hours: number
  actual_hours: number
  deliverables: Array<{ name: string; status: string; url?: string }>
  criteria: Array<{ name: string; met: boolean; value?: number | string }>
  notes: string | null
  account_id: string
  package_config_id: string
}

interface PackageConfig {
  id: string
  package_key: string
  name: string
  description: string | null
  price_naira: number
  duration_weeks: number
  tier: number
  campaign_slugs: string[]
  automation_types: string[]
  flow_types: string[]
  report_frequency: string
  retainer_options: Array<{ name: string; price: number; monitoring_level: string; intervention_frequency: string }>
  milestone_template: Array<{ week: number; name: string; description?: string; deliverables: string[]; criteria: string[] }>
  transition_rules: {
    next_packages?: string[]
    quantitative_criteria?: Array<{ metric: string; threshold: number; operator: string }>
    qualitative_criteria?: Array<{ key: string; description: string }>
    qualitative_minimum?: number
  }
  is_active: boolean
}

interface AccountSummary {
  account_id: string
  business_name: string
  subscription_tier: string
  industry: string
  created_at: string
  active_package: {
    package_config_id: string
    package_key: string
    package_name: string
    price_naira: number
    duration_weeks: number
    total_milestones: number
    completed: number
    in_progress: number
    pending: number
    blocked: number
    skipped: number
    progress_percent: number
    current_week: number
    current_milestone: string | null
    started_at: string | null
    last_activity: string | null
    estimated_end: string | null
  } | null
  campaign_stats: { total: number; active: number; draft: number }
  automation_stats: { total: number; active: number }
  contact_count: number
}

interface PackageCompletionFlowProps {
  account: AccountSummary
  pkgConfig: PackageConfig
  milestones: MilestoneData[]
  packages: PackageConfig[]
  onTransition: (body: Record<string, unknown>) => Promise<{ success?: boolean; error?: string }>
  actionLoading: boolean
}

type CompletionStep = "summary" | "report" | "recommendation" | "communication" | "close"

const formatNaira = (n: number) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 0,
  }).format(n)

const formatDate = (d: string | null) =>
  d
    ? new Date(d).toLocaleDateString("en-NG", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "—"

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */
export function PackageCompletionFlow({
  account,
  pkgConfig,
  milestones,
  packages,
  onTransition,
  actionLoading,
}: PackageCompletionFlowProps) {
  const [step, setStep] = useState<CompletionStep>("summary")
  const [copied, setCopied] = useState(false)
  const [closing, setClosing] = useState(false)
  const [closed, setClosed] = useState(false)

  const pkg = account.active_package
  if (!pkg) return null

  const completedMilestones = milestones.filter((m) => m.status === "completed")
  const skippedMilestones = milestones.filter((m) => m.status === "skipped")
  const totalHoursPlanned = milestones.reduce((s, m) => s + m.planned_hours, 0)
  const totalHoursActual = milestones.reduce((s, m) => s + m.actual_hours, 0)
  const allDeliverables = milestones.flatMap((m) => m.deliverables)
  const completedDeliverables = allDeliverables.filter(
    (d) => d.status === "completed"
  )
  const allCriteria = milestones.flatMap((m) => m.criteria)
  const metCriteria = allCriteria.filter((c) => c.met)

  // Transition recommendations
  const nextPkgKeys = pkgConfig.transition_rules?.next_packages ?? []
  const nextPkgConfigs = packages.filter((p) =>
    nextPkgKeys.includes(p.package_key)
  )

  const isComplete =
    pkg.completed === pkg.total_milestones ||
    pkg.progress_percent >= 100

  // Generate report text
  const reportText = `# Package Completion Report
## ${account.business_name} — ${pkgConfig.name}

**Duration:** ${pkgConfig.duration_weeks} weeks (${formatDate(pkg.started_at)} — ${formatDate(pkg.estimated_end)})
**Investment:** ${formatNaira(pkgConfig.price_naira)}

### Results Summary
- **Milestones Completed:** ${completedMilestones.length}/${milestones.length}
- **Milestones Skipped:** ${skippedMilestones.length}
- **Deliverables Completed:** ${completedDeliverables.length}/${allDeliverables.length}
- **Success Criteria Met:** ${metCriteria.length}/${allCriteria.length}
- **Hours:** ${totalHoursActual} actual vs ${totalHoursPlanned} planned

### Milestone Details
${milestones
  .map(
    (m) =>
      `#### ${m.name} (Week ${m.week_number}) — ${m.status.toUpperCase()}
${m.deliverables.map((d) => `- [${d.status === "completed" ? "x" : " "}] ${d.name}`).join("\n")}
${m.notes ? `Notes: ${m.notes}` : ""}`
  )
  .join("\n\n")}

### Campaigns
- Active: ${account.campaign_stats.active}
- Total: ${account.campaign_stats.total}

### Automations
- Active: ${account.automation_stats.active}
- Total: ${account.automation_stats.total}

### Recommendation
${nextPkgConfigs.length > 0 ? `Consider upgrading to: ${nextPkgConfigs.map((p) => p.name).join(", ")}` : "Consider a retainer plan for ongoing support."}
`

  // Client communication template
  const clientMessage = `Hi ${account.business_name},

Congratulations on completing your ${pkgConfig.name} package! Here's a quick summary of what we achieved together:

✅ ${completedMilestones.length} milestones completed
✅ ${completedDeliverables.length} deliverables delivered
✅ ${metCriteria.length} success criteria met
✅ ${account.campaign_stats.active} active campaigns running
✅ ${account.automation_stats.active} automations working for you

${nextPkgConfigs.length > 0 ? `Based on your results, we recommend the ${nextPkgConfigs[0].name} as your next step to continue growing your business.` : `We recommend transitioning to a retainer plan to maintain and build on these results.`}

Would you like to schedule a call to discuss next steps?

Best regards,
Marketing4Effect Team`

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleClose = async () => {
    setClosing(true)
    try {
      await onTransition({
        action: "transition_package",
        account_id: account.account_id,
        transition_type: "complete",
        notes: `Package completed. ${completedMilestones.length}/${milestones.length} milestones done.`,
      })
      setClosed(true)
    } catch {
      // Error handled by parent
    } finally {
      setClosing(false)
    }
  }

  const completionSteps: { key: CompletionStep; label: string; num: number }[] = [
    { key: "summary", label: "Results", num: 1 },
    { key: "report", label: "Report", num: 2 },
    { key: "recommendation", label: "Next Steps", num: 3 },
    { key: "communication", label: "Client Comms", num: 4 },
    { key: "close", label: "Close", num: 5 },
  ]

  const currentNum =
    step === "summary" ? 1 :
    step === "report" ? 2 :
    step === "recommendation" ? 3 :
    step === "communication" ? 4 : 5

  if (closed) {
    return (
      <div className="bg-card border border-border rounded-lg p-8 text-center">
        <CheckCircle2 className="h-12 w-12 text-emerald-400 mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-foreground">Package Closed</h3>
        <p className="text-sm text-muted-foreground mt-1">
          {pkgConfig.name} for {account.business_name} has been marked as completed and archived.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Award className="h-5 w-5 text-accent-500" />
            Package Completion
          </h3>
          <p className="text-sm text-muted-foreground">
            {account.business_name} — {pkgConfig.name}
          </p>
        </div>
        {isComplete && (
          <span className="text-xs px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            All milestones complete
          </span>
        )}
      </div>

      {/* Step Indicator */}
      <div className="flex items-center gap-2 overflow-x-auto">
        {completionSteps.map((s, i) => (
          <React.Fragment key={s.key}>
            <button
              onClick={() => setStep(s.key)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap",
                currentNum >= s.num
                  ? "bg-accent-500/10 text-accent-500"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              {currentNum > s.num ? (
                <CheckCircle2 className="h-3.5 w-3.5" />
              ) : (
                <span className="h-4 w-4 rounded-full bg-current/20 flex items-center justify-center text-[10px]">
                  {s.num}
                </span>
              )}
              {s.label}
            </button>
            {i < completionSteps.length - 1 && (
              <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Step 1: Results Summary */}
      {step === "summary" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-card border border-border rounded-lg p-3">
              <p className="text-xs text-muted-foreground">Milestones</p>
              <p className="text-xl font-bold text-foreground">
                {completedMilestones.length}
                <span className="text-sm font-normal text-muted-foreground">
                  /{milestones.length}
                </span>
              </p>
            </div>
            <div className="bg-card border border-border rounded-lg p-3">
              <p className="text-xs text-muted-foreground">Deliverables</p>
              <p className="text-xl font-bold text-foreground">
                {completedDeliverables.length}
                <span className="text-sm font-normal text-muted-foreground">
                  /{allDeliverables.length}
                </span>
              </p>
            </div>
            <div className="bg-card border border-border rounded-lg p-3">
              <p className="text-xs text-muted-foreground">Criteria Met</p>
              <p className="text-xl font-bold text-foreground">
                {metCriteria.length}
                <span className="text-sm font-normal text-muted-foreground">
                  /{allCriteria.length}
                </span>
              </p>
            </div>
            <div className="bg-card border border-border rounded-lg p-3">
              <p className="text-xs text-muted-foreground">Hours</p>
              <p className="text-xl font-bold text-foreground">
                {totalHoursActual}
                <span className="text-sm font-normal text-muted-foreground">
                  /{totalHoursPlanned}h
                </span>
              </p>
            </div>
          </div>

          {/* Milestone list */}
          <div className="bg-card border border-border rounded-lg divide-y divide-border">
            {milestones.map((m) => (
              <div key={m.id} className="flex items-center gap-3 p-3">
                <div
                  className={cn(
                    "h-6 w-6 rounded-full flex items-center justify-center shrink-0",
                    m.status === "completed"
                      ? "bg-emerald-500/10 text-emerald-400"
                      : m.status === "skipped"
                        ? "bg-muted text-muted-foreground"
                        : m.status === "blocked"
                          ? "bg-red-500/10 text-red-400"
                          : "bg-amber-500/10 text-amber-400"
                  )}
                >
                  {m.status === "completed" ? (
                    <Check className="h-3 w-3" />
                  ) : (
                    <Clock className="h-3 w-3" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {m.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Week {m.week_number} ·{" "}
                    {m.deliverables.filter((d) => d.status === "completed").length}/
                    {m.deliverables.length} deliverables
                  </p>
                </div>
                <span
                  className={cn(
                    "text-xs px-2 py-0.5 rounded-full",
                    m.status === "completed"
                      ? "bg-emerald-500/10 text-emerald-400"
                      : m.status === "skipped"
                        ? "bg-muted text-muted-foreground"
                        : "bg-amber-500/10 text-amber-400"
                  )}
                >
                  {m.status}
                </span>
              </div>
            ))}
          </div>

          <div className="flex justify-end">
            <button
              onClick={() => setStep("report")}
              className="px-6 py-2.5 rounded-lg font-medium text-sm bg-accent-500 text-foreground hover:bg-accent-600 transition-colors flex items-center gap-2"
            >
              Generate Report <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Report */}
      {step === "report" && (
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <FileText className="h-4 w-4" /> Completion Report
              </h4>
              <button
                onClick={() => handleCopy(reportText)}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                {copied ? (
                  <><Check className="h-3 w-3" /> Copied</>
                ) : (
                  <><Copy className="h-3 w-3" /> Copy</>
                )}
              </button>
            </div>
            <pre className="text-xs text-muted-foreground whitespace-pre-wrap max-h-96 overflow-y-auto bg-muted/50 rounded-lg p-3">
              {reportText}
            </pre>
          </div>

          <div className="flex justify-between">
            <button
              onClick={() => setStep("summary")}
              className="px-4 py-2 rounded-lg text-sm font-medium border border-border text-foreground hover:bg-muted transition-colors"
            >
              Back
            </button>
            <button
              onClick={() => setStep("recommendation")}
              className="px-6 py-2.5 rounded-lg font-medium text-sm bg-accent-500 text-foreground hover:bg-accent-600 transition-colors flex items-center gap-2"
            >
              Next Steps <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Recommendation */}
      {step === "recommendation" && (
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-lg p-4">
            <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-accent-500" /> Transition Recommendation
            </h4>

            {nextPkgConfigs.length > 0 ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Based on the package transition rules, the following packages are recommended:
                </p>
                {nextPkgConfigs.map((np) => (
                  <div
                    key={np.id}
                    className="p-3 rounded-lg border border-accent-500/30 bg-accent-500/5"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm text-foreground">
                          {np.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {np.duration_weeks} weeks ·{" "}
                          {np.milestone_template.length} milestones
                        </p>
                      </div>
                      <p className="text-lg font-bold text-accent-500">
                        {formatNaira(np.price_naira)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No upgrade packages configured. Consider a retainer plan.
              </p>
            )}

            {pkgConfig.retainer_options.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-medium text-muted-foreground mb-2">
                  Retainer Options
                </p>
                <div className="grid sm:grid-cols-2 gap-2">
                  {pkgConfig.retainer_options.map((r, i) => (
                    <div
                      key={i}
                      className="p-3 rounded-lg border border-border bg-background"
                    >
                      <p className="font-medium text-sm text-foreground">
                        {r.name}
                      </p>
                      <p className="text-lg font-bold text-accent-500">
                        {formatNaira(r.price)}
                        <span className="text-xs text-muted-foreground font-normal">
                          /mo
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {r.monitoring_level} monitoring ·{" "}
                        {r.intervention_frequency} intervention
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-between">
            <button
              onClick={() => setStep("report")}
              className="px-4 py-2 rounded-lg text-sm font-medium border border-border text-foreground hover:bg-muted transition-colors"
            >
              Back
            </button>
            <button
              onClick={() => setStep("communication")}
              className="px-6 py-2.5 rounded-lg font-medium text-sm bg-accent-500 text-foreground hover:bg-accent-600 transition-colors flex items-center gap-2"
            >
              Client Comms <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Client Communication */}
      {step === "communication" && (
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <MessageSquare className="h-4 w-4" /> Client Message
              </h4>
              <button
                onClick={() => handleCopy(clientMessage)}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                {copied ? (
                  <><Check className="h-3 w-3" /> Copied</>
                ) : (
                  <><Copy className="h-3 w-3" /> Copy</>
                )}
              </button>
            </div>
            <pre className="text-sm text-muted-foreground whitespace-pre-wrap bg-muted/50 rounded-lg p-3">
              {clientMessage}
            </pre>
          </div>

          <div className="flex justify-between">
            <button
              onClick={() => setStep("recommendation")}
              className="px-4 py-2 rounded-lg text-sm font-medium border border-border text-foreground hover:bg-muted transition-colors"
            >
              Back
            </button>
            <button
              onClick={() => setStep("close")}
              className="px-6 py-2.5 rounded-lg font-medium text-sm bg-accent-500 text-foreground hover:bg-accent-600 transition-colors flex items-center gap-2"
            >
              Close Package <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 5: Close Package */}
      {step === "close" && (
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-lg p-6 text-center">
            <Package className="h-10 w-10 text-accent-500 mx-auto mb-3" />
            <h4 className="text-lg font-semibold text-foreground">
              Close {pkgConfig.name}?
            </h4>
            <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
              This will mark the package as completed and archive it.
              The client’s campaigns and automations will continue running.
            </p>

            <div className="flex items-center justify-center gap-3 mt-6">
              <button
                onClick={() => setStep("communication")}
                className="px-4 py-2 rounded-lg text-sm font-medium border border-border text-foreground hover:bg-muted transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleClose}
                disabled={actionLoading || closing}
                className="px-6 py-2.5 rounded-lg font-medium text-sm bg-red-500 text-white hover:bg-red-600 transition-colors flex items-center gap-2"
              >
                {closing ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Closing...</>
                ) : (
                  <><CheckCircle2 className="h-4 w-4" /> Confirm Close</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
