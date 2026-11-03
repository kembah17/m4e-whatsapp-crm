import { supabaseAdmin } from '@/lib/ecommerce/admin-client'
import type { FinancialDiagnostic, FinancialSummary, HealthScore, HealthScoreFactor, AgingBucket } from '@/types/financials'
import { getFinancialSummary, getAgingAnalysis, getTargetProgress } from '@/lib/financials'

function makeId(): string {
  return Math.random().toString(36).slice(2, 10)
}

/* ------------------------------------------------------------------ */
/*  Feature 6: Financial Health Score                                   */
/* ------------------------------------------------------------------ */

export function calculateHealthScore(
  diagnostics: FinancialDiagnostic[],
  summary: FinancialSummary,
  aging?: AgingBucket | null,
): HealthScore {
  const factors: HealthScoreFactor[] = []

  // 1. Collections Rate (weight 25%)
  const collectionsRate =
    summary.totalSales > 0
      ? Math.min(100, (summary.totalCollected / summary.totalSales) * 100)
      : 50
  factors.push({ name: 'Collections Rate', score: collectionsRate, weight: 25 })

  // 2. Profit Margin (weight 20%)
  const marginScore = Math.max(0, Math.min(100, summary.grossMargin * 2))
  factors.push({ name: 'Profit Margin', score: marginScore, weight: 20 })

  // 3. Expense Control (weight 15%)
  const expenseRatio =
    summary.totalSales > 0
      ? (summary.totalExpenses / summary.totalSales) * 100
      : 50
  const expenseScore = Math.max(0, Math.min(100, 100 - expenseRatio))
  factors.push({ name: 'Expense Control', score: expenseScore, weight: 15 })

  // 4. Revenue Growth (weight 20%)
  const growthRaw = summary.changePercent.totalSales
  const growthScore = Math.max(0, Math.min(100, 50 + growthRaw))
  factors.push({ name: 'Revenue Growth', score: growthScore, weight: 20 })

  // 5. Debt Health (weight 20%)
  let debtScore = 80
  if (aging) {
    const total =
      aging.current + aging.days_1_30 + aging.days_31_60 + aging.days_61_90 + aging.days_90_plus
    if (total > 0) {
      const overdueRatio =
        (aging.days_61_90 + aging.days_90_plus) / total
      debtScore = Math.max(0, Math.min(100, (1 - overdueRatio) * 100))
    }
  }
  factors.push({ name: 'Debt Health', score: debtScore, weight: 20 })

  // Calculate weighted score
  const totalWeight = factors.reduce((s, f) => s + f.weight, 0)
  const score = Math.round(
    factors.reduce((s, f) => s + (f.score * f.weight) / totalWeight, 0),
  )

  let grade: 'A' | 'B' | 'C' | 'D' | 'F'
  if (score >= 80) grade = 'A'
  else if (score >= 65) grade = 'B'
  else if (score >= 50) grade = 'C'
  else if (score >= 35) grade = 'D'
  else grade = 'F'

  return {
    score: Math.max(0, Math.min(100, score)),
    grade,
    factors: factors.map((f) => ({
      ...f,
      score: Math.round(Math.max(0, Math.min(100, f.score))),
    })),
  }
}

