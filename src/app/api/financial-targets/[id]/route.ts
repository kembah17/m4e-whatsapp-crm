import { NextResponse } from 'next/server'
import { requireRole, toErrorResponse } from '@/lib/auth/account'
import { supabaseAdmin } from '@/lib/ecommerce/admin-client'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await requireRole('admin')
    const { id } = await params
    const body = await request.json()
    const db = supabaseAdmin()
    const { data, error } = await db
      .from('financial_targets')
      .update({
        target_type: body.target_type,
        period_type: body.period_type,
        period_start: body.period_start,
        target_amount: body.target_amount,
        revenue_center_id: body.revenue_center_id || null,
        branch_id: body.branch_id || null,
        notes: body.notes || null,
      })
      .eq('account_id', ctx.accountId)
      .eq('id', id)
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch (err) {
    return toErrorResponse(err)
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await requireRole('admin')
    const { id } = await params
    const db = supabaseAdmin()
    const { error } = await db
      .from('financial_targets')
      .delete()
      .eq('account_id', ctx.accountId)
      .eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (err) {
    return toErrorResponse(err)
  }
}
