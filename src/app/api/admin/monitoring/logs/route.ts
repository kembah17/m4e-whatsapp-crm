import { NextResponse, type NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/ecommerce/admin-client'
import type { MonitoringTimeRange } from '@/lib/monitoring/types'
import { timeRangeToHours } from '@/lib/monitoring/types'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const level = searchParams.get('level')
    const category = searchParams.get('category')
    const timeRange = (searchParams.get('timeRange') ?? '24h') as MonitoringTimeRange
    const search = searchParams.get('search')
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50', 10), 200)
    const offset = parseInt(searchParams.get('offset') ?? '0', 10)

    const hours = timeRangeToHours(timeRange)
    const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()

    const db = supabaseAdmin()

    let query = db
      .from('system_logs')
      .select('*', { count: 'exact' })
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (level) {
      query = query.eq('level', level)
    }

    if (category) {
      query = query.eq('category', category)
    }

    if (search) {
      query = query.ilike('message', `%${search}%`)
    }

    const { data, error, count } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      logs: data ?? [],
      total: count ?? 0,
      limit,
      offset,
    })

  } catch (error) {
    console.error('[ADMIN_MONITORING_LOGS_GET] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
