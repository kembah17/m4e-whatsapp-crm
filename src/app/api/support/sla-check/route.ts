import { NextRequest, NextResponse } from 'next/server'
import { checkSLABreaches } from '@/lib/support/sla'

export async function POST(req: NextRequest) {
  try {
    // Verify cron secret for automated calls
    const authHeader = req.headers.get('authorization')
    const cronSecret = process.env.AUTOMATION_CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const result = await checkSLABreaches()

    return NextResponse.json({
      success: true,
      breached: result.breached,
      warnings: result.warnings,
      checked_at: new Date().toISOString(),
    })
  } catch (err) {
    console.error('[sla-check] Error:', err)
    return NextResponse.json(
      { error: 'SLA check failed', details: String(err) },
      { status: 500 }
    )
  }
}
