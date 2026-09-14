import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/ecommerce/admin-client'
import { getFinancialSummary } from '@/lib/financials'
import { generateFinancialDiagnostics } from '@/lib/financials/diagnostics'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.AUTOMATION_CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const db = supabaseAdmin()
  const results: { accountId: string; status: string }[] = []

  try {
    // Get all active accounts
    const { data: accounts, error: accErr } = await db
      .from('accounts')
      .select('id')
      .eq('status', 'active')

    if (accErr || !accounts) {
      console.error('Failed to fetch accounts:', accErr?.message)
      return NextResponse.json(
        { error: 'Failed to fetch accounts' },
        { status: 500 },
      )
    }

    const now = new Date()
    const today = now.toISOString().slice(0, 10)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .slice(0, 10)

    for (const account of accounts) {
      try {
        // Generate financial summary
        const summary = await getFinancialSummary(account.id, {
          start: monthStart,
          end: today,
        })

        // Insert operational snapshot
        await db.from('operational_snapshots').insert({
          account_id: account.id,
          snapshot_date: today,
          snapshot_type: 'financial_daily',
          data: {
            totalSales: summary.totalSales,
            totalCOGS: summary.totalCOGS,
            grossProfit: summary.grossProfit,
            grossMargin: summary.grossMargin,
            totalCollected: summary.totalCollected,
            totalOutstanding: summary.totalOutstanding,
            totalExpenses: summary.totalExpenses,
            netPosition: summary.netPosition,
          },
        })

        // Generate diagnostics
        const diagnostics = await generateFinancialDiagnostics(account.id)

        // Insert high-confidence diagnostics as business insights
        for (const diag of diagnostics.filter((d) => d.confidence === 'HIGH')) {
          await db.from('business_insights').insert({
            account_id: account.id,
            insight_type: 'financial_diagnostic',
            category: diag.category,
            message: diag.message,
            confidence: diag.confidence,
            suggested_action: diag.suggested_action,
            data: {
              metric_value: diag.metric_value,
              comparison_value: diag.comparison_value,
              priority: diag.priority,
            },
          })
        }

        results.push({ accountId: account.id, status: 'ok' })
      } catch (err) {
        console.error(
          `Financial snapshot failed for account ${account.id}:`,
          err,
        )
        results.push({
          accountId: account.id,
          status: `error: ${err instanceof Error ? err.message : 'unknown'}`,
        })
      }
    }

    return NextResponse.json({
      processed: results.length,
      results,
      timestamp: now.toISOString(),
    })
  } catch (err) {
    console.error('Financial snapshots cron failed:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    )
  }
}
