import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/campaigns/admin-client'
import { processQueuedExecutions } from '@/lib/campaigns/executor'
import { evaluateTimeTriggers } from '@/lib/campaigns/scheduler'

/**
 * POST /api/campaigns/triggers/cron
 * Process queued campaign executions and evaluate time-based triggers.
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

    return NextResponse.json({
      success: true,
      executions_processed: executionsProcessed,
      time_triggers_fired: triggersFired,
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
