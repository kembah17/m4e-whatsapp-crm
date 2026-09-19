import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAccount, toErrorResponse } from '@/lib/auth/account'
import { supabaseAdmin } from '@/lib/ecommerce/admin-client'

export async function GET(req: NextRequest) {
  try {
    await getCurrentAccount()

    const url = new URL(req.url)
    const severity = url.searchParams.get('severity')
    const eventType = url.searchParams.get('event_type')
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10))
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '20', 10)))
    const fromDate = url.searchParams.get('from_date')
    const toDate = url.searchParams.get('to_date')

    const db = supabaseAdmin()
    let query = db
      .from('security_events')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })

    if (severity) query = query.eq('severity', severity)
    if (eventType) query = query.eq('event_type', eventType)
    if (fromDate) query = query.gte('created_at', fromDate)
    if (toDate) query = query.lte('created_at', toDate)

    const offset = (page - 1) * limit
    query = query.range(offset, offset + limit - 1)

    const { data, count, error } = await query
    if (error) throw error

    return NextResponse.json({
      events: data || [],
      total: count || 0,
      page,
      limit,
    })
  } catch (err) {
    return toErrorResponse(err)
  }
}
