import { supabaseAdmin } from '@/lib/ecommerce/admin-client'
import type {
  FinancialSummary,
  PeriodMetrics,
  AgingBucket,
  RevenueCenterPerformance,
  RevenueByChannel,
  TopCustomer,
  MonthlyTrend,
  TargetProgress,
  ManagerMetrics,
  CashFlowProjectionDay,
  RevenueByProduct,
} from '@/types/financials'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function pctChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0
  return ((current - previous) / Math.abs(previous)) * 100
}

function dateParts(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  return { y, m, d }
}

/** Shift a period backwards by its own duration. */
function previousPeriod(start: string, end: string) {
  const s = new Date(start)
  const e = new Date(end)
  const durationMs = e.getTime() - s.getTime()
  const prevEnd = new Date(s.getTime() - 1) // day before start
  const prevStart = new Date(prevEnd.getTime() - durationMs)
  return {
    start: prevStart.toISOString().slice(0, 10),
    end: prevEnd.toISOString().slice(0, 10),
  }
}

// ---------------------------------------------------------------------------
// getFinancialSummary
// ---------------------------------------------------------------------------

async function computePeriodMetrics(
  accountId: string,
  start: string,
  end: string,
): Promise<PeriodMetrics> {
  const db = supabaseAdmin()

  // Revenue: sum of invoice totals for the period
  const { data: invRows } = await db
    .from('invoices')
    .select('total, amount_paid')
    .eq('account_id', accountId)
    .eq('doc_type', 'invoice')
    .in('status', ['paid', 'partial', 'sent', 'viewed', 'overdue'])
    .gte('issue_date', start)
    .lte('issue_date', end)

  const totalSales = (invRows ?? []).reduce((s, r) => s + (Number(r.total) || 0), 0)
  const totalCollected = (invRows ?? []).reduce((s, r) => s + (Number(r.amount_paid) || 0), 0)

  // COGS: join invoice_items -> products where products.cost > 0
  // We fetch invoice IDs for the period, then get their items with product costs
  const { data: periodInvoices } = await db
    .from('invoices')
    .select('id')
    .eq('account_id', accountId)
    .eq('doc_type', 'invoice')
    .in('status', ['paid', 'partial', 'sent', 'viewed', 'overdue'])
    .gte('issue_date', start)
    .lte('issue_date', end)

  let totalCOGS = 0
  const invoiceIds = (periodInvoices ?? []).map((i) => i.id)
  if (invoiceIds.length > 0) {
    // Process in batches of 50 to avoid query limits
    for (let i = 0; i < invoiceIds.length; i += 50) {
      const batch = invoiceIds.slice(i, i + 50)
      const { data: items } = await db
        .from('invoice_items')
        .select('quantity, product_id')
        .in('invoice_id', batch)
        .not('product_id', 'is', null)

      if (items && items.length > 0) {
        const productIds = [...new Set(items.map((it) => it.product_id).filter(Boolean))]
        if (productIds.length > 0) {
          const { data: products } = await db
            .from('products')
            .select('id, cost')
            .in('id', productIds)
            .gt('cost', 0)

          const costMap = new Map<string, number>()
          for (const p of products ?? []) {
            costMap.set(p.id, Number(p.cost) || 0)
          }
          for (const item of items) {
            const cost = costMap.get(item.product_id) ?? 0
            totalCOGS += (Number(item.quantity) || 0) * cost
          }
        }
      }
    }
  }

  // Outstanding: from debt_entries
  const { data: debtRows } = await db
    .from('debt_entries')
    .select('original_amount, amount_paid')
    .eq('account_id', accountId)
    .in('status', ['outstanding', 'partial', 'overdue'])

  const totalOutstanding = (debtRows ?? []).reduce(
    (s, r) => s + ((Number(r.original_amount) || 0) - (Number(r.amount_paid) || 0)),
    0,
  )

  // Expenses
  const { data: expRows } = await db
    .from('expenses')
    .select('amount')
    .eq('account_id', accountId)
    .gte('expense_date', start)
    .lte('expense_date', end)

  const totalExpenses = (expRows ?? []).reduce((s, r) => s + (Number(r.amount) || 0), 0)

  const grossProfit = totalSales - totalCOGS
  const grossMargin = totalSales > 0 ? (grossProfit / totalSales) * 100 : 0
  const netPosition = grossProfit - totalExpenses

  return {
    totalSales,
    totalCOGS,
    grossProfit,
    grossMargin,
    totalCollected,
    totalOutstanding,
    totalExpenses,
    netPosition,
  }
}

