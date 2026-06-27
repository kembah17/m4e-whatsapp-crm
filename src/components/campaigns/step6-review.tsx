"use client"

import { useState } from "react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  ArrowLeft,
  Rocket,
  Save,
  Loader2,
  LayoutTemplate,
  Users,
  MessageSquare,
  Zap,
  Calendar,
  GitBranch,
  MessageCircle,
  Mail,
  Smartphone,
  Wand2,
  BarChart3,
  DollarSign,
  Target,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { formatCurrency } from "@/lib/currency"
import type {
  CampaignWizardState,
  CampaignCategory,
} from "@/types/campaigns"

interface Step6ReviewProps {
  wizardState: CampaignWizardState
  onLaunch: () => Promise<void>
  onSaveDraft: () => Promise<void>
  onBack: () => void
  isLaunching: boolean
}

const CATEGORY_LABELS: Record<CampaignCategory, string> = {
  reactivation: "Reactivation",
  cart_recovery: "Cart Recovery",
  post_purchase: "Post Purchase",
  lifecycle: "Lifecycle",
  engagement: "Engagement",
  revenue: "Revenue",
  feedback: "Feedback",
}

const CATEGORY_COLORS: Record<CampaignCategory, string> = {
  reactivation: "bg-orange-100 text-orange-700 border-orange-200",
  cart_recovery: "bg-red-100 text-red-700 border-red-200",
  post_purchase: "bg-blue-100 text-blue-700 border-blue-200",
  lifecycle: "bg-purple-100 text-purple-700 border-purple-200",
  engagement: "bg-emerald-100 text-emerald-700 border-emerald-200",
  revenue: "bg-amber-100 text-amber-700 border-amber-200",
  feedback: "bg-cyan-100 text-cyan-700 border-cyan-200",
}

interface ChannelConfig {
  label: string
  icon: React.ReactNode
  color: string
  bgColor: string
}

const CHANNEL_CONFIG: Record<string, ChannelConfig> = {
  whatsapp: {
    label: "WhatsApp",
    icon: <MessageCircle className="h-5 w-5" />,
    color: "text-emerald-700",
    bgColor: "bg-emerald-50",
  },
  email: {
    label: "Email",
    icon: <Mail className="h-5 w-5" />,
    color: "text-blue-700",
    bgColor: "bg-blue-50",
  },
  sms: {
    label: "SMS",
    icon: <Smartphone className="h-5 w-5" />,
    color: "text-orange-700",
    bgColor: "bg-orange-50",
  },
  auto: {
    label: "Auto (AI-selected)",
    icon: <Wand2 className="h-5 w-5" />,
    color: "text-purple-700",
    bgColor: "bg-purple-50",
  },
}

interface CircularProgressProps {
  value: number
  label: string
  sublabel: string
  color: string
}

