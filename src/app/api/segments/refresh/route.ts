import { NextRequest, NextResponse } from 'next/server'
import { processDynamicSegments, refreshDynamicSegment } from '@/lib/segments/dynamic-segment'

/**
 * POST /api/segments/refresh
 *
 * Refresh dynamic segments. Called by the cron job or manually.
 *
 * Body (optional):
 *   { segment_id?: string }  — refresh a specific segment, or all if omitted
 *
 * Headers:
 *   Authorization: Bearer <AUTOMATION_CRON_SECRET>  — for cron authentication
 */
export async function POST(req: NextRequest) {
  try {
    // Authenticate: accept either cron secret or session auth
    const authHeader = req.headers.get('authorization')
    const cronSecret = process.env.AUTOMATION_CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      // Try session auth as fallback
      const { getCurrentAccount } = await import('@/lib/auth/account')
      const account = await getCurrentAccount()
      if (!account) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    // Parse optional body
    let segmentId: string | undefined
    try {
      const body = await req.json()
      segmentId = body?.segment_id
    } catch {
      // No body or invalid JSON — refresh all
    }

    if (segmentId) {
      // Refresh a specific segment
      const result = await refreshDynamicSegment(segmentId)
      return NextResponse.json({
        success: true,
        refreshed: 1,
        results: [result],
      })
    }

    // Refresh all stale dynamic segments
    const results = await processDynamicSegments()
    return NextResponse.json({
      success: true,
      refreshed: results.length,
      results,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal error'
    console.error('[api/segments/refresh] Error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
