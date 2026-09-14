import { supabaseAdmin } from '@/lib/ecommerce/admin-client'
import type {
  FinancialSummary,
  PeriodMetrics,
  AgingBucket,
  RevenueCenterPerformance,
  RevenueByChannel,
  TopCustomer,
  MonthlyTrend,
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
