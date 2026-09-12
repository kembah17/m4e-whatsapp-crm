import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/campaigns/admin-client'
import { processQueuedExecutions } from '@/lib/campaigns/executor'
import { evaluateTimeTriggers } from '@/lib/campaigns/scheduler'
import { processPackageCampaignSchedules } from '@/lib/campaigns/package-orchestrator'

/**
 * POST /api/campaigns/triggers/cron
 * Process queued campaign executions, evaluate time-based triggers,
 * and activate package campaign schedules.
 * Called by an external cron service (e.g., Vercel Cron, GitHub Actions).
 */
export async function POST(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const db = supabaseAdmin()

    // Process queued executions
    const executionsProcessed = await processQueuedExecutions(db)

    // Evaluate time-based triggers (birthdays, dormancy, milestones)
    const triggersFired = await evaluateTimeTriggers(db)

    // Process package campaign schedules (activate due campaigns)
    let packageScheduleResult = { accounts_processed: 0, total_activated: 0, total_created: 0, errors: [] as string[] }
    try {
      packageScheduleResult = await processPackageCampaignSchedules(db)
    } catch (schedErr) {
      console.error('[campaigns/triggers/cron] Package schedule error:', schedErr)
      packageScheduleResult.errors.push(
        schedErr instanceof Error ? schedErr.message : 'Package schedule processing failed'
      )
    }

    return NextResponse.json({
      success: true,
      executions_processed: executionsProcessed,
      time_triggers_fired: triggersFired,
      package_campaigns: {
        accounts_processed: packageScheduleResult.accounts_processed,
        activated: packageScheduleResult.total_activated,
        created: packageScheduleResult.total_created,
        errors: packageScheduleResult.errors,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    console.error('[campaigns/triggers/cron] Error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 },
    )
  }
}
