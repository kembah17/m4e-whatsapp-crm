import { NextResponse } from 'next/server'
import { getCurrentAccount, requireRole, toErrorResponse } from '@/lib/auth/account'

interface Params { params: Promise<{ id: string }> }

export async function GET(_request: Request, { params }: Params) {
  try {
    const { id } = await params
    const ctx = await getCurrentAccount()
    const { data, error } = await ctx.supabase
      .from('whatsapp_flows')
      .select('*')
      .eq('id', id)
      .eq('account_id', ctx.accountId)
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 404 })
    return NextResponse.json({ flow: data })
  } catch (err) {
    return toErrorResponse(err)
  }
}

export async function PUT(request: Request, { params }: Params) {
  try {
    const { id } = await params
    const ctx = await requireRole('admin')
    const body = await request.json()
    const { name, flow_json, status, meta_flow_id } = body

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (name !== undefined) updates.name = name
    if (flow_json !== undefined) updates.flow_json = flow_json
    if (status !== undefined) updates.status = status
    if (meta_flow_id !== undefined) updates.meta_flow_id = meta_flow_id

    const { data, error } = await ctx.supabase
      .from('whatsapp_flows')
      .update(updates)
      .eq('id', id)
      .eq('account_id', ctx.accountId)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ flow: data })
  } catch (err) {
    return toErrorResponse(err)
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { id } = await params
    const ctx = await requireRole('admin')
    const { error } = await ctx.supabase
      .from('whatsapp_flows')
      .delete()
      .eq('id', id)
      .eq('account_id', ctx.accountId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (err) {
    return toErrorResponse(err)
  }
}
