import { NextResponse, type NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/ecommerce/admin-client'
import { generateFunnelReport } from '@/lib/funnel/report-generator'
import { deliverReport } from '@/lib/funnel/report-delivery'

export const runtime = 'nodejs'

// ---------------------------------------------------------------------------
// Frequency helpers
// ---------------------------------------------------------------------------

function isReportDue(frequency: string, lastReportDate: string | null): boolean {
  const now = new Date()
  const dayOfWeek = now.getDay() // 0=Sun, 1=Mon
  const dayOfMonth = now.getDate()

  if (!lastReportDate) return true

  const lastDate = new Date(lastReportDate)
  const daysSinceLast = Math.floor((now.getTime() - lastDate.getTime()) / 86400000)

  switch (frequency) {
    case 'weekly':
      return dayOfWeek === 1 && daysSinceLast >= 5
    case 'biweekly':
      return dayOfWeek === 1 && daysSinceLast >= 12
    case 'monthly':
      return dayOfMonth === 1 && daysSinceLast >= 25
    default:
      return dayOfWeek === 1 && daysSinceLast >= 5
  }
}

function getPeriodDates(frequency: string): { start: Date; end: Date } {
  const end = new Date()
  end.setHours(23, 59, 59, 999)

  const start = new Date(end)
  switch (frequency) {
    case 'weekly':
      start.setDate(end.getDate() - 7)
      break
    case 'biweekly':
      start.setDate(end.getDate() - 14)
      break
    case 'monthly':
      start.setMonth(end.getMonth() - 1)
      break
    default:
      start.setDate(end.getDate() - 7)
  }
  start.setHours(0, 0, 0, 0)

  return { start, end }
}

// ---------------------------------------------------------------------------
// GET /api/cron/funnel-reports
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = supabaseAdmin()
  const results: Array<{ account_id: string; status: string; error?: string }> = []

  try {
    const { data: accounts, error: rpcError } = await supabase
      .rpc('get_accounts_needing_reports')

    if (rpcError) {
      throw new Error(`RPC error: ${rpcError.message}`)
    }

    if (!accounts || accounts.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No accounts with active funnel configs',
        reports_generated: 0,
      })
    }

    for (const account of accounts) {
      const { account_id, report_frequency, last_report_date } = account

      try {
        if (!isReportDue(report_frequency, last_report_date)) {
          results.push({ account_id, status: 'skipped' })
          continue
        }

        const { start, end } = getPeriodDates(report_frequency)

        const reportData = await generateFunnelReport(supabase, account_id, start, end)

        const { data: savedReport, error: saveError } = await supabase
          .from('funnel_reports')
          .insert({
            account_id,
            report_type: report_frequency,
            period_start: start.toISOString().split('T')[0],
            period_end: end.toISOString().split('T')[0],
            report_data: reportData,
            recommendations: reportData.recommendations,
          })
          .select('id')
          .single()

        if (saveError) throw new Error(saveError.message)

        const { data: config } = await supabase
          .from('funnel_configs')
          .select('report_delivery_channels')
          .eq('account_id', account_id)
          .maybeSingle()

        const channels = config?.report_delivery_channels ?? ['dashboard']

        await deliverReport(supabase, savedReport.id, channels)

        results.push({ account_id, status: 'generated' })
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error'
        console.error(`[funnel-reports] Error for account ${account_id}:`, msg)
        results.push({ account_id, status: 'error', error: msg })
      }
    }

    const generated = results.filter(r => r.status === 'generated').length
    const skipped = results.filter(r => r.status === 'skipped').length
    const errors = results.filter(r => r.status === 'error').length

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      reports_generated: generated,
      reports_skipped: skipped,
      errors,
      details: results,
    })
  } catch (err) {
    console.error('[funnel-reports] Cron job error:', err)
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'Cron job failed',
      },
      { status: 500 },
    )
  }
}
