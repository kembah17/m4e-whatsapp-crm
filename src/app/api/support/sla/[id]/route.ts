import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAccount, toErrorResponse } from '@/lib/auth/account'
import { updateSLAPolicy } from '@/lib/support/sla'
import { supabaseAdmin } from '@/lib/ecommerce/admin-client'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const account = await getCurrentAccount()
    const { id } = await params
    const body = await req.json()

    const policy = await updateSLAPolicy(account.account_id, id, {
      name: body.name,
      description: body.description,
      priority: body.priority,
      first_response_minutes: body.first_response_minutes,
      resolution_minutes: body.resolution_minutes,
      escalation_minutes: body.escalation_minutes,
      escalate_to: body.escalate_to,
      is_default: body.is_default,
      is_active: body.is_active,
    })

    return NextResponse.json(policy)
  } catch (err) {
    return toErrorResponse(err)
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const account = await getCurrentAccount()
    const { id } = await params
    const db = supabaseAdmin()

    const { error } = await db
      .from('sla_policies')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('account_id', account.account_id)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (err) {
    return toErrorResponse(err)
  }
}
