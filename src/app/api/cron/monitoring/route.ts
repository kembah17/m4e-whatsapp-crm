import { NextResponse, type NextRequest } from 'next/server'
import { runHealthChecks } from '@/lib/monitoring/health'
import { checkThresholds } from '@/lib/monitoring/alerts'
import { flushMetrics } from '@/lib/monitoring/metrics'
import { flushLogs } from '@/lib/monitoring/logger'
import { supabaseAdmin } from '@/lib/ecommerce/admin-client'
import { checkSLABreaches } from '@/lib/support/sla'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const results: Record<string, unknown> = {}

  try {
    // 1. Run health checks
    const healthSnapshot = await runHealthChecks()
    results.health = {
      status: healthSnapshot.status,
      checks: healthSnapshot.checks.length,
      response_time_ms: healthSnapshot.response_time_ms,
    }

    // 2. Check alert thresholds
    await checkThresholds()
    results.thresholds = 'checked'

    // 3. Flush buffered logs
    await flushLogs()
    results.logs = 'flushed'

    // 4. Flush metrics
    const metricsFlushed = await flushMetrics()
    results.metrics = { flushed: metricsFlushed }

    // 5. Cleanup old data
    const db = supabaseAdmin()
    const { data: cleanupResult } = await db.rpc('cleanup_monitoring_data')
    results.cleanup = cleanupResult ?? 'completed'

    // 6. Check SLA breaches for support tickets
    try {
      const slaBreaches = await checkSLABreaches()
      results.sla_breaches = { checked: true, breaches_found: slaBreaches?.length ?? 0 }
    } catch (slaErr) {
      console.error('[monitoring] SLA breach check failed:', slaErr)
      results.sla_breaches = { checked: false, error: slaErr instanceof Error ? slaErr.message : 'unknown' }
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      results,
    })
  } catch (err) {
    console.error('[monitoring] Cron job error:', err)
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'Cron job failed',
        results,
      },
      { status: 500 }
    )
  }
}
