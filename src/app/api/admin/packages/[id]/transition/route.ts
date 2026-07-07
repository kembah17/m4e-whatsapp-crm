import { NextResponse, type NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/ecommerce/admin-client'
import type {
  TransitionRecommendation,
  PackageTransition,
  RecordTransitionRequest,
} from '@/types/packages'

// GET /api/admin/packages/[id]/transition - Generate transition recommendation
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const db = supabaseAdmin()
    const { id } = await params
    const searchParams = request.nextUrl.searchParams
    const accountId = searchParams.get('account_id')

    if (!accountId) {
      return NextResponse.json(
        { error: 'account_id query parameter is required' },
        { status: 400 }
      )
    }

    const { data, error } = await db.rpc('generate_transition_recommendation', {
      p_account_id: accountId,
      p_package_config_id: id,
    })

    if (error) throw error

    return NextResponse.json({ recommendation: data as TransitionRecommendation })
  } catch (err) {
    console.error('[admin/packages/[id]/transition GET] error:', err)
    return NextResponse.json(
      { error: 'Failed to generate transition recommendation' },
      { status: 500 }
    )
  }
}

// POST /api/admin/packages/[id]/transition - Record a transition decision
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const db = supabaseAdmin()
    const { id: _packageId } = await params
    const body: RecordTransitionRequest = await request.json()

    const { data, error } = await db
      .from('package_transitions')
      .insert({
        account_id: body.account_id,
        from_package_id: body.from_package_id ?? null,
        to_package_id: body.to_package_id ?? null,
        transition_type: body.transition_type,
        recommendation: body.recommendation,
        quantitative_scores: body.quantitative_scores ?? {},
        qualitative_scores: body.qualitative_scores ?? {},
        recommendation_text: body.recommendation_text ?? null,
        decision: body.decision ?? null,
        decided_at: body.decision ? new Date().toISOString() : null,
        notes: body.notes ?? null,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ transition: data as PackageTransition }, { status: 201 })
  } catch (err) {
    console.error('[admin/packages/[id]/transition POST] error:', err)
    return NextResponse.json(
      { error: 'Failed to record transition' },
      { status: 500 }
    )
  }
}
