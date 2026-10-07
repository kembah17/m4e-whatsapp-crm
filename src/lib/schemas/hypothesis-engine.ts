// =============================================================================
// CITE Phase 2 — Hypothesis Engine
// Generates testable creative hypotheses from patterns, profiles, and context
// =============================================================================

import { supabaseAdmin } from '@/lib/ecommerce/admin-client';
import { scoreToConfidenceLevel } from './scoring';
import type { PatternType, ConfidenceLevel, AwarenessLevel, Platform } from './types';
import type {
  CreativeHypothesisGenerated,
  SuccessCriteria,
  HypothesisGenerationResult,
  BusinessProfileSummary,
  ICPProfileSummary,
  ChannelContext,
  PatternMatch,
} from './phase2-types';
import { consultPatterns } from './pattern-consultation';

// ─── Constants ───────────────────────────────────────────────────────────────

const MAX_HYPOTHESES = 10;

const HYPOTHESIS_TEMPLATES: Record<
  CreativeHypothesisGenerated['hypothesis_type'],
  {
    statement_template: string;
    default_metric: string;
    default_window_days: number;
  }
> = {
  hook: {
    statement_template: 'Using a {hook_style} hook will increase read rates by {target}% compared to baseline',
    default_metric: 'read_rate',
    default_window_days: 14,
  },
  message: {
    statement_template: 'Messages emphasizing {emphasis} will achieve higher reply rates than current approach',
    default_metric: 'reply_rate',
    default_window_days: 14,
  },
  timing: {
    statement_template: 'Sending messages at {time_window} will improve delivery and read rates',
    default_metric: 'read_rate',
    default_window_days: 7,
  },
  audience: {
    statement_template: 'Targeting {segment} segment will yield higher conversion rates than broad targeting',
    default_metric: 'conversion_rate',
    default_window_days: 21,
  },
  channel: {
    statement_template: 'Using {channel} as primary channel will outperform current channel mix',
    default_metric: 'conversion_rate',
    default_window_days: 30,
  },
  offer: {
    statement_template: 'Restructuring the offer to emphasize {value_prop} will increase conversions',
    default_metric: 'conversion_rate',
    default_window_days: 14,
  },
  creative: {
    statement_template: 'Applying {creative_approach} creative style will improve engagement metrics',
    default_metric: 'reply_rate',
    default_window_days: 14,
  },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function generateId(): string {
  return `hyp_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

function calculateHypothesisConfidence(
  patternCount: number,
  avgPatternEffectiveness: number,
  evidenceStrength: number,
): number {
  // More supporting patterns + higher effectiveness + stronger evidence = higher confidence
  const patternFactor = Math.min(patternCount / 5, 1.0) * 0.3;
  const effectivenessFactor = avgPatternEffectiveness * 0.4;
  const evidenceFactor = evidenceStrength * 0.3;
  return Math.round((patternFactor + effectivenessFactor + evidenceFactor) * 100) / 100;
}

function estimateImpact(
  confidence: number,
  patternEffectiveness: number,
): CreativeHypothesisGenerated['expected_impact'] {
  const score = confidence * 0.4 + patternEffectiveness * 0.6;
  if (score >= 0.7) return 'very_high';
  if (score >= 0.5) return 'high';
  if (score >= 0.3) return 'medium';
  return 'low';
}

function assessRisk(
  patterns: PatternMatch[],
  hypothesisType: CreativeHypothesisGenerated['hypothesis_type'],
): string {
  const hasAntiPatterns = patterns.some(p => p.is_anti_pattern);
  const avgSaturation = patterns.reduce((sum, p) => {
    const satMap: Record<string, number> = {
      very_low: 0.1, low: 0.3, medium: 0.5, high: 0.7, very_high: 0.9,
    };
    return sum + (satMap[p.saturation] ?? 0.5);
  }, 0) / Math.max(patterns.length, 1);

  if (hasAntiPatterns) return 'High risk: related anti-patterns detected';
  if (avgSaturation > 0.7) return 'Medium risk: high pattern saturation may reduce effectiveness';
  if (hypothesisType === 'channel') return 'Medium risk: channel changes require infrastructure adjustment';
  if (hypothesisType === 'offer') return 'Medium risk: offer changes may affect revenue predictability';
  return 'Low risk: well-supported by existing evidence';
}

// ─── Hypothesis Generators ───────────────────────────────────────────────────

function generateHookHypotheses(
  patterns: PatternMatch[],
  icp: ICPProfileSummary | null,
  channel: ChannelContext | null,
): CreativeHypothesisGenerated[] {
  const hookPatterns = patterns.filter(p => p.pattern_type === 'hook' && !p.is_anti_pattern);
  if (hookPatterns.length === 0) return [];

  const best = hookPatterns.sort((a, b) => b.effectiveness_score - a.effectiveness_score)[0];
  const confidence = calculateHypothesisConfidence(
    hookPatterns.length,
    best.effectiveness_score,
    best.evidence_summary.confidence_score,
  );

  const painPoints = icp?.pain_points || [];
  const hookStyle = best.name.includes('question') ? 'question-based'
    : best.name.includes('pain') ? 'pain-point'
    : best.name.includes('curiosity') ? 'curiosity-driven'
    : best.name.includes('social_proof') ? 'social-proof'
    : 'proven';

  return [{
    hypothesis_id: generateId(),
    statement: `Using a ${hookStyle} hook${painPoints.length > 0 ? ` addressing "${painPoints[0]}"` : ''} will increase read rates by 15-25% compared to current baseline`,
    rationale: `Based on ${hookPatterns.length} observed hook patterns. Best performer (${best.name}) achieved ${((best.evidence_summary.read_rate ?? 0) * 100).toFixed(1)}% read rate across ${best.evidence_summary.sample_size} messages.`,
    supporting_patterns: hookPatterns.map(p => p.pattern_id),
    supporting_evidence: best.evidence_summary.campaign_ids,
    test_method: 'A/B test: send 50% of audience the new hook, 50% the current hook. Measure read rate difference after 48 hours.',
    success_criteria: [{
      metric: 'read_rate',
      target_value: Math.min((best.evidence_summary.read_rate ?? 0.5) * 1.15, 0.95),
      comparison: 'greater_than',
      baseline_value: best.evidence_summary.read_rate ?? 0.5,
      measurement_window_days: 7,
    }],
    confidence_score: confidence,
    confidence_level: scoreToConfidenceLevel(confidence),
    expected_impact: estimateImpact(confidence, best.effectiveness_score),
    risk_assessment: assessRisk(hookPatterns, 'hook'),
    priority_rank: 1,
    hypothesis_type: 'hook',
  }];
}

function generateMessageHypotheses(
  patterns: PatternMatch[],
  icp: ICPProfileSummary | null,
  business: BusinessProfileSummary | null,
): CreativeHypothesisGenerated[] {
  const emotionPatterns = patterns.filter(p => p.pattern_type === 'emotion' && !p.is_anti_pattern);
  const ctaPatterns = patterns.filter(p => p.pattern_type === 'cta' && !p.is_anti_pattern);
  const hypotheses: CreativeHypothesisGenerated[] = [];

  // Emotion-based hypothesis
  if (emotionPatterns.length > 0) {
    const best = emotionPatterns.sort((a, b) => b.effectiveness_score - a.effectiveness_score)[0];
    const emotionType = best.name.includes('urgency') ? 'urgency'
      : best.name.includes('trust') ? 'trust'
      : best.name.includes('fear') ? 'fear of missing out'
      : best.name.includes('excitement') ? 'excitement'
      : 'emotional resonance';

    const confidence = calculateHypothesisConfidence(
      emotionPatterns.length,
      best.effectiveness_score,
      best.evidence_summary.confidence_score,
    );

    hypotheses.push({
      hypothesis_id: generateId(),
      statement: `Messages leading with ${emotionType} will achieve higher reply rates than feature-focused messages`,
      rationale: `${emotionPatterns.length} emotion patterns analyzed. ${emotionType} patterns show ${((best.evidence_summary.reply_rate ?? 0) * 100).toFixed(1)}% reply rate.${icp?.desired_outcomes?.length ? ` ICP desires: ${icp.desired_outcomes[0]}` : ''}`,
      supporting_patterns: emotionPatterns.map(p => p.pattern_id),
      supporting_evidence: best.evidence_summary.campaign_ids,
      test_method: 'Split test: emotion-led message vs feature-led message to equal audience segments.',
      success_criteria: [{
        metric: 'reply_rate',
        target_value: Math.min((best.evidence_summary.reply_rate ?? 0.1) * 1.2, 0.5),
        comparison: 'greater_than',
        baseline_value: best.evidence_summary.reply_rate ?? 0.1,
        measurement_window_days: 14,
      }],
      confidence_score: confidence,
      confidence_level: scoreToConfidenceLevel(confidence),
      expected_impact: estimateImpact(confidence, best.effectiveness_score),
      risk_assessment: assessRisk(emotionPatterns, 'message'),
      priority_rank: 2,
      hypothesis_type: 'message',
    });
  }

  // CTA-based hypothesis
  if (ctaPatterns.length > 0) {
    const best = ctaPatterns.sort((a, b) => b.effectiveness_score - a.effectiveness_score)[0];
    const confidence = calculateHypothesisConfidence(
      ctaPatterns.length,
      best.effectiveness_score,
      best.evidence_summary.confidence_score,
    );

    hypotheses.push({
      hypothesis_id: generateId(),
      statement: `A direct, action-oriented CTA will increase conversion rates compared to soft CTAs`,
      rationale: `${ctaPatterns.length} CTA patterns analyzed. Best performer achieved ${((best.evidence_summary.conversion_rate ?? 0) * 100).toFixed(1)}% conversion rate.`,
      supporting_patterns: ctaPatterns.map(p => p.pattern_id),
      supporting_evidence: best.evidence_summary.campaign_ids,
      test_method: 'A/B test: direct CTA ("Reply YES to order") vs soft CTA ("Let us know if interested").',
      success_criteria: [{
        metric: 'conversion_rate',
        target_value: Math.min((best.evidence_summary.conversion_rate ?? 0.05) * 1.25, 0.3),
        comparison: 'greater_than',
        baseline_value: best.evidence_summary.conversion_rate ?? 0.05,
        measurement_window_days: 14,
      }],
      confidence_score: confidence,
      confidence_level: scoreToConfidenceLevel(confidence),
      expected_impact: estimateImpact(confidence, best.effectiveness_score),
      risk_assessment: assessRisk(ctaPatterns, 'message'),
      priority_rank: 3,
      hypothesis_type: 'message',
    });
  }

  return hypotheses;
}

function generateOfferHypotheses(
  patterns: PatternMatch[],
  business: BusinessProfileSummary | null,
): CreativeHypothesisGenerated[] {
  const offerPatterns = patterns.filter(p => p.pattern_type === 'offer' && !p.is_anti_pattern);
  if (offerPatterns.length === 0) return [];

  const best = offerPatterns.sort((a, b) => b.effectiveness_score - a.effectiveness_score)[0];
  const confidence = calculateHypothesisConfidence(
    offerPatterns.length,
    best.effectiveness_score,
    best.evidence_summary.confidence_score,
  );

  return [{
    hypothesis_id: generateId(),
    statement: `Restructuring the offer to lead with value/outcome rather than discount will improve conversion quality`,
    rationale: `${offerPatterns.length} offer patterns analyzed. ${business?.competitive_advantages?.length ? `Business advantages: ${business.competitive_advantages[0]}` : 'Offer optimization based on pattern evidence.'}`,
    supporting_patterns: offerPatterns.map(p => p.pattern_id),
    supporting_evidence: best.evidence_summary.campaign_ids,
    test_method: 'Split test: value-led offer vs discount-led offer. Track both conversion rate and average order value.',
    success_criteria: [
      {
        metric: 'conversion_rate',
        target_value: (best.evidence_summary.conversion_rate ?? 0.05) * 1.1,
        comparison: 'greater_than',
        baseline_value: best.evidence_summary.conversion_rate ?? 0.05,
        measurement_window_days: 14,
      },
    ],
    confidence_score: confidence,
    confidence_level: scoreToConfidenceLevel(confidence),
    expected_impact: estimateImpact(confidence, best.effectiveness_score),
    risk_assessment: assessRisk(offerPatterns, 'offer'),
    priority_rank: 4,
    hypothesis_type: 'offer',
  }];
}

function generateAudienceHypotheses(
  patterns: PatternMatch[],
  icp: ICPProfileSummary | null,
): CreativeHypothesisGenerated[] {
  if (!icp) return [];

  // Look for patterns with audience_fit data
  const patternsWithAudience = patterns.filter(p => {
    const evidence = p.evidence_summary;
    return evidence.sample_size > 50 && !p.is_anti_pattern;
  });

  if (patternsWithAudience.length === 0) return [];

  const avgEffectiveness = patternsWithAudience.reduce(
    (sum, p) => sum + p.effectiveness_score, 0
  ) / patternsWithAudience.length;

  const confidence = calculateHypothesisConfidence(
    patternsWithAudience.length,
    avgEffectiveness,
    0.5, // moderate evidence for audience hypotheses
  );

  const segment = icp.awareness_level === 'most_aware' ? 'most-aware repeat customers'
    : icp.awareness_level === 'product_aware' ? 'product-aware prospects'
    : icp.awareness_level === 'solution_aware' ? 'solution-aware leads'
    : 'high-intent prospects';

  return [{
    hypothesis_id: generateId(),
    statement: `Targeting ${segment} with tailored messaging will yield 2x higher conversion rates than broad audience targeting`,
    rationale: `ICP analysis identifies key pain points: ${icp.pain_points.slice(0, 2).join(', ')}. ${patternsWithAudience.length} patterns support segment-specific messaging.`,
    supporting_patterns: patternsWithAudience.slice(0, 5).map(p => p.pattern_id),
    supporting_evidence: [],
    test_method: `Segment audience by awareness level. Send tailored messages to ${segment} segment vs generic message to control group.`,
    success_criteria: [{
      metric: 'conversion_rate',
      target_value: 0.10,
      comparison: 'greater_than',
      baseline_value: 0.05,
      measurement_window_days: 21,
    }],
    confidence_score: confidence,
    confidence_level: scoreToConfidenceLevel(confidence),
    expected_impact: estimateImpact(confidence, avgEffectiveness),
    risk_assessment: assessRisk(patternsWithAudience, 'audience'),
    priority_rank: 5,
    hypothesis_type: 'audience',
  }];
}

// ─── Main Generation Function ────────────────────────────────────────────────

export async function generateHypotheses(
  businessProfile: BusinessProfileSummary | null,
  icpProfile: ICPProfileSummary | null,
  patterns: PatternMatch[],
  channelContext: ChannelContext | null,
): Promise<CreativeHypothesisGenerated[]> {
  const allHypotheses: CreativeHypothesisGenerated[] = [];

  // Generate hypotheses from each generator
  allHypotheses.push(...generateHookHypotheses(patterns, icpProfile, channelContext));
  allHypotheses.push(...generateMessageHypotheses(patterns, icpProfile, businessProfile));
  allHypotheses.push(...generateOfferHypotheses(patterns, businessProfile));
  allHypotheses.push(...generateAudienceHypotheses(patterns, icpProfile));

  // Sort by confidence * expected_impact weight
  const impactWeights: Record<string, number> = {
    very_high: 1.0, high: 0.75, medium: 0.5, low: 0.25,
  };

  allHypotheses.sort((a, b) => {
    const scoreA = a.confidence_score * (impactWeights[a.expected_impact] ?? 0.5);
    const scoreB = b.confidence_score * (impactWeights[b.expected_impact] ?? 0.5);
    return scoreB - scoreA;
  });

  // Re-rank after sorting
  allHypotheses.forEach((h, i) => { h.priority_rank = i + 1; });

  return allHypotheses.slice(0, MAX_HYPOTHESES);
}

// ─── Full Pipeline: Consult Patterns + Generate Hypotheses ───────────────────

export async function generateHypothesesForCampaign(
  accountId: string,
  campaignContext: {
    industry?: string;
    channel?: Platform;
    audience_segment?: string;
    campaign_category?: string;
    target_awareness_level?: AwarenessLevel;
  },
): Promise<HypothesisGenerationResult> {
  const admin = supabaseAdmin();

  // 1. Consult pattern library
  const consultation = await consultPatterns(accountId, campaignContext);
  const allPatterns = [...consultation.matching_patterns, ...consultation.anti_patterns];

  // 2. Fetch business profile (if exists)
  let businessProfile: BusinessProfileSummary | null = null;
  const { data: bpData } = await admin
    .from('schema_objects')
    .select('id, data')
    .eq('account_id', accountId)
    .eq('schema_type', 'BusinessProfile')
    .eq('lifecycle_status', 'approved')
    .order('updated_at', { ascending: false })
    .limit(1)
    .single();

  if (bpData?.data) {
    const d = bpData.data as Record<string, unknown>;
    const identity = d.identity as Record<string, string> | undefined;
    const model = d.business_model as Record<string, string> | undefined;
    const position = d.market_position as Record<string, unknown> | undefined;
    businessProfile = {
      id: bpData.id,
      industry: identity?.industry || campaignContext.industry || '',
      business_model: model?.type,
      target_market: model?.customer_type,
      competitive_advantages: (position?.competitive_advantages as string[]) || [],
      constraints: (d.constraints as string[]) || [],
    };
  }

  // 3. Fetch ICP profile (if exists)
  let icpProfile: ICPProfileSummary | null = null;
  const { data: icpData } = await admin
    .from('schema_objects')
    .select('id, data')
    .eq('account_id', accountId)
    .eq('schema_type', 'ICPProfile')
    .eq('lifecycle_status', 'approved')
    .order('updated_at', { ascending: false })
    .limit(1)
    .single();

  if (icpData?.data) {
    const d = icpData.data as Record<string, unknown>;
    const awareness = d.awareness as Record<string, string> | undefined;
    icpProfile = {
      id: icpData.id,
      name: (d.name as string) || 'Default ICP',
      pain_points: (d.pain_points as string[]) || [],
      desired_outcomes: (d.desired_outcomes as string[]) || [],
      awareness_level: (awareness?.product as AwarenessLevel) || undefined,
      objections: (d.objections as string[]) || [],
      triggers: (d.triggers as string[]) || [],
    };
  }

  // 4. Build channel context
  const channelContext: ChannelContext | null = campaignContext.channel
    ? { platform: campaignContext.channel }
    : null;

  // 5. Generate hypotheses
  const hypotheses = await generateHypotheses(
    businessProfile,
    icpProfile,
    allPatterns,
    channelContext,
  );

  return {
    account_id: accountId,
    hypotheses,
    generation_context: {
      business_profile_id: businessProfile?.id,
      icp_profile_id: icpProfile?.id,
      patterns_consulted: consultation.total_patterns_searched,
      channel: campaignContext.channel,
    },
    generated_at: new Date().toISOString(),
  };
}
