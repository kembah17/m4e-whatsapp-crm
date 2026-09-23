"use client"

import { useEffect, useState, useCallback } from "react"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  BarChart3,
  DollarSign,
  Eye,
  MousePointerClick,
  Users,
  Target,
  TrendingUp,
  RefreshCw,
  Loader2,
  AlertCircle,
  Link2,
  ArrowUpDown,
} from "lucide-react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"
import type {
  AdAccount,
  AdCampaign,
  PerformanceSummary,
  DailyPerformance,
  CampaignPerformanceRow,
  DateRange,
} from "@/types/ads"

/* ------------------------------------------------------------------ */
/*  Formatting helpers                                                  */
/* ------------------------------------------------------------------ */

function formatNaira(amount: number): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatNumber(n: number): string {
  return new Intl.NumberFormat("en-NG").format(n)
}

function formatPercent(n: number): string {
  return `${n.toFixed(2)}%`
}

function formatCurrency(amount: number, currency?: string): string {
  if (currency === "USD") {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(amount)
  }
  return formatNaira(amount)
}

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

type TabValue = "overview" | "campaigns" | "accounts" | "audience"

interface SyncStatus {
  syncing: boolean
  lastResult?: {
    success: boolean
    accounts_synced: number
    campaigns_synced: number
    snapshots_synced: number
    errors: string[]
  }
}

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */

