import { NextResponse } from 'next/server'
import { requireRole, toErrorResponse } from '@/lib/auth/account'
import { publishFlow } from '@/lib/whatsapp/flows-api'

interface Params { params: Promise<{ id: string }> }

export async function POST(_request: Request, { params }: Params) {
  try {
    const { id } = await params
    const ctx = await requireRole('admin')

    // Get the flow from DB
    const { data: flow, error } = await ctx.supabase
      .from('whatsapp_flows')
      .select('*')
      .eq('id', id)
      .eq('account_id', ctx.accountId)
      .single()

    if (error || !flow) {
      return NextResponse.json({ error: 'Flow not found' }, { status: 404 })
    }

    if (!flow.meta_flow_id) {
      return NextResponse.json({ error: 'Flow has no Meta Flow ID. Create it on Meta first.' }, { status: 400 })
    }

    // Get access token from whatsapp_config
    const { data: config } = await ctx.supabase
      .from('whatsapp_config')
      .select('access_token')
      .eq('account_id', ctx.accountId)
      .single()

    if (!config?.access_token) {
      return NextResponse.json({ error: 'WhatsApp not configured' }, { status: 400 })
    }

    await publishFlow({ flowId: flow.meta_flow_id, accessToken: config.access_token })

    // Update local status
    await ctx.supabase
      .from('whatsapp_flows')
      .update({ status: 'PUBLISHED', updated_at: new Date().toISOString() })
      .eq('id', id)

    return NextResponse.json({ success: true, status: 'PUBLISHED' })
  } catch (err) {
    return toErrorResponse(err)
  }
}
