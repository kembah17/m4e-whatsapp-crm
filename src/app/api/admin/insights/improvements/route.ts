import { NextResponse, type NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/ecommerce/admin-client'
import type { ImprovementLogEntry, CreateImprovementRequest } from '@/types/packages'

// GET /api/admin/insights/improvements - List improvement log entries
export async function GET(request: NextRequest) {
  try {
    const db = supabaseAdmin()
    const searchParams = request.nextUrl.searchParams
    const logType = searchParams.get('log_type')
    const impactAssessment = searchParams.get('impact_assessment')
    const limit = parseInt(searchParams.get('limit') ?? '50', 10)

    let query = db
      .from('improvement_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (logType) {
      query = query.eq('log_type', logType)
    }

    if (impactAssessment) {
      query = query.eq('impact_assessment', impactAssessment)
    }

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json({ improvements: data as ImprovementLogEntry[] })
  } catch (err) {
    console.error('[admin/insights/improvements GET] error:', err)
    return NextResponse.json({ error: 'Failed to list improvements' }, { status: 500 })
  }
}

// POST /api/admin/insights/improvements - Create improvement log entry
export async function POST(request: NextRequest) {
  try {
    const db = supabaseAdmin()
    const body: CreateImprovementRequest = await request.json()

    const { data, error } = await db
      .from('improvement_log')
      .insert({
        account_id: body.account_id ?? null,
        package_config_id: body.package_config_id ?? null,
        log_type: body.log_type,
        title: body.title,
        description: body.description,
        source: body.source,
        action_items: body.action_items ?? [],
        impact_assessment: body.impact_assessment ?? null,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ improvement: data as ImprovementLogEntry }, { status: 201 })
  } catch (err) {
    console.error('[admin/insights/improvements POST] error:', err)
    return NextResponse.json({ error: 'Failed to create improvement' }, { status: 500 })
  }
}
