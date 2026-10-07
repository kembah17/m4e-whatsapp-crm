import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from '@/lib/rate-limit';
import { consultPatterns, generateSuggestions } from '@/lib/schemas/pattern-consultation';
import type { CampaignContext } from '@/lib/schemas/phase2-types';

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

    // Fetch campaign with template info for context
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select(`
        id, account_id, name, status,
        campaign_templates(name, category)
      `)
      .eq('id', id)
      .single();

    if (campaignError || !campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    // Fetch account for industry context
    const { data: account } = await supabase
      .from('accounts')
      .select('industry, business_type')
      .eq('id', campaign.account_id)
      .single();

    // Build campaign context from available data
    const template = campaign.campaign_templates as { name?: string; category?: string } | null;
    const context: CampaignContext = {
      industry: account?.industry || undefined,
      channel: 'whatsapp',
      campaign_category: template?.category || undefined,
    };

    // Consult pattern library
    const consultation = await consultPatterns(campaign.account_id, context);

    // Generate actionable suggestions
    const suggestions = generateSuggestions(
      consultation.matching_patterns,
      context,
    );

    return NextResponse.json({
      campaign_id: id,
      context,
      patterns: consultation.matching_patterns.slice(0, 10),
      anti_patterns: consultation.anti_patterns.slice(0, 5),
      suggestions,
      total_patterns_searched: consultation.total_patterns_searched,
    });
  } catch (error) {
    console.error('[CAMPAIGNS_ID_SUGGESTIONS] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
