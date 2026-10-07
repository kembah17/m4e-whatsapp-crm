// =============================================================================
// CITE Schema Validation Helpers (Client-side)
// Simple validation utilities for TypeScript consumers
// =============================================================================

import type {
  SchemaEnvelope,
  ObjectType,
  LifecycleStatus,
  ConfidenceLevel,
} from './types';

// ─── All valid schema types ──────────────────────────────────────────────────

export const ALL_SCHEMA_TYPES: ObjectType[] = [
  'BusinessProfile',
  'ICPProfile',
  'OfferProfile',
  'SolutionMethodology',
  'MarketIntelligence',
  'ChannelProfile',
  'ChannelRecommendation',
  'CreativeBrief',
  'CompetitiveAdRecord',
  'CreativePattern',
  'CreativeHypothesis',
  'Hook',
  'CreativeConcept',
  'Story',
  'CharacterBible',
  'EnvironmentBible',
  'Storyboard',
  'ProductionSpecification',
  'Asset',
  'ValidationReport',
  'Campaign',
  'PerformanceRecord',
  'CreativeLearning',
  'WebsiteResearchBrief',
];

export const ALL_LIFECYCLE_STATUSES: LifecycleStatus[] = [
  'draft',
  'proposed',
  'validated',
  'approved',
  'rejected',
  'superseded',
  'archived',
];

export const ALL_CONFIDENCE_LEVELS: ConfidenceLevel[] = [
  'very_low',
  'low',
  'medium',
  'high',
  'very_high',
];

// ─── Type Guards ─────────────────────────────────────────────────────────────

/**
 * Check if a string is a valid CITE schema type.
 */
export function isValidSchemaType(type: string): type is ObjectType {
  return ALL_SCHEMA_TYPES.includes(type as ObjectType);
}

/**
 * Check if a string is a valid lifecycle status.
 */
export function isValidLifecycleStatus(
  status: string
): status is LifecycleStatus {
  return ALL_LIFECYCLE_STATUSES.includes(status as LifecycleStatus);
}

/**
 * Check if a string is a valid confidence level.
 */
export function isValidConfidenceLevel(
  level: string
): level is ConfidenceLevel {
  return ALL_CONFIDENCE_LEVELS.includes(level as ConfidenceLevel);
}

// ─── Envelope Validation ─────────────────────────────────────────────────────

const ENVELOPE_REQUIRED_FIELDS: (keyof SchemaEnvelope)[] = [
  'id',
  'schema_type',
  'schema_version',
  'object_version',
  'created_at',
  'updated_at',
  'source',
  'provenance',
  'confidence',
  'validation',
  'approval',
  'tags',
  'relations',
  'lifecycle_status',
];

/**
 * Validate that data has all required envelope fields.
 * Returns the data cast as SchemaEnvelope if valid, null otherwise.
 */
export function validateEnvelope(
  data: unknown
): SchemaEnvelope | null {
  if (!data || typeof data !== 'object') return null;

  const obj = data as Record<string, unknown>;

  // Check all required fields exist
  for (const field of ENVELOPE_REQUIRED_FIELDS) {
    if (!(field in obj) || obj[field] === undefined || obj[field] === null) {
      return null;
    }
  }

  // Validate schema_type
  if (typeof obj.schema_type !== 'string' || !isValidSchemaType(obj.schema_type)) {
    return null;
  }

  // Validate schema_version format
  if (
    typeof obj.schema_version !== 'string' ||
    !/^\d+\.\d+\.\d+$/.test(obj.schema_version)
  ) {
    return null;
  }

  // Validate object_version
  if (typeof obj.object_version !== 'number' || obj.object_version < 1) {
    return null;
  }

  // Validate lifecycle_status
  if (
    typeof obj.lifecycle_status !== 'string' ||
    !isValidLifecycleStatus(obj.lifecycle_status)
  ) {
    return null;
  }

  // Validate confidence
  if (typeof obj.confidence !== 'object' || !obj.confidence) return null;
  const conf = obj.confidence as Record<string, unknown>;
  if (
    typeof conf.score !== 'number' ||
    conf.score < 0 ||
    conf.score > 1 ||
    typeof conf.level !== 'string' ||
    !isValidConfidenceLevel(conf.level)
  ) {
    return null;
  }

  // Validate tags is array
  if (!Array.isArray(obj.tags)) return null;

  // Validate relations is array
  if (!Array.isArray(obj.relations)) return null;

  return data as SchemaEnvelope;
}

