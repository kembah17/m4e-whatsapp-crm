import { NextResponse, type NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/ecommerce/admin-client'
import type { ClientOutcome, RecordOutcomeRequest } from '@/types/packages'

// GET /api/admin/insights/outcomes - List client outcomes
export async function GET(request: NextRequest) {
  try {
    const db = supabaseAdmin()
    const searchParams = request.nextUrl.searchParams
    const accountId = searchParams.get('account_id')
    const outcomeType = searchParams.get('outcome_type')
    const limit = parseInt(searchParams.get('limit') ?? '50', 10)

    let query = db
      .from('client_outcomes')
      .select('*')
      .order('measured_at', { ascending: false })
      .limit(limit)

    if (accountId) {
      query = query.eq('account_id', accountId)
    }

    if (outcomeType) {
      query = query.eq('outcome_type', outcomeType)
    }

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json({ outcomes: data as ClientOutcome[] })
  } catch (err) {
    console.error('[admin/insights/outcomes GET] error:', err)
    return NextResponse.json({ error: 'Failed to list outcomes' }, { status: 500 })
  }
}

// POST /api/admin/insights/outcomes - Record client outcome
export async function POST(request: NextRequest) {
  try {
    const db = supabaseAdmin()
    const body: RecordOutcomeRequest = await request.json()

    const { data, error } = await db
      .from('client_outcomes')
      .insert({
        account_id: body.account_id,
        package_config_id: body.package_config_id,
        outcome_type: body.outcome_type,
        outcome_key: body.outcome_key,
        outcome_value: body.outcome_value ?? null,
        outcome_text: body.outcome_text ?? null,
        metadata: body.metadata ?? {},
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ outcome: data as ClientOutcome }, { status: 201 })
  } catch (err) {
    console.error('[admin/insights/outcomes POST] error:', err)
    return NextResponse.json({ error: 'Failed to record outcome' }, { status: 500 })
  }
}
