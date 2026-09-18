"use client"

import React, { useCallback, useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import {
  Package, CheckCircle2, Clock, AlertTriangle, ArrowRight,
  ArrowLeft, Users, Rocket, Zap, Loader2, AlertCircle,
  Check, X, ChevronRight, Upload, MessageSquare, Settings,
} from "lucide-react"

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
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

interface PackageInitiationWizardProps {
  accounts: AccountSummary[]
  packages: PackageConfig[]
  onAssign: (accountId: string, packageId: string) => Promise<{ success?: boolean; error?: string }>
  actionLoading: boolean
  onComplete?: () => void
}

type WizardStep = "select_client" | "readiness" | "select_package" | "review" | "launching" | "done"

interface ReadinessCheck {
  key: string
  label: string
  description: string
  status: "green" | "amber" | "red"
  detail: string
}

const formatNaira = (n: number) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 0,
  }).format(n)

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */
export function PackageInitiationWizard({
  accounts,
  packages,
  onAssign,
  actionLoading,
  onComplete,
}: PackageInitiationWizardProps) {
  const [step, setStep] = useState<WizardStep>("select_client")
  const [selectedClient, setSelectedClient] = useState<string | null>(null)
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null)
  const [readiness, setReadiness] = useState<ReadinessCheck[]>([])
  const [launchProgress, setLaunchProgress] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")

  // Only show accounts without active packages
  const eligibleAccounts = accounts.filter((a) => !a.active_package)
  const filteredEligible = eligibleAccounts.filter((a) =>
    !searchQuery.trim() ||
    a.business_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.industry.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const activePackages = packages.filter((p) => p.is_active)
  const selectedClientData = accounts.find((a) => a.account_id === selectedClient)
  const selectedPkgData = packages.find((p) => p.id === selectedPackage)

  // Compute readiness when client is selected
  const computeReadiness = useCallback((acct: AccountSummary): ReadinessCheck[] => {
    const checks: ReadinessCheck[] = []

    // Contacts imported?
    checks.push({
      key: "contacts",
      label: "Contacts Imported",
      description: "At least 10 contacts in the system",
      status: acct.contact_count >= 10 ? "green" : acct.contact_count > 0 ? "amber" : "red",
      detail: `${acct.contact_count} contacts found`,
    })

    // Industry set?
    checks.push({
      key: "industry",
      label: "Industry Configured",
      description: "Business industry is set for workflow bundles",
      status: acct.industry && acct.industry !== "custom" && acct.industry !== "" ? "green" : "red",
      detail: acct.industry && acct.industry !== "custom" ? `Industry: ${acct.industry}` : "No industry set",
    })

    // Subscription tier?
    checks.push({
      key: "subscription",
      label: "Subscription Active",
      description: "Account has an active subscription tier",
      status: acct.subscription_tier && acct.subscription_tier !== "free" ? "green" : "amber",
      detail: `Tier: ${acct.subscription_tier || "none"}`,
    })

    // Campaigns ready?
    checks.push({
      key: "campaigns",
      label: "Campaign Infrastructure",
      description: "At least one campaign exists (draft or active)",
      status: acct.campaign_stats.total > 0 ? "green" : "amber",
      detail: `${acct.campaign_stats.total} campaigns (${acct.campaign_stats.active} active)`,
    })

    // Automations?
    checks.push({
      key: "automations",
      label: "Automations Configured",
      description: "At least one automation is set up",
      status: acct.automation_stats.total > 0 ? "green" : "amber",
      detail: `${acct.automation_stats.total} automations (${acct.automation_stats.active} active)`,
    })

    return checks
  }, [])

  // Handle client selection
  const handleSelectClient = useCallback(
    (accountId: string) => {
      setSelectedClient(accountId)
      const acct = accounts.find((a) => a.account_id === accountId)
      if (acct) {
        setReadiness(computeReadiness(acct))
      }
      setStep("readiness")
    },
    [accounts, computeReadiness]
  )

  // Handle launch
  const handleLaunch = useCallback(async () => {
    if (!selectedClient || !selectedPackage) return
    setStep("launching")
    setError(null)
    setLaunchProgress([])

    const addProgress = (msg: string) =>
      setLaunchProgress((prev) => [...prev, msg])

    try {
      addProgress("Creating milestones...")
      await new Promise((r) => setTimeout(r, 500))

      addProgress("Scheduling campaigns...")
      const result = await onAssign(selectedClient, selectedPackage)

      if (result.error) {
        setError(result.error)
        setStep("review")
        return
      }

      addProgress("Setting start date...")
      await new Promise((r) => setTimeout(r, 300))

      addProgress("Sending kickoff notification...")
      await new Promise((r) => setTimeout(r, 300))

      addProgress("Package launched successfully! ✓")
      setStep("done")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Launch failed")
      setStep("review")
    }
  }, [selectedClient, selectedPackage, onAssign])

  const steps: { key: WizardStep; label: string; num: number }[] = [
    { key: "select_client", label: "Select Client", num: 1 },
    { key: "readiness", label: "Readiness Check", num: 2 },
    { key: "select_package", label: "Select Package", num: 3 },
    { key: "review", label: "Review & Launch", num: 4 },
  ]

  const currentStepNum =
    step === "select_client" ? 1 :
    step === "readiness" ? 2 :
    step === "select_package" ? 3 :
    step === "review" || step === "launching" || step === "done" ? 4 : 1

  return (
    <div className="space-y-6">
      {/* Step Indicator */}
      <div className="flex items-center gap-2">
        {steps.map((s, i) => (
          <React.Fragment key={s.key}>
            <div
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                currentStepNum >= s.num
                  ? "bg-accent-500/10 text-accent-500"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {currentStepNum > s.num ? (
                <CheckCircle2 className="h-3.5 w-3.5" />
              ) : (
                <span className="h-4 w-4 rounded-full bg-current/20 flex items-center justify-center text-[10px]">
                  {s.num}
                </span>
              )}
              <span className="hidden sm:inline">{s.label}</span>
            </div>
            {i < steps.length - 1 && (
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Step 1: Select Client */}
      {step === "select_client" && (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Select Client</h3>
            <p className="text-sm text-muted-foreground">
              Choose a client account to initiate a package for.
              Only accounts without active packages are shown.
            </p>
          </div>

          {eligibleAccounts.length === 0 ? (
            <div className="text-center py-12 bg-card border border-border rounded-lg">
              <CheckCircle2 className="h-12 w-12 text-emerald-400 mx-auto mb-3" />
              <p className="text-foreground font-medium">All clients have active packages</p>
              <p className="text-sm text-muted-foreground mt-1">
                No accounts are available for package initiation.
              </p>
            </div>
          ) : (
            <>
              <div className="relative max-w-md">
                <input
                  type="text"
                  placeholder="Search clients..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-4 pr-4 py-2.5 text-sm bg-card border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-accent-500"
                />
              </div>
              <div className="grid gap-2">
                {filteredEligible.map((acct) => (
                  <button
                    key={acct.account_id}
                    onClick={() => handleSelectClient(acct.account_id)}
                    className="w-full text-left bg-card border border-border rounded-lg p-4 hover:border-accent-500/30 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold text-foreground">
                          {acct.business_name}
                        </h4>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {acct.industry} · {acct.contact_count} contacts ·
                          Tier: {acct.subscription_tier}
                        </p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Step 2: Readiness Check */}
      {step === "readiness" && selectedClientData && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-foreground">Readiness Check</h3>
              <p className="text-sm text-muted-foreground">
                Verifying {selectedClientData.business_name} is ready for package initiation.
              </p>
            </div>
            <button
              onClick={() => { setStep("select_client"); setSelectedClient(null) }}
              className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
          </div>

          <div className="bg-card border border-border rounded-lg divide-y divide-border">
            {readiness.map((check) => (
              <div key={check.key} className="flex items-center gap-4 p-4">
                <div
                  className={cn(
                    "h-8 w-8 rounded-full flex items-center justify-center shrink-0",
                    check.status === "green"
                      ? "bg-emerald-500/10 text-emerald-400"
                      : check.status === "amber"
                        ? "bg-amber-500/10 text-amber-400"
                        : "bg-red-500/10 text-red-400"
                  )}
                >
                  {check.status === "green" ? (
                    <Check className="h-4 w-4" />
                  ) : check.status === "amber" ? (
                    <AlertTriangle className="h-4 w-4" />
                  ) : (
                    <X className="h-4 w-4" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{check.label}</p>
                  <p className="text-xs text-muted-foreground">{check.description}</p>
                </div>
                <span
                  className={cn(
                    "text-xs font-medium",
                    check.status === "green"
                      ? "text-emerald-400"
                      : check.status === "amber"
                        ? "text-amber-400"
                        : "text-red-400"
                  )}
                >
                  {check.detail}
                </span>
              </div>
            ))}
          </div>

          {readiness.some((c) => c.status === "red") && (
            <div className="flex items-start gap-2 p-3 bg-red-500/5 border border-red-500/20 rounded-lg">
              <AlertCircle className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
              <p className="text-sm text-red-400">
                Some checks failed. You can still proceed, but the package may not perform optimally.
              </p>
            </div>
          )}

          <div className="flex justify-end">
            <button
              onClick={() => setStep("select_package")}
              className="px-6 py-2.5 rounded-lg font-medium text-sm bg-accent-500 text-foreground hover:bg-accent-600 transition-colors flex items-center gap-2"
            >
              Continue <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Select Package */}
      {step === "select_package" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-foreground">Select Package</h3>
              <p className="text-sm text-muted-foreground">
                Choose a package for {selectedClientData?.business_name}.
              </p>
            </div>
            <button
              onClick={() => setStep("readiness")}
              className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
          </div>

          <div className="grid gap-3">
            {activePackages.map((pkg) => (
              <button
                key={pkg.id}
                onClick={() => {
                  setSelectedPackage(pkg.id)
                  setStep("review")
                }}
                className={cn(
                  "w-full text-left bg-card border rounded-lg p-4 transition-colors",
                  selectedPackage === pkg.id
                    ? "border-accent-500 bg-accent-500/5"
                    : "border-border hover:border-accent-500/30"
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-foreground">{pkg.name}</h4>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                        Tier {pkg.tier}
                      </span>
                    </div>
                    {pkg.description && (
                      <p className="text-sm text-muted-foreground mt-1">{pkg.description}</p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {pkg.duration_weeks} weeks
                      </span>
                      <span className="flex items-center gap-1">
                        <Package className="h-3 w-3" /> {pkg.milestone_template.length} milestones
                      </span>
                      <span className="flex items-center gap-1">
                        <Rocket className="h-3 w-3" /> {pkg.campaign_slugs.length} campaigns
                      </span>
                      <span className="flex items-center gap-1">
                        <Zap className="h-3 w-3" /> {pkg.automation_types.length} automations
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-accent-500">
                      {formatNaira(pkg.price_naira)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Reports: {pkg.report_frequency}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 4: Review & Launch */}
      {step === "review" && selectedClientData && selectedPkgData && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-foreground">Review & Launch</h3>
              <p className="text-sm text-muted-foreground">
                Confirm the package assignment before launching.
              </p>
            </div>
            <button
              onClick={() => setStep("select_package")}
              className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-500/5 border border-red-500/20 rounded-lg">
              <AlertCircle className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <div className="bg-card border border-border rounded-lg p-4 space-y-4">
            {/* Client */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Client</p>
              <p className="text-sm font-semibold text-foreground">
                {selectedClientData.business_name}
              </p>
              <p className="text-xs text-muted-foreground">
                {selectedClientData.industry} · {selectedClientData.contact_count} contacts
              </p>
            </div>

            {/* Package */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Package</p>
              <p className="text-sm font-semibold text-foreground">
                {selectedPkgData.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatNaira(selectedPkgData.price_naira)} · {selectedPkgData.duration_weeks} weeks
              </p>
            </div>

            {/* What will be created */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">What will be created</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground">Milestones</p>
                  <p className="text-sm font-semibold text-foreground">
                    {selectedPkgData.milestone_template.length}
                  </p>
                </div>
                <div className="p-2 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground">Campaigns</p>
                  <p className="text-sm font-semibold text-foreground">
                    {selectedPkgData.campaign_slugs.length}
                  </p>
                </div>
                <div className="p-2 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground">Automations</p>
                  <p className="text-sm font-semibold text-foreground">
                    {selectedPkgData.automation_types.length}
                  </p>
                </div>
                <div className="p-2 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground">Flows</p>
                  <p className="text-sm font-semibold text-foreground">
                    {selectedPkgData.flow_types.length}
                  </p>
                </div>
              </div>
            </div>

            {/* Milestone Timeline */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Milestone Timeline</p>
              <div className="space-y-1">
                {selectedPkgData.milestone_template.map((ms, i) => (
                  <div key={i} className="flex items-center gap-3 text-xs">
                    <span className="text-muted-foreground w-16 shrink-0">
                      Week {ms.week}
                    </span>
                    <div className="h-2 w-2 rounded-full bg-accent-500 shrink-0" />
                    <span className="text-foreground">{ms.name}</span>
                    <span className="text-muted-foreground ml-auto">
                      {ms.deliverables.length} deliverables
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <button
            onClick={handleLaunch}
            disabled={actionLoading}
            className="w-full py-3 rounded-lg font-medium text-sm bg-accent-500 text-foreground hover:bg-accent-600 transition-colors flex items-center justify-center gap-2"
          >
            {actionLoading ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Launching...</>
            ) : (
              <><Rocket className="h-4 w-4" /> Launch Package</>
            )}
          </button>
        </div>
      )}

      {/* Launching Animation */}
      {step === "launching" && (
        <div className="bg-card border border-border rounded-lg p-8">
          <div className="text-center mb-6">
            <Loader2 className="h-10 w-10 animate-spin text-accent-500 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-foreground">Launching Package...</h3>
            <p className="text-sm text-muted-foreground">
              Setting up {selectedPkgData?.name} for {selectedClientData?.business_name}
            </p>
          </div>
          <div className="space-y-2 max-w-sm mx-auto">
            {launchProgress.map((msg, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                <span className="text-foreground">{msg}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Done */}
      {step === "done" && (
        <div className="bg-card border border-border rounded-lg p-8 text-center">
          <CheckCircle2 className="h-12 w-12 text-emerald-400 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-foreground">Package Launched!</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {selectedPkgData?.name} has been assigned to {selectedClientData?.business_name}.
            Milestones and campaigns are ready.
          </p>
          <div className="flex items-center justify-center gap-3 mt-6">
            <button
              onClick={() => {
                setStep("select_client")
                setSelectedClient(null)
                setSelectedPackage(null)
                setError(null)
              }}
              className="px-4 py-2 rounded-lg text-sm font-medium border border-border text-foreground hover:bg-muted transition-colors"
            >
              Initiate Another
            </button>
            <button
              onClick={() => onComplete?.()}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-accent-500 text-foreground hover:bg-accent-600 transition-colors"
            >
              View Package
            </button>
          </div>
          <div className="mt-4 space-y-1">
            {launchProgress.map((msg, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground justify-center">
                <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                <span>{msg}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