export async function getFinancialSummary(
  accountId: string,
  period: { start: string; end: string },
): Promise<FinancialSummary> {
  const current = await computePeriodMetrics(accountId, period.start, period.end)
  const prev = previousPeriod(period.start, period.end)
  const previous = await computePeriodMetrics(accountId, prev.start, prev.end)

  const changePercent: PeriodMetrics = {
    totalSales: pctChange(current.totalSales, previous.totalSales),
    totalCOGS: pctChange(current.totalCOGS, previous.totalCOGS),
    grossProfit: pctChange(current.grossProfit, previous.grossProfit),
    grossMargin: current.grossMargin - previous.grossMargin,
    totalCollected: pctChange(current.totalCollected, previous.totalCollected),
    totalOutstanding: pctChange(current.totalOutstanding, previous.totalOutstanding),
    totalExpenses: pctChange(current.totalExpenses, previous.totalExpenses),
    netPosition: pctChange(current.netPosition, previous.netPosition),
  }

  return { ...current, previousPeriod: previous, changePercent }
}

// ---------------------------------------------------------------------------
// getAgingAnalysis
// ---------------------------------------------------------------------------

export async function getAgingAnalysis(accountId: string): Promise<AgingBucket> {
  const db = supabaseAdmin()
  const { data: rows } = await db
    .from('debt_entries')
    .select('original_amount, amount_paid, issue_date, status')
    .eq('account_id', accountId)
    .in('status', ['outstanding', 'partial', 'overdue'])

  const now = Date.now()
  const bucket: AgingBucket = {
    current: 0,
    days_1_30: 0,
    days_31_60: 0,
    days_61_90: 0,
    days_90_plus: 0,
    attention_required: 0,
  }

  for (const r of rows ?? []) {
    const outstanding = (Number(r.original_amount) || 0) - (Number(r.amount_paid) || 0)
    if (outstanding <= 0) continue
    const ageDays = Math.floor((now - new Date(r.issue_date).getTime()) / 86_400_000)

    if (ageDays <= 30) bucket.current += outstanding
    else if (ageDays <= 60) bucket.days_1_30 += outstanding
    else if (ageDays <= 90) bucket.days_31_60 += outstanding
    else if (ageDays <= 120) bucket.days_61_90 += outstanding
    else bucket.days_90_plus += outstanding

    if (r.status === 'overdue' && ageDays > 60) {
      bucket.attention_required += outstanding
    }
  }

  return bucket
}

// ---------------------------------------------------------------------------
// getRevenueCenterPerformance
// ---------------------------------------------------------------------------

