import { NextResponse, type NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/ecommerce/admin-client'
import type { MonitoringTimeRange } from '@/lib/monitoring/types'
import { timeRangeToHours } from '@/lib/monitoring/types'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const timeRange = (searchParams.get('timeRange') ?? '24h') as MonitoringTimeRange
  const hours = timeRangeToHours(timeRange)

  const db = supabaseAdmin()

  try {
    const [summaryResult, eventsResult] = await Promise.all([
      db.rpc('get_security_summary', { p_hours_back: hours }),
      db
        .from('security_events')
        .select('*')
        .gte('created_at', new Date(Date.now() - hours * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
        .limit(100),
    ])

    return NextResponse.json({
      summary: summaryResult.data ?? null,
      events: eventsResult.data ?? [],
    })
  } catch (err) {
    console.error('[monitoring] Security API error:', err)
    return NextResponse.json(
      { error: 'Failed to fetch security data' },
      { status: 500 }
    )
  }
}
