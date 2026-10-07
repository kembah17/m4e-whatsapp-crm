import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from '@/lib/rate-limit';
import { generateHypotheses } from '@/lib/schemas/hypothesis-engine';
import { consultPatterns } from '@/lib/schemas/pattern-consultation';
import type {
  BusinessProfileSummary,
  ICPProfileSummary,
  ChannelContext,
  CampaignContext,
} from '@/lib/schemas/phase2-types';

export async function POST(
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

    // Parse optional body for additional context
    let body: Record<string, unknown> = {};
    try {
      body = await request.json();
    } catch {
      // No body is fine — we'll use defaults
    }

    // Fetch account info for business profile
    const { data: account } = await supabase
      .from('accounts')
      .select('id, business_name, industry, business_type')
      .eq('id', campaign.account_id)
      .single();

    const businessProfile: BusinessProfileSummary = {
      id: account?.id || campaign.account_id,
      industry: account?.industry || 'general',
      business_model: account?.business_type || undefined,
      target_market: (body.target_market as string) || undefined,
      competitive_advantages: (body.competitive_advantages as string[]) || undefined,
      constraints: (body.constraints as string[]) || undefined,
    };

    const icpProfile: ICPProfileSummary = {
      id: (body.icp_id as string) || 'default',
      name: (body.icp_name as string) || 'Target Customer',
      pain_points: (body.pain_points as string[]) || [],
      desired_outcomes: (body.desired_outcomes as string[]) || [],
      awareness_level: (body.awareness_level as ICPProfileSummary['awareness_level']) || undefined,
      objections: (body.objections as string[]) || undefined,
      triggers: (body.triggers as string[]) || undefined,
    };

    const channelContext: ChannelContext = {
      platform: 'whatsapp',
      audience_size: (body.audience_size as number) || undefined,
      avg_engagement_rate: (body.avg_engagement_rate as number) || undefined,
      cost_per_message: (body.cost_per_message as number) || undefined,
    };

    // Get relevant patterns first
    const campaignContext: CampaignContext = {
      industry: businessProfile.industry,
      channel: 'whatsapp',
      campaign_category: (body.campaign_category as string) || undefined,
      target_awareness_level: icpProfile.awareness_level,
    };

    const consultation = await consultPatterns(campaign.account_id, campaignContext);

    // Generate hypotheses
    const result = await generateHypotheses(
      businessProfile,
      icpProfile,
      consultation.matching_patterns,
      channelContext,
    );

    return NextResponse.json({
      success: true,
      campaign_id: id,
      ...result,
    });
  } catch (error) {
    console.error('[CAMPAIGNS_ID_HYPOTHESES] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