export async function getRevenueCenterPerformance(
  accountId: string,
  period: { start: string; end: string },
): Promise<RevenueCenterPerformance[]> {
  const db = supabaseAdmin()

  // Get revenue centers
  const { data: centers } = await db
    .from('revenue_centers')
    .select('id, name')
    .eq('account_id', accountId)
    .eq('is_active', true)

  if (!centers || centers.length === 0) return []

  const prev = previousPeriod(period.start, period.end)
  const results: RevenueCenterPerformance[] = []

  for (const center of centers) {
    // Current period invoices for this center
    const { data: invs } = await db
      .from('invoices')
      .select('total, amount_paid')
      .eq('account_id', accountId)
      .eq('revenue_center_id', center.id)
      .eq('doc_type', 'invoice')
      .in('status', ['paid', 'partial', 'sent', 'viewed', 'overdue'])
      .gte('issue_date', period.start)
      .lte('issue_date', period.end)

    const revenue = (invs ?? []).reduce((s, r) => s + (Number(r.total) || 0), 0)
    const collected = (invs ?? []).reduce((s, r) => s + (Number(r.amount_paid) || 0), 0)

    // Previous period for growth
    const { data: prevInvs } = await db
      .from('invoices')
      .select('total')
      .eq('account_id', accountId)
      .eq('revenue_center_id', center.id)
      .eq('doc_type', 'invoice')
      .in('status', ['paid', 'partial', 'sent', 'viewed', 'overdue'])
      .gte('issue_date', prev.start)
      .lte('issue_date', prev.end)

    const prevRevenue = (prevInvs ?? []).reduce((s, r) => s + (Number(r.total) || 0), 0)

    // Simplified COGS for center (use product cost from invoice items)
    const cogs = 0 // Simplified: would need invoice_items join
    const profit = revenue - cogs
    const margin = revenue > 0 ? (profit / revenue) * 100 : 0
    const collectionsRate = revenue > 0 ? (collected / revenue) * 100 : 0
    const growth = pctChange(revenue, prevRevenue)

    let status: 'green' | 'yellow' | 'red' = 'green'
    if (growth < -10 || collectionsRate < 50) status = 'red'
    else if (growth < 0 || collectionsRate < 75) status = 'yellow'

    results.push({
      center_name: center.name,
      revenue,
      cogs,
      profit,
      margin,
      collections_rate: collectionsRate,
      growth_vs_previous: growth,
      status,
    })
  }

  return results.sort((a, b) => b.revenue - a.revenue)
}

// ---------------------------------------------------------------------------
// getRevenueByChannel
// ---------------------------------------------------------------------------

