import { NextResponse } from 'next/server'
import { getCurrentAccount, requireRole, toErrorResponse } from '@/lib/auth/account'
import { supabaseAdmin } from '@/lib/ecommerce/admin-client'

export async function GET() {
  try {
    const ctx = await getCurrentAccount()
    const db = supabaseAdmin()
    const { data, error } = await db
      .from('financial_targets')
      .select('*')
      .eq('account_id', ctx.accountId)
      .order('period_start', { ascending: false })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ targets: data ?? [] })
  } catch (err) {
    return toErrorResponse(err)
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await requireRole('admin')
    const body = await request.json()
    const db = supabaseAdmin()
    const { data, error } = await db
      .from('financial_targets')
      .insert({
        account_id: ctx.accountId,
        target_type: body.target_type,
        period_type: body.period_type,
        period_start: body.period_start,
        target_amount: body.target_amount,
        revenue_center_id: body.revenue_center_id || null,
        branch_id: body.branch_id || null,
        notes: body.notes || null,
      })
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data, { status: 201 })
  } catch (err) {
    return toErrorResponse(err)
  }
}
