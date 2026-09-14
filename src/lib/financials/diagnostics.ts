import { supabaseAdmin } from '@/lib/ecommerce/admin-client'
import type { FinancialDiagnostic } from '@/types/financials'
import { getFinancialSummary, getAgingAnalysis } from '@/lib/financials'

function makeId(): string {
  return Math.random().toString(36).slice(2, 10)
}

export async function generateFinancialDiagnostics(
  accountId: string,
): Promise<FinancialDiagnostic[]> {
  const diagnostics: FinancialDiagnostic[] = []
  const now = new Date()
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .slice(0, 10)
  const today = now.toISOString().slice(0, 10)

  // Fetch current summary
  let summary
  try {
    summary = await getFinancialSummary(accountId, {
      start: thisMonthStart,
      end: today,
    })
  } catch {
    return diagnostics
  }

  // 1. Revenue trend (HIGH)
  const revChange = summary.changePercent.totalSales
  if (Math.abs(revChange) > 5) {
    const direction = revChange > 0 ? 'up' : 'down'
    const emoji = revChange > 0 ? 'growing' : 'declining'
    diagnostics.push({
      id: makeId(),
      message: `Your revenue is ${emoji} — ${direction} ${Math.abs(revChange).toFixed(1)}% compared to last period. ${revChange > 0 ? 'Keep the momentum going!' : 'Consider reviewing your sales strategy and customer outreach.'}`,
      confidence: 'HIGH',
      category: 'revenue',
      priority: revChange < -10 ? 1 : 3,
      metric_value: summary.totalSales,
      comparison_value: summary.previousPeriod.totalSales,
      suggested_action:
        revChange < 0
          ? 'Review your top-selling products and run a targeted promotion to your best customers.'
          : 'Identify what is driving growth and double down on those channels.',
    })
  }

  // 2. Collections rate (HIGH)
  const collectionsRate =
    summary.totalSales > 0
      ? (summary.totalCollected / summary.totalSales) * 100
      : 0
  if (collectionsRate < 70 && summary.totalSales > 0) {
    diagnostics.push({
      id: makeId(),
      message: `Your collections rate is ${collectionsRate.toFixed(1)}% — you are selling but not collecting fast enough. This can create cash flow problems for your business.`,
      confidence: 'HIGH',
      category: 'collections',
      priority: 1,
      metric_value: collectionsRate,
      comparison_value: 70,
      suggested_action:
        'Send payment reminders to customers with outstanding balances. Consider offering a small discount for early payment.',
    })
  }

  // 3. Overdue concentration (HIGH)
  try {
    const db = supabaseAdmin()
    const { data: debtRows } = await db
      .from('debt_entries')
      .select('contact_id, original_amount, amount_paid')
      .eq('account_id', accountId)
      .in('status', ['overdue'])

    if (debtRows && debtRows.length > 0) {
      const contactTotals = new Map<string, number>()
      let totalOverdue = 0
      for (const r of debtRows) {
        const outstanding =
          (Number(r.original_amount) || 0) - (Number(r.amount_paid) || 0)
        if (outstanding <= 0) continue
        totalOverdue += outstanding
        contactTotals.set(
          r.contact_id,
          (contactTotals.get(r.contact_id) ?? 0) + outstanding,
        )
      }

      if (totalOverdue > 0) {
        const sorted = Array.from(contactTotals.values()).sort(
          (a, b) => b - a,
        )
        const top5Total = sorted.slice(0, 5).reduce((s, v) => s + v, 0)
        const concentration = (top5Total / totalOverdue) * 100

        if (concentration > 50) {
          diagnostics.push({
            id: makeId(),
            message: `${concentration.toFixed(0)}% of your overdue debt is concentrated in just ${Math.min(5, sorted.length)} customers. This is risky — if any of them default, it will hit your business hard.`,
            confidence: 'HIGH',
            category: 'risk',
            priority: 1,
            metric_value: concentration,
            comparison_value: 50,
            suggested_action:
              'Personally follow up with your top debtors. Consider requiring deposits or shorter payment terms for large orders.',
          })
        }
      }
    }
  } catch {
    // Skip if debt analysis fails
  }

  // 4. Expense growth (MEDIUM)
  const expChange = summary.changePercent.totalExpenses
  const revGrowth = summary.changePercent.totalSales
  if (expChange > revGrowth + 10 && summary.totalExpenses > 0) {
    diagnostics.push({
      id: makeId(),
      message: `Your expenses are growing ${expChange.toFixed(1)}% while revenue only grew ${revGrowth.toFixed(1)}%. Expenses are outpacing your income — review your spending.`,
      confidence: 'MEDIUM',
      category: 'expenses',
      priority: 2,
      metric_value: expChange,
      comparison_value: revGrowth,
      suggested_action:
        'Review your expense categories to identify where costs are rising fastest. Look for subscriptions or recurring costs that can be reduced.',
    })
  }

  // 5. Margin change (MEDIUM)
  const marginDelta = summary.grossMargin - summary.previousPeriod.grossMargin
  if (Math.abs(marginDelta) > 5 && summary.totalSales > 0) {
    const direction = marginDelta > 0 ? 'improved' : 'dropped'
    diagnostics.push({
      id: makeId(),
      message: `Your gross margin has ${direction} by ${Math.abs(marginDelta).toFixed(1)} percentage points. ${marginDelta < 0 ? 'Your cost of goods may be rising or you are discounting too heavily.' : 'Good — you are keeping more of each sale.'}`,
      confidence: 'MEDIUM',
      category: 'profitability',
      priority: marginDelta < 0 ? 2 : 4,
      metric_value: summary.grossMargin,
      comparison_value: summary.previousPeriod.grossMargin,
      suggested_action:
        marginDelta < 0
          ? 'Check if supplier costs have increased. Review your discount policies and consider adjusting prices.'
          : 'Document what is working and apply the same approach to other product lines.',
    })
  }

  // 6. Stock-out correlation (LOW)
  try {
    const db = supabaseAdmin()
    const { data: oos } = await db
      .from('products')
      .select('id')
      .eq('account_id', accountId)
      .eq('status', 'active')

    // Check inventory for zero stock
    if (oos && oos.length > 0) {
      const { data: invRows } = await db
        .from('inventory')
        .select('product_id, quantity')
        .eq('account_id', accountId)
        .in(
          'product_id',
          oos.map((p) => p.id),
        )

      const zeroStock = (invRows ?? []).filter(
        (r) => (Number(r.quantity) || 0) <= 0,
      )
      if (zeroStock.length > 0 && revChange < -5) {
        diagnostics.push({
          id: makeId(),
          message: `You have ${zeroStock.length} product(s) out of stock and your revenue dipped ${Math.abs(revChange).toFixed(1)}%. The two may be connected — customers cannot buy what you do not have.`,
          confidence: 'LOW',
          category: 'inventory',
          priority: 3,
          metric_value: zeroStock.length,
          comparison_value: null,
          suggested_action:
            'Restock your popular items urgently. Set up low-stock alerts to prevent this in the future.',
        })
      }
    }
  } catch {
    // Skip if inventory check fails
  }

  // 7. Seasonal pattern (LOW)
  try {
    const lastYear = new Date(
      now.getFullYear() - 1,
      now.getMonth(),
      1,
    )
    const lastYearEnd = new Date(
      now.getFullYear() - 1,
      now.getMonth() + 1,
      0,
    )
    const db = supabaseAdmin()
    const { data: lyInvs } = await db
      .from('invoices')
      .select('total')
      .eq('account_id', accountId)
      .eq('doc_type', 'invoice')
      .in('status', ['paid', 'partial', 'sent', 'viewed', 'overdue'])
      .gte('issue_date', lastYear.toISOString().slice(0, 10))
      .lte('issue_date', lastYearEnd.toISOString().slice(0, 10))

    const lyRevenue = (lyInvs ?? []).reduce(
      (s, r) => s + (Number(r.total) || 0),
      0,
    )
    if (lyRevenue > 0) {
      const lyChange =
        ((summary.totalSales - lyRevenue) / lyRevenue) * 100
      if (Math.abs(lyChange) < 15) {
        diagnostics.push({
          id: makeId(),
          message: `This month looks similar to the same month last year (${lyChange > 0 ? '+' : ''}${lyChange.toFixed(1)}% difference). This may be a seasonal pattern in your business.`,
          confidence: 'LOW',
          category: 'seasonal',
          priority: 5,
          metric_value: summary.totalSales,
          comparison_value: lyRevenue,
          suggested_action:
            'If this is a slow season, use the time to prepare promotions for the next busy period. If it is a peak, make sure you have enough stock and staff.',
        })
      }
    }
  } catch {
    // Skip if seasonal check fails
  }

  // 8. Cash flow warning (HIGH)
  if (
    summary.totalOutstanding > 0 &&
    summary.totalSales > 0 &&
    summary.totalOutstanding > summary.totalSales * 2
  ) {
    diagnostics.push({
      id: makeId(),
      message: `Warning: Your total outstanding debt is more than 2x your monthly revenue. This is a serious cash flow risk that could affect your ability to pay suppliers and staff.`,
      confidence: 'HIGH',
      category: 'cash_flow',
      priority: 1,
      metric_value: summary.totalOutstanding,
      comparison_value: summary.totalSales,
      suggested_action:
        'Immediately prioritise debt collection. Consider pausing credit sales until outstanding amounts are reduced. Send reminders via WhatsApp to all overdue customers.',
    })
  }

  // Sort by priority (lower number = higher priority)
  diagnostics.sort((a, b) => a.priority - b.priority)

  return diagnostics
}
