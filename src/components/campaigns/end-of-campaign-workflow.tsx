"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import {
  CheckCircle2, Download, FileText, RefreshCw, ArrowRight,
  Clock, AlertTriangle, Loader2, TrendingUp, Calendar,
  Gift, BarChart3, Send, ChevronDown, ChevronRight,
  Star, Zap, Shield,
} from "lucide-react"
import { toast } from "sonner"

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface CampaignData {
  id: string
  name: string
  status: string
  created_at: string
  completed_at?: string | null
  total_audience: number
  template_slug?: string
}

interface EndOfCampaignWorkflowProps {
  campaign: CampaignData
  onRefresh: () => void
}

type WorkflowStep = "review" | "report" | "decide" | "execute"

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
const formatDate = (d: string | null | undefined) =>
  d ? new Date(d).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" }) : "—"

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */
export function EndOfCampaignWorkflow({ campaign, onRefresh }: EndOfCampaignWorkflowProps) {
  const [activeStep, setActiveStep] = useState<WorkflowStep>("review")
  const [loading, setLoading] = useState<string | null>(null)
  const [reportGenerated, setReportGenerated] = useState(false)
  const [selectedAction, setSelectedAction] = useState<string | null>(null)
  const [extensionWeeks, setExtensionWeeks] = useState(2)
  const [showGracePeriod, setShowGracePeriod] = useState(false)

  const isCompleted = campaign.status === "completed"
  if (!isCompleted) return null

  /* ── Report Download ─────────────────────────────────────────── */
  const downloadReport = async (format: "md" | "csv") => {
    setLoading(`report-${format}`)
    try {
      const endpoint = format === "md"
        ? `/api/campaigns/${campaign.id}/report/pdf`
        : `/api/campaigns/${campaign.id}/report/csv`
      const res = await fetch(endpoint)
      if (!res.ok) throw new Error("Failed to generate report")
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `campaign-${campaign.name.replace(/[^a-zA-Z0-9]/g, "_")}-report.${format}`
      a.click()
      URL.revokeObjectURL(url)
      setReportGenerated(true)
      toast.success(`Report downloaded as .${format}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Download failed")
    } finally {
      setLoading(null)
    }
  }

  /* ── Campaign Actions ────────────────────────────────────────── */
  const executeCampaignAction = async (action: string) => {
    setLoading(action)
    try {
      const res = await fetch(`/api/campaigns/${campaign.id}/completion`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          extension_weeks: action === "extend" ? extensionWeeks : undefined,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Action failed" }))
        throw new Error(data.error || "Action failed")
      }
      toast.success(
        action === "extend" ? `Campaign extended by ${extensionWeeks} weeks` :
        action === "clone" ? "New campaign created from this template" :
        action === "transition" ? "Transition recommendation saved" :
        action === "archive" ? "Campaign archived" :
        "Action completed"
      )
      onRefresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed")
    } finally {
      setLoading(null)
    }
  }

  /* ── Workflow Steps ───────────────────────────────────────────── */
  const steps: { key: WorkflowStep; label: string; icon: typeof CheckCircle2; description: string }[] = [
    { key: "review", label: "Review Results", icon: BarChart3, description: "Review campaign performance" },
    { key: "report", label: "Generate Report", icon: FileText, description: "Download client-facing report" },
    { key: "decide", label: "Next Steps", icon: TrendingUp, description: "Decide what happens next" },
    { key: "execute", label: "Execute", icon: Zap, description: "Take action" },
  ]

  const currentStepIndex = steps.findIndex(s => s.key === activeStep)

  return (
    <div className="rounded-2xl border-2 border-purple-200 bg-purple-50/30 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-purple-500 px-6 py-4">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="h-6 w-6 text-white" />
          <div>
            <h3 className="text-lg font-bold text-white">Campaign Completed</h3>
            <p className="text-sm text-purple-100">
              Completed {formatDate(campaign.completed_at)} • {campaign.total_audience} contacts reached
            </p>
          </div>
        </div>
      </div>

      {/* Step Navigation */}
      <div className="flex border-b border-purple-100 bg-white/50">
        {steps.map((step, i) => {
          const Icon = step.icon
          const isActive = step.key === activeStep
          const isPast = i < currentStepIndex
          return (
            <button
              key={step.key}
              onClick={() => setActiveStep(step.key)}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2",
                isActive ? "border-purple-600 text-purple-700 bg-purple-50" :
                isPast ? "border-transparent text-purple-500 hover:bg-purple-50/50" :
                "border-transparent text-muted-foreground hover:bg-muted/50"
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden md:inline">{step.label}</span>
            </button>
          )
        })}
      </div>

      {/* Step Content */}
      <div className="p-6">
        {/* ── Step 1: Review Results ──────────────────────────── */}
        {activeStep === "review" && (
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <BarChart3 className="h-5 w-5 text-purple-600 mt-0.5" />
              <div>
                <h4 className="font-semibold">Performance Summary</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Review the campaign metrics above. Key areas to evaluate:
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[
                { label: "Response Rate", desc: "How many contacts engaged with messages", icon: Send },
                { label: "Conversion Rate", desc: "Contacts who took the desired action", icon: TrendingUp },
                { label: "ROI Impact", desc: "Revenue generated vs campaign cost", icon: Star },
              ].map((item) => (
                <div key={item.label} className="rounded-xl border bg-white p-4">
                  <item.icon className="h-5 w-5 text-purple-500 mb-2" />
                  <h5 className="font-medium text-sm">{item.label}</h5>
                  <p className="text-xs text-muted-foreground mt-1">{item.desc}</p>
                </div>
              ))}
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setActiveStep("report")}
                className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 transition-colors"
              >
                Continue to Report <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* ── Step 2: Generate Report ─────────────────────────── */}
        {activeStep === "report" && (
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <FileText className="h-5 w-5 text-purple-600 mt-0.5" />
              <div>
                <h4 className="font-semibold">Client-Facing Report</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Generate a professional report to share with the client.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <button
                onClick={() => downloadReport("md")}
                disabled={loading === "report-md"}
                className="flex items-center gap-3 rounded-xl border bg-white p-4 hover:border-purple-300 hover:bg-purple-50/50 transition-all text-left"
              >
                {loading === "report-md" ? (
                  <Loader2 className="h-8 w-8 text-purple-500 animate-spin" />
                ) : (
                  <Download className="h-8 w-8 text-purple-500" />
                )}
                <div>
                  <h5 className="font-medium">Markdown Report</h5>
                  <p className="text-xs text-muted-foreground">Detailed report with all metrics and insights</p>
                </div>
              </button>

              <button
                onClick={() => downloadReport("csv")}
                disabled={loading === "report-csv"}
                className="flex items-center gap-3 rounded-xl border bg-white p-4 hover:border-purple-300 hover:bg-purple-50/50 transition-all text-left"
              >
                {loading === "report-csv" ? (
                  <Loader2 className="h-8 w-8 text-purple-500 animate-spin" />
                ) : (
                  <Download className="h-8 w-8 text-purple-500" />
                )}
                <div>
                  <h5 className="font-medium">CSV Export</h5>
                  <p className="text-xs text-muted-foreground">Raw data for spreadsheet analysis</p>
                </div>
              </button>
            </div>

            {reportGenerated && (
              <div className="flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-700">
                <CheckCircle2 className="h-4 w-4" />
                Report generated successfully
              </div>
            )}

            <div className="flex justify-between">
              <button
                onClick={() => setActiveStep("review")}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                ← Back
              </button>
              <button
                onClick={() => setActiveStep("decide")}
                className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 transition-colors"
              >
                Continue to Next Steps <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: Decide Next Steps ──────────────────────── */}
        {activeStep === "decide" && (
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <TrendingUp className="h-5 w-5 text-purple-600 mt-0.5" />
              <div>
                <h4 className="font-semibold">What Happens Next?</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Choose the best path forward based on campaign results.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                {
                  key: "extend",
                  icon: Calendar,
                  title: "Extend Campaign",
                  desc: "Continue reaching out to remaining contacts or add new segments",
                  color: "border-blue-200 hover:bg-blue-50/50",
                },
                {
                  key: "clone",
                  icon: RefreshCw,
                  title: "Run Again (Clone)",
                  desc: "Create a new campaign using the same template and settings",
                  color: "border-emerald-200 hover:bg-emerald-50/50",
                },
                {
                  key: "transition",
                  icon: ArrowRight,
                  title: "Transition to Next Package",
                  desc: "Recommend the client moves to the next package tier",
                  color: "border-purple-200 hover:bg-purple-50/50",
                },
                {
                  key: "archive",
                  icon: Shield,
                  title: "Archive Campaign",
                  desc: "Mark as complete and archive for records",
                  color: "border-gray-200 hover:bg-gray-50/50",
                },
              ].map((option) => (
                <button
                  key={option.key}
                  onClick={() => setSelectedAction(option.key)}
                  className={cn(
                    "flex items-start gap-3 rounded-xl border bg-white p-4 transition-all text-left",
                    option.color,
                    selectedAction === option.key && "ring-2 ring-purple-500 border-purple-300"
                  )}
                >
                  <option.icon className="h-5 w-5 text-purple-500 mt-0.5 shrink-0" />
                  <div>
                    <h5 className="font-medium">{option.title}</h5>
                    <p className="text-xs text-muted-foreground mt-1">{option.desc}</p>
                  </div>
                </button>
              ))}
            </div>

            {/* Extension Options */}
            {selectedAction === "extend" && (
              <div className="rounded-xl border bg-blue-50/50 p-4 space-y-3">
                <h5 className="font-medium text-sm">Extension Duration</h5>
                <div className="flex gap-2">
                  {[1, 2, 4].map((weeks) => (
                    <button
                      key={weeks}
                      onClick={() => setExtensionWeeks(weeks)}
                      className={cn(
                        "rounded-lg border px-4 py-2 text-sm font-medium transition-colors",
                        extensionWeeks === weeks
                          ? "border-blue-500 bg-blue-100 text-blue-700"
                          : "border-gray-200 bg-white hover:border-blue-300"
                      )}
                    >
                      {weeks} week{weeks > 1 ? "s" : ""}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Grace Period Toggle */}
            <button
              onClick={() => setShowGracePeriod(!showGracePeriod)}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {showGracePeriod ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              <Gift className="h-4 w-4" />
              Grace Period Options
            </button>

            {showGracePeriod && (
              <div className="rounded-xl border bg-yellow-50/50 p-4">
                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div>
                    <h5 className="font-medium text-sm">Grace Period</h5>
                    <p className="text-xs text-muted-foreground mt-1">
                      Allow the client continued access to campaign data and basic features
                      for a limited time after the package ends. This helps with smooth transitions.
                    </p>
                    <div className="flex gap-2 mt-3">
                      {["7 days", "14 days", "30 days"].map((period) => (
                        <span
                          key={period}
                          className="rounded-full border border-yellow-200 bg-yellow-100 px-3 py-1 text-xs font-medium text-yellow-700"
                        >
                          {period}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-between">
              <button
                onClick={() => setActiveStep("report")}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                ← Back
              </button>
              <button
                onClick={() => setActiveStep("execute")}
                disabled={!selectedAction}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                  selectedAction
                    ? "bg-purple-600 text-white hover:bg-purple-700"
                    : "bg-gray-200 text-gray-400 cursor-not-allowed"
                )}
              >
                Continue to Execute <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* ── Step 4: Execute ─────────────────────────────────── */}
        {activeStep === "execute" && (
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Zap className="h-5 w-5 text-purple-600 mt-0.5" />
              <div>
                <h4 className="font-semibold">Confirm Action</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  {selectedAction === "extend" && `Extend this campaign by ${extensionWeeks} week${extensionWeeks > 1 ? "s" : ""}.`}
                  {selectedAction === "clone" && "Create a new campaign using the same template and settings."}
                  {selectedAction === "transition" && "Save a transition recommendation for this client."}
                  {selectedAction === "archive" && "Archive this campaign. It will remain accessible in reports."}
                </p>
              </div>
            </div>

            {selectedAction === "transition" && (
              <div className="rounded-xl border bg-purple-50 p-4">
                <h5 className="font-medium text-sm mb-2">Transition Recommendation</h5>
                <p className="text-xs text-muted-foreground">
                  Based on campaign results, the system will generate a transition
                  recommendation for the client to move to the next package tier.
                  This will appear in their Package Progress dashboard.
                </p>
              </div>
            )}

            {selectedAction === "archive" && (
              <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <p className="text-sm text-yellow-700">
                    Archiving is permanent. The campaign data will be preserved but the campaign
                    cannot be reactivated.
                  </p>
                </div>
              </div>
            )}

            <div className="flex justify-between">
              <button
                onClick={() => setActiveStep("decide")}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                ← Back
              </button>
              <button
                onClick={() => selectedAction && executeCampaignAction(selectedAction)}
                disabled={!selectedAction || loading !== null}
                className="flex items-center gap-2 rounded-lg bg-purple-600 px-6 py-2 text-sm font-medium text-white hover:bg-purple-700 transition-colors disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                {selectedAction === "extend" ? `Extend ${extensionWeeks} Weeks` :
                 selectedAction === "clone" ? "Clone Campaign" :
                 selectedAction === "transition" ? "Save Recommendation" :
                 selectedAction === "archive" ? "Archive Campaign" :
                 "Execute"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