export async function getRevenueByChannel(
  accountId: string,
  period: { start: string; end: string },
): Promise<RevenueByChannel[]> {
  const db = supabaseAdmin()

  // Offline payments
  const { data: offlineRows } = await db
    .from('offline_payments')
    .select('payment_method, amount')
    .eq('account_id', accountId)
    .eq('status', 'verified')
    .gte('payment_date', period.start)
    .lte('payment_date', period.end + 'T23:59:59')

  // Online payment transactions
  const { data: onlineRows } = await db
    .from('payment_transactions')
    .select('payment_channel, amount')
    .eq('account_id', accountId)
    .eq('status', 'success')
    .gte('created_at', period.start)
    .lte('created_at', period.end + 'T23:59:59')

  const channelMap = new Map<string, { amount: number; count: number }>()

  for (const r of offlineRows ?? []) {
    const ch = r.payment_method || 'other'
    const existing = channelMap.get(ch) ?? { amount: 0, count: 0 }
    existing.amount += Number(r.amount) || 0
    existing.count += 1
    channelMap.set(ch, existing)
  }

  for (const r of onlineRows ?? []) {
    const ch = r.payment_channel || 'online'
    const existing = channelMap.get(ch) ?? { amount: 0, count: 0 }
    existing.amount += Number(r.amount) || 0
    existing.count += 1
    channelMap.set(ch, existing)
  }

  const totalAmount = Array.from(channelMap.values()).reduce((s, v) => s + v.amount, 0)

  return Array.from(channelMap.entries())
    .map(([channel, v]) => ({
      channel,
      amount: v.amount,
      count: v.count,
      percentage: totalAmount > 0 ? (v.amount / totalAmount) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount)
}

// ---------------------------------------------------------------------------
// getTopCustomers
// ---------------------------------------------------------------------------

export async function getTopCustomers(
  accountId: string,
  period: { start: string; end: string },
  limit = 10,
): Promise<TopCustomer[]> {
  const db = supabaseAdmin()

  const { data: invRows } = await db
    .from('invoices')
    .select('contact_id, total, amount_paid, balance_due')
    .eq('account_id', accountId)
    .eq('doc_type', 'invoice')
    .in('status', ['paid', 'partial', 'sent', 'viewed', 'overdue'])
    .gte('issue_date', period.start)
    .lte('issue_date', period.end)

  // Aggregate by contact
  const contactMap = new Map<string, { revenue: number; orders: number; outstanding: number }>()
  for (const r of invRows ?? []) {
    const cid = r.contact_id
    if (!cid) continue
    const existing = contactMap.get(cid) ?? { revenue: 0, orders: 0, outstanding: 0 }
    existing.revenue += Number(r.total) || 0
    existing.orders += 1
    existing.outstanding += Number(r.balance_due) || 0
    contactMap.set(cid, existing)
  }

  // Sort by revenue and take top N
  const sorted = Array.from(contactMap.entries())
    .sort((a, b) => b[1].revenue - a[1].revenue)
    .slice(0, limit)

  if (sorted.length === 0) return []

  // Fetch contact names
  const contactIds = sorted.map(([id]) => id)
  const { data: contacts } = await db
    .from('contacts')
    .select('id, name')
    .in('id', contactIds)

  const nameMap = new Map<string, string>()
  for (const c of contacts ?? []) {
    nameMap.set(c.id, c.name || 'Unknown')
  }

  return sorted.map(([id, v]) => ({
    contact_id: id,
    contact_name: nameMap.get(id) || 'Unknown',
    revenue: v.revenue,
    orders: v.orders,
    outstanding: v.outstanding,
  }))
}

// ---------------------------------------------------------------------------
// getMonthlyTrend
// ---------------------------------------------------------------------------

export async function getMonthlyTrend(
  accountId: string,
  months = 6,
): Promise<MonthlyTrend[]> {
  const db = supabaseAdmin()
  const results: MonthlyTrend[] = []
  const now = new Date()

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const start = d.toISOString().slice(0, 10)
    const endDate = new Date(d.getFullYear(), d.getMonth() + 1, 0)
    const end = endDate.toISOString().slice(0, 10)
    const monthLabel = d.toLocaleDateString('en-NG', { month: 'short', year: 'numeric' })

    // Revenue
    const { data: invs } = await db
      .from('invoices')
      .select('total, amount_paid')
      .eq('account_id', accountId)
      .eq('doc_type', 'invoice')
      .in('status', ['paid', 'partial', 'sent', 'viewed', 'overdue'])
      .gte('issue_date', start)
      .lte('issue_date', end)

    const revenue = (invs ?? []).reduce((s, r) => s + (Number(r.total) || 0), 0)
    const collections = (invs ?? []).reduce((s, r) => s + (Number(r.amount_paid) || 0), 0)

    // Expenses
    const { data: exps } = await db
      .from('expenses')
      .select('amount')
      .eq('account_id', accountId)
      .gte('expense_date', start)
      .lte('expense_date', end)

    const expenses = (exps ?? []).reduce((s, r) => s + (Number(r.amount) || 0), 0)

    results.push({
      month: monthLabel,
      revenue,
      expenses,
      collections,
      profit: revenue - expenses,
    })
  }

  return results
}


/* ------------------------------------------------------------------ */
/*  Feature 3: Target Progress                                         */
/* ------------------------------------------------------------------ */

export async function getTargetProgress(
  accountId: string,
): Promise<TargetProgress[]> {
  const db = supabaseAdmin()
  const { data: targets } = await db
    .from('financial_targets')
    .select('*')
    .eq('account_id', accountId)
    .order('created_at', { ascending: false })

  if (!targets || targets.length === 0) return []

  const results: TargetProgress[] = []
  for (const target of targets) {
    const periodStart = target.period_start
    let periodEnd: string
    if (target.period_type === 'monthly') {
      const d = new Date(periodStart)
      d.setMonth(d.getMonth() + 1)
      d.setDate(0)
      periodEnd = d.toISOString().slice(0, 10)
    } else if (target.period_type === 'quarterly') {
      const d = new Date(periodStart)
      d.setMonth(d.getMonth() + 3)
      d.setDate(0)
      periodEnd = d.toISOString().slice(0, 10)
    } else {
      const d = new Date(periodStart)
      d.setFullYear(d.getFullYear() + 1)
      d.setDate(0)
      periodEnd = d.toISOString().slice(0, 10)
    }

    let actual = 0
    if (target.target_type === 'revenue') {
      const { data } = await db
        .from('invoices')
        .select('total')
        .eq('account_id', accountId)
        .eq('doc_type', 'invoice')
        .in('status', ['paid', 'partial', 'sent', 'viewed', 'overdue'])
        .gte('issue_date', periodStart)
        .lte('issue_date', periodEnd)
      actual = (data ?? []).reduce((s, r) => s + (Number(r.total) || 0), 0)
    } else if (target.target_type === 'collections') {
      const { data } = await db
        .from('invoices')
        .select('amount_paid')
        .eq('account_id', accountId)
        .eq('doc_type', 'invoice')
        .gte('issue_date', periodStart)
        .lte('issue_date', periodEnd)
      actual = (data ?? []).reduce((s, r) => s + (Number(r.amount_paid) || 0), 0)
    } else if (target.target_type === 'expenses') {
      const { data } = await db
        .from('expenses')
        .select('amount')
        .eq('account_id', accountId)
        .gte('expense_date', periodStart)
        .lte('expense_date', periodEnd)
      actual = (data ?? []).reduce((s, r) => s + (Number(r.amount) || 0), 0)
    } else if (target.target_type === 'profit') {
      const { data: invs } = await db
        .from('invoices')
        .select('total')
        .eq('account_id', accountId)
        .eq('doc_type', 'invoice')
        .in('status', ['paid', 'partial', 'sent', 'viewed', 'overdue'])
        .gte('issue_date', periodStart)
        .lte('issue_date', periodEnd)
      const { data: exps } = await db
        .from('expenses')
        .select('amount')
        .eq('account_id', accountId)
        .gte('expense_date', periodStart)
        .lte('expense_date', periodEnd)
      const rev = (invs ?? []).reduce((s, r) => s + (Number(r.total) || 0), 0)
      const exp = (exps ?? []).reduce((s, r) => s + (Number(r.amount) || 0), 0)
      actual = rev - exp
    }

    const targetAmount = Number(target.target_amount) || 0
    const progress = targetAmount > 0 ? (actual / targetAmount) * 100 : 0

    // Calculate expected progress based on time elapsed
    const now = new Date()
    const start = new Date(periodStart)
    const end = new Date(periodEnd)
    const totalDays = Math.max(1, (end.getTime() - start.getTime()) / 86400000)
    const elapsedDays = Math.max(0, (now.getTime() - start.getTime()) / 86400000)
    const expectedProgress = Math.min(100, (elapsedDays / totalDays) * 100)

    let status: 'on_track' | 'at_risk' | 'behind' = 'on_track'
    if (progress < expectedProgress * 0.7) status = 'behind'
    else if (progress < expectedProgress * 0.9) status = 'at_risk'

    results.push({
      id: target.id,
      account_id: target.account_id,
      target_type: target.target_type,
      period_type: target.period_type,
      period_start: target.period_start,
      period_end: periodEnd,
      target_amount: targetAmount,
      revenue_center_id: target.revenue_center_id ?? null,
      branch_id: target.branch_id ?? null,
      notes: target.notes ?? null,
      created_at: target.created_at,
      actual,
      progress: Math.min(progress, 100),
      status,
    })
  }

  return results
}

/* ------------------------------------------------------------------ */
/*  Feature 5: Manager Metrics                                         */
/* ------------------------------------------------------------------ */

export async function getManagerMetrics(
  accountId: string,
  period: { start: string; end: string },
): Promise<ManagerMetrics> {
  const db = supabaseAdmin()

  // Invoices sent this period
  const { data: sentInvs } = await db
    .from('invoices')
    .select('id')
    .eq('account_id', accountId)
    .eq('doc_type', 'invoice')
    .in('status', ['sent', 'viewed', 'paid', 'partial', 'overdue'])
    .gte('issue_date', period.start)
    .lte('issue_date', period.end)
  const invoicesSent = (sentInvs ?? []).length

  // Invoices paid this period
  const { data: paidInvs } = await db
    .from('invoices')
    .select('id')
    .eq('account_id', accountId)
    .eq('doc_type', 'invoice')
    .eq('status', 'paid')
    .gte('issue_date', period.start)
    .lte('issue_date', period.end)
  const invoicesPaid = (paidInvs ?? []).length

  // Collection rate
  const { data: allInvs } = await db
    .from('invoices')
    .select('total, amount_paid')
    .eq('account_id', accountId)
    .eq('doc_type', 'invoice')
    .in('status', ['paid', 'partial', 'sent', 'viewed', 'overdue'])
    .gte('issue_date', period.start)
    .lte('issue_date', period.end)
  const totalInvoiced = (allInvs ?? []).reduce((s, r) => s + (Number(r.total) || 0), 0)
  const totalCollected = (allInvs ?? []).reduce((s, r) => s + (Number(r.amount_paid) || 0), 0)
  const collectionRate = totalInvoiced > 0 ? (totalCollected / totalInvoiced) * 100 : 0

  // Average days to pay
  const { data: paidWithDates } = await db
    .from('invoices')
    .select('issue_date, paid_at')
    .eq('account_id', accountId)
    .eq('doc_type', 'invoice')
    .eq('status', 'paid')
    .not('paid_at', 'is', null)
    .gte('issue_date', period.start)
    .lte('issue_date', period.end)
  let avgDaysToPay = 0
  if (paidWithDates && paidWithDates.length > 0) {
    const totalDays = paidWithDates.reduce((s, r) => {
      const issued = new Date(r.issue_date).getTime()
      const paid = new Date(r.paid_at).getTime()
      return s + Math.max(0, (paid - issued) / 86400000)
    }, 0)
    avgDaysToPay = Math.round(totalDays / paidWithDates.length)
  }

  // Overdue invoices
  const { data: overdueInvs } = await db
    .from('invoices')
    .select('total, amount_paid')
    .eq('account_id', accountId)
    .eq('doc_type', 'invoice')
    .eq('status', 'overdue')
  const overdueCount = (overdueInvs ?? []).length
  const overdueValue = (overdueInvs ?? []).reduce(
    (s, r) => s + ((Number(r.total) || 0) - (Number(r.amount_paid) || 0)),
    0,
  )

  // Active installment plans
  const { data: activePlans } = await db
    .from('installment_plans')
    .select('id')
    .eq('account_id', accountId)
    .eq('status', 'active')
  const activeInstallments = (activePlans ?? []).length

  return {
    invoices_sent: invoicesSent,
    invoices_paid: invoicesPaid,
    collection_rate: collectionRate,
    avg_days_to_pay: avgDaysToPay,
    overdue_count: overdueCount,
    overdue_value: overdueValue,
    active_installments: activeInstallments,
  }
}

/* ------------------------------------------------------------------ */
/*  Feature 8: Cash Flow Projection                                    */
/* ------------------------------------------------------------------ */

export async function getCashFlowProjection(
  accountId: string,
): Promise<CashFlowProjectionDay[]> {
  const db = supabaseAdmin()
  const today = new Date()
  const todayStr = today.toISOString().slice(0, 10)
  const thirtyDaysOut = new Date(today.getTime() + 30 * 86400000)
  const endStr = thirtyDaysOut.toISOString().slice(0, 10)

  // Get upcoming invoice due dates (expected inflows)
  const { data: dueInvoices } = await db
    .from('invoices')
    .select('due_date, total, amount_paid')
    .eq('account_id', accountId)
    .eq('doc_type', 'invoice')
    .in('status', ['sent', 'viewed', 'overdue', 'partial'])
    .gte('due_date', todayStr)
    .lte('due_date', endStr)

  // Get recurring expenses (estimate from last 3 months average)
  const threeMonthsAgo = new Date(today.getTime() - 90 * 86400000).toISOString().slice(0, 10)
  const { data: recentExpenses } = await db
    .from('expenses')
    .select('amount, expense_date, is_recurring')
    .eq('account_id', accountId)
    .gte('expense_date', threeMonthsAgo)
    .lte('expense_date', todayStr)

  // Calculate daily average expense
  const totalExpenses = (recentExpenses ?? []).reduce((s, r) => s + (Number(r.amount) || 0), 0)
  const dailyAvgExpense = totalExpenses / 90

  // Build daily projection
  const projection: CashFlowProjectionDay[] = []
  let cumulative = 0

  for (let i = 0; i < 30; i++) {
    const date = new Date(today.getTime() + i * 86400000)
    const dateStr = date.toISOString().slice(0, 10)

    // Sum expected inflows for this date
    const inflow = (dueInvoices ?? [])
      .filter((inv) => (inv.due_date || '').slice(0, 10) === dateStr)
      .reduce((s, inv) => s + ((Number(inv.total) || 0) - (Number(inv.amount_paid) || 0)), 0)

    // Use daily average for outflow (skip weekends slightly)
    const dayOfWeek = date.getDay()
    const outflow = dayOfWeek === 0 || dayOfWeek === 6 ? dailyAvgExpense * 0.3 : dailyAvgExpense

    const net = inflow - outflow
    cumulative += net

    projection.push({
      date: dateStr,
      projected_inflow: Math.round(inflow * 100) / 100,
      projected_outflow: Math.round(outflow * 100) / 100,
      net_position: Math.round(net * 100) / 100,
      cumulative: Math.round(cumulative * 100) / 100,
    })
  }

  return projection
}

/* ------------------------------------------------------------------ */
/*  Feature 9: Revenue by Product                                      */
/* ------------------------------------------------------------------ */

export async function getRevenueByProduct(
  accountId: string,
  period: { start: string; end: string },
): Promise<RevenueByProduct[]> {
  const db = supabaseAdmin()

  // Get invoice items with product info for the period
  const { data: invoices } = await db
    .from('invoices')
    .select('id')
    .eq('account_id', accountId)
    .eq('doc_type', 'invoice')
    .in('status', ['paid', 'partial', 'sent', 'viewed', 'overdue'])
    .gte('issue_date', period.start)
    .lte('issue_date', period.end)

  if (!invoices || invoices.length === 0) return []

  const invoiceIds = invoices.map((i) => i.id)

  // Get all invoice items for these invoices
  const { data: items } = await db
    .from('invoice_items')
    .select('product_id, description, quantity, total')
    .in('invoice_id', invoiceIds)

  if (!items || items.length === 0) return []

  // Aggregate by product
  const productMap = new Map<string, { name: string; revenue: number; quantity: number }>()
  for (const item of items) {
    const key = item.product_id || item.description || 'Unknown'
    const name = item.description || 'Unknown Product'
    const existing = productMap.get(key) || { name, revenue: 0, quantity: 0 }
    existing.revenue += Number(item.total) || 0
    existing.quantity += Number(item.quantity) || 0
    productMap.set(key, existing)
  }

  // Sort by revenue and take top 10
  const sorted = Array.from(productMap.entries())
    .map(([id, data]) => ({ product_id: id, ...data }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10)

  const totalRevenue = sorted.reduce((s, p) => s + p.revenue, 0)

  return sorted.map((p) => ({
    product_name: p.name,
    product_id: p.product_id,
    revenue: p.revenue,
    quantity: p.quantity,
    percentage: totalRevenue > 0 ? (p.revenue / totalRevenue) * 100 : 0,
  }))
}
