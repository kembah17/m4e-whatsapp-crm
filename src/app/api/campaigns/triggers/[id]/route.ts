import { NextResponse } from 'next/server'
import { getCurrentAccount, toErrorResponse } from '@/lib/auth/account'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * PUT /api/campaigns/triggers/:id
 * Update a campaign trigger.
 */
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params
    const { accountId, supabase } = await getCurrentAccount()
    const body = await request.json()

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (body.campaign_template_id !== undefined) updates.campaign_template_id = body.campaign_template_id
    if (body.trigger_event !== undefined) updates.trigger_event = body.trigger_event
    if (body.conditions !== undefined) updates.conditions = body.conditions
    if (body.delay_minutes !== undefined) updates.delay_minutes = body.delay_minutes
    if (body.is_active !== undefined) updates.is_active = body.is_active

    const { data, error } = await supabase
      .from('campaign_triggers')
      .update(updates)
      .eq('id', id)
      .eq('account_id', accountId)
      .select('*, campaign_template:campaign_templates(id, name, slug, category, default_channel)')
      .single()

    if (error) throw error

    return NextResponse.json({ trigger: data })
  } catch (err) {
    return toErrorResponse(err)
  }
}

/**
 * DELETE /api/campaigns/triggers/:id
 * Delete a campaign trigger.
 */
export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params
    const { accountId, supabase } = await getCurrentAccount()

    const { error } = await supabase
      .from('campaign_triggers')
      .delete()
      .eq('id', id)
      .eq('account_id', accountId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err) {
    return toErrorResponse(err)
  }
}
