import { NextResponse, type NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/ecommerce/admin-client'
import type { ExecutionMetric, RecordMetricRequest } from '@/types/packages'

// GET /api/admin/insights/metrics - Get execution metrics with filters
export async function GET(request: NextRequest) {
  try {
    const db = supabaseAdmin()
    const searchParams = request.nextUrl.searchParams
    const accountId = searchParams.get('account_id')
    const metricType = searchParams.get('metric_type')
    const periodDays = parseInt(searchParams.get('period_days') ?? '30', 10)

    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - periodDays)

    let query = db
      .from('execution_metrics')
      .select('*')
      .gte('created_at', cutoff.toISOString())
      .order('created_at', { ascending: false })

    if (accountId) {
      query = query.eq('account_id', accountId)
    }

    if (metricType) {
      query = query.eq('metric_type', metricType)
    }

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json({ metrics: data as ExecutionMetric[] })
  } catch (err) {
    console.error('[admin/insights/metrics GET] error:', err)
    return NextResponse.json({ error: 'Failed to get metrics' }, { status: 500 })
  }
}

// POST /api/admin/insights/metrics - Record a new execution metric
export async function POST(request: NextRequest) {
  try {
    const db = supabaseAdmin()
    const body: RecordMetricRequest = await request.json()

    const { data, error } = await db
      .from('execution_metrics')
      .insert({
        account_id: body.account_id,
        package_config_id: body.package_config_id ?? null,
        metric_type: body.metric_type,
        metric_key: body.metric_key,
        metric_value: body.metric_value,
        metric_unit: body.metric_unit ?? null,
        period_start: body.period_start,
        period_end: body.period_end,
        metadata: body.metadata ?? {},
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ metric: data as ExecutionMetric }, { status: 201 })
  } catch (err) {
    console.error('[admin/insights/metrics POST] error:', err)
    return NextResponse.json({ error: 'Failed to record metric' }, { status: 500 })
  }
}
