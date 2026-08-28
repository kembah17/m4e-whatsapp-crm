"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { useRouter, useParams } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { toast } from "sonner"
import { formatCurrency } from "@/lib/currency"
import { cn } from "@/lib/utils"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
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
  ArrowDown,
  Send,
  CheckCircle2,
  Eye,
  Reply,
  Target,
  DollarSign,
  Users,
  Clock,
  Zap,
  Pause,
  Play,
  XCircle,
  Trash2,
  Loader2,
  AlertCircle,
  RefreshCw,
  BarChart3,
  MessageSquare,
  MessageCircle,
  Mail,
  Smartphone,
  Wand2,
  GitBranch,
  FileText,
  Calendar,
  Download,
  Share2,
  ChevronDown as ChevronDownIcon,
} from "lucide-react"
import type {
  Campaign,
  CampaignStatus,
  CampaignPerformance,
  CampaignMessageTemplate,
  CampaignSequenceStep,
} from "@/types/campaigns"
import { CampaignMonitor } from "@/components/campaigns/campaign-monitor"
import { EndOfCampaignWorkflow } from "@/components/campaigns/end-of-campaign-workflow"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"
import type { CampaignReport } from "@/lib/campaigns/report-generator"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CampaignWithTemplate extends Campaign {
  campaign_templates?: {
    name: string
    icon: string
    category: string
    expected_open_rate: number | null
    expected_reply_rate: number | null
    expected_conversion_rate: number | null
  } | null
}

