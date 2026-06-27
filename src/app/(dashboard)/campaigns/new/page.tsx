"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  ArrowLeft,
  Check,
  Loader2,
} from "lucide-react"

import { Step1Analyze } from "@/components/campaigns/step1-analyze"
import { Step2Template } from "@/components/campaigns/step2-template"
import { Step3Audience } from "@/components/campaigns/step3-audience"
import { Step4Customize } from "@/components/campaigns/step4-customize"
import { Step5Schedule } from "@/components/campaigns/step5-schedule"
import { Step6Review } from "@/components/campaigns/step6-review"

import type {
  CampaignTemplate,
  CampaignWizardState,
  CampaignMessageTemplate,
  CampaignSequenceStep,
  CampaignAudienceFilter,
  DatabaseAnalysis,
  DatabaseAnalysisRecommendation,
  WizardStep,
} from "@/types/campaigns"

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STEPS = [
  { label: "Analyze", key: "analyze" as WizardStep },
  { label: "Template", key: "select" as WizardStep },
  { label: "Audience", key: "audience" as WizardStep },
  { label: "Customize", key: "customize" as WizardStep },
  { label: "Schedule", key: "schedule" as WizardStep },
  { label: "Review", key: "review" as WizardStep },
] as const

const STEP_INDEX: Record<WizardStep, number> = {
  analyze: 0,
  select: 1,
  audience: 2,
  customize: 3,
  schedule: 4,
  review: 5,
}

