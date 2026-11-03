"use client"

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  AlertTriangle,
  Plus,
  Trash2,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  Receipt,
  Clock,
  Users,
  CreditCard,
  Target,
  Lightbulb,
  Building2,
  Download,
  Upload,
  ExternalLink,
  Activity,
  BarChart3,
  ShieldCheck,
  FileText,
  CalendarClock,
} from 'lucide-react'
import type {
  FinancialSummary,
  AgingBucket,
  RevenueCenterPerformance,
  RevenueByChannel,
  TopCustomer,
  MonthlyTrend,
  FinancialDiagnostic,
  Expense,
  RevenueCenter,
  FinancialTarget,
  ExpenseCategory,
  ManagerMetrics,
  HealthScore,
  CashFlowProjectionDay,
  TargetProgress,
  RevenueByProduct,
} from '@/types/financials'
import { EXPENSE_CATEGORY_LABELS } from '@/types/financials'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const fmtNGN = (v: number) =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(v)

const fmtPct = (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`

const fmtDate = (iso: string) => {
  const d = new Date(iso)
  return d.toLocaleDateString('en-NG', { day: '2-digit', month: 'short', year: 'numeric' })
}

function exportToCSV(data: Record<string, unknown>[], filename: string) {
  if (!data || data.length === 0) {
    toast.error('No data to export')
    return
  }
  const headers = Object.keys(data[0] || {})
  const csv = [
    headers.join(','),
    ...data.map((row) =>
      headers.map((h) => JSON.stringify(row[h] ?? '')).join(',')
    ),
  ].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${filename}_${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

type PeriodKey = 'this_month' | 'last_month' | 'this_quarter' | 'last_quarter' | 'this_year' | 'ytd'

function periodRange(key: PeriodKey): { start: string; end: string } {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth()
  switch (key) {
    case 'this_month':
      return {
        start: new Date(y, m, 1).toISOString().slice(0, 10),
        end: now.toISOString().slice(0, 10),
      }
    case 'last_month':
      return {
        start: new Date(y, m - 1, 1).toISOString().slice(0, 10),
        end: new Date(y, m, 0).toISOString().slice(0, 10),
      }
    case 'this_quarter': {
      const qStart = Math.floor(m / 3) * 3
      return {
        start: new Date(y, qStart, 1).toISOString().slice(0, 10),
        end: now.toISOString().slice(0, 10),
      }
    }
    case 'last_quarter': {
      const qStart = Math.floor(m / 3) * 3 - 3
      return {
        start: new Date(y, qStart, 1).toISOString().slice(0, 10),
        end: new Date(y, qStart + 3, 0).toISOString().slice(0, 10),
      }
    }
    case 'this_year':
      return {
        start: new Date(y, 0, 1).toISOString().slice(0, 10),
        end: now.toISOString().slice(0, 10),
      }
    case 'ytd':
      return {
        start: `${y}-01-01`,
        end: now.toISOString().slice(0, 10),
      }
  }
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function FinancialsPage() {
  const { accountId } = useAuth()
  const [activeTab, setActiveTab] = useState('owner')
  const [period, setPeriod] = useState<PeriodKey>('this_month')
  const [loading, setLoading] = useState(true)

  // Owner View data
  const [summary, setSummary] = useState<FinancialSummary | null>(null)
  const [aging, setAging] = useState<AgingBucket | null>(null)
  const [centers, setCenters] = useState<RevenueCenterPerformance[]>([])
  const [trends, setTrends] = useState<MonthlyTrend[]>([])
  const [diagnostics, setDiagnostics] = useState<FinancialDiagnostic[]>([])
  const [healthScore, setHealthScore] = useState<HealthScore | null>(null)
  const [cashFlow, setCashFlow] = useState<CashFlowProjectionDay[]>([])

  // Manager View data
  const [channels, setChannels] = useState<RevenueByChannel[]>([])
  const [customers, setCustomers] = useState<TopCustomer[]>([])
  const [managerMetrics, setManagerMetrics] = useState<ManagerMetrics | null>(null)
  const [productRevenue, setProductRevenue] = useState<RevenueByProduct[]>([])

  // Finance View data
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [expenseCount, setExpenseCount] = useState(0)
  const [revenueCenters, setRevenueCenters] = useState<RevenueCenter[]>([])
  const [targets, setTargets] = useState<FinancialTarget[]>([])
  const [targetProgress, setTargetProgress] = useState<TargetProgress[]>([])

  // Expense form
  const [showExpenseForm, setShowExpenseForm] = useState(false)
  const [expenseForm, setExpenseForm] = useState({
    category: 'other' as ExpenseCategory,
    description: '',
    amount: '',
    expense_date: new Date().toISOString().slice(0, 10),
    payment_method: 'bank_transfer',
    vendor: '',
    notes: '',
  })
  const receiptInputRef = useRef<HTMLInputElement>(null)
  const [receiptFile, setReceiptFile] = useState<File | null>(null)

  // Revenue center form
  const [showCenterForm, setShowCenterForm] = useState(false)
  const [centerName, setCenterName] = useState('')
  const [centerDesc, setCenterDesc] = useState('')

  // Target form
  const [showTargetForm, setShowTargetForm] = useState(false)
  const [targetForm, setTargetForm] = useState({
    target_type: 'revenue',
    period_type: 'monthly',
    period_start: new Date().toISOString().slice(0, 10),
    target_amount: '',
    notes: '',
  })

  // Expense filter
  const [expCategoryFilter, setExpCategoryFilter] = useState('')

  const range = periodRange(period)

  // Fetch Owner View data
  const fetchOwner = useCallback(async () => {
    setLoading(true)
    try {
      const qs = `start=${range.start}&end=${range.end}`
      const [sumRes, agingRes, cenRes, diagRes, trendRes, cfRes] = await Promise.all([
        fetch(`/api/financials/summary?${qs}`),
        fetch('/api/financials/aging'),
        fetch(`/api/financials/centers?${qs}`),
        fetch('/api/financials/diagnostics'),
        fetch('/api/financials/trends?months=6'),
        fetch('/api/financials/cashflow'),
      ])
      if (sumRes.ok) setSummary(await sumRes.json())
      if (agingRes.ok) setAging(await agingRes.json())
      if (cenRes.ok) {
        const d = await cenRes.json()
        setCenters(d.centers ?? [])
      }
      if (diagRes.ok) {
        const d = await diagRes.json()
        setDiagnostics(d.diagnostics ?? [])
        if (d.healthScore) setHealthScore(d.healthScore)
      }
      if (trendRes.ok) {
        const d = await trendRes.json()
        setTrends(d.trends ?? [])
      }
      if (cfRes.ok) {
        const d = await cfRes.json()
        setCashFlow(d.projection ?? [])
      }
    } catch (err) {
      console.error('Failed to fetch owner data:', err)
      toast.error('Failed to load financial data')
    } finally {
      setLoading(false)
    }
  }, [range.start, range.end])

  // Fetch Manager View data
  const fetchManager = useCallback(async () => {
    try {
      const qs = `start=${range.start}&end=${range.end}`
      const [chRes, custRes, mmRes, prodRes] = await Promise.all([
        fetch(`/api/financials/channels?${qs}`),
        fetch(`/api/financials/customers?${qs}&limit=10`),
        fetch(`/api/financials/manager-metrics?${qs}`),
        fetch(`/api/financials/products?${qs}`),
      ])
      if (chRes.ok) {
        const d = await chRes.json()
        setChannels(d.channels ?? [])
      }
      if (custRes.ok) {
        const d = await custRes.json()
        setCustomers(d.customers ?? [])
      }
      if (mmRes.ok) {
        const d = await mmRes.json()
        setManagerMetrics(d.metrics ?? null)
      }
      if (prodRes.ok) {
        const d = await prodRes.json()
        setProductRevenue(d.products ?? [])
      }
    } catch (err) {
      console.error('Failed to fetch manager data:', err)
    }
  }, [range.start, range.end])

  // Fetch Finance View data
  const fetchFinance = useCallback(async () => {
    try {
      const catParam = expCategoryFilter && expCategoryFilter !== 'all' ? `&category=${expCategoryFilter}` : ''
      const [expRes, rcRes, tgtRes, tpRes] = await Promise.all([
        fetch(`/api/expenses?start=${range.start}&end=${range.end}${catParam}&limit=50`),
        fetch('/api/revenue-centers'),
        fetch('/api/financial-targets'),
        fetch('/api/financial-targets/progress'),
      ])
      if (expRes.ok) {
        const d = await expRes.json()
        setExpenses(d.expenses ?? [])
        setExpenseCount(d.count ?? 0)
      }
      if (rcRes.ok) {
        const d = await rcRes.json()
        setRevenueCenters(d.centers ?? [])
      }
      if (tgtRes.ok) {
        const d = await tgtRes.json()
        setTargets(d.targets ?? [])
      }
      if (tpRes.ok) {
        const d = await tpRes.json()
        setTargetProgress(d.targets ?? [])
      }
    } catch (err) {
      console.error('Failed to fetch finance data:', err)
    }
  }, [range.start, range.end, expCategoryFilter])

  useEffect(() => {
    if (!accountId) return
    if (activeTab === 'owner') fetchOwner()
    else if (activeTab === 'manager') {
      fetchOwner()
      fetchManager()
    } else if (activeTab === 'finance') fetchFinance()
  }, [accountId, activeTab, period, fetchOwner, fetchManager, fetchFinance])

  // Handlers
  async function handleCreateExpense() {
    if (!expenseForm.description || !expenseForm.amount) {
      toast.error('Description and amount are required')
      return
    }
    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...expenseForm,
          amount: parseFloat(expenseForm.amount),
        }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error || 'Failed to create expense')
      }
      const created = await res.json()

      // Upload receipt if selected
      if (receiptFile && created?.expense?.id) {
        const formData = new FormData()
        formData.append('file', receiptFile)
        formData.append('expense_id', created.expense.id)
        await fetch('/api/expenses/upload-receipt', { method: 'POST', body: formData })
      }

      toast.success('Expense recorded')
      setShowExpenseForm(false)
      setExpenseForm({
        category: 'other',
        description: '',
        amount: '',
        expense_date: new Date().toISOString().slice(0, 10),
        payment_method: 'bank_transfer',
        vendor: '',
        notes: '',
      })
      setReceiptFile(null)
      fetchFinance()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create expense')
    }
  }

  async function handleDeleteExpense(id: string) {
    try {
      const res = await fetch(`/api/expenses/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      toast.success('Expense deleted')
      fetchFinance()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete expense')
    }
  }

  async function handleCreateCenter() {
    if (!centerName.trim()) {
      toast.error('Name is required')
      return
    }
    try {
      const res = await fetch('/api/revenue-centers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: centerName, description: centerDesc }),
      })
      if (!res.ok) throw new Error('Failed to create')
      toast.success('Revenue center created')
      setShowCenterForm(false)
      setCenterName('')
      setCenterDesc('')
      fetchFinance()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create revenue center')
    }
  }

  async function handleDeleteCenter(id: string) {
    try {
      const res = await fetch(`/api/revenue-centers/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      toast.success('Revenue center removed')
      fetchFinance()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete')
    }
  }

  async function handleCreateTarget() {
    if (!targetForm.target_amount) {
      toast.error('Target amount is required')
      return
    }
    try {
      const res = await fetch('/api/financial-targets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...targetForm,
          target_amount: parseFloat(targetForm.target_amount),
        }),
      })
      if (!res.ok) throw new Error('Failed to create')
      toast.success('Target set')
      setShowTargetForm(false)
      setTargetForm({
        target_type: 'revenue',
        period_type: 'monthly',
        period_start: new Date().toISOString().slice(0, 10),
        target_amount: '',
        notes: '',
      })
      fetchFinance()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create target')
    }
  }

  async function handleDeleteTarget(id: string) {
    try {
      const res = await fetch(`/api/financial-targets/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      toast.success('Target removed')
      fetchFinance()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete target')
    }
  }

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------

  function KPICard({
    title,
    value,
    change,
    icon: Icon,
  }: {
    title: string
    value: string
    change: number
    icon: React.ElementType
  }) {
    const isPositive = change >= 0
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{title}</p>
              <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
              <div className={`flex items-center gap-1 mt-1 text-sm ${isPositive ? 'text-emerald-600' : 'text-red-500'}`}>
                {isPositive ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                <span>{fmtPct(change)} vs prev period</span>
              </div>
            </div>
            <div className="rounded-lg bg-primary/10 p-3">
              <Icon className="h-6 w-6 text-primary" />
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  function ConfidenceBadge({ level }: { level: string }) {
    const colors: Record<string, string> = {
      HIGH: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      MEDIUM: 'bg-amber-100 text-amber-800 border-amber-200',
      LOW: 'bg-muted text-muted-foreground border-border',
    }
    return (
      <Badge variant="outline" className={colors[level] ?? colors.LOW}>
        {level}
      </Badge>
    )
  }

  // ---------------------------------------------------------------------------
  // Tab 1: Owner View (was Overview)
  // ---------------------------------------------------------------------------

  function OwnerTab() {
    if (loading && !summary) {
      return <div className="py-12 text-center text-muted-foreground">Loading financial data...</div>
    }
    if (!summary) {
      return <div className="py-12 text-center text-muted-foreground">No financial data available for this period.</div>
    }

    const maxTrend = Math.max(...(trends || []).map((t) => Math.max(t.revenue, t.expenses)), 1)
    const agingTotal = aging
      ? aging.current + aging.days_1_30 + aging.days_31_60 + aging.days_61_90 + aging.days_90_plus
      : 0

    // Cash flow chart helpers
    const cfMin = Math.min(...(cashFlow || []).map((d) => d.cumulative), 0)
    const cfMax = Math.max(...(cashFlow || []).map((d) => d.cumulative), 1)
    const cfRange = Math.max(cfMax - cfMin, 1)

    return (
      <div className="space-y-6">
        {/* Health Score + KPI Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* Health Score Card */}
          {healthScore && (
            <Card className="lg:col-span-1">
              <CardContent className="pt-6 flex flex-col items-center">
                <div className="relative w-24 h-24">
                  <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="8" className="text-muted" />
                    <circle
                      cx="50" cy="50" r="42" fill="none" strokeWidth="8"
                      strokeDasharray={`${(healthScore.score / 100) * 264} 264`}
                      strokeLinecap="round"
                      className={healthScore.grade === 'A' || healthScore.grade === 'B' ? 'text-emerald-500' : healthScore.grade === 'C' ? 'text-amber-500' : 'text-red-500'}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-bold">{healthScore.grade}</span>
                    <span className="text-xs text-muted-foreground">{healthScore.score}/100</span>
                  </div>
                </div>
                <p className="text-sm font-medium mt-2">Health Score</p>
                <div className="w-full mt-3 space-y-1">
                  {(healthScore.factors || []).map((f) => (
                    <div key={f.name} className="flex items-center gap-2 text-xs">
                      <span className="w-20 truncate text-muted-foreground">{f.name}</span>
                      <Progress value={f.score} className="h-1.5 flex-1" />
                      <span className="w-8 text-right">{f.score}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* KPI Cards */}
          <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 ${healthScore ? 'lg:col-span-4' : 'lg:col-span-5'}`}>
            <KPICard title="Total Revenue" value={fmtNGN(summary.totalSales)} change={summary.changePercent.totalSales} icon={DollarSign} />
            <KPICard title="Gross Profit" value={fmtNGN(summary.grossProfit)} change={summary.changePercent.grossProfit} icon={TrendingUp} />
            <KPICard title="Collections" value={fmtNGN(summary.totalCollected)} change={summary.changePercent.totalCollected} icon={Wallet} />
            <KPICard title="Outstanding" value={fmtNGN(summary.totalOutstanding)} change={summary.changePercent.totalOutstanding} icon={Clock} />
          </div>
        </div>

        {/* Monthly Trend Chart */}
        {(trends || []).length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Monthly Trend (6 Months)</CardTitle>
              <Button
                variant="outline"
                size="sm"
                className="gap-1"
                onClick={() =>
                  exportToCSV(
                    (trends || []).map((t) => ({ month: t.month, revenue: t.revenue, expenses: t.expenses, profit: t.profit, collections: t.collections })),
                    'monthly_trends'
                  )
                }
              >
                <Download className="h-3 w-3" /> CSV
              </Button>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-2 h-48">
                {(trends || []).map((t) => (
                  <div key={t.month} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full flex gap-0.5 items-end" style={{ height: '160px' }}>
                      <div
                        className="flex-1 bg-primary/80 rounded-t"
                        style={{ height: `${(t.revenue / maxTrend) * 100}%`, minHeight: '2px' }}
                        title={`Revenue: ${fmtNGN(t.revenue)}`}
                      />
                      <div
                        className="flex-1 bg-destructive/60 rounded-t"
                        style={{ height: `${(t.expenses / maxTrend) * 100}%`, minHeight: '2px' }}
                        title={`Expenses: ${fmtNGN(t.expenses)}`}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground truncate w-full text-center">{t.month}</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-primary/80" /> Revenue</div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-destructive/60" /> Expenses</div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Cash Flow Projection (Feature 8) */}
        {(cashFlow || []).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-4 w-4" /> 30-Day Cash Flow Projection
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-40 flex items-end gap-px">
                {(cashFlow || []).map((d, i) => {
                  const pct = cfRange > 0 ? ((d.cumulative - cfMin) / cfRange) * 100 : 50
                  return (
                    <div
                      key={d.date}
                      className={`flex-1 rounded-t transition-colors ${
                        d.cumulative >= 0 ? 'bg-emerald-500/70' : 'bg-red-500/70'
                      }`}
                      style={{ height: `${Math.max(pct, 2)}%` }}
                      title={`${d.date}: ${fmtNGN(d.cumulative)} (In: ${fmtNGN(d.projected_inflow)}, Out: ${fmtNGN(d.projected_outflow)})`}
                    />
                  )
                })}
              </div>
              <div className="flex justify-between text-xs text-muted-foreground mt-2">
                <span>{(cashFlow || [])[0]?.date || ''}</span>
                <span className="text-center">
                  Net: {fmtNGN((cashFlow || [])[(cashFlow || []).length - 1]?.cumulative || 0)}
                </span>
                <span>{(cashFlow || [])[(cashFlow || []).length - 1]?.date || ''}</span>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue Center Performance */}
          {(centers || []).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Building2 className="h-4 w-4" /> Revenue Centers
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(centers || []).map((c) => {
                  const maxRev = Math.max(...(centers || []).map((x) => x.revenue), 1)
                  return (
                    <div key={c.center_name}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-foreground">{c.center_name}</span>
                        <span className="text-muted-foreground">{fmtNGN(c.revenue)}</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${c.status === 'green' ? 'bg-emerald-500' : c.status === 'yellow' ? 'bg-amber-500' : 'bg-red-500'}`}
                          style={{ width: `${(c.revenue / maxRev) * 100}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          )}

          {/* Aging Summary */}
          {aging && agingTotal > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" /> Receivables Aging
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {[
                    { label: 'Current (0-30 days)', value: aging.current, color: 'bg-emerald-500' },
                    { label: '31-60 days', value: aging.days_1_30, color: 'bg-amber-400' },
                    { label: '61-90 days', value: aging.days_31_60, color: 'bg-orange-500' },
                    { label: '91-120 days', value: aging.days_61_90, color: 'bg-red-400' },
                    { label: '120+ days', value: aging.days_90_plus, color: 'bg-red-600' },
                  ].map((b) => (
                    <div key={b.label}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-foreground">{b.label}</span>
                        <span className="text-muted-foreground">{fmtNGN(b.value)}</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${b.color}`} style={{ width: `${agingTotal > 0 ? (b.value / agingTotal) * 100 : 0}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
                {aging.attention_required > 0 && (
                  <div className="mt-3 p-2 rounded bg-destructive/10 text-sm text-destructive flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    {fmtNGN(aging.attention_required)} requires immediate attention
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Financial Diagnostics */}
        {(diagnostics || []).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Lightbulb className="h-4 w-4" /> Financial Insights
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(diagnostics || []).map((d) => (
                <div key={d.id} className="p-3 rounded-lg border border-border bg-card">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm text-foreground">{d.message}</p>
                    <ConfidenceBadge level={d.confidence} />
                  </div>
                  {d.suggested_action && (
                    <p className="text-xs text-muted-foreground mt-2 italic">Suggested: {d.suggested_action}</p>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // Tab 2: Manager View (was Details)
  // ---------------------------------------------------------------------------

  function ManagerTab() {
    return (
      <div className="space-y-6">
        {/* Manager Metrics Summary (Feature 5) */}
        {managerMetrics && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: 'Invoices Sent', value: String(managerMetrics.invoices_sent), icon: FileText },
              { label: 'Invoices Paid', value: String(managerMetrics.invoices_paid), icon: ShieldCheck },
              { label: 'Collection Rate', value: `${managerMetrics.collection_rate.toFixed(1)}%`, icon: Wallet },
              { label: 'Avg Days to Pay', value: `${managerMetrics.avg_days_to_pay}d`, icon: CalendarClock },
              { label: 'Overdue', value: `${managerMetrics.overdue_count} (${fmtNGN(managerMetrics.overdue_value)})`, icon: AlertTriangle },
              { label: 'Active Plans', value: String(managerMetrics.active_installments), icon: CreditCard },
            ].map((m) => (
              <Card key={m.label}>
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-center gap-2 mb-1">
                    <m.icon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">{m.label}</span>
                  </div>
                  <p className="text-lg font-bold text-foreground">{m.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Revenue Center Drill-down */}
        {(centers || []).length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Revenue Center Performance</CardTitle>
              <Button
                variant="outline"
                size="sm"
                className="gap-1"
                onClick={() =>
                  exportToCSV(
                    (centers || []).map((c) => ({
                      center: c.center_name,
                      revenue: c.revenue,
                      profit: c.profit,
                      margin: c.margin,
                      collections_rate: c.collections_rate,
                      growth: c.growth_vs_previous,
                    })),
                    'revenue_centers'
                  )
                }
              >
                <Download className="h-3 w-3" /> CSV
              </Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 text-muted-foreground font-medium">Center</th>
                      <th className="text-right py-2 text-muted-foreground font-medium">Revenue</th>
                      <th className="text-right py-2 text-muted-foreground font-medium">Profit</th>
                      <th className="text-right py-2 text-muted-foreground font-medium">Margin</th>
                      <th className="text-right py-2 text-muted-foreground font-medium">Collections</th>
                      <th className="text-right py-2 text-muted-foreground font-medium">Growth</th>
                      <th className="text-center py-2 text-muted-foreground font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(centers || []).map((c) => (
                      <tr key={c.center_name} className="border-b border-border/50">
                        <td className="py-2 text-foreground">{c.center_name}</td>
                        <td className="py-2 text-right text-foreground">{fmtNGN(c.revenue)}</td>
                        <td className="py-2 text-right text-foreground">{fmtNGN(c.profit)}</td>
                        <td className="py-2 text-right text-foreground">{c.margin.toFixed(1)}%</td>
                        <td className="py-2 text-right text-foreground">{c.collections_rate.toFixed(1)}%</td>
                        <td className={`py-2 text-right ${c.growth_vs_previous >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                          {fmtPct(c.growth_vs_previous)}
                        </td>
                        <td className="py-2 text-center">
                          <span className={`inline-block w-3 h-3 rounded-full ${c.status === 'green' ? 'bg-emerald-500' : c.status === 'yellow' ? 'bg-amber-500' : 'bg-red-500'}`} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Revenue by Product (Feature 9) */}
        {(productRevenue || []).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-4 w-4" /> Revenue by Product
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {(productRevenue || []).map((p) => (
                <div key={p.product_id}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-foreground truncate max-w-[60%]">{p.product_name}</span>
                    <span className="text-muted-foreground">{fmtNGN(p.revenue)} ({p.percentage.toFixed(1)}%)</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-primary/70" style={{ width: `${p.percentage}%` }} />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Payment Channels */}
        {(channels || []).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <CreditCard className="h-4 w-4" /> Payment Channels
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {(channels || []).map((ch) => (
                  <div key={ch.channel} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="capitalize text-foreground">{ch.channel.replace(/_/g, ' ')}</span>
                      <span className="text-muted-foreground">({ch.count} txns)</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-foreground font-medium">{fmtNGN(ch.amount)}</span>
                      <span className="text-muted-foreground w-12 text-right">{ch.percentage.toFixed(1)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Top Customers */}
        {(customers || []).length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4" /> Top Customers
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                className="gap-1"
                onClick={() =>
                  exportToCSV(
                    (customers || []).map((c) => ({ customer: c.contact_name, revenue: c.revenue, orders: c.orders, outstanding: c.outstanding })),
                    'top_customers'
                  )
                }
              >
                <Download className="h-3 w-3" /> CSV
              </Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 text-muted-foreground font-medium">Customer</th>
                      <th className="text-right py-2 text-muted-foreground font-medium">Revenue</th>
                      <th className="text-right py-2 text-muted-foreground font-medium">Orders</th>
                      <th className="text-right py-2 text-muted-foreground font-medium">Outstanding</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(customers || []).map((c) => (
                      <tr key={c.contact_id} className="border-b border-border/50">
                        <td className="py-2 text-foreground">{c.contact_name}</td>
                        <td className="py-2 text-right text-foreground">{fmtNGN(c.revenue)}</td>
                        <td className="py-2 text-right text-foreground">{c.orders}</td>
                        <td className={`py-2 text-right ${c.outstanding > 0 ? 'text-red-500' : 'text-foreground'}`}>
                          {fmtNGN(c.outstanding)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // Tab 3: Finance View (was Transactions)
  // ---------------------------------------------------------------------------

  function FinanceTab() {
    return (
      <div className="space-y-6">
        {/* Expenses */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Receipt className="h-4 w-4" /> Expenses ({expenseCount})
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-1"
                onClick={() =>
                  exportToCSV(
                    (expenses || []).map((e) => ({
                      date: e.expense_date,
                      category: EXPENSE_CATEGORY_LABELS[e.category] ?? e.category,
                      description: e.description,
                      amount: e.amount,
                      vendor: e.vendor || '',
                      payment_method: e.payment_method || '',
                    })),
                    'expenses'
                  )
                }
              >
                <Download className="h-3 w-3" /> CSV
              </Button>
              <Select value={expCategoryFilter} onValueChange={setExpCategoryFilter}>
                <SelectTrigger className="w-[160px] h-8 text-sm">
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {Object.entries(EXPENSE_CATEGORY_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Dialog open={showExpenseForm} onOpenChange={setShowExpenseForm}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-1">
                    <Plus className="h-4 w-4" /> Add Expense
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Record Expense</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Category</Label>
                      <Select
                        value={expenseForm.category}
                        onValueChange={(v) => setExpenseForm((p) => ({ ...p, category: v as ExpenseCategory }))}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(EXPENSE_CATEGORY_LABELS).map(([k, v]) => (
                            <SelectItem key={k} value={k}>{v}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Description</Label>
                      <Input
                        value={expenseForm.description}
                        onChange={(e) => setExpenseForm((p) => ({ ...p, description: e.target.value }))}
                        placeholder="What was this expense for?"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Amount (NGN)</Label>
                        <Input
                          type="number"
                          value={expenseForm.amount}
                          onChange={(e) => setExpenseForm((p) => ({ ...p, amount: e.target.value }))}
                          placeholder="0.00"
                        />
                      </div>
                      <div>
                        <Label>Date</Label>
                        <Input
                          type="date"
                          value={expenseForm.expense_date}
                          onChange={(e) => setExpenseForm((p) => ({ ...p, expense_date: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Payment Method</Label>
                        <Select
                          value={expenseForm.payment_method}
                          onValueChange={(v) => setExpenseForm((p) => ({ ...p, payment_method: v }))}
                        >
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="cash">Cash</SelectItem>
                            <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                            <SelectItem value="pos">POS</SelectItem>
                            <SelectItem value="card">Card</SelectItem>
                            <SelectItem value="mobile_transfer">Mobile Transfer</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Vendor</Label>
                        <Input
                          value={expenseForm.vendor}
                          onChange={(e) => setExpenseForm((p) => ({ ...p, vendor: e.target.value }))}
                          placeholder="Vendor name"
                        />
                      </div>
                    </div>
                    {/* Receipt Upload (Feature 10) */}
                    <div>
                      <Label>Receipt (optional)</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <input
                          ref={receiptInputRef}
                          type="file"
                          accept="image/*,.pdf"
                          className="hidden"
                          onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="gap-1"
                          onClick={() => receiptInputRef.current?.click()}
                        >
                          <Upload className="h-3 w-3" /> {receiptFile ? receiptFile.name : 'Upload Receipt'}
                        </Button>
                        {receiptFile && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setReceiptFile(null)}
                            className="text-destructive"
                          >
                            Remove
                          </Button>
                        )}
                      </div>
                    </div>
                    <div>
                      <Label>Notes</Label>
                      <Input
                        value={expenseForm.notes}
                        onChange={(e) => setExpenseForm((p) => ({ ...p, notes: e.target.value }))}
                        placeholder="Optional notes"
                      />
                    </div>
                    <Button onClick={handleCreateExpense} className="w-full">Save Expense</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {(expenses || []).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No expenses recorded for this period.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 text-muted-foreground font-medium">Date</th>
                      <th className="text-left py-2 text-muted-foreground font-medium">Category</th>
                      <th className="text-left py-2 text-muted-foreground font-medium">Description</th>
                      <th className="text-right py-2 text-muted-foreground font-medium">Amount</th>
                      <th className="text-center py-2 text-muted-foreground font-medium">Receipt</th>
                      <th className="text-center py-2 text-muted-foreground font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(expenses || []).map((e) => (
                      <tr key={e.id} className="border-b border-border/50">
                        <td className="py-2 text-foreground">{fmtDate(e.expense_date)}</td>
                        <td className="py-2">
                          <Badge variant="outline" className="text-xs">
                            {EXPENSE_CATEGORY_LABELS[e.category] ?? e.category}
                          </Badge>
                        </td>
                        <td className="py-2 text-foreground">{e.description}</td>
                        <td className="py-2 text-right text-foreground font-medium">{fmtNGN(e.amount)}</td>
                        <td className="py-2 text-center">
                          {e.receipt_url ? (
                            <a href={e.receipt_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                              <ExternalLink className="h-4 w-4 inline" />
                            </a>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </td>
                        <td className="py-2 text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteExpense(e.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Revenue Centers Management */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4" /> Revenue Centers
            </CardTitle>
            <Dialog open={showCenterForm} onOpenChange={setShowCenterForm}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1">
                  <Plus className="h-4 w-4" /> Add Center
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Revenue Center</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Name</Label>
                    <Input value={centerName} onChange={(e) => setCenterName(e.target.value)} placeholder="e.g. Main Store, Online Sales" />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Input value={centerDesc} onChange={(e) => setCenterDesc(e.target.value)} placeholder="Optional description" />
                  </div>
                  <Button onClick={handleCreateCenter} className="w-full">Create Center</Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {(revenueCenters || []).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No revenue centers configured.</p>
            ) : (
              <div className="space-y-2">
                {(revenueCenters || []).map((rc) => (
                  <div key={rc.id} className="flex items-center justify-between p-2 rounded border border-border">
                    <div>
                      <p className="text-sm font-medium text-foreground">{rc.name}</p>
                      {rc.description && <p className="text-xs text-muted-foreground">{rc.description}</p>}
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => handleDeleteCenter(rc.id)} className="text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Financial Targets with Progress (Feature 3) */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4" /> Financial Targets
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-1"
                onClick={() =>
                  exportToCSV(
                    (targetProgress || []).map((t) => ({
                      type: t.target_type,
                      period: t.period_type,
                      start: t.period_start,
                      end: t.period_end,
                      target: t.target_amount,
                      actual: t.actual,
                      progress: `${t.progress.toFixed(1)}%`,
                      status: t.status,
                    })),
                    'financial_targets'
                  )
                }
              >
                <Download className="h-3 w-3" /> CSV
              </Button>
              <Dialog open={showTargetForm} onOpenChange={setShowTargetForm}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-1">
                    <Plus className="h-4 w-4" /> Set Target
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Set Financial Target</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Target Type</Label>
                        <Select
                          value={targetForm.target_type}
                          onValueChange={(v) => setTargetForm((p) => ({ ...p, target_type: v }))}
                        >
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="revenue">Revenue</SelectItem>
                            <SelectItem value="profit">Profit</SelectItem>
                            <SelectItem value="collections">Collections</SelectItem>
                            <SelectItem value="expenses">Expenses</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Period</Label>
                        <Select
                          value={targetForm.period_type}
                          onValueChange={(v) => setTargetForm((p) => ({ ...p, period_type: v }))}
                        >
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="monthly">Monthly</SelectItem>
                            <SelectItem value="quarterly">Quarterly</SelectItem>
                            <SelectItem value="annually">Annually</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Target Amount (NGN)</Label>
                        <Input
                          type="number"
                          value={targetForm.target_amount}
                          onChange={(e) => setTargetForm((p) => ({ ...p, target_amount: e.target.value }))}
                          placeholder="0.00"
                        />
                      </div>
                      <div>
                        <Label>Period Start</Label>
                        <Input
                          type="date"
                          value={targetForm.period_start}
                          onChange={(e) => setTargetForm((p) => ({ ...p, period_start: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Notes</Label>
                      <Input
                        value={targetForm.notes}
                        onChange={(e) => setTargetForm((p) => ({ ...p, notes: e.target.value }))}
                        placeholder="Optional notes"
                      />
                    </div>
                    <Button onClick={handleCreateTarget} className="w-full">Set Target</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {(targetProgress || []).length === 0 && (targets || []).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No financial targets set.</p>
            ) : (targetProgress || []).length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(targetProgress || []).map((t) => {
                  const statusColor =
                    t.status === 'on_track'
                      ? 'text-emerald-600 bg-emerald-100 border-emerald-200'
                      : t.status === 'at_risk'
                        ? 'text-amber-600 bg-amber-100 border-amber-200'
                        : 'text-red-600 bg-red-100 border-red-200'
                  const progressColor =
                    t.status === 'on_track'
                      ? '[&>div]:bg-emerald-500'
                      : t.status === 'at_risk'
                        ? '[&>div]:bg-amber-500'
                        : '[&>div]:bg-red-500'
                  return (
                    <div key={t.id} className="p-4 rounded-lg border border-border bg-card">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Target className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium capitalize">{t.target_type}</span>
                          <Badge variant="outline" className="text-xs capitalize">{t.period_type}</Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={`text-xs ${statusColor}`}>
                            {t.status.replace('_', ' ')}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteTarget(t.id)}
                            className="text-destructive h-6 w-6 p-0"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <Progress value={t.progress} className={`h-2 mb-2 ${progressColor}`} />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Actual: {fmtNGN(t.actual)}</span>
                        <span>{t.progress.toFixed(1)}%</span>
                        <span>Target: {fmtNGN(t.target_amount)}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {fmtDate(t.period_start)} — {fmtDate(t.period_end)}
                      </p>
                    </div>
                  )
                })}
              </div>
            ) : (
              /* Fallback: plain table if progress API fails */
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 text-muted-foreground font-medium">Type</th>
                      <th className="text-left py-2 text-muted-foreground font-medium">Period</th>
                      <th className="text-left py-2 text-muted-foreground font-medium">Start</th>
                      <th className="text-right py-2 text-muted-foreground font-medium">Target</th>
                      <th className="text-center py-2 text-muted-foreground font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(targets || []).map((t) => (
                      <tr key={t.id} className="border-b border-border/50">
                        <td className="py-2 capitalize text-foreground">{t.target_type}</td>
                        <td className="py-2 capitalize text-foreground">{t.period_type}</td>
                        <td className="py-2 text-foreground">{fmtDate(t.period_start)}</td>
                        <td className="py-2 text-right text-foreground font-medium">{fmtNGN(t.target_amount)}</td>
                        <td className="py-2 text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteTarget(t.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // Main render
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Financial Dashboard</h1>
          <p className="text-sm text-muted-foreground">Monitor your business financial health</p>
        </div>
        <Select value={period} onValueChange={(v) => setPeriod(v as PeriodKey)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="this_month">This Month</SelectItem>
            <SelectItem value="last_month">Last Month</SelectItem>
            <SelectItem value="this_quarter">This Quarter</SelectItem>
            <SelectItem value="last_quarter">Last Quarter</SelectItem>
            <SelectItem value="this_year">This Year</SelectItem>
            <SelectItem value="ytd">Year to Date</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="owner">Owner View</TabsTrigger>
          <TabsTrigger value="manager">Manager View</TabsTrigger>
          <TabsTrigger value="finance">Finance View</TabsTrigger>
        </TabsList>

        <TabsContent value="owner" className="mt-4">
          <OwnerTab />
        </TabsContent>

        <TabsContent value="manager" className="mt-4">
          <ManagerTab />
        </TabsContent>

        <TabsContent value="finance" className="mt-4">
          <FinanceTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
