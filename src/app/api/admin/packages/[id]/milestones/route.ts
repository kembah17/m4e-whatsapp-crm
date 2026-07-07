import { NextResponse, type NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/ecommerce/admin-client'
import type {
  PackageMilestone,
  CreateMilestoneRequest,
  UpdateMilestoneRequest,
  MilestoneStatus,
} from '@/types/packages'

// GET /api/admin/packages/[id]/milestones - Get milestones for a package
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const db = supabaseAdmin()
    const { id } = await params
    const searchParams = request.nextUrl.searchParams
    const accountId = searchParams.get('account_id')
    const status = searchParams.get('status') as MilestoneStatus | null

    if (!accountId) {
      return NextResponse.json(
        { error: 'account_id query parameter is required' },
        { status: 400 }
      )
    }

    let query = db
      .from('package_milestones')
      .select('*')
      .eq('package_config_id', id)
      .eq('account_id', accountId)
      .order('week_number', { ascending: true })

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json({ milestones: data as PackageMilestone[] })
  } catch (err) {
    console.error('[admin/packages/[id]/milestones GET] error:', err)
    return NextResponse.json({ error: 'Failed to get milestones' }, { status: 500 })
  }
}

// POST /api/admin/packages/[id]/milestones - Create a new milestone
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const db = supabaseAdmin()
    const { id } = await params
    const body: CreateMilestoneRequest = await request.json()

    const { data, error } = await db
      .from('package_milestones')
      .insert({
        ...body,
        package_config_id: id,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ milestone: data as PackageMilestone }, { status: 201 })
  } catch (err) {
    console.error('[admin/packages/[id]/milestones POST] error:', err)
    return NextResponse.json({ error: 'Failed to create milestone' }, { status: 500 })
  }
}

// PATCH /api/admin/packages/[id]/milestones - Update a milestone
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const db = supabaseAdmin()
    const { id: _packageId } = await params
    const body = await request.json()
    const { milestone_id, ...updates } = body as { milestone_id: string } & UpdateMilestoneRequest

    if (!milestone_id) {
      return NextResponse.json(
        { error: 'milestone_id is required in request body' },
        { status: 400 }
      )
    }

    const { data, error } = await db
      .from('package_milestones')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', milestone_id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ milestone: data as PackageMilestone })
  } catch (err) {
    console.error('[admin/packages/[id]/milestones PATCH] error:', err)
    return NextResponse.json({ error: 'Failed to update milestone' }, { status: 500 })
  }
}
