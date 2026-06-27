"use client"

import { useEffect, useState, useMemo, useCallback } from "react"
import { useRouter } from "next/navigation"
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import {
  Plus,
  Megaphone,
  BarChart3,
  CheckCircle2,
  Clock,
  DollarSign,
  Users,
  Send,
  MessageSquare,
  Reply,
  Target,
  Loader2,
  AlertCircle,
  RefreshCw,
  Zap,
  Pause,
  XCircle,
  FileText,
} from "lucide-react"
import type {
  Campaign,
  CampaignStatus,
  CampaignPerformance,
  CampaignTemplate,
} from "@/types/campaigns"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CampaignWithTemplate extends Campaign {
  campaign_templates?: {
    name: string
    icon: string
    category: string
  } | null
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

const CHANNEL_COLORS: Record<string, string> = {
  whatsapp: "bg-green-50 text-green-700 border-green-200",
  email: "bg-blue-50 text-blue-700 border-blue-200",
  sms: "bg-orange-50 text-orange-700 border-orange-200",
  auto: "bg-purple-50 text-purple-700 border-purple-200",
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function CampaignCardSkeleton() {
  return (
    <Card className="animate-pulse">
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-muted" />
            <div className="space-y-2">
              <div className="h-4 w-32 rounded bg-muted" />
              <div className="h-3 w-20 rounded bg-muted" />
            </div>
          </div>
          <div className="h-5 w-16 rounded-full bg-muted" />
        </div>
        <div className="space-y-2 mt-4">
          <div className="h-3 w-full rounded bg-muted" />
          <div className="h-3 w-3/4 rounded bg-muted" />
        </div>
        <div className="flex gap-2 mt-4">
          <div className="h-5 w-16 rounded-full bg-muted" />
          <div className="h-5 w-16 rounded-full bg-muted" />
        </div>
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function CampaignsPage() {
  const router = useRouter()
  const { user } = useAuth()

  const [campaigns, setCampaigns] = useState<CampaignWithTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<string>("all")

  // -----------------------------------------------------------------------
  // Fetch
  // -----------------------------------------------------------------------

  const fetchCampaigns = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch("/api/campaigns")
      if (!res.ok) {
        throw new Error("Failed to fetch campaigns")
      }
      const data = await res.json()
      setCampaigns(data.campaigns ?? [])
    } catch (err: any) {
      setError(err.message || "Something went wrong")
      toast.error("Failed to load campaigns")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCampaigns()
  }, [fetchCampaigns])

  // -----------------------------------------------------------------------
  // Computed
  // -----------------------------------------------------------------------

  const stats = useMemo(() => {
    const total = campaigns.length
    const active = campaigns.filter((c) => c.status === "active").length
    const completed = campaigns.filter((c) => c.status === "completed").length
    const totalRevenue = campaigns.reduce(
      (sum, c) => sum + (c.performance?.total_revenue ?? 0),
      0
    )
    return { total, active, completed, totalRevenue }
  }, [campaigns])

  const filteredCampaigns = useMemo(() => {
    if (activeTab === "all") return campaigns
    return campaigns.filter((c) => c.status === activeTab)
  }, [campaigns, activeTab])

  const tabCounts = useMemo(() => {
    const counts: Record<string, number> = { all: campaigns.length }
    for (const c of campaigns) {
      counts[c.status] = (counts[c.status] ?? 0) + 1
    }
    return counts
  }, [campaigns])

  // -----------------------------------------------------------------------
  // Render helpers
  // -----------------------------------------------------------------------

  function renderPerformanceBar(perf: CampaignPerformance) {
    const max = perf.total_sent || 1
    const bars = [
      { label: "Sent", value: perf.total_sent, color: "bg-blue-500" },
      { label: "Delivered", value: perf.total_delivered, color: "bg-sky-500" },
      { label: "Replied", value: perf.total_replied, color: "bg-emerald-500" },
      { label: "Converted", value: perf.total_converted, color: "bg-purple-500" },
    ]
    return (
      <div className="space-y-1.5 mt-3">
        {bars.map((bar) => (
          <div key={bar.label} className="flex items-center gap-2 text-xs">
            <span className="w-16 text-muted-foreground shrink-0">{bar.label}</span>
            <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className={cn("h-full rounded-full transition-all duration-500", bar.color)}
                style={{ width: `${Math.min((bar.value / max) * 100, 100)}%` }}
              />
            </div>
            <span className="w-8 text-right text-muted-foreground tabular-nums">
              {bar.value.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    )
  }

  function renderCampaignCard(campaign: CampaignWithTemplate) {
    const statusCfg = STATUS_CONFIG[campaign.status]
    const StatusIcon = statusCfg.icon
    const templateIcon = campaign.campaign_templates?.icon ?? "\uD83D\uDCE2"
    const templateName = campaign.campaign_templates?.name ?? "Custom Campaign"
    const templateCategory = campaign.campaign_templates?.category ?? ""
    const channelColor = CHANNEL_COLORS[campaign.channel] ?? CHANNEL_COLORS.auto
    const hasPerformance =
      campaign.performance && campaign.performance.total_sent > 0
    const revenue = campaign.performance?.total_revenue ?? 0

    return (
      <Card
        key={campaign.id}
        className="group cursor-pointer transition-all duration-200 hover:shadow-md hover:border-primary/30 hover:-translate-y-0.5"
        onClick={() => router.push(`/campaigns/${campaign.id}`)}
      >
        <CardContent className="p-5">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-lg">
                {templateIcon}
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-sm leading-tight truncate max-w-[180px]">
                  {campaign.name}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[180px]">
                  {templateName}
                </p>
              </div>
            </div>
            <Badge
              variant="outline"
              className={cn("text-[10px] shrink-0 gap-1", statusCfg.color)}
            >
              <StatusIcon className="h-3 w-3" />
              {statusCfg.label}
            </Badge>
          </div>

          {/* Meta badges */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {templateCategory && (
              <Badge variant="secondary" className="text-[10px] capitalize">
                {templateCategory.replace("_", " ")}
              </Badge>
            )}
            <Badge variant="outline" className={cn("text-[10px] capitalize", channelColor)}>
              {campaign.channel}
            </Badge>
            <Badge variant="outline" className="text-[10px] gap-1">
              <Users className="h-2.5 w-2.5" />
              {campaign.total_audience.toLocaleString()}
            </Badge>
          </div>

          {/* Performance */}
          {hasPerformance && renderPerformanceBar(campaign.performance!)}

          {/* Revenue */}
          {revenue > 0 && (
            <div className="flex items-center gap-1.5 mt-3 px-2 py-1.5 rounded-md bg-amber-50 border border-amber-100">
              <DollarSign className="h-3.5 w-3.5 text-amber-600" />
              <span className="text-xs font-semibold text-amber-700">
                {formatCurrency(revenue, "NGN")}
              </span>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between mt-3 pt-3 border-t">
            <span className="text-[11px] text-muted-foreground">
              {relativeTime(campaign.created_at)}
            </span>
            <span className="text-[11px] text-primary opacity-0 group-hover:opacity-100 transition-opacity">
              View details \u2192
            </span>
          </div>
        </CardContent>
      </Card>
    )
  }

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Campaigns</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Create and manage automated marketing campaigns to re-engage your customers.
          </p>
        </div>
        <Button onClick={() => router.push("/campaigns/new")} className="gap-2">
          <Plus className="h-4 w-4" />
          New Campaign
        </Button>
      </div>

      {/* Stats */}
      {!loading && !error && campaigns.length > 0 && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Card className="border-blue-100 bg-blue-50/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100">
                  <Megaphone className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total</p>
                  <p className="text-xl font-bold text-blue-700">
                    {stats.total.toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-emerald-100 bg-emerald-50/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100">
                  <Zap className="h-4 w-4 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Active</p>
                  <p className="text-xl font-bold text-emerald-700">
                    {stats.active.toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-purple-100 bg-purple-50/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-100">
                  <CheckCircle2 className="h-4 w-4 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Completed</p>
                  <p className="text-xl font-bold text-purple-700">
                    {stats.completed.toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-amber-100 bg-amber-50/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100">
                  <DollarSign className="h-4 w-4 text-amber-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Revenue</p>
                  <p className="text-lg font-bold text-amber-700 truncate">
                    {formatCurrency(stats.totalRevenue, "NGN")}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs */}
      {!loading && !error && campaigns.length > 0 && (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="h-auto flex-wrap">
            {[
              { key: "all", label: "All" },
              { key: "draft", label: "Draft" },
              { key: "active", label: "Active" },
              { key: "scheduled", label: "Scheduled" },
              { key: "completed", label: "Completed" },
              { key: "cancelled", label: "Cancelled" },
            ].map((tab) => (
              <TabsTrigger key={tab.key} value={tab.key} className="gap-1.5 text-xs">
                {tab.label}
                {(tabCounts[tab.key] ?? 0) > 0 && (
                  <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium">
                    {tabCounts[tab.key]}
                  </span>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      )}

      {/* Loading */}
      {loading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <CampaignCardSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <AlertCircle className="h-10 w-10 text-destructive mb-3" />
            <h3 className="font-semibold text-lg">Failed to load campaigns</h3>
            <p className="text-sm text-muted-foreground mt-1 mb-4">{error}</p>
            <Button variant="outline" onClick={fetchCampaigns} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Empty */}
      {!loading && !error && campaigns.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
              <Megaphone className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-lg">No campaigns yet</h3>
            <p className="text-sm text-muted-foreground mt-1 mb-6 max-w-sm">
              Create your first campaign to start re-engaging your customers and
              driving revenue with automated messaging.
            </p>
            <Button onClick={() => router.push("/campaigns/new")} className="gap-2">
              <Plus className="h-4 w-4" />
              Create Your First Campaign
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Filtered empty */}
      {!loading &&
        !error &&
        campaigns.length > 0 &&
        filteredCampaigns.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-3">
                <MessageSquare className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="font-medium">No {activeTab} campaigns</h3>
              <p className="text-sm text-muted-foreground mt-1">
                There are no campaigns with this status.
              </p>
            </CardContent>
          </Card>
        )}

      {/* Campaign grid */}
      {!loading && !error && filteredCampaigns.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredCampaigns.map((campaign) => renderCampaignCard(campaign))}
        </div>
      )}
    </div>
  )
}
