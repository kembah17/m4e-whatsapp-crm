// =============================================================================
// CITE Phase 2 — Pattern Consultation Library
// Queries pattern library for relevant precedents before campaign creation
// =============================================================================

import { supabaseAdmin } from '@/lib/ecommerce/admin-client';
import { scoreToConfidenceLevel } from './scoring';
import type { PatternType, Trend, Saturation, ConfidenceLevel, AwarenessLevel, Platform } from './types';
import type {
  CampaignContext,
  PatternMatch,
  PatternSuggestion,
  ConsultationResult,
  EffectivenessEvidence,
} from './phase2-types';

// ─── Constants ───────────────────────────────────────────────────────────────

const DEFAULT_LIMIT = 20;
const MIN_RELEVANCE_SCORE = 0.3;
const ANTI_PATTERN_THRESHOLD = 0.05; // Below 5% conversion = anti-pattern

// Weights for relevance scoring
const RELEVANCE_WEIGHTS = {
  industry_match: 0.25,
  channel_match: 0.20,
  awareness_match: 0.15,
  category_match: 0.10,
  recency: 0.10,
  frequency: 0.10,
  effectiveness: 0.10,
};

// ─── Relevance Scoring ───────────────────────────────────────────────────────

interface PatternRow {
  id: string;
  account_id: string;
  pattern_type: PatternType;
  name: string;
  description: string;
  frequency: number;
  trend: Trend;
  saturation: Saturation;
  effectiveness_evidence: EffectivenessEvidence | Record<string, unknown>;
  audience_fit: Record<string, unknown>;
  strengths: string[];
  weaknesses: string[];
  opportunity: string | null;
  recommended_use: string | null;
  industry: string | null;
  channel: string | null;
  created_at: string;
  updated_at: string;
}

function calculateRelevanceScore(
  pattern: PatternRow,
  context: CampaignContext,
): number {
  let score = 0;

  // Industry match
  if (context.industry && pattern.industry) {
    score += pattern.industry.toLowerCase() === context.industry.toLowerCase()
      ? RELEVANCE_WEIGHTS.industry_match
      : 0;
  } else {
    score += RELEVANCE_WEIGHTS.industry_match * 0.5; // Partial credit for universal patterns
  }

  // Channel match
  if (context.channel && pattern.channel) {
    score += pattern.channel.toLowerCase() === context.channel.toLowerCase()
      ? RELEVANCE_WEIGHTS.channel_match
      : 0;
  } else {
    score += RELEVANCE_WEIGHTS.channel_match * 0.3;
  }

  // Awareness level match
  const audienceFit = pattern.audience_fit as { awareness_levels?: string[] } | null;
  if (context.target_awareness_level && audienceFit?.awareness_levels) {
    const levels = audienceFit.awareness_levels;
    score += levels.includes(context.target_awareness_level)
      ? RELEVANCE_WEIGHTS.awareness_match
      : 0;
  } else {
    score += RELEVANCE_WEIGHTS.awareness_match * 0.3;
  }

  // Campaign category match (from audience_fit segments)
  const segments = (audienceFit as { segments?: string[] } | null)?.segments || [];
  if (context.campaign_category && segments.length > 0) {
    score += segments.some(s =>
      s.toLowerCase().includes(context.campaign_category!.toLowerCase())
    )
      ? RELEVANCE_WEIGHTS.category_match
      : 0;
  }

  // Recency bonus (newer patterns score higher)
  const daysSinceUpdate = Math.max(
    0,
    (Date.now() - new Date(pattern.updated_at).getTime()) / (1000 * 60 * 60 * 24)
  );
  const recencyFactor = Math.max(0, 1 - daysSinceUpdate / 365);
  score += RELEVANCE_WEIGHTS.recency * recencyFactor;

  // Frequency bonus (more frequently observed = more reliable)
  const frequencyFactor = Math.min(pattern.frequency / 10, 1);
  score += RELEVANCE_WEIGHTS.frequency * frequencyFactor;

  // Effectiveness bonus
  const evidence = pattern.effectiveness_evidence as EffectivenessEvidence | null;
  if (evidence?.confidence_score) {
    score += RELEVANCE_WEIGHTS.effectiveness * evidence.confidence_score;
  }

  return Math.round(score * 100) / 100;
}