export default function AdsPerformancePage() {
  const [activeTab, setActiveTab] = useState<TabValue>("overview")
  const [dateRange, setDateRange] = useState<DateRange>("30d")
  const [loading, setLoading] = useState(true)
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({ syncing: false })

  // Data state
  const [summary, setSummary] = useState<PerformanceSummary | null>(null)
  const [daily, setDaily] = useState<DailyPerformance[]>([])
  const [campaignRows, setCampaignRows] = useState<CampaignPerformanceRow[]>([])
  const [campaigns, setCampaigns] = useState<AdCampaign[]>([])
  const [adAccounts, setAdAccounts] = useState<AdAccount[]>([])
  const [campaignFilter, setCampaignFilter] = useState("ALL")
  const [sortField, setSortField] = useState<string>("spend")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")

  // ----------------------------------------------------------------
  // Data fetching
  // ----------------------------------------------------------------

  const fetchPerformance = useCallback(async () => {
    try {
      const res = await fetch(`/api/ads/performance?range=${dateRange}`)
      if (!res.ok) throw new Error("Failed to fetch performance data")
      const data = await res.json()
      setSummary(data.summary)
      setDaily(data.daily || [])
      setCampaignRows(data.campaigns || [])
    } catch {
      // Silently handle — empty state will show
    }
  }, [dateRange])

  const fetchAccounts = useCallback(async () => {
    try {
      const res = await fetch("/api/ads/accounts")
      if (!res.ok) return
      const data = await res.json()
      setAdAccounts(data.accounts || [])
    } catch {
      // Silently handle
    }
  }, [])

  const fetchCampaigns = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (campaignFilter !== "ALL") params.set("status", campaignFilter)
      const res = await fetch(`/api/ads/campaigns?${params}`)
      if (!res.ok) return
      const data = await res.json()
      setCampaigns(data.campaigns || [])
    } catch {
      // Silently handle
    }
  }, [campaignFilter])

  useEffect(() => {
    setLoading(true)
    Promise.all([fetchPerformance(), fetchAccounts(), fetchCampaigns()]).finally(
      () => setLoading(false),
    )
  }, [fetchPerformance, fetchAccounts, fetchCampaigns])

  // ----------------------------------------------------------------
  // Actions
  // ----------------------------------------------------------------

  const handleSync = async () => {
    setSyncStatus({ syncing: true })
    try {
      const res = await fetch("/api/ads/sync", { method: "POST" })
      const result = await res.json()
      setSyncStatus({ syncing: false, lastResult: result })
      if (result.success) {
        toast.success(
          `Synced ${result.accounts_synced} accounts, ${result.campaigns_synced} campaigns, ${result.snapshots_synced} snapshots`,
        )
        // Refresh data
        await Promise.all([fetchPerformance(), fetchAccounts(), fetchCampaigns()])
      } else {
        toast.error(`Sync completed with errors: ${result.errors?.[0] || "Unknown error"}`)
      }
    } catch {
      setSyncStatus({ syncing: false })
      toast.error("Failed to sync ads data")
    }
  }

  const handleConnectAccounts = async () => {
    try {
      const res = await fetch("/api/ads/accounts", { method: "POST" })
      const data = await res.json()
      if (res.ok) {
        toast.success(data.message || "Ad accounts connected")
        await fetchAccounts()
      } else {
        toast.error(data.error || "Failed to connect ad accounts")
      }
    } catch {
      toast.error("Failed to connect ad accounts")
    }
  }

  // ----------------------------------------------------------------
  // Sorting
  // ----------------------------------------------------------------

  const toggleSort = (field: string) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortField(field)
      setSortDir("desc")
    }
  }

  const sortedCampaignRows = [...campaignRows].sort((a, b) => {
    const aVal = a[sortField as keyof CampaignPerformanceRow] as number
    const bVal = b[sortField as keyof CampaignPerformanceRow] as number
    return sortDir === "asc" ? aVal - bVal : bVal - aVal
  })

  // ----------------------------------------------------------------
  // Empty state
  // ----------------------------------------------------------------

  const hasAccounts = adAccounts.length > 0
  const hasData = summary && summary.total_impressions > 0

  if (!loading && !hasAccounts) {
    return (
      <div className="space-y-6 p-4 md:p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Ads Performance</h1>
            <p className="text-muted-foreground">Monitor your Meta ad campaigns</p>
          </div>
        </div>
        <Card className="bg-card/50 border-border">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <BarChart3 className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              No Ad Accounts Connected
            </h3>
            <p className="text-muted-foreground max-w-md mb-6">
              Connect your Meta ad accounts to start tracking campaign performance,
              impressions, clicks, spend, and conversions.
            </p>
            <div className="space-y-3">
              <Button onClick={handleConnectAccounts} className="gap-2">
                <Link2 className="h-4 w-4" />
                Connect Ad Accounts
              </Button>
              <p className="text-xs text-muted-foreground">
                Requires WhatsApp to be connected first. Your Meta access token
                will be used to discover ad accounts.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ----------------------------------------------------------------
  // Render
  // ----------------------------------------------------------------

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Ads Performance</h1>
          <p className="text-muted-foreground">
            Monitor your Meta ad campaigns and performance metrics
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRange)}>
            <SelectTrigger className="w-36 bg-card/50 border-border text-foreground">
              <SelectValue placeholder="Date range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="14d">Last 14 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSync}
            disabled={syncStatus.syncing}
            className="gap-2"
          >
            {syncStatus.syncing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Sync
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)}>
          <TabsList className="bg-card/50 border border-border">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
            <TabsTrigger value="accounts">Ad Accounts</TabsTrigger>
            <TabsTrigger value="audience">Audience Sync</TabsTrigger>
          </TabsList>

          {/* ============ TAB 1: OVERVIEW ============ */}
          <TabsContent value="overview" className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <SummaryCard
                title="Total Spend"
                value={formatCurrency(summary?.total_spend || 0)}
                icon={DollarSign}
                color="text-emerald-500"
              />
              <SummaryCard
                title="Impressions"
                value={formatNumber(summary?.total_impressions || 0)}
                icon={Eye}
                color="text-blue-500"
              />
              <SummaryCard
                title="Clicks"
                value={formatNumber(summary?.total_clicks || 0)}
                icon={MousePointerClick}
                color="text-violet-500"
              />
              <SummaryCard
                title="Reach"
                value={formatNumber(summary?.total_reach || 0)}
                icon={Users}
                color="text-orange-500"
              />
              <SummaryCard
                title="Conversions"
                value={formatNumber(summary?.total_conversions || 0)}
                icon={Target}
                color="text-green-500"
              />
              <SummaryCard
                title="Avg CTR"
                value={formatPercent(summary?.avg_ctr || 0)}
                icon={TrendingUp}
                color="text-cyan-500"
              />
              <SummaryCard
                title="Avg CPC"
                value={formatCurrency(summary?.avg_cpc || 0)}
                icon={MousePointerClick}
                color="text-pink-500"
              />
              <SummaryCard
                title="Avg CPM"
                value={formatCurrency(summary?.avg_cpm || 0)}
                icon={Eye}
                color="text-amber-500"
              />
            </div>

            {/* Performance Chart */}
            {daily.length > 0 ? (
              <Card className="bg-card/50 border-border">
                <CardHeader>
                  <CardTitle className="text-foreground">Performance Over Time</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={daily}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                          tickFormatter={(v) => {
                            const d = new Date(v)
                            return `${d.getMonth() + 1}/${d.getDate()}`
                          }}
                        />
                        <YAxis
                          yAxisId="left"
                          tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                        />
                        <YAxis
                          yAxisId="right"
                          orientation="right"
                          tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                            color: "hsl(var(--foreground))",
                          }}
                        />
                        <Legend />
                        <Line
                          yAxisId="left"
                          type="monotone"
                          dataKey="impressions"
                          stroke="#3b82f6"
                          strokeWidth={2}
                          dot={false}
                          name="Impressions"
                        />
                        <Line
                          yAxisId="left"
                          type="monotone"
                          dataKey="clicks"
                          stroke="#8b5cf6"
                          strokeWidth={2}
                          dot={false}
                          name="Clicks"
                        />
                        <Line
                          yAxisId="right"
                          type="monotone"
                          dataKey="spend"
                          stroke="#10b981"
                          strokeWidth={2}
                          dot={false}
                          name="Spend"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            ) : !hasData ? (
              <Card className="bg-card/50 border-border">
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <AlertCircle className="h-8 w-8 text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground">
                    No performance data yet. Click Sync to fetch data from Meta.
                  </p>
                </CardContent>
              </Card>
            ) : null}

            {/* Campaign Performance Table */}
            {sortedCampaignRows.length > 0 && (
              <Card className="bg-card/50 border-border">
                <CardHeader>
                  <CardTitle className="text-foreground">Campaign Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-muted-foreground">Campaign</TableHead>
                        <TableHead className="text-muted-foreground">Status</TableHead>
                        <TableHead
                          className="text-muted-foreground cursor-pointer"
                          onClick={() => toggleSort("impressions")}
                        >
                          <span className="flex items-center gap-1">
                            Impressions <ArrowUpDown className="h-3 w-3" />
                          </span>
                        </TableHead>
                        <TableHead
                          className="text-muted-foreground cursor-pointer"
                          onClick={() => toggleSort("clicks")}
                        >
                          <span className="flex items-center gap-1">
                            Clicks <ArrowUpDown className="h-3 w-3" />
                          </span>
                        </TableHead>
                        <TableHead
                          className="text-muted-foreground cursor-pointer"
                          onClick={() => toggleSort("ctr")}
                        >
                          <span className="flex items-center gap-1">
                            CTR <ArrowUpDown className="h-3 w-3" />
                          </span>
                        </TableHead>
                        <TableHead
                          className="text-muted-foreground cursor-pointer"
                          onClick={() => toggleSort("spend")}
                        >
                          <span className="flex items-center gap-1">
                            Spend <ArrowUpDown className="h-3 w-3" />
                          </span>
                        </TableHead>
                        <TableHead
                          className="text-muted-foreground cursor-pointer"
                          onClick={() => toggleSort("conversions")}
                        >
                          <span className="flex items-center gap-1">
                            Conversions <ArrowUpDown className="h-3 w-3" />
                          </span>
                        </TableHead>
                        <TableHead
                          className="text-muted-foreground cursor-pointer"
                          onClick={() => toggleSort("cpc")}
                        >
                          <span className="flex items-center gap-1">
                            CPC <ArrowUpDown className="h-3 w-3" />
                          </span>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedCampaignRows.map((row) => (
                        <TableRow key={row.campaign_id}>
                          <TableCell className="font-medium text-foreground">
                            {row.campaign_name}
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={row.status} />
                          </TableCell>
                          <TableCell className="text-foreground">
                            {formatNumber(row.impressions)}
                          </TableCell>
                          <TableCell className="text-foreground">
                            {formatNumber(row.clicks)}
                          </TableCell>
                          <TableCell className="text-foreground">
                            {formatPercent(row.ctr)}
                          </TableCell>
                          <TableCell className="text-foreground">
                            {formatCurrency(row.spend)}
                          </TableCell>
                          <TableCell className="text-foreground">
                            {formatNumber(row.conversions)}
                          </TableCell>
                          <TableCell className="text-foreground">
                            {formatCurrency(row.cpc)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ============ TAB 2: CAMPAIGNS ============ */}
          <TabsContent value="campaigns" className="space-y-4">
            <div className="flex items-center gap-3">
              <Select value={campaignFilter} onValueChange={setCampaignFilter}>
                <SelectTrigger className="w-40 bg-card/50 border-border text-foreground">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Status</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="PAUSED">Paused</SelectItem>
                  <SelectItem value="ARCHIVED">Archived</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-sm text-muted-foreground">
                {campaigns.length} campaign(s)
              </span>
            </div>

            {campaigns.length === 0 ? (
              <Card className="bg-card/50 border-border">
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <AlertCircle className="h-8 w-8 text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground">
                    No campaigns found. Sync your ad accounts to import campaigns.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-card/50 border-border">
                <CardContent className="pt-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-muted-foreground">Campaign Name</TableHead>
                        <TableHead className="text-muted-foreground">Objective</TableHead>
                        <TableHead className="text-muted-foreground">Status</TableHead>
                        <TableHead className="text-muted-foreground">Daily Budget</TableHead>
                        <TableHead className="text-muted-foreground">Lifetime Budget</TableHead>
                        <TableHead className="text-muted-foreground">Start</TableHead>
                        <TableHead className="text-muted-foreground">End</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {campaigns.map((c) => (
                        <TableRow key={c.id}>
                          <TableCell className="font-medium text-foreground">
                            {c.name}
                          </TableCell>
                          <TableCell className="text-foreground">
                            {c.objective || "-"}
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={c.status} />
                          </TableCell>
                          <TableCell className="text-foreground">
                            {c.daily_budget ? formatCurrency(c.daily_budget) : "-"}
                          </TableCell>
                          <TableCell className="text-foreground">
                            {c.lifetime_budget ? formatCurrency(c.lifetime_budget) : "-"}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-xs">
                            {c.start_time
                              ? new Date(c.start_time).toLocaleDateString()
                              : "-"}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-xs">
                            {c.stop_time
                              ? new Date(c.stop_time).toLocaleDateString()
                              : "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ============ TAB 3: AD ACCOUNTS ============ */}
          <TabsContent value="accounts" className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {adAccounts.length} connected account(s)
              </span>
              <Button onClick={handleConnectAccounts} variant="outline" size="sm" className="gap-2">
                <Link2 className="h-4 w-4" />
                Refresh Accounts
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {adAccounts.map((acc) => (
                <Card key={acc.id} className="bg-card/50 border-border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-foreground text-base flex items-center justify-between">
                      <span>{acc.name || acc.meta_ad_account_id}</span>
                      <Badge variant={acc.is_active ? "default" : "secondary"}>
                        {acc.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Account ID</span>
                      <span className="text-foreground font-mono text-xs">
                        {acc.meta_ad_account_id}
                      </span>
                    </div>
                    {acc.business_name && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Business</span>
                        <span className="text-foreground">{acc.business_name}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Currency</span>
                      <span className="text-foreground">{acc.currency}</span>
                    </div>
                    {acc.timezone_name && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Timezone</span>
                        <span className="text-foreground">{acc.timezone_name}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Last Synced</span>
                      <span className="text-foreground text-xs">
                        {acc.last_synced_at
                          ? new Date(acc.last_synced_at).toLocaleString()
                          : "Never"}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* ============ TAB 4: AUDIENCE SYNC ============ */}
          <TabsContent value="audience" className="space-y-4">
            <Card className="bg-card/50 border-border">
              <CardHeader>
                <CardTitle className="text-foreground">Lookalike Audience Sync</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Sync your customer segments to Meta Custom Audiences and create
                  Lookalike Audiences to find new customers similar to your best ones.
                </p>
                <div className="rounded-lg border border-border bg-muted/30 p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        Meta Business Verification Required
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Audience sync requires Meta Business verification and the
                        ads_management permission. Once approved, you can sync
                        segments directly from the Segments page.
                      </p>
                    </div>
                  </div>
                </div>
                <Button variant="outline" disabled className="gap-2">
                  <Users className="h-4 w-4" />
                  Sync Audience (Pending Verification)
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                      */
/* ------------------------------------------------------------------ */

function SummaryCard({
  title,
  value,
  icon: Icon,
  color,
}: {
  title: string
  value: string
  icon: React.ComponentType<{ className?: string }>
  color: string
}) {
  return (
    <Card className="bg-card/50 border-border">
      <CardContent className="flex items-center gap-3 py-4">
        <div className={`rounded-lg bg-muted p-2 ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{title}</p>
          <p className="text-lg font-bold text-foreground">{value}</p>
        </div>
      </CardContent>
    </Card>
  )
}

function StatusBadge({ status }: { status: string | null }) {
  if (!status) return <Badge variant="secondary">Unknown</Badge>

  switch (status.toUpperCase()) {
    case "ACTIVE":
      return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Active</Badge>
    case "PAUSED":
      return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">Paused</Badge>
    case "DELETED":
      return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Deleted</Badge>
    case "ARCHIVED":
      return <Badge variant="secondary">Archived</Badge>
    default:
      return <Badge variant="secondary">{status}</Badge>
  }
}