interface ConfirmDialogState {
  open: boolean
  title: string
  description: string
  action: () => void
  variant: "default" | "destructive"
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function relativeTime(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diffMs = now - then
  const seconds = Math.floor(diffMs / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  const weeks = Math.floor(days / 7)
  const months = Math.floor(days / 30)

  if (seconds < 60) return "just now"
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  if (weeks < 5) return `${weeks}w ago`
  return `${months}mo ago`
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-NG", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function formatDelay(minutes: number): string {
  if (minutes < 60) return `${minutes}min`
  if (minutes < 1440) return `${Math.round(minutes / 60)}hr`
  return `${Math.round(minutes / 1440)}d`
}

const STATUS_CONFIG: Record<
  CampaignStatus,
  { label: string; color: string; icon: React.ElementType }
> = {
  draft: { label: "Draft", color: "bg-gray-100 text-gray-700 border-gray-200", icon: FileText },
  active: { label: "Active", color: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: Zap },
  scheduled: { label: "Scheduled", color: "bg-blue-50 text-blue-700 border-blue-200", icon: Clock },
  completed: { label: "Completed", color: "bg-purple-50 text-purple-700 border-purple-200", icon: CheckCircle2 },
  paused: { label: "Paused", color: "bg-yellow-50 text-yellow-700 border-yellow-200", icon: Pause },
  cancelled: { label: "Cancelled", color: "bg-red-50 text-red-700 border-red-200", icon: XCircle },
}

const CHANNEL_CONFIG: Record<
  string,
  { label: string; color: string; icon: React.ElementType }
> = {
  whatsapp: { label: "WhatsApp", color: "text-green-600", icon: MessageCircle },
  email: { label: "Email", color: "text-blue-600", icon: Mail },
  sms: { label: "SMS", color: "text-orange-600", icon: Smartphone },
  auto: { label: "Auto", color: "text-purple-600", icon: Wand2 },
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function DetailSkeleton() {
  return (
    <div className="mx-auto max-w-5xl space-y-6 animate-pulse">
      <div className="h-8 w-40 rounded bg-muted" />
      <div className="flex items-start gap-4">
        <div className="h-12 w-12 rounded-xl bg-muted" />
        <div className="space-y-2">
          <div className="h-7 w-64 rounded bg-muted" />
          <div className="h-5 w-32 rounded bg-muted" />
        </div>
      </div>
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-28 rounded-lg bg-muted" />
        ))}
      </div>
      <div className="h-64 rounded-lg bg-muted" />
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="h-72 rounded-lg bg-muted" />
        <div className="h-72 rounded-lg bg-muted" />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function CampaignDetailPage() {
  const router = useRouter()
  const params = useParams()
  const campaignId = params.id as string
  const { user } = useAuth()

  // -----------------------------------------------------------------------
  // State
  // -----------------------------------------------------------------------

  const [campaign, setCampaign] = useState<CampaignWithTemplate | null>(null)
  const [performance, setPerformance] = useState<CampaignPerformance | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>({
    open: false,
    title: "",
    description: "",
    action: () => {},
    variant: "default",
  })

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // -----------------------------------------------------------------------
  // Fetch campaign
  // -----------------------------------------------------------------------

  const fetchCampaign = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch(`/api/campaigns/${campaignId}`)
      if (!res.ok) throw new Error("Failed to load campaign")
      const data = await res.json()
      setCampaign(data.campaign)
    } catch (err: any) {
      setError(err.message || "Something went wrong")
      toast.error("Failed to load campaign")
    } finally {
      setLoading(false)
    }
  }, [campaignId])

  // -----------------------------------------------------------------------
  // Fetch performance
  // -----------------------------------------------------------------------

  const fetchPerformance = useCallback(async () => {
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/performance`)
      if (!res.ok) return
      const data = await res.json()
      setPerformance(data.performance)
    } catch {
      // Silently fail for performance polling
    }
  }, [campaignId])

  // -----------------------------------------------------------------------
  // Initial load
  // -----------------------------------------------------------------------

  useEffect(() => {
    fetchCampaign()
    fetchPerformance()
  }, [fetchCampaign, fetchPerformance])

  // -----------------------------------------------------------------------
  // Poll performance every 10s if active
  // -----------------------------------------------------------------------

  useEffect(() => {
    if (campaign?.status === "active") {
      pollRef.current = setInterval(fetchPerformance, 10000)
    } else {
      if (pollRef.current) {
        clearInterval(pollRef.current)
        pollRef.current = null
      }
    }

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current)
        pollRef.current = null
      }
    }
  }, [campaign?.status, fetchPerformance])

  // -----------------------------------------------------------------------
  // Actions
  // -----------------------------------------------------------------------

  const updateStatus = useCallback(
    async (status: CampaignStatus) => {
      try {
        setActionLoading(true)
        const res = await fetch(`/api/campaigns/${campaignId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        })
        if (!res.ok) throw new Error("Failed to update campaign")
        const data = await res.json()
        setCampaign((prev) => (prev ? { ...prev, ...data.campaign } : prev))
        toast.success(`Campaign ${status === "paused" ? "paused" : status === "active" ? "resumed" : "cancelled"}`)
        setConfirmDialog((prev) => ({ ...prev, open: false }))
      } catch (err: any) {
        toast.error(err.message || "Failed to update campaign")
      } finally {
        setActionLoading(false)
      }
    },
    [campaignId]
  )

  const deleteCampaign = useCallback(async () => {
    try {
      setActionLoading(true)
      const res = await fetch(`/api/campaigns/${campaignId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cancelled" }),
      })
      if (!res.ok) throw new Error("Failed to delete campaign")
      toast.success("Campaign deleted")
      router.push("/campaigns")
    } catch (err: any) {
      toast.error(err.message || "Failed to delete campaign")
    } finally {
      setActionLoading(false)
    }
  }, [campaignId, router])

  const openConfirm = useCallback(
    (
      title: string,
      description: string,
      action: () => void,
      variant: "default" | "destructive" = "default"
    ) => {
      setConfirmDialog({ open: true, title, description, action, variant })
    },
    []
  )

  // -----------------------------------------------------------------------
  // Report download & share handlers
  // -----------------------------------------------------------------------

  const [reportLoading, setReportLoading] = useState(false)

  const handleDownloadCSV = useCallback(async () => {
    try {
      setReportLoading(true)
      const res = await fetch(`/api/campaigns/${campaignId}/report/csv`)
      if (!res.ok) throw new Error("Failed to generate CSV")
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `campaign-report.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success("CSV report downloaded")
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Download failed"
      toast.error(message)
    } finally {
      setReportLoading(false)
    }
  }, [campaignId])

  const handleDownloadMarkdown = useCallback(async () => {
    try {
      setReportLoading(true)
      const res = await fetch(`/api/campaigns/${campaignId}/report/pdf`)
      if (!res.ok) throw new Error("Failed to generate report")
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `campaign-report.md`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success("Report downloaded")
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Download failed"
      toast.error(message)
    } finally {
      setReportLoading(false)
    }
  }, [campaignId])

  const handleShareReport = useCallback(async () => {
    try {
      setReportLoading(true)
      const res = await fetch(`/api/campaigns/${campaignId}/report`)
      if (!res.ok) throw new Error("Failed to fetch report")
      const data = await res.json()
      const r = data.report as CampaignReport
      const startDate = r.started_at ? new Date(r.started_at).toLocaleDateString() : "N/A"
      const endDate = r.completed_at ? new Date(r.completed_at).toLocaleDateString() : "In Progress"
      const dr = (r.delivery_rate * 100).toFixed(1)
      const rr = (r.read_rate * 100).toFixed(1)
      const rpr = (r.reply_rate * 100).toFixed(1)
      const costStr = r.estimated_cost_ngn.toLocaleString("en-NG", { minimumFractionDigits: 2 })
      const summary = [
        `📊 Campaign Report: ${r.campaign_name}`,
        `📅 ${startDate} → ${endDate}`,
        `📨 Sent: ${r.sent} | ✅ Delivered: ${r.delivered} (${dr}%) | 👁 Read: ${r.read} (${rr}%) | 💬 Replied: ${r.replied} (${rpr}%)`,
        `❌ Failed: ${r.failed}`,
        `💰 Est. Cost: ₦${costStr}`,
      ].join("\n")
      await navigator.clipboard.writeText(summary)
      toast.success("Report summary copied to clipboard")
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to share report"
      toast.error(message)
    } finally {
      setReportLoading(false)
    }
  }, [campaignId])

  // -----------------------------------------------------------------------
  // Loading / Error states
  // -----------------------------------------------------------------------

  if (loading) {
    return <DetailSkeleton />
  }

  if (error || !campaign) {
    return (
      <div className="mx-auto max-w-5xl space-y-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/campaigns")}
          className="gap-2 text-muted-foreground hover:text-foreground -ml-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Campaigns
        </Button>

        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <AlertCircle className="h-10 w-10 text-destructive mb-3" />
            <h3 className="font-semibold text-lg">Failed to load campaign</h3>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              {error || "Campaign not found"}
            </p>
            <Button variant="outline" onClick={fetchCampaign} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // -----------------------------------------------------------------------
  // Derived values
  // -----------------------------------------------------------------------

  const statusCfg = STATUS_CONFIG[campaign.status]
  const StatusIcon = statusCfg.icon
  const templateIcon = campaign.campaign_templates?.icon ?? "\uD83D\uDCE2"
  const templateName = campaign.campaign_templates?.name ?? "Custom Campaign"
  const templateCategory = campaign.campaign_templates?.category ?? ""
  const channelCfg = CHANNEL_CONFIG[campaign.channel] ?? CHANNEL_CONFIG.auto
  const ChannelIcon = channelCfg.icon

  const perf = performance
  const totalSent = perf?.total_sent ?? 0

  // -----------------------------------------------------------------------
  // Funnel data
  // -----------------------------------------------------------------------

  const funnelSteps = perf
    ? [
        { label: "Sent", value: perf.total_sent, color: "bg-blue-500" },
        { label: "Delivered", value: perf.total_delivered, color: "bg-sky-500" },
        { label: "Read", value: perf.total_read, color: "bg-teal-500" },
        { label: "Replied", value: perf.total_replied, color: "bg-emerald-500" },
        { label: "Converted", value: perf.total_converted, color: "bg-green-600" },
      ]
    : []

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Back */}
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-2xl shrink-0">
            {templateIcon}
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {campaign.name}
            </h1>
            <div className="flex flex-wrap items-center gap-2 mt-1.5">
              <Badge
                variant="outline"
                className={cn("gap-1", statusCfg.color)}
              >
                <StatusIcon className="h-3 w-3" />
                {statusCfg.label}
              </Badge>
              {campaign.status === "active" && (
                <span className="flex items-center gap-1 text-xs text-emerald-600">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  </span>
                  Live
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          {campaign.status === "active" && (
            <Button
              variant="outline"
              size="sm"
              disabled={actionLoading}
              className="gap-1.5"
              onClick={() =>
                openConfirm(
                  "Pause Campaign",
                  "This will pause message delivery. You can resume later.",
                  () => updateStatus("paused")
                )
              }
            >
              <Pause className="h-3.5 w-3.5" />
              Pause
            </Button>
          )}
          {campaign.status === "paused" && (
            <Button
              variant="outline"
              size="sm"
              disabled={actionLoading}
              className="gap-1.5"
              onClick={() =>
                openConfirm(
                  "Resume Campaign",
                  "This will resume message delivery.",
                  () => updateStatus("active")
                )
              }
            >
              <Play className="h-3.5 w-3.5" />
              Resume
            </Button>
          )}
          {(campaign.status === "active" ||
            campaign.status === "scheduled") && (
            <Button
              variant="outline"
              size="sm"
              disabled={actionLoading}
              className="gap-1.5 text-destructive hover:text-destructive"
              onClick={() =>
                openConfirm(
                  "Cancel Campaign",
                  "This will permanently cancel the campaign. This action cannot be undone.",
                  () => updateStatus("cancelled"),
                  "destructive"
                )
              }
            >
              <XCircle className="h-3.5 w-3.5" />
              Cancel
            </Button>
          )}
          {campaign.status === "draft" && (
            <Button
              variant="outline"
              size="sm"
              disabled={actionLoading}
              className="gap-1.5 text-destructive hover:text-destructive"
              onClick={() =>
                openConfirm(
                  "Delete Campaign",
                  "This will permanently delete this draft campaign.",
                  deleteCampaign,
                  "destructive"
                )
              }
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </Button>
          )}
          {/* Download & Share - show for non-draft campaigns */}
          {campaign.status !== "draft" && (
            <>
              <DropdownMenu>
                <DropdownMenuTrigger
                  className={cn(
                    "inline-flex items-center justify-center gap-1.5 rounded-md text-sm font-medium",
                    "border border-input bg-background px-3 h-8",
                    "hover:bg-accent hover:text-accent-foreground",
                    "disabled:pointer-events-none disabled:opacity-50"
                  )}
                  disabled={reportLoading}
                >
                  {reportLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Download className="h-3.5 w-3.5" />
                  )}
                  Report
                  <ChevronDownIcon className="h-3 w-3 opacity-50" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleDownloadCSV}>
                    <Download className="h-3.5 w-3.5 mr-2" />
                    Download CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleDownloadMarkdown}>
                    <FileText className="h-3.5 w-3.5 mr-2" />
                    Download Report
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                variant="outline"
                size="sm"
                disabled={reportLoading}
                className="gap-1.5"
                onClick={handleShareReport}
              >
                <Share2 className="h-3.5 w-3.5" />
                Share
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Performance metrics */}
      {perf && (
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-3">
          {[
            {
              label: "Sent",
              value: perf.total_sent.toLocaleString(),
              rate: null as number | null,
              icon: Send,
              color: "text-blue-600",
              bg: "bg-blue-50",
              border: "border-blue-100",
            },
            {
              label: "Delivered",
              value: perf.total_delivered.toLocaleString(),
              rate: perf.delivery_rate,
              icon: CheckCircle2,
              color: "text-sky-600",
              bg: "bg-sky-50",
              border: "border-sky-100",
            },
            {
              label: "Read",
              value: perf.total_read.toLocaleString(),
              rate: perf.read_rate,
              icon: Eye,
              color: "text-teal-600",
              bg: "bg-teal-50",
              border: "border-teal-100",
            },
            {
              label: "Replied",
              value: perf.total_replied.toLocaleString(),
              rate: perf.reply_rate,
              icon: Reply,
              color: "text-emerald-600",
              bg: "bg-emerald-50",
              border: "border-emerald-100",
            },
            {
              label: "Converted",
              value: perf.total_converted.toLocaleString(),
              rate: perf.conversion_rate,
              icon: Target,
              color: "text-green-600",
              bg: "bg-green-50",
              border: "border-green-100",
            },
            {
              label: "Revenue",
              value: formatCurrency(perf.total_revenue, "NGN"),
              rate: null as number | null,
              icon: DollarSign,
              color: "text-amber-600",
              bg: "bg-amber-50",
              border: "border-amber-100",
            },
          ].map((metric) => {
            const MetricIcon = metric.icon
            return (
              <Card key={metric.label} className={cn(metric.border, metric.bg + "/50")}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-lg",
                        metric.bg
                      )}
                    >
                      <MetricIcon className={cn("h-4 w-4", metric.color)} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-muted-foreground">
                        {metric.label}
                      </p>
                      <p className="text-lg font-bold truncate">
                        {metric.value}
                      </p>
                    </div>
                  </div>
                  {metric.rate !== null && (
                    <div className="mt-2">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-muted-foreground">Rate</span>
                        <span className="font-medium">
                          {(metric.rate * 100).toFixed(1)}%
                        </span>
                      </div>
                      <Progress
                        value={metric.rate * 100}
                        className="h-1.5"
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Conversion funnel */}
      {perf && totalSent > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              Conversion Funnel
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-6">
            <div className="space-y-3">
              {funnelSteps.map((step, index) => {
                const maxVal = funnelSteps[0].value || 1
                const widthPct = Math.max((step.value / maxVal) * 100, 2)
                const pct =
                  index === 0
                    ? 100
                    : totalSent > 0
                    ? (step.value / totalSent) * 100
                    : 0

                return (
                  <div key={step.label}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <div className="flex items-center gap-2">
                        {index > 0 && (
                          <ArrowDown className="h-3 w-3 text-muted-foreground" />
                        )}
                        <span className="font-medium">{step.label}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-muted-foreground tabular-nums">
                          {step.value.toLocaleString()}
                        </span>
                        <span className="text-xs font-medium tabular-nums w-12 text-right">
                          {pct.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    <div className="h-6 rounded-md bg-muted overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-md transition-all duration-700 ease-out",
                          step.color
                        )}
                        style={{ width: `${widthPct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}


      {/* Campaign Monitor - show for active/completed/paused campaigns */}
      {campaign.status !== "draft" && campaign.status !== "scheduled" && campaign.status !== "cancelled" && (
        <CampaignMonitor
          campaignId={campaignId}
          campaignStatus={campaign.status}
          campaignName={campaign.name}
        />
      )}
      {/* Campaign details + Message sequence */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Info card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Campaign Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Template */}
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-lg">
                {templateIcon}
              </div>
              <div>
                <p className="text-sm font-medium">{templateName}</p>
                {templateCategory && (
                  <Badge variant="secondary" className="text-[10px] capitalize mt-0.5">
                    {templateCategory.replace("_", " ")}
                  </Badge>
                )}
              </div>
            </div>

            <Separator />

            {/* Channel */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Channel</span>
              <div className="flex items-center gap-1.5">
                <ChannelIcon className={cn("h-4 w-4", channelCfg.color)} />
                <span className="text-sm font-medium">{channelCfg.label}</span>
              </div>
            </div>

            {/* Audience */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Audience</span>
              <div className="flex items-center gap-1.5">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">
                  {campaign.total_audience.toLocaleString()} contacts
                </span>
              </div>
            </div>

            {/* Segment filter */}
            {campaign.audience_filter?.segment && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Segment</span>
                <Badge variant="outline" className="capitalize text-xs">
                  {campaign.audience_filter.segment.replace("_", " ")}
                </Badge>
              </div>
            )}

            <Separator />

            {/* Dates */}
            {campaign.scheduled_at && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Scheduled</span>
                <span className="text-sm">{formatDate(campaign.scheduled_at)}</span>
              </div>
            )}
            {campaign.started_at && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Started</span>
                <span className="text-sm">{formatDate(campaign.started_at)}</span>
              </div>
            )}
            {campaign.completed_at && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Completed</span>
                <span className="text-sm">{formatDate(campaign.completed_at)}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Created</span>
              <span className="text-sm">{relativeTime(campaign.created_at)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Message sequence */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <GitBranch className="h-4 w-4 text-muted-foreground" />
              Message Sequence
            </CardTitle>
          </CardHeader>
          <CardContent>
            {campaign.sequence_steps && campaign.sequence_steps.length > 0 ? (
              <div className="relative">
                {/* Vertical line */}
                <div className="absolute left-4 top-4 bottom-4 w-px bg-border" />

                <div className="space-y-4">
                  {campaign.sequence_steps.map(
                    (step: CampaignSequenceStep, index: number) => {
                      const message = campaign.message_templates?.find(
                        (m: CampaignMessageTemplate) =>
                          m.key === step.message_key
                      )
                      return (
                        <div
                          key={index}
                          className="relative flex items-start gap-4 pl-1"
                        >
                          {/* Step dot */}
                          <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 border-2 border-primary text-xs font-bold text-primary">
                            {step.step}
                          </div>

                          <div className="flex-1 min-w-0 pt-0.5">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-medium">
                                {message?.name ?? `Step ${step.step}`}
                              </span>
                              {step.delay_minutes > 0 && (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] gap-1"
                                >
                                  <Clock className="h-2.5 w-2.5" />
                                  {formatDelay(step.delay_minutes)} delay
                                </Badge>
                              )}
                              {index === 0 && step.delay_minutes === 0 && (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] gap-1 text-emerald-600 border-emerald-200"
                                >
                                  <Zap className="h-2.5 w-2.5" />
                                  Immediate
                                </Badge>
                              )}
                            </div>
                            {step.condition && (
                              <p className="text-[11px] text-muted-foreground mb-1">
                                Condition: {step.condition}
                              </p>
                            )}
                            {message?.body && (
                              <p className="text-xs text-muted-foreground line-clamp-2 bg-muted/50 rounded-md px-3 py-2">
                                {message.body}
                              </p>
                            )}
                          </div>
                        </div>
                      )
                    }
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <MessageSquare className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  No message sequence configured
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* End-of-Campaign Workflow - show for completed campaigns */}
      {campaign.status === "completed" && (
        <EndOfCampaignWorkflow
          campaign={{
            id: campaign.id,
            name: campaign.name,
            status: campaign.status,
            created_at: campaign.created_at,
            completed_at: campaign.completed_at,
            total_audience: campaign.total_audience ?? 0,
            template_slug: campaign.template_slug,
          }}
          onRefresh={fetchCampaign}
        />
      )}

      {/* Confirmation dialog */}
      <Dialog
        open={confirmDialog.open}
        onOpenChange={(open) =>
          setConfirmDialog((prev) => ({ ...prev, open }))
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{confirmDialog.title}</DialogTitle>
            <DialogDescription>{confirmDialog.description}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() =>
                setConfirmDialog((prev) => ({ ...prev, open: false }))
              }
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              variant={confirmDialog.variant}
              onClick={confirmDialog.action}
              disabled={actionLoading}
              className="gap-2"
            >
              {actionLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
