import { NextRequest, NextResponse } from 'next/server'
import { calculateAllHealthScores } from '@/lib/subscriber-monitoring/health-score'
import { evaluateInterventions } from '@/lib/subscriber-monitoring/interventions'
import { cleanupOldEvents } from '@/lib/subscriber-monitoring/activity-tracker'

/**
 * Cron job: Runs daily to:
 * 1. Calculate health scores for all active accounts
 * 2. Evaluate and trigger automated interventions
 * 3. Clean up old activity events (>90 days)
 *
 * Schedule: Daily at 6:00 AM WAT (5:00 AM UTC)
 * Vercel Cron: 0 5 * * *
 */
export async function GET(req: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = req.headers.get('authorization')
    const cronSecret = process.env.AUTOMATION_CRON_SECRET || process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const startTime = Date.now()
    const results: Record<string, unknown> = {}

    // Step 1: Calculate health scores
    console.log('[SubscriberHealth] Starting health score calculation...')
    const healthResults = await calculateAllHealthScores()
    results.healthScores = {
      processed: healthResults.processed,
      errors: healthResults.errors,
      riskDistribution: {
        healthy: healthResults.scores.filter(s => s.risk === 'healthy').length,
        watch: healthResults.scores.filter(s => s.risk === 'watch').length,
        at_risk: healthResults.scores.filter(s => s.risk === 'at_risk').length,
        critical: healthResults.scores.filter(s => s.risk === 'critical').length,
      },
    }
    console.log(`[SubscriberHealth] Health scores: ${healthResults.processed} processed, ${healthResults.errors} errors`)

    // Step 2: Evaluate interventions
    console.log('[SubscriberHealth] Evaluating interventions...')
    const interventionResults = await evaluateInterventions()
    results.interventions = interventionResults
    console.log(`[SubscriberHealth] Interventions: ${interventionResults.triggered} triggered from ${interventionResults.evaluated} accounts`)

    // Step 3: Cleanup old events
    console.log('[SubscriberHealth] Cleaning up old activity events...')
    const cleanedUp = await cleanupOldEvents()
    results.cleanup = { eventsDeleted: cleanedUp }
    console.log(`[SubscriberHealth] Cleanup: ${cleanedUp} old events deleted`)

    const duration = Date.now() - startTime
    results.duration_ms = duration

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...results,
    })
  } catch (error) {
    console.error('[SubscriberHealth] Cron error:', error)
    return NextResponse.json(
      { error: 'Cron job failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