// ─── Required Fields per Schema Type ─────────────────────────────────────────

const SCHEMA_REQUIRED_FIELDS: Record<ObjectType, string[]> = {
  BusinessProfile: ['identity', 'business_model', 'commercial', 'market_position', 'capacity', 'business_goals', 'constraints'],
  ICPProfile: ['name', 'market', 'firmographics', 'decision_maker', 'psychographics', 'jobs_to_be_done', 'pain_points', 'desired_outcomes', 'triggers', 'objections', 'existing_solutions', 'buying_process', 'language', 'awareness'],
  OfferProfile: ['name', 'category', 'description', 'customer_problem', 'desired_outcomes', 'mechanism', 'differentiators', 'proof', 'limitations', 'cta_options'],
  SolutionMethodology: ['problem_definition', 'diagnostic_process', 'intervention', 'delivery_steps', 'mechanism', 'transformation', 'customer_participation', 'proof_points', 'limitations', 'non_claims', 'failure_conditions'],
  MarketIntelligence: ['market', 'market_size', 'market_trends', 'customer_trends', 'pain_trends', 'desire_trends', 'competitors', 'substitutes', 'economic_factors', 'regulatory_factors', 'cultural_factors', 'technology_factors', 'opportunities', 'threats', 'evidence_ids'],
  ChannelProfile: ['channel', 'placement', 'market', 'audience', 'behavior', 'creative_grammar', 'cost', 'awareness_distribution', 'competition', 'constraints', 'strengths', 'weaknesses', 'evidence_ids'],
  ChannelRecommendation: ['channel_profile_id', 'business_profile_id', 'icp_profile_id', 'offer_profile_id', 'objective', 'scores', 'total_score', 'confidence', 'recommendation', 'reasoning', 'risks', 'test_plan'],
  CreativeBrief: ['business_profile_id', 'offer_profile_id', 'icp_profile_id', 'methodology_id', 'channel_recommendation_id', 'campaign_objective', 'awareness_stage', 'single_minded_proposition', 'customer_problem', 'customer_desire', 'desired_belief_change', 'mechanism_to_demonstrate', 'proof_required', 'offer', 'cta', 'creative_constraints', 'brand_constraints', 'cultural_constraints', 'platform_constraints', 'production_constraints', 'success_metrics'],
  CompetitiveAdRecord: ['capture', 'classification', 'creative', 'audience', 'observed_signals', 'evidence_ids'],
  CreativePattern: ['pattern_type', 'name', 'description', 'observed_in', 'frequency', 'trend', 'saturation', 'effectiveness_evidence', 'audience_fit', 'strengths', 'weaknesses', 'opportunity', 'recommended_use', 'confidence'],
  CreativeHypothesis: ['creative_angle', 'hypothesis', 'target_audience', 'problem', 'desire', 'belief_change', 'mechanism', 'hook_direction', 'proof_direction', 'expected_response', 'why_it_should_work', 'differentiation', 'risks', 'production_complexity', 'strategic_score', 'confidence', 'test_metric'],
  Hook: ['hypothesis_id', 'type', 'text', 'promise', 'attention_mechanism', 'emotional_trigger', 'audience_relevance', 'channel_fit', 'clarity_score', 'curiosity_score', 'credibility_score', 'scroll_stop_score', 'clickbait_risk', 'total_score'],
  CreativeConcept: ['hypothesis_id', 'hook_id', 'title', 'core_idea', 'creative_angle', 'opening', 'problem', 'tension', 'revelation', 'mechanism', 'proof', 'transformation', 'cta', 'format', 'duration_seconds', 'visual_direction', 'story_direction', 'audio_direction', 'differentiation', 'strategic_score', 'production_score', 'overall_score', 'confidence'],
  Story: ['concept_id', 'title', 'premise', 'characters', 'setting', 'conflict', 'tension', 'revelation', 'mechanism', 'transformation', 'cta', 'narrative_structure', 'scenes', 'hook_integrity', 'methodology_integrity'],
  CharacterBible: ['character_name', 'role', 'identity', 'appearance', 'wardrobe', 'personality', 'emotional_arc', 'voice', 'continuity_constraints', 'reference_asset_ids'],
  EnvironmentBible: ['name', 'location_type', 'geography', 'architecture', 'interior_design', 'time_of_day', 'lighting', 'color_palette', 'props', 'background_activity', 'camera_constraints', 'continuity_constraints'],
  Storyboard: ['story_id', 'format', 'total_duration_seconds', 'scenes'],
  ProductionSpecification: ['storyboard_id', 'output_requirements', 'visual', 'image_generation', 'video_generation', 'audio', 'subtitles', 'brand'],
  Asset: ['asset_type', 'purpose', 'generation_source', 'file', 'specification', 'parent_asset_ids', 'quality', 'rights'],
  ValidationReport: ['object_id', 'validator', 'validation_status', 'checks', 'critical_errors', 'warnings', 'required_revisions', 'overall_score', 'confidence', 'validated_at'],
  Campaign: ['campaign_name', 'business_profile_id', 'offer_profile_id', 'creative_ids', 'channel', 'audience', 'objective', 'budget', 'schedule', 'tracking', 'campaign_status'],
  PerformanceRecord: ['campaign_id', 'creative_id', 'measurement_period', 'attention', 'engagement', 'lead_generation', 'sales', 'revenue', 'cost', 'attribution', 'sample_quality'],
  CreativeLearning: ['source_performance_ids', 'scope', 'observation', 'finding', 'winning_pattern', 'losing_pattern', 'diagnosis', 'commercial_effect', 'confidence', 'applicability', 'recommendation', 'evidence_ids'],
  WebsiteResearchBrief: ['business_profile_id', 'research_scope', 'content_requirements', 'technical_requirements'],
};