function calculateEffectivenessScore(pattern: PatternRow): number {
  const evidence = pattern.effectiveness_evidence as EffectivenessEvidence | null;
  if (!evidence) return 0;

  let score = 0;
  let factors = 0;

  if (evidence.conversion_rate !== undefined) {
    score += Math.min(evidence.conversion_rate * 10, 1); // 10% = perfect
    factors++;
  }
  if (evidence.reply_rate !== undefined) {
    score += Math.min(evidence.reply_rate * 5, 1); // 20% = perfect
    factors++;
  }
  if (evidence.read_rate !== undefined) {
    score += Math.min(evidence.read_rate * 1.5, 1); // 67% = perfect
    factors++;
  }
  if (evidence.confidence_score !== undefined) {
    score += evidence.confidence_score;
    factors++;
  }

  return factors > 0 ? Math.round((score / factors) * 100) / 100 : 0;
}

function isAntiPattern(pattern: PatternRow): boolean {
  const evidence = pattern.effectiveness_evidence as EffectivenessEvidence | null;
  if (!evidence) return false;

  // Low conversion + low reply + sufficient sample = anti-pattern
  const hasLowConversion = (evidence.conversion_rate ?? 1) < ANTI_PATTERN_THRESHOLD;
  const hasLowReply = (evidence.reply_rate ?? 1) < ANTI_PATTERN_THRESHOLD;
  const hasSufficientSample = (evidence.sample_size ?? 0) >= 20;

  return (hasLowConversion || hasLowReply) && hasSufficientSample;
}

// ─── Pattern to Match Conversion ─────────────────────────────────────────────

function patternToMatch(
  pattern: PatternRow,
  context: CampaignContext,
): PatternMatch {
  const evidence = (pattern.effectiveness_evidence || {}) as EffectivenessEvidence;
  return {
    pattern_id: pattern.id,
    pattern_type: pattern.pattern_type,
    name: pattern.name,
    description: pattern.description,
    relevance_score: calculateRelevanceScore(pattern, context),
    effectiveness_score: calculateEffectivenessScore(pattern),
    trend: pattern.trend,
    saturation: pattern.saturation,
    frequency: pattern.frequency,
    strengths: pattern.strengths || [],
    weaknesses: pattern.weaknesses || [],
    recommended_use: pattern.recommended_use || undefined,
    evidence_summary: {
      sample_size: evidence.sample_size ?? 0,
      delivery_rate: evidence.delivery_rate,
      read_rate: evidence.read_rate,
      reply_rate: evidence.reply_rate,
      conversion_rate: evidence.conversion_rate,
      revenue_impact: evidence.revenue_impact,
      confidence_score: evidence.confidence_score ?? 0,
      campaign_ids: evidence.campaign_ids ?? [],
    },
    is_anti_pattern: isAntiPattern(pattern),
  };
}

// ─── Suggestion Generation ───────────────────────────────────────────────────

export function generateSuggestions(
  patterns: PatternMatch[],
  context: CampaignContext,
): PatternSuggestion[] {
  const suggestions: PatternSuggestion[] = [];
  let suggestionIndex = 0;

  // Group patterns by type
  const byType = new Map<PatternType, PatternMatch[]>();
  for (const p of patterns) {
    if (p.is_anti_pattern) continue; // Skip anti-patterns for positive suggestions
    const list = byType.get(p.pattern_type) || [];
    list.push(p);
    byType.set(p.pattern_type, list);
  }

  // Generate suggestions per pattern type
  for (const [patternType, typePatterns] of byType) {
    // Sort by effectiveness
    const sorted = typePatterns.sort((a, b) => b.effectiveness_score - a.effectiveness_score);
    const best = sorted[0];
    if (!best) continue;

    const confidenceScore = best.effectiveness_score;
    const confidenceLevel = scoreToConfidenceLevel(confidenceScore);

    suggestions.push({
      suggestion_id: `sug_${++suggestionIndex}`,
      title: `Use ${patternType} pattern: ${best.name}`,
      description: best.description,
      rationale: buildRationale(best, context),
      confidence: confidenceLevel,
      confidence_score: confidenceScore,
      source_patterns: [best.pattern_id],
      action_items: buildActionItems(best, patternType, context),
      expected_impact: confidenceScore >= 0.7 ? 'high'
        : confidenceScore >= 0.4 ? 'medium' : 'low',
      risk_level: best.saturation === 'very_high' || best.saturation === 'high'
        ? 'high' : best.saturation === 'medium' ? 'medium' : 'low',
      priority: suggestionIndex,
    });
  }

  // Generate anti-pattern warnings
  const antiPatterns = patterns.filter(p => p.is_anti_pattern);
  for (const ap of antiPatterns.slice(0, 5)) {
    suggestions.push({
      suggestion_id: `sug_avoid_${++suggestionIndex}`,
      title: `⚠️ Avoid: ${ap.name}`,
      description: `This ${ap.pattern_type} pattern has consistently underperformed. ${ap.description}`,
      rationale: `Based on ${ap.evidence_summary.sample_size} messages with ${((ap.evidence_summary.conversion_rate ?? 0) * 100).toFixed(1)}% conversion rate`,
      confidence: scoreToConfidenceLevel(ap.evidence_summary.confidence_score),
      confidence_score: ap.evidence_summary.confidence_score,
      source_patterns: [ap.pattern_id],
      action_items: ['Avoid this pattern in new campaigns', 'Consider opposite approach'],
      expected_impact: 'low',
      risk_level: 'high',
      priority: 100 + suggestionIndex, // Lower priority than positive suggestions
    });
  }

  // Sort by priority
  return suggestions.sort((a, b) => a.priority - b.priority);
}