/* ------------------------------------------------------------------ */
/*  Feature 14: Enhanced Financial Diagnostics                          */
/* ------------------------------------------------------------------ */

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
  let summary: FinancialSummary
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

  // 2. Expense growth vs revenue + industry benchmark (MEDIUM)
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
  // Industry benchmark for expense ratio
  const expenseRatio = summary.totalSales > 0 ? (summary.totalExpenses / summary.totalSales) * 100 : 0
  if (expenseRatio > 70 && summary.totalSales > 0) {
    diagnostics.push({
      id: makeId(),
      message: `Your expense-to-revenue ratio is ${expenseRatio.toFixed(1)}% — industry benchmarks suggest keeping this below 60-70%. You may be spending too much relative to your income.`,
      confidence: 'MEDIUM',
      category: 'expenses',
      priority: 2,
      metric_value: expenseRatio,
      comparison_value: 70,
      suggested_action:
        'Audit your top 3 expense categories. Negotiate better rates with suppliers or find more cost-effective alternatives.',
    })
  }

  // 3. Debt aging distribution (HIGH)
  try {
    const aging = await getAgingAnalysis(accountId)
    if (aging) {
      const total = aging.current + aging.days_1_30 + aging.days_31_60 + aging.days_61_90 + aging.days_90_plus
      if (total > 0) {
        const overdueRatio = ((aging.days_61_90 + aging.days_90_plus) / total) * 100
        if (overdueRatio > 30) {
          diagnostics.push({
            id: makeId(),
            message: `${overdueRatio.toFixed(0)}% of your receivables are 60+ days overdue. This is a serious collection problem that threatens your cash flow.`,
            confidence: 'HIGH',
            category: 'aging',
            priority: 1,
            metric_value: overdueRatio,
            comparison_value: 30,
            suggested_action:
              'Immediately contact customers with 60+ day overdue balances. Consider offering settlement discounts for immediate payment.',
          })
        }
      }
    }
  } catch {
    // Skip aging analysis if it fails
  }

  // 4. Cash flow projection warning (HIGH)
  try {
    const db = supabaseAdmin()
    const thirtyDaysOut = new Date(now.getTime() + 30 * 86400000).toISOString().slice(0, 10)
    const { data: dueInvoices } = await db
      .from('invoices')
      .select('total, amount_paid')
      .eq('account_id', accountId)
      .eq('doc_type', 'invoice')
      .in('status', ['sent', 'viewed', 'overdue', 'partial'])
      .gte('due_date', today)
      .lte('due_date', thirtyDaysOut)
    const expectedInflow = (dueInvoices ?? []).reduce(
      (s, r) => s + ((Number(r.total) || 0) - (Number(r.amount_paid) || 0)),
      0,
    )
    // Estimate 30-day expenses from recent average
    const threeMonthsAgo = new Date(now.getTime() - 90 * 86400000).toISOString().slice(0, 10)
    const { data: recentExp } = await db
      .from('expenses')
      .select('amount')
      .eq('account_id', accountId)
      .gte('expense_date', threeMonthsAgo)
      .lte('expense_date', today)
    const totalRecentExp = (recentExp ?? []).reduce((s, r) => s + (Number(r.amount) || 0), 0)
    const monthlyExpEstimate = totalRecentExp / 3

    if (monthlyExpEstimate > expectedInflow && monthlyExpEstimate > 0) {
      diagnostics.push({
        id: makeId(),
        message: `Cash flow warning: Your estimated expenses for the next 30 days exceed expected collections. You may face a cash shortfall.`,
        confidence: 'HIGH',
        category: 'cash_flow',
        priority: 1,
        metric_value: expectedInflow,
        comparison_value: monthlyExpEstimate,
        suggested_action:
          'Accelerate collections by sending payment reminders. Delay non-essential expenses. Consider offering early payment discounts.',
      })
    }
  } catch {
    // Skip cash flow projection if it fails
  }

  // 5. Collections rate (HIGH)
  const collectionsRate =
    summary.totalSales > 0
      ? (summary.totalCollected / summary.totalSales) * 100
      : 0
  if (collectionsRate < 70 && summary.totalSales > 0) {
    diagnostics.push({
      id: makeId(),
      message: `Your collections rate is ${collectionsRate.toFixed(1)}% — you are selling but not collecting fast enough. This can create cash flow problems.`,
      confidence: 'HIGH',
      category: 'collections',
      priority: 1,
      metric_value: collectionsRate,
      comparison_value: 70,
      suggested_action:
        'Send payment reminders to customers with outstanding balances. Consider offering a small discount for early payment.',
    })
  }

  // 6. Overdue concentration (HIGH)
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
        const outstanding = (Number(r.original_amount) || 0) - (Number(r.amount_paid) || 0)
        if (outstanding <= 0) continue
        totalOverdue += outstanding
        contactTotals.set(r.contact_id, (contactTotals.get(r.contact_id) ?? 0) + outstanding)
      }
      if (totalOverdue > 0) {
        const sorted = Array.from(contactTotals.values()).sort((a, b) => b - a)
        const top5Total = sorted.slice(0, 5).reduce((s, v) => s + v, 0)
        const concentration = (top5Total / totalOverdue) * 100
        if (concentration > 50) {
          diagnostics.push({
            id: makeId(),
            message: `${concentration.toFixed(0)}% of your overdue debt is concentrated in just ${Math.min(5, sorted.length)} customers. This is risky — if any default, it will hit your business hard.`,
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

  // 7. Margin change (MEDIUM)
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

  // 8. Inventory stock-out check (LOW)
  try {
    const db = supabaseAdmin()
    const { data: products } = await db
      .from('products')
      .select('id, name, track_inventory')
      .eq('account_id', accountId)
      .eq('status', 'active')
      .eq('track_inventory', true)

    if (products && products.length > 0) {
      const { data: invRows } = await db
        .from('inventory')
        .select('product_id, quantity')
        .eq('account_id', accountId)
        .in('product_id', products.map((p) => p.id))

      const zeroStock = (invRows ?? []).filter((r) => (Number(r.quantity) || 0) <= 0)
      if (zeroStock.length > 0) {
        diagnostics.push({
          id: makeId(),
          message: `You have ${zeroStock.length} tracked product(s) out of stock. ${revChange < -5 ? 'This may be contributing to your revenue decline.' : 'Customers cannot buy what you do not have.'}`,
          confidence: zeroStock.length > 3 ? 'HIGH' : 'LOW',
          category: 'inventory',
          priority: zeroStock.length > 3 ? 2 : 4,
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

  // 9. Target achievement rate (MEDIUM)
  try {
    const targets = await getTargetProgress(accountId)
    const activeTargets = (targets ?? []).filter((t) => t.progress !== undefined)
    if (activeTargets.length > 0) {
      const behindTargets = activeTargets.filter((t) => t.status === 'behind')
      if (behindTargets.length > 0) {
        const names = behindTargets.map((t) => t.target_type).join(', ')
        diagnostics.push({
          id: makeId(),
          message: `You are behind on ${behindTargets.length} of ${activeTargets.length} financial target(s): ${names}. Review your strategy to get back on track.`,
          confidence: 'MEDIUM',
          category: 'targets',
          priority: 2,
          metric_value: behindTargets.length,
          comparison_value: activeTargets.length,
          suggested_action:
            'Focus on the most impactful target first. Break it into weekly milestones and track daily progress.',
        })
      } else if (activeTargets.every((t) => t.status === 'on_track')) {
        diagnostics.push({
          id: makeId(),
          message: `All ${activeTargets.length} financial target(s) are on track. Great discipline!`,
          confidence: 'HIGH',
          category: 'targets',
          priority: 5,
          metric_value: activeTargets.length,
          comparison_value: activeTargets.length,
          suggested_action:
            'Consider setting more ambitious targets for the next period to push growth further.',
        })
      }
    }
  } catch {
    // Skip if target check fails
  }

  // 10. Collection velocity (MEDIUM)
  try {
    const db = supabaseAdmin()
    const { data: paidInvs } = await db
      .from('invoices')
      .select('issue_date, paid_at')
      .eq('account_id', accountId)
      .eq('doc_type', 'invoice')
      .eq('status', 'paid')
      .not('paid_at', 'is', null)
      .gte('issue_date', thisMonthStart)
      .lte('issue_date', today)

    if (paidInvs && paidInvs.length >= 3) {
      const totalDays = paidInvs.reduce((s, r) => {
        const issued = new Date(r.issue_date).getTime()
        const paid = new Date(r.paid_at).getTime()
        return s + Math.max(0, (paid - issued) / 86400000)
      }, 0)
      const avgDays = Math.round(totalDays / paidInvs.length)

      if (avgDays > 30) {
        diagnostics.push({
          id: makeId(),
          message: `Your average collection time is ${avgDays} days. Anything over 30 days puts pressure on your cash flow.`,
          confidence: 'MEDIUM',
          category: 'collections',
          priority: 2,
          metric_value: avgDays,
          comparison_value: 30,
          suggested_action:
            'Shorten payment terms on new invoices. Send reminders at 7, 14, and 21 days. Offer 2-3% discount for payment within 7 days.',
        })
      } else if (avgDays <= 14) {
        diagnostics.push({
          id: makeId(),
          message: `Excellent collection velocity — average ${avgDays} days to collect payment. Your customers pay quickly.`,
          confidence: 'HIGH',
          category: 'collections',
          priority: 5,
          metric_value: avgDays,
          comparison_value: 14,
          suggested_action:
            'Maintain your current payment terms and follow-up process. This is a competitive advantage.',
        })
      }
    }
  } catch {
    // Skip if collection velocity check fails
  }

  // 11. Cash flow warning - outstanding > 2x revenue (HIGH)
  if (
    summary.totalOutstanding > 0 &&
    summary.totalSales > 0 &&
    summary.totalOutstanding > summary.totalSales * 2
  ) {
    diagnostics.push({
      id: makeId(),
      message: `Warning: Your total outstanding debt is more than 2x your monthly revenue. This is a serious cash flow risk.`,
      confidence: 'HIGH',
      category: 'cash_flow',
      priority: 1,
      metric_value: summary.totalOutstanding,
      comparison_value: summary.totalSales,
      suggested_action:
        'Immediately prioritise debt collection. Consider pausing credit sales until outstanding amounts are reduced.',
    })
  }

  // Sort by priority (lower number = higher priority)
  diagnostics.sort((a, b) => a.priority - b.priority)

  return diagnostics
}
