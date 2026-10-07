// =============================================================================
// CITE Phase 2 — Pattern Extraction Library
// Analyzes completed campaigns and extracts creative patterns + learnings
// =============================================================================

import { supabaseAdmin } from '@/lib/ecommerce/admin-client';
import { scoreToConfidenceLevel } from './scoring';
import type { PatternType, Trend, Saturation, ConfidenceLevel } from './types';
import type {
  CampaignMetrics,
  ExtractedPattern,
  ExtractedLearning,
  ExtractionResult,
  EffectivenessEvidence,
  AudienceFit,
} from './phase2-types';

// ─── Constants ───────────────────────────────────────────────────────────────

const HIGH_PERFORMANCE_THRESHOLD = 0.15; // 15% reply/conversion = high
const LOW_PERFORMANCE_THRESHOLD = 0.03;  // 3% reply/conversion = low
const MIN_SAMPLE_SIZE = 10;              // Minimum messages for pattern validity

const METRIC_BENCHMARKS: Record<string, { good: number; poor: number }> = {
  delivery_rate: { good: 0.95, poor: 0.80 },
  read_rate: { good: 0.60, poor: 0.30 },
  reply_rate: { good: 0.15, poor: 0.03 },
  conversion_rate: { good: 0.08, poor: 0.02 },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function calculateConfidenceFromSample(sampleSize: number, rate: number): number {
  // Higher sample + higher rate = higher confidence
  const sampleFactor = Math.min(sampleSize / 100, 1.0); // caps at 100
  const rateFactor = Math.min(rate * 5, 1.0); // caps at 20%
  return Math.round(Math.min(sampleFactor * 0.6 + rateFactor * 0.4, 1.0) * 100) / 100;
}

function determineTrend(currentRate: number, historicalRates: number[]): Trend {
  if (historicalRates.length < 2) return 'unknown';
  const avg = historicalRates.reduce((a, b) => a + b, 0) / historicalRates.length;
  const recentAvg = historicalRates.slice(-3).reduce((a, b) => a + b, 0) /
    Math.min(historicalRates.length, 3);

  if (currentRate > recentAvg * 1.2 && recentAvg > avg * 1.1) return 'emerging';
  if (currentRate > avg * 1.1) return 'rising';
  if (currentRate < avg * 0.8) return 'declining';
  return 'stable';
}

function determineSaturation(frequency: number, totalCampaigns: number): Saturation {
  if (totalCampaigns === 0) return 'medium';
  const ratio = frequency / totalCampaigns;
  if (ratio > 0.8) return 'very_high';
  if (ratio > 0.6) return 'high';
  if (ratio > 0.3) return 'medium';
  if (ratio > 0.1) return 'low';
  return 'very_low';
}

function classifyPerformance(
  metrics: CampaignMetrics
): 'high' | 'medium' | 'low' {
  const scores: number[] = [];
  for (const [key, bench] of Object.entries(METRIC_BENCHMARKS)) {
    const val = (metrics as Record<string, number>)[key];
    if (val !== undefined) {
      if (val >= bench.good) scores.push(1);
      else if (val >= bench.poor) scores.push(0.5);
      else scores.push(0);
    }
  }
  const avg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0.5;
  if (avg >= 0.7) return 'high';
  if (avg >= 0.4) return 'medium';
  return 'low';
}

// ─── Pattern Extraction from Message Templates ───────────────────────────────

function extractPatternsFromTemplates(
  templates: Array<{ key: string; name: string; body: string; has_discount: boolean }>,
  metrics: CampaignMetrics,
  campaignId: string,
  industry?: string,
  channel?: string,
): ExtractedPattern[] {
  const patterns: ExtractedPattern[] = [];
  const performance = classifyPerformance(metrics);
  const confidenceScore = calculateConfidenceFromSample(metrics.total_sent, metrics.reply_rate);

  for (const template of templates) {
    const body = template.body || '';

    // Extract hook pattern (first line / opening)
    const firstLine = body.split('\n')[0]?.trim();
    if (firstLine && firstLine.length > 5) {
      const hookType = detectHookType(firstLine);
      patterns.push({
        pattern_type: 'hook',
        name: `${hookType}_hook_${performance}`,
        description: `Hook pattern: "${firstLine.substring(0, 80)}..." — ${performance} performance`,
        effectiveness_evidence: buildEvidence(metrics, campaignId, confidenceScore),
        audience_fit: { segments: [], awareness_levels: [], industries: industry ? [industry] : [] },
        strengths: performance === 'high' ? ['Proven engagement driver'] : [],
        weaknesses: performance === 'low' ? ['Below benchmark engagement'] : [],
        opportunity: performance === 'medium' ? 'Test variations to improve' : undefined,
        recommended_use: performance === 'high' ? 'Reuse in similar campaigns' : undefined,
        industry,
        channel,
        trend: 'unknown',
        saturation: 'medium',
        frequency: 1,
      });
    }

    // Extract CTA pattern
    const ctaMatch = body.match(/(?:reply|click|order|buy|call|visit|book|schedule|get|claim|grab)[^.!?\n]{0,60}/i);
    if (ctaMatch) {
      patterns.push({
        pattern_type: 'cta',
        name: `cta_${performance}_${template.key}`,
        description: `CTA pattern: "${ctaMatch[0].trim()}" — ${performance} performance`,
        effectiveness_evidence: buildEvidence(metrics, campaignId, confidenceScore),
        audience_fit: { segments: [], awareness_levels: [], industries: industry ? [industry] : [] },
        strengths: performance === 'high' ? ['Strong call to action'] : [],
        weaknesses: performance === 'low' ? ['Weak conversion driver'] : [],
        industry,
        channel,
        trend: 'unknown',
        saturation: 'medium',
        frequency: 1,
      });
    }

    // Extract offer pattern (discount/deal)
    if (template.has_discount || /\d+%|discount|offer|deal|free|bonus/i.test(body)) {
      patterns.push({
        pattern_type: 'offer',
        name: `offer_${performance}_${template.key}`,
        description: `Offer pattern with ${template.has_discount ? 'discount' : 'value proposition'} — ${performance} performance`,
        effectiveness_evidence: buildEvidence(metrics, campaignId, confidenceScore),
        audience_fit: { segments: [], awareness_levels: [], industries: industry ? [industry] : [] },
        strengths: performance === 'high' ? ['Compelling offer drives action'] : [],
        weaknesses: performance === 'low' ? ['Offer not compelling enough'] : [],
        industry,
        channel,
        trend: 'unknown',
        saturation: 'medium',
        frequency: 1,
      });
    }

    // Extract emotion pattern
    const emotionType = detectEmotionType(body);
    if (emotionType) {
      patterns.push({
        pattern_type: 'emotion',
        name: `emotion_${emotionType}_${performance}`,
        description: `Emotional appeal (${emotionType}) — ${performance} performance`,
        effectiveness_evidence: buildEvidence(metrics, campaignId, confidenceScore),
        audience_fit: { segments: [], awareness_levels: [], industries: industry ? [industry] : [] },
        strengths: performance === 'high' ? [`${emotionType} resonates with audience`] : [],
        weaknesses: performance === 'low' ? [`${emotionType} appeal ineffective`] : [],
        industry,
        channel,
        trend: 'unknown',
        saturation: 'medium',
        frequency: 1,
      });
    }
  }

  return patterns;
}

function detectHookType(text: string): string {
  if (/\?/.test(text)) return 'question';
  if (/\d+%|\d+ out of|statistics?/i.test(text)) return 'statistic';
  if (/miss|losing|don.t|stop|warning|urgent/i.test(text)) return 'pain';
  if (/imagine|dream|achieve|success|grow/i.test(text)) return 'desire';
  if (/secret|reveal|discover|truth|nobody/i.test(text)) return 'curiosity';
  if (/proof|proven|result|case study|testimonial/i.test(text)) return 'social_proof';
  if (/story|journey|experience|when I/i.test(text)) return 'story';
  return 'general';
}

function detectEmotionType(text: string): string | null {
  if (/fear|afraid|worry|risk|danger|lose|miss out/i.test(text)) return 'fear';
  if (/excit|amazing|incredible|wow|fantastic/i.test(text)) return 'excitement';
  if (/trust|reliable|proven|guarantee|safe/i.test(text)) return 'trust';
  if (/urgent|now|today|limited|hurry|last chance/i.test(text)) return 'urgency';
  if (/belong|community|together|join|family/i.test(text)) return 'belonging';
  if (/pride|achievement|success|accomplish/i.test(text)) return 'pride';
  return null;
}

function buildEvidence(
  metrics: CampaignMetrics,
  campaignId: string,
  confidenceScore: number,
): EffectivenessEvidence {
  return {
    sample_size: metrics.total_sent,
    delivery_rate: metrics.delivery_rate,
    read_rate: metrics.read_rate,
    reply_rate: metrics.reply_rate,
    conversion_rate: metrics.conversion_rate,
    revenue_impact: metrics.total_revenue,
    confidence_score: confidenceScore,
    campaign_ids: [campaignId],
  };
}

// ─── Learning Extraction ─────────────────────────────────────────────────────

function extractLearnings(
  metrics: CampaignMetrics,
  patterns: ExtractedPattern[],
  campaignId: string,
  industry?: string,
  channel?: string,
): ExtractedLearning[] {
  const learnings: ExtractedLearning[] = [];
  const performance = classifyPerformance(metrics);

  // Overall campaign learning
  learnings.push({
    scope: industry || 'general',
    observation: `Campaign ${campaignId} achieved ${(metrics.reply_rate * 100).toFixed(1)}% reply rate and ${(metrics.conversion_rate * 100).toFixed(1)}% conversion rate across ${metrics.total_sent} messages`,
    finding: performance === 'high'
      ? 'Campaign significantly outperformed benchmarks'
      : performance === 'low'
        ? 'Campaign underperformed benchmarks — review messaging and targeting'
        : 'Campaign performed within expected range',
    winning_pattern: performance === 'high'
      ? { patterns: patterns.filter(p => p.strengths.length > 0).map(p => p.name) }
      : undefined,
    losing_pattern: performance === 'low'
      ? { patterns: patterns.filter(p => p.weaknesses.length > 0).map(p => p.name) }
      : undefined,
    diagnosis: performance === 'low'
      ? identifyFailureDiagnosis(metrics)
      : undefined,
    commercial_effect: metrics.total_revenue > 0
      ? {
          metric: 'revenue',
          before: 0,
          after: metrics.total_revenue,
          delta: metrics.total_revenue,
        }
      : undefined,
    confidence_score: calculateConfidenceFromSample(metrics.total_sent, metrics.reply_rate),
    applicability: {
      scope: industry || 'general',
      conditions: [
        channel ? `Channel: ${channel}` : 'Any channel',
        `Sample size: ${metrics.total_sent}+ messages`,
      ],
      exceptions: metrics.total_sent < MIN_SAMPLE_SIZE
        ? ['Small sample size — treat as directional only']
        : [],
    },
  });

  // Delivery learning
  if (metrics.delivery_rate < METRIC_BENCHMARKS.delivery_rate.poor) {
    learnings.push({
      scope: 'operational',
      observation: `Delivery rate ${(metrics.delivery_rate * 100).toFixed(1)}% is below ${(METRIC_BENCHMARKS.delivery_rate.poor * 100)}% threshold`,
      finding: 'Contact list quality issue — many invalid or unreachable numbers',
      diagnosis: 'Poor contact data quality or stale phone numbers',
      confidence_score: 0.9,
      applicability: {
        scope: 'operational',
        conditions: ['Applies to contact list hygiene'],
        exceptions: [],
      },
    });
  }

  // Read vs Reply gap learning
  if (metrics.read_rate > 0.5 && metrics.reply_rate < 0.03) {
    learnings.push({
      scope: industry || 'general',
      observation: `High read rate (${(metrics.read_rate * 100).toFixed(1)}%) but very low reply rate (${(metrics.reply_rate * 100).toFixed(1)}%)`,
      finding: 'Messages are being seen but not compelling enough to drive action',
      diagnosis: 'Weak CTA or insufficient value proposition in message body',
      confidence_score: 0.7,
      applicability: {
        scope: 'messaging',
        conditions: ['Applies when read rate is healthy but replies are low'],
        exceptions: [],
      },
    });
  }

  return learnings;
}

function identifyFailureDiagnosis(metrics: CampaignMetrics): string {
  if (metrics.delivery_rate < 0.8) return 'Primary failure: delivery — contact list quality';
  if (metrics.read_rate < 0.3) return 'Primary failure: attention — messages not being opened';
  if (metrics.reply_rate < 0.03) return 'Primary failure: engagement — message content not compelling';
  if (metrics.conversion_rate < 0.02) return 'Primary failure: conversion — offer or CTA weakness';
  return 'No single dominant failure identified';
}

// ─── Main Extraction Function ────────────────────────────────────────────────

export async function extractPatternsFromCampaign(
  campaignId: string,
  accountId: string,
): Promise<ExtractionResult> {
  const admin = supabaseAdmin();

  // 1. Fetch campaign data
  const { data: campaign, error: campaignError } = await admin
    .from('campaigns')
    .select('*')
    .eq('id', campaignId)
    .eq('account_id', accountId)
    .single();

  if (campaignError || !campaign) {
    throw new Error(`Campaign not found: ${campaignError?.message || 'no data'}`);
  }

  if (campaign.status !== 'completed') {
    throw new Error(`Campaign must be completed to extract patterns. Current status: ${campaign.status}`);
  }

  // 2. Fetch performance data
  const { data: perfData } = await admin
    .from('campaign_performance')
    .select('*')
    .eq('campaign_id', campaignId)
    .single();

  const metrics: CampaignMetrics = {
    total_sent: perfData?.total_sent ?? campaign.total_audience ?? 0,
    total_delivered: perfData?.total_delivered ?? 0,
    total_read: perfData?.total_read ?? 0,
    total_replied: perfData?.total_replied ?? 0,
    total_converted: perfData?.total_converted ?? 0,
    total_purchased: perfData?.total_purchased ?? 0,
    total_revenue: perfData?.total_revenue ?? 0,
    delivery_rate: perfData?.delivery_rate ?? 0,
    read_rate: perfData?.read_rate ?? 0,
    reply_rate: perfData?.reply_rate ?? 0,
    conversion_rate: perfData?.conversion_rate ?? 0,
  };

  // 3. Fetch account industry info
  const { data: account } = await admin
    .from('accounts')
    .select('industry, business_name')
    .eq('id', accountId)
    .single();

  const industry = account?.industry || undefined;
  const channel = campaign.channel || 'whatsapp';

  // 4. Extract patterns from message templates
  const messageTemplates = campaign.message_templates || [];
  const patterns = extractPatternsFromTemplates(
    messageTemplates,
    metrics,
    campaignId,
    industry,
    channel,
  );

  // 5. Check for existing patterns and update frequency
  const { data: existingPatterns } = await admin
    .from('creative_patterns')
    .select('id, name, pattern_type, frequency')
    .eq('account_id', accountId);

  const totalCampaigns = await getCampaignCount(accountId);

  for (const pattern of patterns) {
    const existing = (existingPatterns || []).find(
      (ep) => ep.pattern_type === pattern.pattern_type && ep.name === pattern.name
    );
    if (existing) {
      pattern.frequency = (existing.frequency || 0) + 1;
      pattern.saturation = determineSaturation(pattern.frequency, totalCampaigns);
    }
  }

  // 6. Extract learnings
  const learnings = extractLearnings(metrics, patterns, campaignId, industry, channel);

  // 7. Persist patterns to database
  for (const pattern of patterns) {
    const existing = (existingPatterns || []).find(
      (ep) => ep.pattern_type === pattern.pattern_type && ep.name === pattern.name
    );

    if (existing) {
      await admin
        .from('creative_patterns')
        .update({
          frequency: pattern.frequency,
          saturation: pattern.saturation,
          effectiveness_evidence: pattern.effectiveness_evidence,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);
    } else {
      await admin
        .from('creative_patterns')
        .insert({
          account_id: accountId,
          pattern_type: pattern.pattern_type,
          name: pattern.name,
          description: pattern.description,
          frequency: pattern.frequency,
          trend: pattern.trend,
          saturation: pattern.saturation,
          effectiveness_evidence: pattern.effectiveness_evidence,
          audience_fit: pattern.audience_fit,
          strengths: pattern.strengths,
          weaknesses: pattern.weaknesses,
          opportunity: pattern.opportunity,
          recommended_use: pattern.recommended_use,
          industry: pattern.industry,
          channel: pattern.channel,
        });
    }
  }

  // 8. Persist learnings to database
  for (const learning of learnings) {
    await admin
      .from('creative_learnings')
      .insert({
        account_id: accountId,
        scope: learning.scope,
        observation: learning.observation,
        finding: learning.finding,
        winning_pattern: learning.winning_pattern || {},
        losing_pattern: learning.losing_pattern || {},
        diagnosis: learning.diagnosis,
        commercial_effect: learning.commercial_effect || {},
        confidence_score: learning.confidence_score,
        applicability: learning.applicability || {},
        source_performance_ids: perfData?.campaign_id ? [perfData.campaign_id] : [],
      });
  }

  return {
    campaign_id: campaignId,
    account_id: accountId,
    patterns,
    learnings,
    extracted_at: new Date().toISOString(),
    metrics_summary: metrics,
  };
}

async function getCampaignCount(accountId: string): Promise<number> {
  const admin = supabaseAdmin();
  const { count } = await admin
    .from('campaigns')
    .select('id', { count: 'exact', head: true })
    .eq('account_id', accountId)
    .eq('status', 'completed');
  return count ?? 0;
}
