import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAccount } from '@/lib/auth/account'
import { supabaseAdmin } from '@/lib/ecommerce/admin-client'

export async function GET(req: NextRequest) {
  try {
    const account = await getCurrentAccount()
    if (!account) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const accountId = searchParams.get('account_id') || account.account_id
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '50', 10)

    const db = supabaseAdmin()
    let query = db
      .from('subscriber_interventions')
      .select('*')
      .eq('account_id', accountId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ interventions: data || [] })
  } catch (error) {
    console.error('[Interventions API] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const account = await getCurrentAccount()
    if (!account) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { interventionId, status, responseAction } = body

    if (!interventionId || !status) {
      return NextResponse.json({ error: 'interventionId and status are required' }, { status: 400 })
    }

    const db = supabaseAdmin()
    const updateData: Record<string, unknown> = { status }
    if (responseAction) {
      updateData.response_action = responseAction
      updateData.responded_at = new Date().toISOString()
    }

    const { data, error } = await db
      .from('subscriber_interventions')
      .update(updateData)
      .eq('id', interventionId)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('[Interventions API] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
