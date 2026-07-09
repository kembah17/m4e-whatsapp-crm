"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  ArrowLeft,
  Download,
  Loader2,
  TrendingUp,
  TrendingDown,
  Minus,
  Megaphone,
  UserPlus,
  MessageSquare,
  ShoppingCart,
  Repeat,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  Users,
  Calendar,
} from "lucide-react"
import { cn } from "@/lib/utils"

// ---------------------------------------------------------------------------
// Types (matching report_data JSONB)
// ---------------------------------------------------------------------------

interface ScorecardItem {
  value: number
  label: string
  change_pct: number
}

interface ReportData {
  executive_summary: string
  scorecard: {
    attract: ScorecardItem
    capture: ScorecardItem
    nurture: ScorecardItem
    close: ScorecardItem
    expand: ScorecardItem
  }
  financials: {
    ad_spend: number
    revenue: number
    roi_multiple: number
    cost_per_customer: number
    avg_order_value: number
  }
  what_worked: string[]
  needs_attention: string[]
  recommendations: string[]
  lookalike_update: {
    customers_synced: number
    audience_reach: number
    lookalike_leads: number
    lookalike_pct: number
  } | null
  next_report_date: string
}

interface ReportRecord {
  id: string
  report_type: string
  period_start: string
  period_end: string
  report_data: ReportData
  delivered_via: string[] | null
  delivered_at: string | null
  created_at: string
}

// ---------------------------------------------------------------------------
// Stage config
// ---------------------------------------------------------------------------

const STAGE_CONFIG = [
  { key: "attract" as const, label: "Attract", icon: Megaphone, color: "text-blue-400", bg: "bg-blue-400/10" },
  { key: "capture" as const, label: "Capture", icon: UserPlus, color: "text-green-400", bg: "bg-green-400/10" },
  { key: "nurture" as const, label: "Nurture", icon: MessageSquare, color: "text-yellow-400", bg: "bg-yellow-400/10" },
  { key: "close" as const, label: "Close", icon: ShoppingCart, color: "text-orange-400", bg: "bg-orange-400/10" },
  { key: "expand" as const, label: "Expand", icon: Repeat, color: "text-purple-400", bg: "bg-purple-400/10" },
]

function formatNaira(n: number): string {
  return "N" + n.toLocaleString()
}

