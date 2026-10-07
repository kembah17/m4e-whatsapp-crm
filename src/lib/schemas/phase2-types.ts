// =============================================================================
// CITE Phase 2 Types - Pattern Library, Hypothesis Engine, Evidence Tracking
// =============================================================================

import type {
  PatternType,
  Trend,
  Saturation,
  ConfidenceLevel,
  AwarenessLevel,
  Platform,
  Objective,
  NigerianIndustry,
} from './types';

// ─── Campaign Context (for pattern consultation) ─────────────────────────────

export interface CampaignContext {
  industry?: string;
  channel?: Platform;
  audience_segment?: string;
  campaign_category?: string;
  target_awareness_level?: AwarenessLevel;
  objective?: Objective;
  budget_range?: { min: number; max: number };
}

// ─── Pattern Extraction Types ────────────────────────────────────────────────

export interface CampaignMetrics {
  total_sent: number;
  total_delivered: number;
  total_read: number;
  total_replied: number;
  total_converted: number;
  total_purchased: number;
  total_revenue: number;
  delivery_rate: number;
  read_rate: number;
  reply_rate: number;
  conversion_rate: number;
}

export interface ExtractedPattern {
  pattern_type: PatternType;
  name: string;
  description: string;
  effectiveness_evidence: EffectivenessEvidence;
  audience_fit: AudienceFit;
  strengths: string[];
  weaknesses: string[];
  opportunity?: string;
  recommended_use?: string;
  industry?: string;
  channel?: string;
  trend: Trend;
  saturation: Saturation;
  frequency: number;
}

export interface EffectivenessEvidence {
  sample_size: number;
  delivery_rate?: number;
  read_rate?: number;
  reply_rate?: number;
  conversion_rate?: number;
  revenue_impact?: number;
  confidence_score: number;
  measurement_period?: { start: string; end: string };
  campaign_ids: string[];
}

export interface AudienceFit {
  segments: string[];
  awareness_levels: AwarenessLevel[];
  industries: string[];
  effectiveness_by_segment?: Record<string, number>;
}

export interface ExtractionResult {
  campaign_id: string;
  account_id: string;
  patterns: ExtractedPattern[];
  learnings: ExtractedLearning[];
  extracted_at: string;
  metrics_summary: CampaignMetrics;
}

export interface ExtractedLearning {
  scope: string;
  observation: string;
  finding: string;
  winning_pattern?: Record<string, unknown>;
  losing_pattern?: Record<string, unknown>;
  diagnosis?: string;
  commercial_effect?: {
    metric: string;
    before: number;
    after: number;
    delta: number;
  };
  confidence_score: number;
  applicability?: {
    scope: string;
    conditions: string[];
    exceptions: string[];
  };
}

// ─── Pattern Consultation Types ──────────────────────────────────────────────

export interface PatternMatch {
  pattern_id: string;
  pattern_type: PatternType;
  name: string;
  description: string;
  relevance_score: number;
  effectiveness_score: number;
  trend: Trend;
  saturation: Saturation;
  frequency: number;
  strengths: string[];
  weaknesses: string[];
  recommended_use?: string;
  evidence_summary: EffectivenessEvidence;
  is_anti_pattern: boolean;
}

export interface PatternSuggestion {
  suggestion_id: string;
  title: string;
  description: string;
  rationale: string;
  confidence: ConfidenceLevel;
  confidence_score: number;
  source_patterns: string[];
  action_items: string[];
  expected_impact: 'low' | 'medium' | 'high' | 'very_high';
  risk_level: 'low' | 'medium' | 'high';
  priority: number;
}

export interface ConsultationResult {
  account_id: string;
  context: CampaignContext;
  matching_patterns: PatternMatch[];
  anti_patterns: PatternMatch[];
  suggestions: PatternSuggestion[];
  consulted_at: string;
  total_patterns_searched: number;
}

// ─── Hypothesis Engine Types ─────────────────────────────────────────────────

export interface CreativeHypothesisGenerated {
  hypothesis_id: string;
  statement: string;
  rationale: string;
  supporting_patterns: string[];
  supporting_evidence: string[];
  test_method: string;
  success_criteria: SuccessCriteria[];
  confidence_score: number;
  confidence_level: ConfidenceLevel;
  expected_impact: 'low' | 'medium' | 'high' | 'very_high';
  risk_assessment: string;
  priority_rank: number;
  hypothesis_type: 'hook' | 'message' | 'timing' | 'audience' | 'channel' | 'offer' | 'creative';
}

export interface SuccessCriteria {
  metric: string;
  target_value: number;
  comparison: 'greater_than' | 'less_than' | 'equal_to' | 'between';
  baseline_value?: number;
  measurement_window_days: number;
}

export interface HypothesisGenerationResult {
  account_id: string;
  hypotheses: CreativeHypothesisGenerated[];
  generation_context: {
    business_profile_id?: string;
    icp_profile_id?: string;
    patterns_consulted: number;
    channel?: string;
  };
  generated_at: string;
}

export interface BusinessProfileSummary {
  id: string;
  industry: string;
  business_model?: string;
  target_market?: string;
  competitive_advantages?: string[];
  constraints?: string[];
}

export interface ICPProfileSummary {
  id: string;
  name: string;
  pain_points: string[];
  desired_outcomes: string[];
  awareness_level?: AwarenessLevel;
  objections?: string[];
  triggers?: string[];
}

export interface ChannelContext {
  platform: Platform;
  placement?: string;
  audience_size?: number;
  avg_engagement_rate?: number;
  cost_per_message?: number;
}

// ─── Rules Engine Types ──────────────────────────────────────────────────────

export type RuleSeverity = 'critical' | 'high' | 'medium' | 'low';

export interface RuleViolation {
  rule_id: string;
  name: string;
  severity: RuleSeverity;
  message: string;
}

export interface RuleCheckResult {
  violations: RuleViolation[];
  passed: boolean;
  has_blocking: boolean;
  checked_at: string;
  rules_checked: number;
}

// ─── Evidence Tracking Types ─────────────────────────────────────────────────

export interface EvidenceSource {
  source_type: 'pattern' | 'learning' | 'research' | 'hypothesis' | 'performance';
  source_id: string;
  description?: string;
  confidence_score?: number;
}

export interface CampaignProvenance {
  created_by: string;
  created_at: string;
  based_on_patterns: string[];
  based_on_learnings: string[];
  based_on_hypotheses: string[];
  based_on_research: string[];
  decision_rationale?: string;
}

export interface CampaignEvidenceRecord {
  id?: string;
  campaign_id: string;
  account_id: string;
  source_type: EvidenceSource['source_type'];
  source_id: string;
  relationship: 'informed_by' | 'tested_hypothesis' | 'validated_pattern' | 'contradicted_pattern';
  notes?: string;
  created_at?: string;
}

export interface ProvenanceResult {
  campaign_id: string;
  provenance: CampaignProvenance;
  evidence_chain: CampaignEvidenceRecord[];
  patterns_used: Array<{ id: string; name: string; pattern_type: PatternType }>;
  learnings_used: Array<{ id: string; observation: string }>;
  hypotheses_tested: Array<{ id: string; statement: string }>;
}
