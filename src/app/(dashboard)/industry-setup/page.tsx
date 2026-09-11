"use client"

import { useState } from "react"
import { toast } from "sonner"
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock,
  Factory,
  GitBranch,
  Loader2,
  Sparkles,
  Target,
  Workflow,
  XCircle,
  Zap,
} from "lucide-react"
import {
  getBundlesByIndustry,
  getAvailableIndustries,
} from "@/lib/bundles/registry"
import type { IndustryWorkflowBundle } from "@/lib/bundles/types"

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

type Step = "industry" | "preview" | "applying" | "complete"

// Utility
function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
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
  const [result, setResult] = useState<ApplyResult | null>(null)
  const [appliedBundles, setAppliedBundles] = useState<string[]>([])

  const industries = getAvailableIndustries()

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
    <div className="min-h-screen bg-neutral-950 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Factory className="h-7 w-7 text-primary" />
          <h1 className="text-2xl font-bold text-white">Industry Setup</h1>
        </div>
        <p className="text-neutral-400">
          Get started fast &mdash; pick your industry and we will set up
          pipelines, flows, automations, and segments tailored to your business.
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8 text-sm">
        <StepPill label="1. Industry" active={step === "industry"} done={step !== "industry"} />
        <ArrowRight className="h-4 w-4 text-neutral-600" />
        <StepPill label="2. Preview" active={step === "preview"} done={step === "applying" || step === "complete"} />
        <ArrowRight className="h-4 w-4 text-neutral-600" />
        <StepPill label="3. Apply" active={step === "applying" || step === "complete"} done={step === "complete"} />
      </div>

      {/* ---- Step 1: Industry Selection ---- */}
      {step === "industry" && (
        <div>
          <h2 className="text-lg font-semibold text-white mb-1">Select your industry</h2>
          <p className="text-neutral-500 text-sm mb-6">
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
                  className="group relative flex flex-col items-start gap-3 rounded-xl border border-neutral-800 bg-neutral-900 p-5 text-left transition-all hover:border-primary/50 hover:bg-neutral-800"
                >
                  {meta?.priority && (
                    <span className="absolute -top-2 -right-2 rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
                      Popular
                    </span>
                  )}
                  <span className="text-3xl">{meta?.icon ?? "📊"}</span>
                  <div>
                    <p className="font-semibold text-white group-hover:text-primary transition-colors">
                      {industry}
                    </p>
                    <p className="text-xs text-neutral-500 mt-1 line-clamp-2">
                      {meta?.description ?? "Industry workflow bundles"}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-neutral-500 mt-auto">
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
        </div>
      )}

      {/* ---- Step 2: Bundle Preview ---- */}
      {step === "preview" && selectedIndustry && (
        <div>
          <button
            type="button"
            onClick={() => { setStep("industry"); setSelectedIndustry(null) }}
            className="flex items-center gap-1 text-sm text-neutral-400 hover:text-white mb-6 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Back to industries
          </button>

          <h2 className="text-lg font-semibold text-white mb-1">
            {INDUSTRY_META[selectedIndustry]?.icon}{" "}
            {selectedIndustry} Workflow Bundles
          </h2>
          <p className="text-neutral-500 text-sm mb-6">
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
          <h2 className="text-lg font-semibold text-white mb-6 text-center">
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
            <h2 className="text-xl font-bold text-white mb-2">
              {result.bundleName} Applied!
            </h2>
            <p className="text-neutral-400">
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
          <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-5 mb-6">
            {result.created.pipeline && (
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-neutral-300 mb-2 flex items-center gap-2">
                  <GitBranch className="h-4 w-4 text-primary" /> Pipeline
                </h3>
                <a href="/pipelines" className="text-sm text-primary hover:underline">
                  {result.created.pipeline.name} ({result.created.pipeline.stageCount} stages)
                </a>
              </div>
            )}

            {result.created.flows.length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-neutral-300 mb-2 flex items-center gap-2">
                  <Workflow className="h-4 w-4 text-primary" /> Flows
                </h3>
                <ul className="space-y-1">
                  {result.created.flows.map((f) => (
                    <li key={f.id} className="text-sm text-neutral-400">
                      <a href="/flows" className="hover:text-primary transition-colors">{f.name}</a>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {result.created.automations.length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-neutral-300 mb-2 flex items-center gap-2">
                  <Zap className="h-4 w-4 text-primary" /> Automations
                </h3>
                <ul className="space-y-1">
                  {result.created.automations.map((a) => (
                    <li key={a.id} className="text-sm text-neutral-400">
                      <a href="/automations" className="hover:text-primary transition-colors">{a.name}</a>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {result.created.segments.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-neutral-300 mb-2 flex items-center gap-2">
                  <Target className="h-4 w-4 text-primary" /> Segments
                </h3>
                <ul className="space-y-1">
                  {result.created.segments.map((s) => (
                    <li key={s.id} className="text-sm text-neutral-400">
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
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
            >
              <GitBranch className="h-4 w-4" /> Go to Pipelines
            </a>
            <button
              type="button"
              onClick={() => { setStep("preview"); setResult(null) }}
              className="inline-flex items-center gap-2 rounded-lg border border-neutral-700 bg-neutral-900 px-5 py-2.5 text-sm font-medium text-neutral-300 hover:bg-neutral-800 transition-colors"
            >
              <Sparkles className="h-4 w-4" /> Apply Another Bundle
            </button>
            <button
              type="button"
              onClick={() => { setStep("industry"); setSelectedIndustry(null); setResult(null) }}
              className="inline-flex items-center gap-2 rounded-lg border border-neutral-700 bg-neutral-900 px-5 py-2.5 text-sm font-medium text-neutral-300 hover:bg-neutral-800 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" /> Choose Different Industry
            </button>
          </div>
        </div>
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
            : "bg-neutral-800 text-neutral-500"
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
    <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-6 flex flex-col">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <span className="text-2xl mr-2">{bundle.icon}</span>
          <h3 className="inline text-lg font-semibold text-white">{bundle.name}</h3>
          <span className="ml-2 rounded-full bg-neutral-800 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-neutral-400">
            {bundle.process}
          </span>
        </div>
        <span className="flex items-center gap-1 text-xs text-neutral-500 whitespace-nowrap">
          <Clock className="h-3 w-3" /> {bundle.setup_time_minutes}m
        </span>
      </div>

      <p className="text-sm text-neutral-400 mb-5">{bundle.description}</p>

      {/* Pipeline stages */}
      <div className="mb-4">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-2">
          Pipeline ({stageNames.length} stages)
        </h4>
        <div className="flex flex-wrap gap-1.5">
          {stageNames.map((name) => (
            <span key={name} className="rounded-md bg-neutral-800 px-2 py-0.5 text-xs text-neutral-300">
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
          <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-2">
            Customization Tips
          </h4>
          <ul className="space-y-1">
            {bundle.customization_hints.slice(0, 3).map((hint, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-neutral-400">
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
            className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
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
    <div className="flex items-center gap-2 rounded-lg bg-neutral-800/50 px-3 py-2">
      <span className="text-primary">{icon}</span>
      <div>
        <p className="text-sm font-semibold text-white">{count}</p>
        <p className="text-[10px] text-neutral-500">{label}</p>
      </div>
    </div>
  )
}

function ProgressRow({ label, status, icon }: { label: string; status: boolean | null; icon: React.ReactNode }) {
  return (
    <div className="flex items-center gap-4 rounded-lg border border-neutral-800 bg-neutral-900 px-5 py-4">
      <span className="text-neutral-500">{icon}</span>
      <span className="flex-1 text-sm font-medium text-white">{label}</span>
      {status === null && <span className="text-xs text-neutral-600">Waiting</span>}
      {status === false && <Loader2 className="h-5 w-5 text-primary animate-spin" />}
      {status === true && <CheckCircle2 className="h-5 w-5 text-emerald-500" />}
    </div>
  )
}

function SummaryCard({ label, value, detail, ok }: { label: string; value: number; detail: string; ok: boolean }) {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4 text-center">
      <p className={`text-2xl font-bold ${ok ? "text-white" : "text-neutral-600"}`}>{value}</p>
      <p className="text-xs font-medium text-neutral-400 mt-1">{label}</p>
      <p className="text-[10px] text-neutral-500">{detail}</p>
    </div>
  )
}
