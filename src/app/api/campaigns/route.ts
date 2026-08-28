import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from '@/lib/rate-limit';

export async function GET(request: Request) {
  try {
    const rlIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const rl = checkRateLimit(`general:${rlIp}`, RATE_LIMITS.general);
    if (!rl.success) return rateLimitResponse(rl);

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    let query = supabase
      .from('campaigns')
      .select('*, campaign_templates(name, icon, category)')
      .order('created_at', { ascending: false })

    if (status) query = query.eq('status', status)

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ campaigns: data ?? [] })

  } catch (error) {
    console.error('[CAMPAIGNS_GET] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const rlIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const rl = checkRateLimit(`general:${rlIp}`, RATE_LIMITS.general);
    if (!rl.success) return rateLimitResponse(rl);

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const {
      template_id,
      name,
      description,
      channel,
      message_templates,
      sequence_steps,
      audience_filter,
      scheduled_at,
      total_audience,
    } = body

    // Get user's account_id
    const { data: member } = await supabase
      .from('profiles')
      .select('account_id')
      .eq('user_id', user.id)
      .limit(1)
      .single()

    if (!member) return NextResponse.json({ error: 'No account found' }, { status: 404 })

    const { data, error } = await supabase
      .from('campaigns')
      .insert({
        account_id: member.account_id,
        template_id: template_id || null,
        name,
        description: description || null,
        channel: channel || 'whatsapp',
        message_templates: message_templates || [],
        sequence_steps: sequence_steps || [],
        audience_filter: audience_filter || {},
        scheduled_at: scheduled_at || null,
        total_audience: total_audience || 0,
        created_by: user.id,
        status: scheduled_at ? 'scheduled' : 'draft',
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ campaign: data }, { status: 201 })

  } catch (error) {
    console.error('[CAMPAIGNS_POST] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
