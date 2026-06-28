import { NextResponse } from 'next/server'
import { getCurrentAccount, requireRole, toErrorResponse } from '@/lib/auth/account'

export async function GET() {
  try {
    const ctx = await getCurrentAccount()
    const { data, error } = await ctx.supabase
      .from('whatsapp_flows')
      .select('*')
      .eq('account_id', ctx.accountId)
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ flows: data })
  } catch (err) {
    return toErrorResponse(err)
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await requireRole('admin')
    const body = await request.json()
    const { name, flow_json, template_name, meta_flow_id } = body

    if (!name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 })
    }

    const { data, error } = await ctx.supabase
      .from('whatsapp_flows')
      .insert({
        account_id: ctx.accountId,
        name,
        flow_json: flow_json || null,
        template_name: template_name || null,
        meta_flow_id: meta_flow_id || null,
        status: 'DRAFT',
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ flow: data })
  } catch (err) {
    return toErrorResponse(err)
  }
}
