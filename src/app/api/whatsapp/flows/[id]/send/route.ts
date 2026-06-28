import { NextResponse } from 'next/server'
import { requireRole, toErrorResponse } from '@/lib/auth/account'
import { sendFlowMessage } from '@/lib/whatsapp/flows-api'
import { randomUUID } from 'crypto'

interface Params { params: Promise<{ id: string }> }

export async function POST(request: Request, { params }: Params) {
  try {
    const { id } = await params
    const ctx = await requireRole('admin')
    const body = await request.json()
    const { to, headerText, bodyText, flowCTA } = body

    if (!to) {
      return NextResponse.json({ error: 'Recipient phone number (to) is required' }, { status: 400 })
    }

    // Get the flow
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
      return NextResponse.json({ error: 'Flow has no Meta Flow ID' }, { status: 400 })
    }

    // Get WhatsApp config
    const { data: config } = await ctx.supabase
      .from('whatsapp_config')
      .select('phone_number_id, access_token')
      .eq('account_id', ctx.accountId)
      .single()

    if (!config?.access_token || !config?.phone_number_id) {
      return NextResponse.json({ error: 'WhatsApp not configured' }, { status: 400 })
    }

    const result = await sendFlowMessage({
      phoneNumberId: config.phone_number_id,
      accessToken: config.access_token,
      to,
      flowId: flow.meta_flow_id,
      flowToken: randomUUID(),
      flowCTA: flowCTA || 'Open Form',
      headerText,
      bodyText,
    })

    return NextResponse.json({ success: true, result })
  } catch (err) {
    return toErrorResponse(err)
  }
}
