import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from '@/lib/rate-limit';
import { getProvenance } from '@/lib/schemas/evidence-tracker';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const rlIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const rl = checkRateLimit(`general:${rlIp}`, RATE_LIMITS.general);
    if (!rl.success) return rateLimitResponse(rl);

    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Verify campaign access
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('id, account_id')
      .eq('id', id)
      .single();

    if (campaignError || !campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    const provenance = await getProvenance(id, campaign.account_id);

    return NextResponse.json({
      success: true,
      ...provenance,
    });
  } catch (error) {
    console.error('[CAMPAIGNS_ID_EVIDENCE] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
