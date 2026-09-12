"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock,
  ExternalLink,
  Factory,
  GitBranch,
  ListChecks,
  Loader2,
  Settings,
  Sparkles,
  Target,
  Workflow,
  XCircle,
  Zap,
} from "lucide-react"
import {
  getBundlesByIndustry,
  getBundleById,
  getAvailableIndustries,
} from "@/lib/bundles/registry"
import type { IndustryWorkflowBundle, SetupAction } from "@/lib/bundles/types"

// Industry metadata for the selection grid
const INDUSTRY_META: Record<
  string,
  { icon: string; description: string; priority: boolean }
> = {
  Retail: {
    icon: "🛒",
    description: "Product sales, inventory, and delivery tracking",
    priority: true,
  },
  "Real Estate": {
    icon: "🏠",
    description: "Property sales, tenant management, and viewings",
    priority: true,
  },
  Restaurant: {
    icon: "🍽️",
    description: "Orders, reservations, and catering management",
    priority: true,
  },
  "Professional Services": {
    icon: "💼",
    description: "Client engagements, proposals, and project delivery",
    priority: true,
  },
  Hotels: {
    icon: "🏨",
    description: "Reservations, guest services, and event bookings",
    priority: true,
  },
  Healthcare: {
    icon: "🏥",
    description: "Patient consultations and pharmacy dispensing",
    priority: false,
  },
  Agriculture: {
    icon: "🌾",
    description: "Farm produce sales and input procurement",
    priority: false,
  },
  Manufacturing: {
    icon: "🏭",
    description: "B2B sales and production order tracking",
    priority: false,
  },
  Logistics: {
    icon: "🚚",
    description: "Shipment tracking and claims management",
    priority: false,
  },
  Education: {
    icon: "🎓",
    description: "Student admissions and fee collection",
    priority: false,
  },
}
// Types
interface CreatedItem {
  id: string
  name: string
}

interface FailedItem {
  type: string
  slug: string
  error: string
}

interface ApplyResult {
  success: boolean
  bundleId: string
  bundleName: string
  created: {
    pipeline: { id: string; name: string; stageCount: number } | null
    flows: CreatedItem[]
    automations: CreatedItem[]
    segments: CreatedItem[]
  }
  failures?: FailedItem[]
}

type Step = "industry" | "preview" | "applying" | "complete" | "customize" | "custom"

// Utility
function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// ================================================================
// Setup Actions Components
// ================================================================

