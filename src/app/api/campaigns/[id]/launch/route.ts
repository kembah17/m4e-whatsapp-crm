import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from '@/lib/rate-limit';
export async function POST(
  request: Request,
  {
 params }: { params: Promise<{ id: string }> }
) {
  try {
    const rlIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const rl = checkRateLimit(`campaignLaunch:${rlIp}`, RATE_LIMITS.campaignLaunch);
    if (!rl.success) return rateLimitResponse(rl);
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Get the campaign
    const { data: campaign, error: fetchError } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    if (campaign.status !== 'draft' && campaign.status !== 'scheduled') {
      return NextResponse.json(
        { error: `Cannot launch campaign in '${campaign.status}' status` },
        { status: 400 }
      )
    }

    // Update campaign status to active
    const { data: updated, error: updateError } = await supabase
      .from('campaigns')
      .update({
        status: 'active',
        started_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // TODO: Create broadcast/automation based on campaign config
    // For now, we mark it as active and the campaign engine cron will pick it up

    return NextResponse.json({ campaign: updated, message: 'Campaign launched successfully' })

  } catch (error) {
    console.error('[CAMPAIGNS_ID_LAUNCH_POST] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