function buildRationale(pattern: PatternMatch, context: CampaignContext): string {
  const parts: string[] = [];

  if (pattern.evidence_summary.sample_size > 0) {
    parts.push(`Tested across ${pattern.evidence_summary.sample_size} messages`);
  }
  if (pattern.evidence_summary.conversion_rate !== undefined) {
    parts.push(`${(pattern.evidence_summary.conversion_rate * 100).toFixed(1)}% conversion rate`);
  }
  if (pattern.trend === 'emerging' || pattern.trend === 'rising') {
    parts.push(`Currently ${pattern.trend} in effectiveness`);
  }
  if (pattern.frequency > 3) {
    parts.push(`Observed in ${pattern.frequency} campaigns`);
  }
  if (context.industry) {
    parts.push(`Relevant to ${context.industry} industry`);
  }

  return parts.length > 0 ? parts.join('. ') + '.' : 'Based on historical pattern analysis.';
}

function buildActionItems(
  pattern: PatternMatch,
  patternType: PatternType,
  context: CampaignContext,
): string[] {
  const items: string[] = [];

  switch (patternType) {
    case 'hook':
      items.push('Use this hook style in the opening message');
      items.push('Test 2-3 variations of this hook type');
      break;
    case 'cta':
      items.push('Incorporate this CTA style in your message');
      items.push('Place CTA prominently — avoid burying it');
      break;
    case 'offer':
      items.push('Structure your offer following this pattern');
      items.push('Ensure offer is time-limited for urgency');
      break;
    case 'emotion':
      items.push('Lead with this emotional appeal');
      items.push('Pair with proof elements for credibility');
      break;
    case 'problem':
      items.push('Frame the problem using this pattern');
      items.push('Connect problem to your solution naturally');
      break;
    default:
      items.push(`Apply this ${patternType} pattern to your campaign`);
      items.push('Monitor performance and compare to baseline');
  }

  if (pattern.saturation === 'high' || pattern.saturation === 'very_high') {
    items.push('⚠️ High saturation — add unique differentiation');
  }

  if (pattern.recommended_use) {
    items.push(pattern.recommended_use);
  }

  return items;
}

// ─── Main Consultation Function ──────────────────────────────────────────────

export async function consultPatterns(
  accountId: string,
  campaignContext: CampaignContext,
): Promise<ConsultationResult> {
  const admin = supabaseAdmin();

  // 1. Build query for relevant patterns
  let query = admin
    .from('creative_patterns')
    .select('*')
    .eq('account_id', accountId)
    .order('frequency', { ascending: false })
    .limit(100);

  // Apply filters if context provided
  if (campaignContext.industry) {
    // Get both industry-specific and universal patterns
    query = query.or(
      `industry.eq.${campaignContext.industry},industry.is.null`
    );
  }
  if (campaignContext.channel) {
    query = query.or(
      `channel.eq.${campaignContext.channel},channel.is.null`
    );
  }

  const { data: patterns, error } = await query;

  if (error) {
    throw new Error(`Failed to query patterns: ${error.message}`);
  }

  const allPatterns = (patterns || []) as PatternRow[];

  // 2. Score and rank patterns
  const matches: PatternMatch[] = allPatterns
    .map(p => patternToMatch(p, campaignContext))
    .filter(m => m.relevance_score >= MIN_RELEVANCE_SCORE)
    .sort((a, b) => b.relevance_score - a.relevance_score);

  // 3. Separate positive patterns and anti-patterns
  const positivePatterns = matches
    .filter(m => !m.is_anti_pattern)
    .slice(0, DEFAULT_LIMIT);
  const antiPatterns = matches
    .filter(m => m.is_anti_pattern)
    .slice(0, 10);

  // 4. Generate actionable suggestions
  const suggestions = generateSuggestions(matches, campaignContext);

  return {
    account_id: accountId,
    context: campaignContext,
    matching_patterns: positivePatterns,
    anti_patterns: antiPatterns,
    suggestions,
    consulted_at: new Date().toISOString(),
    total_patterns_searched: allPatterns.length,
  };
}