function ActionGroup({
  label,
  description,
  badgeClass,
  actions,
  completedActions,
  onToggleAction,
}: {
  label: string
  description: string
  badgeClass: string
  actions: SetupAction[]
  completedActions: string[]
  onToggleAction: (actionId: string) => void
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${badgeClass}`}>
          {label}
        </span>
        <span className="text-xs text-muted-foreground">{description}</span>
      </div>
      <div className="space-y-2">
        {actions.map((action) => {
          const isComplete = completedActions.includes(action.id)
          const url = action.target_params
            ? `${action.target_url}?${new URLSearchParams(action.target_params).toString()}`
            : action.target_url

          return (
            <div
              key={action.id}
              className={`rounded-xl border p-4 transition-all ${
                isComplete
                  ? "border-emerald-500/30 bg-emerald-500/5"
                  : "border-border bg-card hover:border-border"
              }`}
            >
              <div className="flex items-start gap-3">
                {/* Completion toggle */}
                <button
                  type="button"
                  onClick={() => onToggleAction(action.id)}
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors ${
                    isComplete
                      ? "border-emerald-500 bg-emerald-500 text-primary-foreground"
                      : "border-border hover:border-border"
                  }`}
                >
                  {isComplete && <Check className="h-3 w-3" />}
                </button>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {action.icon && <span className="text-base">{action.icon}</span>}
                    <h4 className={`text-sm font-medium ${isComplete ? "text-muted-foreground line-through" : "text-foreground"}`}>
                      {action.title}
                    </h4>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">{action.description}</p>
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Clock className="h-3 w-3" /> {action.estimated_minutes}min
                    </span>
                  </div>
                </div>

                {/* Configure button */}
                <a
                  href={url}
                  className={`shrink-0 inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                    isComplete
                      ? "border-border text-muted-foreground hover:text-muted-foreground"
                      : "border-primary/30 bg-primary/10 text-primary hover:bg-primary/20"
                  }`}
                >
                  Configure <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function SetupActionsPanel({
  bundle,
  completedActions,
  onToggleAction,
  onBack,
}: {
  bundle: IndustryWorkflowBundle
  completedActions: string[]
  onToggleAction: (actionId: string) => void
  onBack: () => void
}) {
  const actions = bundle.setup_actions || []
  const totalActions = actions.length
  const completedCount = completedActions.length
  const progressPercent = totalActions > 0 ? Math.round((completedCount / totalActions) * 100) : 0

  const essentialActions = actions.filter(a => a.priority === "essential")
  const recommendedActions = actions.filter(a => a.priority === "recommended")
  const optionalActions = actions.filter(a => a.priority === "optional")

  return (
    <div className="max-w-3xl mx-auto">
      <button
        type="button"
        onClick={onBack}
        className="mb-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Back to summary
      </button>

      <div className="mb-8">
        <h2 className="text-xl font-bold text-foreground mb-2 flex items-center gap-3">
          <span className="text-2xl">{bundle.icon}</span>
          Customize Your {bundle.name}
        </h2>
        <p className="text-muted-foreground text-sm mb-4">
          Complete these actions to get the most out of your setup. Click each action to go to the right page.
        </p>

        {/* Progress bar */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">
            {completedCount} of {totalActions} done
          </span>
        </div>
      </div>

      {/* Action groups */}
      <div className="space-y-8">
        {essentialActions.length > 0 && (
          <ActionGroup
            label="Essential"
            description="Must be configured for your setup to work properly"
            badgeClass="bg-red-500/10 text-red-400 border-red-500/30"
            actions={essentialActions}
            completedActions={completedActions}
            onToggleAction={onToggleAction}
          />
        )}
        {recommendedActions.length > 0 && (
          <ActionGroup
            label="Recommended"
            description="Significantly improves your workflow experience"
            badgeClass="bg-amber-500/10 text-amber-400 border-amber-500/30"
            actions={recommendedActions}
            completedActions={completedActions}
            onToggleAction={onToggleAction}
          />
        )}
        {optionalActions.length > 0 && (
          <ActionGroup
            label="Optional"
            description="Nice-to-have enhancements you can do later"
            badgeClass="bg-muted/50 text-muted-foreground border-border"
            actions={optionalActions}
            completedActions={completedActions}
            onToggleAction={onToggleAction}
          />
        )}
      </div>
    </div>
  )
}

// ================================================================
// Main Page Component
// ================================================================
export default function IndustrySetupPage() {
  const [step, setStep] = useState<Step>("industry")
  const [selectedIndustry, setSelectedIndustry] = useState<string | null>(null)
  const [applyingBundle, setApplyingBundle] = useState<string | null>(null)
  const [progress, setProgress] = useState<{
    pipeline: boolean | null
    flows: boolean | null
    automations: boolean | null
    segments: boolean | null
  }>({ pipeline: null, flows: null, automations: null, segments: null })
  const [customStages, setCustomStages] = useState<string[]>(["New Lead", "Contacted", "Qualified", "Proposal Sent", "Won"])
  const [customBusinessName, setCustomBusinessName] = useState("")
  const [result, setResult] = useState<ApplyResult | null>(null)
  const [appliedBundles, setAppliedBundles] = useState<string[]>([])
  const [completedActions, setCompletedActions] = useState<Record<string, string[]>>({})
  const [activeBundle, setActiveBundle] = useState<IndustryWorkflowBundle | null>(null)

  const industries = getAvailableIndustries()

  // Load completed actions and last bundle from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("industry-setup-progress")
      if (saved) setCompletedActions(JSON.parse(saved))

      // Check URL params for direct navigation
      const params = new URLSearchParams(window.location.search)
      const stepParam = params.get("step")
      const bundleParam = params.get("bundle")
      if (stepParam === "customize" && bundleParam) {
        const bundle = getBundleById(bundleParam)
        if (bundle) {
          setActiveBundle(bundle)
          setStep("customize")
        }
      } else if (stepParam === "customize") {
        // Try last applied bundle
        const lastBundle = localStorage.getItem("industry-setup-last-bundle")
        if (lastBundle) {
          const bundle = getBundleById(lastBundle)
          if (bundle) {
            setActiveBundle(bundle)
            setStep("customize")
          }
        }
      }
    } catch { /* silent */ }
  }, [])

  // Save completed actions to localStorage
  function toggleActionComplete(bundleId: string, actionId: string) {
    setCompletedActions(prev => {
      const bundleActions = prev[bundleId] || []
      const updated = bundleActions.includes(actionId)
        ? bundleActions.filter(id => id !== actionId)
        : [...bundleActions, actionId]
      const next = { ...prev, [bundleId]: updated }
      localStorage.setItem("industry-setup-progress", JSON.stringify(next))
      return next
    })
  }

  // Apply a bundle
  async function applyBundle(bundle: IndustryWorkflowBundle) {
    setApplyingBundle(bundle.id)
    setStep("applying")
    setProgress({ pipeline: null, flows: null, automations: null, segments: null })
    setResult(null)

    // Show pipeline spinner immediately
    setProgress((p) => ({ ...p, pipeline: false }))

    try {
      const res = await fetch("/api/bundles/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bundleId: bundle.id }),
      })

      const data = (await res.json()) as ApplyResult & { error?: string }

      if (!res.ok) {
        toast.error(data.error || "Failed to apply bundle")
        setStep("preview")
        setApplyingBundle(null)
        return
      }

      // Animate progress checkmarks
      setProgress((p) => ({ ...p, pipeline: true }))
      await delay(300)
      setProgress((p) => ({ ...p, flows: true }))
      await delay(300)
      setProgress((p) => ({ ...p, automations: true }))
      await delay(300)
      setProgress((p) => ({ ...p, segments: true }))
      await delay(400)

      setResult(data)
      setAppliedBundles((prev) => [...prev, bundle.id])
      setStep("complete")
      toast.success(`${bundle.name} applied successfully!`)
    } catch {
      toast.error("Network error. Please try again.")
      setStep("preview")
    } finally {
      setApplyingBundle(null)
    }
  }

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Factory className="h-7 w-7 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Industry Setup</h1>
        </div>
        <p className="text-muted-foreground">
          Get started fast &mdash; pick your industry and we will set up
          pipelines, flows, automations, and segments tailored to your business.
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8 text-sm">
        <StepPill label="1. Industry" active={step === "industry"} done={step !== "industry" && step !== "custom"} />
        <ArrowRight className="h-4 w-4 text-muted-foreground" />
        <StepPill label="2. Preview" active={step === "preview"} done={["applying", "complete", "customize"].includes(step)} />
        <ArrowRight className="h-4 w-4 text-muted-foreground" />
        <StepPill label="3. Apply" active={step === "applying" || step === "complete"} done={step === "complete" || step === "customize"} />
        {(step === "customize" || (step === "complete" && result?.success)) && (
          <>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <StepPill label="4. Customize" active={step === "customize"} done={false} />
          </>
        )}
      </div>

      {/* ---- Step 1: Industry Selection ---- */}
      {step === "industry" && (
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-1">Select your industry</h2>
          <p className="text-muted-foreground text-sm mb-6">
            Each industry includes two workflow bundles &mdash; one for sales and one for operations.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {industries.map((industry) => {
              const meta = INDUSTRY_META[industry]
              const bundles = getBundlesByIndustry(industry)
              const totalTime = bundles.reduce((s, b) => s + b.setup_time_minutes, 0)
              return (
                <button
                  key={industry}
                  type="button"
                  onClick={() => {
                    setSelectedIndustry(industry)
                    setStep("preview")
                  }}
                  className="group relative flex flex-col items-start gap-3 rounded-xl border border-border bg-card p-5 text-left transition-all hover:border-primary/50 hover:bg-muted"
                >
                  {meta?.priority && (
                    <span className="absolute -top-2 -right-2 rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
                      Popular
                    </span>
                  )}
                  <span className="text-3xl">{meta?.icon ?? "📊"}</span>
                  <div>
                    <p className="font-semibold text-foreground group-hover:text-primary transition-colors">
                      {industry}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {meta?.description ?? "Industry workflow bundles"}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-auto">
                    <span className="flex items-center gap-1">
                      <GitBranch className="h-3 w-3" /> {bundles.length} bundles
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {totalTime}m
                    </span>
                  </div>
                </button>
              )
            })}
          </div>

            {/* Custom / Other option */}
            <button
              type="button"
              onClick={() => setStep("custom")}
              className="group relative flex flex-col items-start gap-3 rounded-xl border border-dashed border-border bg-card/50 p-5 text-left transition-all hover:border-primary/50 hover:bg-muted"
            >
              <span className="text-3xl">⚙️</span>
              <div>
                <p className="font-semibold text-foreground group-hover:text-primary transition-colors">
                  Custom / Other
                </p>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  Set up your own pipeline stages for any business type
                </p>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-auto">
                <span className="flex items-center gap-1">
                  <Settings className="h-3 w-3" /> Manual setup
                </span>
              </div>
            </button>
        </div>
      )}

      {/* ---- Step: Custom Setup ---- */}
      {step === "custom" && (
        <div>
          <button
            type="button"
            onClick={() => setStep("industry")}
            className="mb-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Back to industries
          </button>

          <h2 className="text-lg font-semibold text-foreground mb-1">Custom Pipeline Setup</h2>
          <p className="text-muted-foreground text-sm mb-6">
            Define your own pipeline stages. You can always add flows, automations, and segments later.
          </p>

          <div className="space-y-4 max-w-lg">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Business Type (optional)</label>
              <input
                type="text"
                value={customBusinessName}
                onChange={(e) => setCustomBusinessName(e.target.value)}
                placeholder="e.g. Laundry Service, Car Wash, Event Planning..."
                className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">Pipeline Stages</label>
              <p className="text-xs text-muted-foreground mb-3">Drag to reorder, click × to remove, or add new stages below.</p>
              <div className="space-y-2">
                {customStages.map((stage, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-6 text-center">{i + 1}</span>
                    <input
                      type="text"
                      value={stage}
                      onChange={(e) => {
                        const updated = [...customStages]
                        updated[i] = e.target.value
                        setCustomStages(updated)
                      }}
                      className="flex-1 rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                    />
                    {customStages.length > 2 && (
                      <button
                        type="button"
                        onClick={() => setCustomStages(customStages.filter((_, j) => j !== i))}
                        className="text-muted-foreground hover:text-red-400 transition-colors"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {customStages.length < 10 && (
                <button
                  type="button"
                  onClick={() => setCustomStages([...customStages, ""])}
                  className="mt-2 text-sm text-primary hover:text-primary/80 transition-colors"
                >
                  + Add stage
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={async () => {
                setStep("applying")
                try {
                  const stages = customStages.filter(s => s.trim())
                  if (stages.length < 2) {
                    setResult({ success: false, errors: ["Need at least 2 pipeline stages"], created: { pipelines: 0, flows: 0, automations: 0, segments: 0 } })
                    setStep("complete")
                    return
                  }
                  const resp = await fetch("/api/pipelines", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      name: customBusinessName || "Custom Pipeline",
                      stages: stages.map((name, i) => ({ name, position: i }))
                    })
                  })
                  if (!resp.ok) throw new Error("Failed to create pipeline")
                  setResult({ success: true, errors: [], created: { pipelines: 1, flows: 0, automations: 0, segments: 0 } })
                } catch (err) {
                  setResult({ success: false, errors: [err instanceof Error ? err.message : "Unknown error"], created: { pipelines: 0, flows: 0, automations: 0, segments: 0 } })
                }
                setStep("complete")
              }}
              disabled={customStages.filter(s => s.trim()).length < 2}
              className="w-full rounded-lg bg-primary px-4 py-3 font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Create Custom Pipeline
            </button>
          </div>
        </div>
      )}

      {/* ---- Step 2: Bundle Preview ---- */}
      {step === "preview" && selectedIndustry && (
        <div>
          <button
            type="button"
            onClick={() => { setStep("industry"); setSelectedIndustry(null) }}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Back to industries
          </button>

          <h2 className="text-lg font-semibold text-foreground mb-1">
            {INDUSTRY_META[selectedIndustry]?.icon}{" "}
            {selectedIndustry} Workflow Bundles
          </h2>
          <p className="text-muted-foreground text-sm mb-6">
            Review what will be created, then apply one or both bundles.
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {getBundlesByIndustry(selectedIndustry).map((bundle) => (
              <BundleCard
                key={bundle.id}
                bundle={bundle}
                applied={appliedBundles.includes(bundle.id)}
                onApply={() => applyBundle(bundle)}
              />
            ))}
          </div>
        </div>
      )}

      {/* ---- Step 3: Applying ---- */}
      {step === "applying" && (
        <div className="max-w-lg mx-auto">
          <h2 className="text-lg font-semibold text-foreground mb-6 text-center">
            Setting up your workspace&hellip;
          </h2>
          <div className="space-y-4">
            <ProgressRow label="Pipeline & Stages" status={progress.pipeline} icon={<GitBranch className="h-5 w-5" />} />
            <ProgressRow label="Conversation Flows" status={progress.flows} icon={<Workflow className="h-5 w-5" />} />
            <ProgressRow label="Automations" status={progress.automations} icon={<Zap className="h-5 w-5" />} />
            <ProgressRow label="Segments" status={progress.segments} icon={<Target className="h-5 w-5" />} />
          </div>
        </div>
      )}
      {/* ---- Step 4: Complete ---- */}
      {step === "complete" && result && (
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <CheckCircle2 className="h-16 w-16 text-emerald-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-foreground mb-2">
              {result.bundleName} Applied!
            </h2>
            <p className="text-muted-foreground">
              Your workspace is ready. Here is what was created:
            </p>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            <SummaryCard
              label="Pipeline"
              value={result.created.pipeline ? 1 : 0}
              detail={result.created.pipeline ? `${result.created.pipeline.stageCount} stages` : "Failed"}
              ok={!!result.created.pipeline}
            />
            <SummaryCard label="Flows" value={result.created.flows.length} detail="created" ok={result.created.flows.length > 0} />
            <SummaryCard label="Automations" value={result.created.automations.length} detail="created" ok={result.created.automations.length > 0} />
            <SummaryCard label="Segments" value={result.created.segments.length} detail="created" ok={result.created.segments.length > 0} />
          </div>

          {/* Created items list */}
          <div className="rounded-xl border border-border bg-card p-5 mb-6">
            {result.created.pipeline && (
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2">
                  <GitBranch className="h-4 w-4 text-primary" /> Pipeline
                </h3>
                <a href="/pipelines" className="text-sm text-primary hover:underline">
                  {result.created.pipeline.name} ({result.created.pipeline.stageCount} stages)
                </a>
              </div>
            )}

            {result.created.flows.length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2">
                  <Workflow className="h-4 w-4 text-primary" /> Flows
                </h3>
                <ul className="space-y-1">
                  {result.created.flows.map((f) => (
                    <li key={f.id} className="text-sm text-muted-foreground">
                      <a href="/flows" className="hover:text-primary transition-colors">{f.name}</a>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {result.created.automations.length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2">
                  <Zap className="h-4 w-4 text-primary" /> Automations
                </h3>
                <ul className="space-y-1">
                  {result.created.automations.map((a) => (
                    <li key={a.id} className="text-sm text-muted-foreground">
                      <a href="/automations" className="hover:text-primary transition-colors">{a.name}</a>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {result.created.segments.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2">
                  <Target className="h-4 w-4 text-primary" /> Segments
                </h3>
                <ul className="space-y-1">
                  {result.created.segments.map((s) => (
                    <li key={s.id} className="text-sm text-muted-foreground">
                      <a href="/segments" className="hover:text-primary transition-colors">{s.name}</a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Failures */}
          {result.failures && result.failures.length > 0 && (
            <div className="rounded-xl border border-amber-900/50 bg-amber-950/30 p-4 mb-6">
              <h3 className="text-sm font-semibold text-amber-400 mb-2 flex items-center gap-2">
                <XCircle className="h-4 w-4" /> Some items could not be created
              </h3>
              <ul className="space-y-1">
                {result.failures.map((f, i) => (
                  <li key={i} className="text-xs text-amber-300/70">
                    {f.type}: {f.slug} &mdash; {f.error}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            <a
              href="/pipelines"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <GitBranch className="h-4 w-4" /> Go to Pipelines
            </a>
            <button
              type="button"
              onClick={() => { setStep("preview"); setResult(null) }}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-5 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
            >
              <Sparkles className="h-4 w-4" /> Apply Another Bundle
            </button>
            <button
              type="button"
              onClick={() => { setStep("industry"); setSelectedIndustry(null); setResult(null) }}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-5 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
            >
              <ArrowLeft className="h-4 w-4" /> Choose Different Industry
            </button>
            {result && result.success && (() => {
              const bundle = getBundleById(result.bundleId)
              if (!bundle || !bundle.setup_actions || bundle.setup_actions.length === 0) return null
              return (
                <button
                  type="button"
                  onClick={() => {
                    setActiveBundle(bundle)
                    localStorage.setItem("industry-setup-last-bundle", bundle.id)
                    setStep("customize")
                  }}
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-emerald-500 transition-colors"
                >
                  <ListChecks className="h-4 w-4" /> Customize Your Setup →
                </button>
              )
            })()}
          </div>
        </div>
      )}

      {/* ---- Step: Customize Your Setup ---- */}
      {step === "customize" && activeBundle && (
        <SetupActionsPanel
          bundle={activeBundle}
          completedActions={completedActions[activeBundle.id] || []}
          onToggleAction={(actionId) => toggleActionComplete(activeBundle.id, actionId)}
          onBack={() => {
            if (result) {
              setStep("complete")
            } else {
              setStep("industry")
              setSelectedIndustry(null)
            }
          }}
        />
      )}
    </div>
  )
}

// ================================================================
// Sub-components
// ================================================================

function StepPill({ label, active, done }: { label: string; active: boolean; done: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
        done
          ? "bg-emerald-500/10 text-emerald-400"
          : active
            ? "bg-primary/10 text-primary"
            : "bg-muted text-muted-foreground"
      }`}
    >
      {done && <Check className="h-3 w-3" />}
      {label}
    </span>
  )
}

function BundleCard({
  bundle,
  applied,
  onApply,
}: {
  bundle: IndustryWorkflowBundle
  applied: boolean
  onApply: () => void
}) {
  const stageNames = bundle.pipeline.stages.map((s) => s.name)

  return (
    <div className="rounded-xl border border-border bg-card p-6 flex flex-col">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <span className="text-2xl mr-2">{bundle.icon}</span>
          <h3 className="inline text-lg font-semibold text-foreground">{bundle.name}</h3>
          <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            {bundle.process}
          </span>
        </div>
        <span className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap">
          <Clock className="h-3 w-3" /> {bundle.setup_time_minutes}m
        </span>
      </div>

      <p className="text-sm text-muted-foreground mb-5">{bundle.description}</p>

      {/* Pipeline stages */}
      <div className="mb-4">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
          Pipeline ({stageNames.length} stages)
        </h4>
        <div className="flex flex-wrap gap-1.5">
          {stageNames.map((name) => (
            <span key={name} className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              {name}
            </span>
          ))}
        </div>
      </div>

      {/* Counts */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <CountBadge icon={<Workflow className="h-3.5 w-3.5" />} count={bundle.suggested_flows.length} label="Flows" />
        <CountBadge icon={<Zap className="h-3.5 w-3.5" />} count={bundle.suggested_automations.length} label="Automations" />
        <CountBadge icon={<Target className="h-3.5 w-3.5" />} count={bundle.suggested_segments.length} label="Segments" />
      </div>

      {/* Customization hints */}
      {bundle.customization_hints.length > 0 && (
        <div className="mb-5">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Customization Tips
          </h4>
          <ul className="space-y-1">
            {bundle.customization_hints.slice(0, 3).map((hint, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                <Sparkles className="h-3 w-3 text-primary mt-0.5 shrink-0" />
                {hint}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Apply button */}
      <div className="mt-auto">
        {applied ? (
          <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 px-4 py-2.5 text-sm font-medium text-emerald-400">
            <CheckCircle2 className="h-4 w-4" /> Applied
          </div>
        ) : (
          <button
            type="button"
            onClick={onApply}
            className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
          >
            <Sparkles className="h-4 w-4" /> Apply This Bundle
          </button>
        )}
      </div>
    </div>
  )
}

function CountBadge({ icon, count, label }: { icon: React.ReactNode; count: number; label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2">
      <span className="text-primary">{icon}</span>
      <div>
        <p className="text-sm font-semibold text-foreground">{count}</p>
        <p className="text-[10px] text-muted-foreground">{label}</p>
      </div>
    </div>
  )
}

function ProgressRow({ label, status, icon }: { label: string; status: boolean | null; icon: React.ReactNode }) {
  return (
    <div className="flex items-center gap-4 rounded-lg border border-border bg-card px-5 py-4">
      <span className="text-muted-foreground">{icon}</span>
      <span className="flex-1 text-sm font-medium text-foreground">{label}</span>
      {status === null && <span className="text-xs text-muted-foreground">Waiting</span>}
      {status === false && <Loader2 className="h-5 w-5 text-primary animate-spin" />}
      {status === true && <CheckCircle2 className="h-5 w-5 text-emerald-500" />}
    </div>
  )
}

function SummaryCard({ label, value, detail, ok }: { label: string; value: number; detail: string; ok: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 text-center">
      <p className={`text-2xl font-bold ${ok ? "text-foreground" : "text-muted-foreground"}`}>{value}</p>
      <p className="text-xs font-medium text-muted-foreground mt-1">{label}</p>
      <p className="text-[10px] text-muted-foreground">{detail}</p>
    </div>
  )
}