const DEFAULT_STATE: CampaignWizardState = {
  step: "analyze",
  analysis: null,
  selectedTemplate: null,
  customizedMessages: [],
  audienceFilter: {},
  audienceCount: 0,
  channel: "whatsapp",
  scheduledAt: null,
  campaignName: "",
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function NewCampaignPage() {
  const router = useRouter()
  const { user } = useAuth()

  // -----------------------------------------------------------------------
  // State
  // -----------------------------------------------------------------------

  const [wizardState, setWizardState] = useState<CampaignWizardState>(DEFAULT_STATE)
  const [templates, setTemplates] = useState<CampaignTemplate[]>([])
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isLaunching, setIsLaunching] = useState(false)
  const [templatesLoaded, setTemplatesLoaded] = useState(false)

  const currentStepIndex = STEP_INDEX[wizardState.step]

  // -----------------------------------------------------------------------
  // API: Fetch templates
  // -----------------------------------------------------------------------

  useEffect(() => {
    async function loadTemplates() {
      try {
        const res = await fetch("/api/campaigns/templates")
        if (!res.ok) throw new Error("Failed to load templates")
        const data = await res.json()
        setTemplates(data.templates ?? [])
      } catch (err) {
        toast.error("Failed to load campaign templates")
      } finally {
        setTemplatesLoaded(true)
      }
    }
    loadTemplates()
  }, [])

  // -----------------------------------------------------------------------
  // API: Analyze database
  // -----------------------------------------------------------------------

  const handleAnalyze = useCallback(async () => {
    try {
      setIsAnalyzing(true)
      const res = await fetch("/api/campaigns/analyze", { method: "POST" })
      if (!res.ok) throw new Error("Analysis failed")
      const data = await res.json()
      setWizardState((prev) => ({ ...prev, analysis: data.analysis }))
      toast.success("Database analysis complete")
    } catch (err) {
      toast.error("Failed to analyze database")
    } finally {
      setIsAnalyzing(false)
    }
  }, [])

  // -----------------------------------------------------------------------
  // Audience count estimation
  // -----------------------------------------------------------------------

  const audienceCount = useMemo(() => {
    const analysis = wizardState.analysis
    if (!analysis) return 0

    const filter = wizardState.audienceFilter
    const segment = filter.segment

    if (!segment || segment === "all") {
      return analysis.total_contacts
    }

    if (segment === "active") return analysis.segments.active.count
    if (segment === "at_risk") return analysis.segments.at_risk.count
    if (segment === "dormant") return analysis.segments.dormant.count

    // Custom or unknown segment: estimate from total
    return Math.round(analysis.total_contacts * 0.3)
  }, [wizardState.analysis, wizardState.audienceFilter])

  // -----------------------------------------------------------------------
  // Recommendations
  // -----------------------------------------------------------------------

  const recommendations = useMemo((): DatabaseAnalysisRecommendation[] => {
    if (!wizardState.analysis?.recommendations) return []
    return wizardState.analysis.recommendations.filter(
      (r): r is DatabaseAnalysisRecommendation => r !== null
    )
  }, [wizardState.analysis])

  // -----------------------------------------------------------------------
  // Navigation
  // -----------------------------------------------------------------------

  const goToStep = useCallback((step: WizardStep) => {
    setWizardState((prev) => ({ ...prev, step }))
  }, [])

  const goNext = useCallback(() => {
    const nextIndex = currentStepIndex + 1
    if (nextIndex < STEPS.length) {
      goToStep(STEPS[nextIndex].key)
    }
  }, [currentStepIndex, goToStep])

  const goBack = useCallback(() => {
    const prevIndex = currentStepIndex - 1
    if (prevIndex >= 0) {
      goToStep(STEPS[prevIndex].key)
    }
  }, [currentStepIndex, goToStep])

  // -----------------------------------------------------------------------
  // Template selection
  // -----------------------------------------------------------------------

  const handleTemplateSelect = useCallback((template: CampaignTemplate) => {
    setWizardState((prev) => ({
      ...prev,
      selectedTemplate: template,
      customizedMessages: [...template.message_templates],
      audienceFilter: { ...template.audience_filter },
      channel: template.default_channel,
      campaignName: template.name,
    }))
  }, [])

  // -----------------------------------------------------------------------
  // Audience filter update
  // -----------------------------------------------------------------------

  const handleAudienceUpdate = useCallback(
    (filter: CampaignAudienceFilter) => {
      setWizardState((prev) => ({ ...prev, audienceFilter: filter }))
    },
    []
  )

  // -----------------------------------------------------------------------
  // Messages update
  // -----------------------------------------------------------------------

  const handleMessagesUpdate = useCallback(
    (messages: CampaignMessageTemplate[]) => {
      setWizardState((prev) => ({ ...prev, customizedMessages: messages }))
    },
    []
  )

  // -----------------------------------------------------------------------
  // Schedule / name / channel
  // -----------------------------------------------------------------------

  const handleScheduleChange = useCallback((date: string | null) => {
    setWizardState((prev) => ({ ...prev, scheduledAt: date }))
  }, [])

  const handleNameChange = useCallback((name: string) => {
    setWizardState((prev) => ({ ...prev, campaignName: name }))
  }, [])

  const handleChannelChange = useCallback(
    (ch: "whatsapp" | "email" | "sms" | "auto") => {
      setWizardState((prev) => ({ ...prev, channel: ch }))
    },
    []
  )

  // -----------------------------------------------------------------------
  // Create campaign helper
  // -----------------------------------------------------------------------

  const createCampaign = useCallback(
    async (launch: boolean) => {
      const body = {
        template_id: wizardState.selectedTemplate?.id ?? null,
        name: wizardState.campaignName || "Untitled Campaign",
        description: wizardState.selectedTemplate?.description ?? null,
        channel: wizardState.channel,
        message_templates: wizardState.customizedMessages,
        sequence_steps: wizardState.selectedTemplate?.sequence_steps ?? [],
        audience_filter: wizardState.audienceFilter,
        scheduled_at: wizardState.scheduledAt,
        total_audience: audienceCount,
      }

      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || "Failed to create campaign")
      }

      const data = await res.json()
      return data.campaign
    },
    [wizardState, audienceCount]
  )

  // -----------------------------------------------------------------------
  // Launch
  // -----------------------------------------------------------------------

  const handleLaunch = useCallback(async () => {
    try {
      setIsLaunching(true)
      const campaign = await createCampaign(true)

      // Launch it
      const launchRes = await fetch(`/api/campaigns/${campaign.id}/launch`, {
        method: "POST",
      })

      if (!launchRes.ok) {
        throw new Error("Failed to launch campaign")
      }

      toast.success("Campaign launched successfully!")
      router.push(`/campaigns/${campaign.id}`)
    } catch (err: any) {
      toast.error(err.message || "Failed to launch campaign")
    } finally {
      setIsLaunching(false)
    }
  }, [createCampaign, router])

  // -----------------------------------------------------------------------
  // Save draft
  // -----------------------------------------------------------------------

  const handleSaveDraft = useCallback(async () => {
    try {
      setIsLaunching(true)
      await createCampaign(false)
      toast.success("Campaign saved as draft")
      router.push("/campaigns")
    } catch (err: any) {
      toast.error(err.message || "Failed to save draft")
    } finally {
      setIsLaunching(false)
    }
  }, [createCampaign, router])

  // -----------------------------------------------------------------------
  // Wizard state with audience count
  // -----------------------------------------------------------------------

  const fullWizardState: CampaignWizardState = useMemo(
    () => ({ ...wizardState, audienceCount }),
    [wizardState, audienceCount]
  )

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Back link */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.push("/campaigns")}
        className="gap-2 text-muted-foreground hover:text-foreground -ml-2"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Campaigns
      </Button>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Create Campaign</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Follow the steps below to build and launch your campaign.
        </p>
      </div>

      {/* Step indicator */}
      <Card>
        <CardContent className="py-4 px-4 sm:px-6">
          <div className="flex items-center">
            {STEPS.map((step, index) => {
              const isActive = index === currentStepIndex
              const isCompleted = index < currentStepIndex
              return (
                <div key={step.key} className="flex flex-1 items-center">
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium transition-all",
                        isCompleted
                          ? "bg-primary text-primary-foreground"
                          : isActive
                          ? "border-2 border-primary bg-primary/10 text-primary"
                          : "border border-border bg-muted text-muted-foreground"
                      )}
                    >
                      {isCompleted ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        index + 1
                      )}
                    </div>
                    <span
                      className={cn(
                        "hidden text-sm font-medium sm:block",
                        isActive
                          ? "text-foreground"
                          : isCompleted
                          ? "text-primary"
                          : "text-muted-foreground"
                      )}
                    >
                      {step.label}
                    </span>
                  </div>
                  {index < STEPS.length - 1 && (
                    <div
                      className={cn(
                        "mx-3 h-px flex-1",
                        index < currentStepIndex ? "bg-primary" : "bg-muted"
                      )}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Step content */}
      <div className="min-h-[400px]">
        {wizardState.step === "analyze" && (
          <Step1Analyze
            onNext={goNext}
            onBack={() => router.push("/campaigns")}
            analysis={wizardState.analysis}
            onAnalyze={handleAnalyze}
            isAnalyzing={isAnalyzing}
          />
        )}

        {wizardState.step === "select" && (
          <Step2Template
            templates={templates}
            selectedTemplate={wizardState.selectedTemplate}
            onSelect={handleTemplateSelect}
            onNext={goNext}
            onBack={goBack}
            recommendations={recommendations}
          />
        )}

        {wizardState.step === "audience" && wizardState.selectedTemplate && (
          <Step3Audience
            template={wizardState.selectedTemplate}
            analysis={wizardState.analysis}
            audienceFilter={wizardState.audienceFilter}
            onUpdate={handleAudienceUpdate}
            audienceCount={audienceCount}
            onNext={goNext}
            onBack={goBack}
          />
        )}

        {wizardState.step === "customize" && (
          <Step4Customize
            messages={wizardState.customizedMessages}
            sequenceSteps={
              wizardState.selectedTemplate?.sequence_steps ?? []
            }
            onUpdate={handleMessagesUpdate}
            onNext={goNext}
            onBack={goBack}
          />
        )}

        {wizardState.step === "schedule" && (
          <Step5Schedule
            scheduledAt={wizardState.scheduledAt}
            onScheduleChange={handleScheduleChange}
            campaignName={wizardState.campaignName}
            onNameChange={handleNameChange}
            channel={wizardState.channel}
            onChannelChange={handleChannelChange}
            sequenceSteps={
              wizardState.selectedTemplate?.sequence_steps ?? []
            }
            messages={wizardState.customizedMessages}
            onNext={goNext}
            onBack={goBack}
          />
        )}

        {wizardState.step === "review" && (
          <Step6Review
            wizardState={fullWizardState}
            onLaunch={handleLaunch}
            onSaveDraft={handleSaveDraft}
            onBack={goBack}
            isLaunching={isLaunching}
          />
        )}
      </div>
    </div>
  )
}