/**
 * Get the required fields for a given schema type.
 * Returns envelope fields + type-specific fields.
 */
export function getRequiredFields(schemaType: string): string[] {
  const typeFields = isValidSchemaType(schemaType)
    ? SCHEMA_REQUIRED_FIELDS[schemaType]
    : [];
  return [...ENVELOPE_REQUIRED_FIELDS, ...typeFields];
}

/**
 * Check if data has all required fields for its schema type.
 * Returns list of missing field names.
 */
export function getMissingFields(data: Record<string, unknown>): string[] {
  const schemaType = data.schema_type as string;
  if (!schemaType || !isValidSchemaType(schemaType)) {
    return ['schema_type (invalid or missing)'];
  }

  const required = getRequiredFields(schemaType);
  return required.filter(
    (field) => !(field in data) || data[field] === undefined || data[field] === null
  );
}

/**
 * Calculate completeness percentage of a schema object.
 */
export function calculateCompleteness(data: Record<string, unknown>): number {
  const schemaType = data.schema_type as string;
  if (!schemaType || !isValidSchemaType(schemaType)) return 0;

  const required = getRequiredFields(schemaType);
  if (required.length === 0) return 100;

  const filled = required.filter(
    (field) => field in data && data[field] !== undefined && data[field] !== null
  ).length;

  return Math.round((filled / required.length) * 100);
}
