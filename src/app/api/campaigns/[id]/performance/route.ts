import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from '@/lib/rate-limit';
export async function GET(
  request: Request,
  {
 params }: { params: Promise<{ id: string }> }
) {
  try {
    const rlIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const rl = checkRateLimit(`general:${rlIp}`, RATE_LIMITS.general);
    if (!rl.success) return rateLimitResponse(rl);
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data, error } = await supabase.rpc('get_campaign_performance', {
      p_campaign_id: id,
    })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ performance: data })

  } catch (error) {
    console.error('[CAMPAIGNS_ID_PERFORMANCE_GET] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