function ChangeIndicator({ pct }: { pct: number }) {
  if (pct > 0) {
    return (
      <span className="inline-flex items-center gap-1 text-sm font-medium text-green-400">
        <TrendingUp className="h-3.5 w-3.5" /> +{pct}%
      </span>
    )
  }
  if (pct < 0) {
    return (
      <span className="inline-flex items-center gap-1 text-sm font-medium text-red-400">
        <TrendingDown className="h-3.5 w-3.5" /> {pct}%
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-sm font-medium text-slate-400">
      <Minus className="h-3.5 w-3.5" /> 0%
    </span>
  )
}

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function ReportDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [report, setReport] = useState<ReportRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchReport() {
      try {
        const res = await fetch(`/api/funnel/reports?limit=100`)
        if (!res.ok) throw new Error("Failed to fetch reports")
        const json = await res.json()
        const found = (json.reports ?? []).find((r: ReportRecord) => r.id === params.id)
        if (!found) throw new Error("Report not found")
        setReport(found)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load report")
      } finally {
        setLoading(false)
      }
    }
    if (params.id) fetchReport()
  }, [params.id])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
      </div>
    )
  }

  if (error || !report) {
    return (
      <div className="max-w-3xl mx-auto py-12 text-center">
        <p className="text-red-400 mb-4">{error ?? "Report not found"}</p>
        <Button variant="outline" onClick={() => router.push("/funnel")}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Funnel
        </Button>
      </div>
    )
  }

  const data = report.report_data

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push("/funnel")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-white">Funnel Report</h1>
            <p className="text-sm text-slate-400">
              {report.period_start} to {report.period_end}
              <Badge variant="outline" className="ml-2 capitalize">{report.report_type}</Badge>
            </p>
          </div>
        </div>
        <Button variant="outline" disabled title="Coming soon">
          <Download className="h-4 w-4 mr-2" /> Download PDF
        </Button>
      </div>

      {/* Executive Summary */}
      <Card className="border-indigo-500/20 bg-[#1e1b4b]/40">
        <CardContent className="pt-6">
          <p className="text-slate-200 leading-relaxed text-lg">{data.executive_summary}</p>
        </CardContent>
      </Card>

      {/* 5-Stage Scorecard */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-3">Funnel Scorecard</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {STAGE_CONFIG.map(({ key, label, icon: Icon, color, bg }) => {
            const item = data.scorecard[key]
            return (
              <Card key={key} className={cn("border-slate-700/50", bg)}>
                <CardContent className="pt-4 pb-3 px-4 text-center">
                  <Icon className={cn("h-5 w-5 mx-auto mb-1", color)} />
                  <p className="text-xs text-slate-400 mb-1">{label}</p>
                  <p className="text-2xl font-bold text-white">{item.value.toLocaleString()}</p>
                  <p className="text-xs text-slate-500 mb-1">{item.label}</p>
                  <ChangeIndicator pct={item.change_pct} />
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Money In vs Money Out */}
      <Card className="border-slate-700/50">
        <CardHeader>
          <CardTitle className="text-white text-lg">Money In vs Money Out</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-slate-400 mb-1">Ad Spend</p>
              <p className="text-xl font-bold text-red-400">{formatNaira(data.financials.ad_spend)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-1">Revenue</p>
              <p className="text-xl font-bold text-green-400">{formatNaira(data.financials.revenue)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-1">ROI</p>
              <p className="text-xl font-bold text-indigo-400">{data.financials.roi_multiple}x</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-1">Cost per Customer</p>
              <p className="text-xl font-bold text-slate-200">{formatNaira(data.financials.cost_per_customer)}</p>
            </div>
          </div>
          {data.financials.avg_order_value > 0 && (
            <p className="text-sm text-slate-400 mt-3">
              Average order value: {formatNaira(data.financials.avg_order_value)}
            </p>
          )}
        </CardContent>
      </Card>

      {/* What Worked / Needs Attention / Recommendations */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="border-green-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-green-400 text-base flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" /> What Worked
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {data.what_worked.map((item, i) => (
                <li key={i} className="text-sm text-slate-300 flex gap-2">
                  <span className="text-green-400 mt-0.5 shrink-0">+</span>
                  {item}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="border-yellow-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-yellow-400 text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" /> Needs Attention
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {data.needs_attention.map((item, i) => (
                <li key={i} className="text-sm text-slate-300 flex gap-2">
                  <span className="text-yellow-400 mt-0.5 shrink-0">!</span>
                  {item}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="border-blue-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-blue-400 text-base flex items-center gap-2">
              <Lightbulb className="h-4 w-4" /> Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {data.recommendations.map((item, i) => (
                <li key={i} className="text-sm text-slate-300 flex gap-2">
                  <span className="text-blue-400 mt-0.5 shrink-0">{i + 1}.</span>
                  {item}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Lookalike Update */}
      {data.lookalike_update && (
        <Card className="border-purple-500/20">
          <CardHeader>
            <CardTitle className="text-purple-400 text-base flex items-center gap-2">
              <Users className="h-4 w-4" /> Lookalike Audience Update
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-slate-400">Customers Synced</p>
                <p className="text-lg font-bold text-white">{data.lookalike_update.customers_synced}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Audience Reach</p>
                <p className="text-lg font-bold text-white">{data.lookalike_update.audience_reach.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Lookalike Leads</p>
                <p className="text-lg font-bold text-white">{data.lookalike_update.lookalike_leads}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Match Rate</p>
                <p className="text-lg font-bold text-white">{data.lookalike_update.lookalike_pct}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Next Report Date */}
      <Separator className="border-slate-700/50" />
      <div className="flex items-center justify-center gap-2 text-slate-400 text-sm">
        <Calendar className="h-4 w-4" />
        Next report: <span className="text-white font-medium">{data.next_report_date}</span>
      </div>
    </div>
  )
}
