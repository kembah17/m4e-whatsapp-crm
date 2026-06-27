import { NextResponse } from 'next/server'
import { getCurrentAccount, toErrorResponse } from '@/lib/auth/account'
import type { CreateCampaignTriggerPayload, TriggerEventType } from '@/types/campaigns'

const VALID_EVENTS: TriggerEventType[] = [
  'order_placed', 'order_shipped', 'order_delivered', 'order_cancelled',
  'payment_confirmed', 'payment_failed',
  'cart_abandoned',
  'contact_birthday', 'contact_anniversary',
  'purchase_milestone', 'no_purchase_period',
  'review_requested', 'referral_made',
  'manual',
]

/**
 * GET /api/campaigns/triggers
 * List campaign triggers for the current account.
 */
export async function GET() {
  try {
    const { accountId, supabase } = await getCurrentAccount()

    const { data, error } = await supabase
      .from('campaign_triggers')
      .select('*, campaign_template:campaign_templates(id, name, slug, category, default_channel)')
      .eq('account_id', accountId)
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ triggers: data ?? [] })
  } catch (err) {
    return toErrorResponse(err)
  }
}

/**
 * POST /api/campaigns/triggers
 * Create a new campaign trigger.
 */
export async function POST(request: Request) {
  try {
    const { accountId, supabase } = await getCurrentAccount()
    const body = (await request.json()) as CreateCampaignTriggerPayload

    if (!body.trigger_event || !VALID_EVENTS.includes(body.trigger_event)) {
      return NextResponse.json(
        { error: `Invalid trigger event. Must be one of: ${VALID_EVENTS.join(', ')}` },
        { status: 400 },
      )
    }

    const { data, error } = await supabase
      .from('campaign_triggers')
      .insert({
        account_id: accountId,
        campaign_template_id: body.campaign_template_id,
        trigger_event: body.trigger_event,
        conditions: body.conditions ?? {},
        delay_minutes: body.delay_minutes ?? 0,
        is_active: body.is_active ?? true,
      })
      .select('*, campaign_template:campaign_templates(id, name, slug, category, default_channel)')
      .single()

    if (error) throw error

    return NextResponse.json({ trigger: data }, { status: 201 })
  } catch (err) {
    return toErrorResponse(err)
  }
}