function CircularProgress({ value, label, sublabel, color }: CircularProgressProps) {
  const radius = 40
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (value / 100) * circumference

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-24 h-24">
        <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
          {/* Background circle */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke="#f3f4f6"
            strokeWidth="8"
          />
          {/* Progress circle */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            style={{
              transition: "stroke-dashoffset 1s ease-in-out",
            }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-bold text-gray-900">
            {value > 0 ? `${value.toFixed(0)}%` : "—"}
          </span>
        </div>
      </div>
      <p className="text-sm font-semibold text-gray-700 mt-2">{label}</p>
      <p className="text-[11px] text-gray-500 text-center leading-tight mt-0.5">
        {sublabel}
      </p>
    </div>
  )
}

function getScheduleLabel(state: CampaignWizardState): {
  label: string
  detail: string
  icon: React.ReactNode
} {
  if (state.scheduledAt) {
    const date = new Date(state.scheduledAt)
    return {
      label: "Scheduled",
      detail: date.toLocaleString(undefined, {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }),
      icon: <Calendar className="h-5 w-5 text-amber-600" />,
    }
  }

  const hasMultipleSteps =
    state.selectedTemplate?.sequence_steps &&
    state.selectedTemplate.sequence_steps.length > 1

  if (hasMultipleSteps) {
    return {
      label: "Drip Campaign",
      detail: `${state.selectedTemplate!.sequence_steps.length} messages in sequence`,
      icon: <GitBranch className="h-5 w-5 text-amber-600" />,
    }
  }

  return {
    label: "Send Immediately",
    detail: "Campaign starts right after launch",
    icon: <Zap className="h-5 w-5 text-amber-600" />,
  }
}

function buildAudienceDescription(state: CampaignWizardState): string {
  const parts: string[] = []
  const filter = state.audienceFilter

  if (filter.segment) {
    const segmentLabels: Record<string, string> = {
      active: "Active customers",
      at_risk: "At-risk customers",
      dormant: "Dormant customers",
      all: "All contacts",
    }
    parts.push(segmentLabels[filter.segment] ?? filter.segment)
  }
  if (filter.min_days_inactive) {
    parts.push(`inactive ${filter.min_days_inactive}+ days`)
  }
  if (filter.min_purchase_value) {
    parts.push(
      `min purchase ${formatCurrency(filter.min_purchase_value, "NGN")}`
    )
  }
  if (filter.min_days_since_purchase) {
    parts.push(
      `${filter.min_days_since_purchase}+ days since last purchase`
    )
  }
  if (filter.min_lifetime_value) {
    parts.push(
      `LTV ${formatCurrency(filter.min_lifetime_value, "NGN")}+`
    )
  }
  if (filter.min_purchases) {
    parts.push(`${filter.min_purchases}+ purchases`)
  }

  return parts.length > 0 ? parts.join(" • ") : "All contacts"
}

export function Step6Review({
  wizardState,
  onLaunch,
  onSaveDraft,
  onBack,
  isLaunching,
}: Step6ReviewProps) {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [isSavingDraft, setIsSavingDraft] = useState(false)

  const template = wizardState.selectedTemplate
  const channelConfig =
    CHANNEL_CONFIG[wizardState.channel] ?? CHANNEL_CONFIG.whatsapp
  const scheduleInfo = getScheduleLabel(wizardState)
  const audienceDescription = buildAudienceDescription(wizardState)

  const expectedDeliveryRate = template?.expected_open_rate
    ? Math.min(template.expected_open_rate + 15, 100)
    : null
  const expectedReadRate = template?.expected_open_rate ?? null
  const expectedReplyRate = template?.expected_reply_rate ?? null
  const expectedConversionRate = template?.expected_conversion_rate ?? null

  const estimatedRevenue = (() => {
    if (!expectedConversionRate || wizardState.audienceCount === 0) return null

    const avgPurchaseValue =
      wizardState.analysis?.revenue?.avg_purchase_value ?? 0
    if (avgPurchaseValue === 0) return null

    return (
      wizardState.audienceCount *
      (expectedConversionRate / 100) *
      avgPurchaseValue
    )
  })()

  const handleLaunch = async () => {
    setShowConfirmDialog(false)
    await onLaunch()
  }

  const handleSaveDraft = async () => {
    setIsSavingDraft(true)
    try {
      await onSaveDraft()
    } finally {
      setIsSavingDraft(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <Badge
          variant="outline"
          className="mb-3 text-sm font-medium px-3 py-1"
        >
          Step 6 of 6
        </Badge>
        <h2 className="text-2xl font-bold text-gray-900">Review & Launch</h2>
        <p className="text-gray-500 mt-1">
          Review your campaign settings before launching
        </p>
      </div>

      {/* Summary Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Template */}
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
                <LayoutTemplate className="h-5 w-5 text-indigo-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Template
                </p>
                <p className="text-sm font-semibold text-gray-900 mt-0.5 truncate">
                  {template?.name ?? "Custom Campaign"}
                </p>
                {template?.category && (
                  <Badge
                    variant="outline"
                    className={cn(
                      "mt-1.5 text-[10px]",
                      CATEGORY_COLORS[template.category]
                    )}
                  >
                    {CATEGORY_LABELS[template.category]}
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Audience */}
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                <Users className="h-5 w-5 text-emerald-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Audience
                </p>
                <p className="text-sm font-semibold text-gray-900 mt-0.5">
                  {wizardState.audienceCount.toLocaleString()} contacts
                </p>
                <p className="text-xs text-gray-500 mt-0.5 truncate">
                  {audienceDescription}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Messages */}
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                <MessageSquare className="h-5 w-5 text-blue-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Messages
                </p>
                <p className="text-sm font-semibold text-gray-900 mt-0.5">
                  {wizardState.customizedMessages.length} message
                  {wizardState.customizedMessages.length !== 1 ? "s" : ""} in
                  sequence
                </p>
                {wizardState.customizedMessages[0] && (
                  <p className="text-xs text-gray-400 mt-1 truncate">
                    “
                    {wizardState.customizedMessages[0].body.substring(0, 60)}
                    {wizardState.customizedMessages[0].body.length > 60
                      ? "…"
                      : ""}
                    ”
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Schedule */}
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
                {scheduleInfo.icon}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Schedule
                </p>
                <p className="text-sm font-semibold text-gray-900 mt-0.5">
                  {scheduleInfo.label}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {scheduleInfo.detail}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Channel - full width */}
        <Card className="md:col-span-2">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
                  channelConfig.bgColor,
                  channelConfig.color
                )}
              >
                {channelConfig.icon}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Delivery Channel
                </p>
                <p
                  className={cn(
                    "text-sm font-semibold mt-0.5",
                    channelConfig.color
                  )}
                >
                  {channelConfig.label}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Campaign:{" "}
                  <span className="font-medium text-gray-700">
                    {wizardState.campaignName || "Untitled"}
                  </span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Estimated Performance */}
      {(expectedDeliveryRate ||
        expectedReadRate ||
        expectedReplyRate ||
        expectedConversionRate) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-blue-600" />
              Estimated Performance
            </CardTitle>
            <CardDescription>
              Based on historical data for this campaign type
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 py-4">
              <CircularProgress
                value={expectedDeliveryRate ?? 0}
                label="Delivery"
                sublabel={
                  expectedDeliveryRate
                    ? `~${Math.round(
                        wizardState.audienceCount *
                          (expectedDeliveryRate / 100)
                      ).toLocaleString()} delivered`
                    : "No data"
                }
                color="#10b981"
              />
              <CircularProgress
                value={expectedReadRate ?? 0}
                label="Read Rate"
                sublabel={
                  expectedReadRate
                    ? `~${Math.round(
                        wizardState.audienceCount *
                          (expectedReadRate / 100)
                      ).toLocaleString()} reads`
                    : "No data"
                }
                color="#3b82f6"
              />
              <CircularProgress
                value={expectedReplyRate ?? 0}
                label="Reply Rate"
                sublabel={
                  expectedReplyRate
                    ? `~${Math.round(
                        wizardState.audienceCount *
                          (expectedReplyRate / 100)
                      ).toLocaleString()} replies`
                    : "No data"
                }
                color="#8b5cf6"
              />
              <CircularProgress
                value={expectedConversionRate ?? 0}
                label="Conversion"
                sublabel={
                  expectedConversionRate
                    ? `~${Math.round(
                        wizardState.audienceCount *
                          (expectedConversionRate / 100)
                      ).toLocaleString()} conversions`
                    : "No data"
                }
                color="#f59e0b"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Revenue Projection */}
      <Card className="bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 border-emerald-200 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-100/50 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-teal-100/50 rounded-full translate-y-1/2 -translate-x-1/2" />
        <CardContent className="pt-6 pb-5 relative">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">
                Revenue Projection
              </h3>
              <p className="text-xs text-gray-500">
                Estimated based on audience size and conversion rates
              </p>
            </div>
          </div>

          {estimatedRevenue !== null ? (
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-emerald-700">
                {formatCurrency(estimatedRevenue, "NGN")}
              </span>
              <span className="text-sm text-gray-500">estimated revenue</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              <span className="text-sm font-medium text-emerald-700">
                Revenue tracking enabled
              </span>
              <span className="text-xs text-gray-500">
                — results will be tracked after launch
              </span>
            </div>
          )}

          {estimatedRevenue !== null &&
            wizardState.audienceCount > 0 &&
            expectedConversionRate && (
              <div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-600">
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {wizardState.audienceCount.toLocaleString()} audience
                </span>
                <span className="flex items-center gap-1">
                  <Target className="h-3 w-3" />
                  {expectedConversionRate}% conversion
                </span>
                <span className="flex items-center gap-1">
                  <DollarSign className="h-3 w-3" />
                  {formatCurrency(
                    wizardState.analysis?.revenue?.avg_purchase_value ?? 0,
                    "NGN"
                  )}{" "}
                  avg. purchase
                </span>
              </div>
            )}
        </CardContent>
      </Card>

      {/* Warning if audience is 0 */}
      {wizardState.audienceCount === 0 && (
        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-800">
                  No audience selected
                </p>
                <p className="text-xs text-amber-700 mt-0.5">
                  Your campaign has 0 contacts in the audience. Go back to the
                  Audience step to adjust your filters.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Separator />

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <Button
          variant="outline"
          onClick={onBack}
          className="gap-2 w-full sm:w-auto"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Button
            variant="outline"
            onClick={handleSaveDraft}
            disabled={isSavingDraft || isLaunching}
            className="gap-2 flex-1 sm:flex-initial"
          >
            {isSavingDraft ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save as Draft
          </Button>

          <Button
            onClick={() => setShowConfirmDialog(true)}
            disabled={
              isLaunching ||
              wizardState.audienceCount === 0 ||
              !wizardState.campaignName.trim()
            }
            className={cn(
              "gap-2 flex-1 sm:flex-initial text-white font-semibold px-8 py-2.5 text-base",
              "bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600",
              "shadow-lg shadow-emerald-200 hover:shadow-emerald-300",
              "transition-all duration-300",
              !isLaunching &&
                wizardState.audienceCount > 0 &&
                wizardState.campaignName.trim() &&
                "animate-[launchPulse_2s_ease-in-out_infinite]"
            )}
          >
            {isLaunching ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Rocket className="h-5 w-5" />
            )}
            {isLaunching ? "Launching..." : "Launch Campaign"}
          </Button>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
              Confirm Campaign Launch
            </DialogTitle>
            <DialogDescription>
              Please review the details below before launching your campaign.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-4">
            <div className="bg-gray-50 rounded-lg p-4 space-y-2.5">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Campaign</span>
                <span className="font-medium text-gray-900">
                  {wizardState.campaignName || "Untitled"}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Audience</span>
                <span className="font-medium text-gray-900">
                  {wizardState.audienceCount.toLocaleString()} contacts
                </span>
              </div>
              <Separator />
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Messages</span>
                <span className="font-medium text-gray-900">
                  {wizardState.customizedMessages.length} in sequence
                </span>
              </div>
              <Separator />
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Channel</span>
                <span className={cn("font-medium", channelConfig.color)}>
                  {channelConfig.label}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Schedule</span>
                <span className="font-medium text-gray-900">
                  {scheduleInfo.label}
                </span>
              </div>
            </div>

            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
              <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700">
                Are you sure you want to launch this campaign? Messages will be
                sent to{" "}
                <span className="font-semibold">
                  {wizardState.audienceCount.toLocaleString()}
                </span>{" "}
                contacts and this action cannot be undone.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowConfirmDialog(false)}
              disabled={isLaunching}
            >
              Cancel
            </Button>
            <Button
              onClick={handleLaunch}
              disabled={isLaunching}
              className="gap-2 bg-emerald-600 hover:bg-emerald-700"
            >
              {isLaunching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Rocket className="h-4 w-4" />
              )}
              {isLaunching ? "Launching..." : "Yes, Launch Now"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pulse Animation */}
      <style jsx global>{`
        @keyframes launchPulse {
          0%,
          100% {
            box-shadow: 0 4px 14px 0 rgba(16, 185, 129, 0.3);
          }
          50% {
            box-shadow: 0 4px 24px 0 rgba(16, 185, 129, 0.5);
          }
        }
      `}</style>
    </div>
  )
}
