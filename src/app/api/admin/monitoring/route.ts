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
    // Fetch all data in parallel
    const [healthResult, alertsResult, errorsResult, securityResult, metricsResult] =
      await Promise.all([
        // Health summary via RPC
        db.rpc('get_system_health_summary'),

        // Active alerts
        db
          .from('system_alerts')
          .select('*')
          .eq('is_resolved', false)
          .order('created_at', { ascending: false })
          .limit(50),

        // Error trends via RPC
        db.rpc('get_error_trends', { p_hours_back: hours }),

        // Security summary via RPC
        db.rpc('get_security_summary', { p_hours_back: hours }),

        // API metrics for the time range
        db
          .from('api_metrics_hourly')
          .select('*')
          .gte('hour', new Date(Date.now() - hours * 60 * 60 * 1000).toISOString())
          .order('hour', { ascending: true }),
      ])

    return NextResponse.json({
      health: healthResult.data ?? null,
      alerts: alertsResult.data ?? [],
      errorTrends: errorsResult.data ?? [],
      security: securityResult.data ?? null,
      metrics: metricsResult.data ?? [],
      timeRange,
      generatedAt: new Date().toISOString(),
    })
  } catch (err) {
    console.error('[monitoring] API error:', err)
    return NextResponse.json(
      { error: 'Failed to fetch monitoring data' },
      { status: 500 }
    )
  }
}
