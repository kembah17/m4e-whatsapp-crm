import { NextResponse, type NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/ecommerce/admin-client'
import type { AggregatedMetric, ImprovementLogEntry } from '@/types/packages'

// GET /api/admin/insights - Get aggregated overview
export async function GET(request: NextRequest) {
  try {
    const db = supabaseAdmin()
    const searchParams = request.nextUrl.searchParams
    const timeRangeDays = parseInt(searchParams.get('time_range_days') ?? '30', 10)

    // Fetch aggregated execution metrics via RPC
    const { data: metrics, error: metricsError } = await db.rpc(
      'aggregate_execution_metrics',
      { p_time_range_days: timeRangeDays }
    )

    if (metricsError) throw metricsError

    // Fetch recent improvement log entries
    const { data: improvements, error: improvementsError } = await db
      .from('improvement_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10)

    if (improvementsError) throw improvementsError

    return NextResponse.json({
      metrics: (metrics ?? []) as AggregatedMetric[],
      improvements: (improvements ?? []) as ImprovementLogEntry[],
    })
  } catch (err) {
    console.error('[admin/insights GET] error:', err)
    return NextResponse.json({ error: 'Failed to get insights overview' }, { status: 500 })
  }
}
