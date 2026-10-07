// =============================================================================
// CITE Schema TypeScript Types
// Generated from M4E CITE JSON Schemas v1.0.0
// =============================================================================

// ─── Common Enums ────────────────────────────────────────────────────────────

export type LifecycleStatus =
  | 'draft'
  | 'proposed'
  | 'validated'
  | 'approved'
  | 'rejected'
  | 'superseded'
  | 'archived';

export type ConfidenceLevel =
  | 'very_low'
  | 'low'
  | 'medium'
  | 'high'
  | 'very_high';

export type ValidationStatus =
  | 'pending'
  | 'passed'
  | 'failed'
  | 'blocked';

export type ApprovalStatus =
  | 'not_required'
  | 'pending'
  | 'approved'
  | 'rejected';

export type TransformationType =
  | 'client_input'
  | 'observed'
  | 'derived_analysis'
  | 'human_decision'
  | 'system_calculation'
  | 'external_api';

export type SourceRefType =
  | 'client_input'
  | 'website'
  | 'landing_page'
  | 'competitor_ad'
  | 'organic_content'
  | 'social_comment'
  | 'review'
  | 'research_report'
  | 'survey'
  | 'analytics'
  | 'crm'
  | 'ad_platform'
  | 'sales_record'
  | 'experiment'
  | 'expert_judgment'
  | 'other';

export type Objective =
  | 'AWARENESS'
  | 'PROBLEM_AGITATION'
  | 'EDUCATION'
  | 'DEMAND_CREATION'
  | 'DEMAND_CAPTURE'
  | 'LEAD_GENERATION'
  | 'APPOINTMENT'
  | 'TRIAL'
  | 'PURCHASE'
  | 'UPSELL'
  | 'CROSS_SELL'
  | 'RETENTION'
  | 'REACTIVATION'
  | 'REFERRAL';

export type AwarenessLevel =
  | 'unaware'
  | 'problem_aware'
  | 'solution_aware'
  | 'product_aware'
  | 'most_aware';

export type Recommendation =
  | 'strong_test'
  | 'test'
  | 'conditional_test'
  | 'do_not_test'
  | 'insufficient_evidence';

export type Priority = 'low' | 'medium' | 'high' | 'critical';

export type Platform =
  | 'meta'
  | 'facebook'
  | 'instagram'
  | 'linkedin'
  | 'tiktok'
  | 'youtube'
  | 'google'
  | 'whatsapp'
  | 'x'
  | 'website'
  | 'email'
  | 'display'
  | 'other';

export type Format =
  | 'image'
  | 'video'
  | 'carousel'
  | 'story'
  | 'reel'
  | 'short'
  | 'feed_video'
  | 'feed_image'
  | 'display'
  | 'audio'
  | 'document';

export type AssetType =
  | 'image'
  | 'video'
  | 'audio'
  | 'text'
  | 'document'
  | 'font'
  | 'logo'
  | 'icon'
  | 'animation'
  | 'composite';

export type ObjectType =
  | 'BusinessProfile'
  | 'OfferProfile'
  | 'ICPProfile'
  | 'SolutionMethodology'
  | 'MarketIntelligence'
  | 'ChannelProfile'
  | 'ChannelRecommendation'
  | 'CreativeBrief'
  | 'CompetitiveAdRecord'
  | 'CreativePattern'
  | 'CreativeHypothesis'
  | 'Hook'
  | 'CreativeConcept'
  | 'Story'
  | 'CharacterBible'
  | 'EnvironmentBible'
  | 'Storyboard'
  | 'ProductionSpecification'
  | 'Asset'
  | 'ValidationReport'
  | 'Campaign'
  | 'PerformanceRecord'
  | 'CreativeLearning'
  | 'WebsiteResearchBrief';

export type PatternType =
  | 'hook'
  | 'problem'
  | 'emotion'
  | 'story_structure'
  | 'mechanism'
  | 'proof'
  | 'visual_style'
  | 'character'
  | 'setting'
  | 'pacing'
  | 'cta'
  | 'offer'
  | 'composite';

export type Trend =
  | 'emerging'
  | 'rising'
  | 'stable'
  | 'declining'
  | 'unknown';

export type Saturation =
  | 'very_low'
  | 'low'
  | 'medium'
  | 'high'
  | 'very_high';

export type ProductionComplexity = 'low' | 'medium' | 'high';

export type CampaignStatus =
  | 'planned'
  | 'active'
  | 'paused'
  | 'completed'
  | 'cancelled';

export type HookType =
  | 'curiosity'
  | 'pain'
  | 'desire'
  | 'authority'
  | 'social_proof'
  | 'contrarian'
  | 'story'
  | 'question'
  | 'statistic'
  | 'demonstration';

export type ResearchScope =
  | 'full_build'
  | 'redesign'
  | 'landing_page'
  | 'directory';

export type NigerianIndustry =
  | 'retail'
  | 'real_estate'
  | 'restaurant'
  | 'professional_services'
  | 'healthcare'
  | 'logistics'
  | 'education'
  | 'agriculture'
  | 'manufacturing'
  | 'hotels_hospitality';

// ─── Common Interfaces ───────────────────────────────────────────────────────

export interface Confidence {
  score: number; // 0-1
  level: ConfidenceLevel;
  basis?: string[];
  uncertainties?: string[];
}

export interface Provenance {
  created_by: string;
  agent_run_id?: string;
  input_object_ids?: string[];
  source_evidence_ids?: string[];
  transformation: TransformationType;
  human_modified?: boolean;
}

export interface SourceRef {
  type: SourceRefType;
  url?: string;
  title?: string;
  captured_at?: string;
  reliability?: number;
}

export interface Evidence {
  id: string;
  evidence_type: SourceRefType;
  claim: string;
  reliability: number;
  source?: SourceRef;
  captured_at?: string;
}

export interface Money {
  amount: number;
  currency: string; // ISO 4217, default NGN
}

export interface Range {
  min?: number;
  max?: number;
  unit?: string;
}

export interface ObjectRef {
  object_type: ObjectType;
  object_id: string;
  relation: string;
}

export interface Validation {
  status: ValidationStatus;
  validation_report_ids: string[];
}

export interface Approval {
  required: boolean;
  status: ApprovalStatus;
  gate_id?: string;
  decision_id?: string;
}

export interface NigerianMarket {
  pidgin_aware?: boolean;
  timezone?: 'Africa/Lagos' | 'WAT';
  nigerian_industries?: NigerianIndustry[];
}

export interface WhatsAppContext {
  phone_format?: string; // +234XXXXXXXXXX
  message_type?: 'template' | 'session' | 'interactive' | 'media' | 'location';
  pidgin_sentiment?: {
    detected?: boolean;
    confidence?: number;
    phrases?: string[];
  };
}

// ─── Schema Envelope ─────────────────────────────────────────────────────────

export interface SchemaEnvelope {
  id: string;
  schema_type: ObjectType;
  schema_version: string;
  object_version: number;
  created_at: string;
  updated_at: string;
  source: SourceRef;
  provenance: Provenance;
  confidence: Confidence;
  validation: Validation;
  approval: Approval;
  tags: string[];
  relations: ObjectRef[];
  lifecycle_status: LifecycleStatus;
}

// ─── Intelligence Schemas ────────────────────────────────────────────────────

export interface BusinessProfileIdentity {
  legal_name: string;
  brand_name: string;
  website?: string;
  industry: string;
  sub_industry?: string;
}

export interface BusinessProfileModel {
  type: string;
  revenue_model: string;
  customer_type: string;
  maturity?: string;
  geography?: string;
}

export interface BusinessProfileCommercial {
  revenue_range?: Range;
  average_order_value?: Money;
  gross_margin?: number;
  customer_lifetime_value?: Money;
  target_cac?: Money;
}

export interface BusinessProfileMarketPosition {
  category: string;
  positioning: string;
  competitive_advantages: string[];
  competitive_disadvantages?: string[];
}

export interface BusinessProfileCapacity {
  sales_capacity: string;
  delivery_capacity: string;
  growth_constraints: string[];
}

export interface BusinessProfile extends SchemaEnvelope {
  schema_type: 'BusinessProfile';
  identity: BusinessProfileIdentity;
  business_model: BusinessProfileModel;
  commercial: BusinessProfileCommercial;
  market_position: BusinessProfileMarketPosition;
  capacity: BusinessProfileCapacity;
  business_goals: string[];
  constraints: string[];
}

export interface ICPFirmographics {
  industry?: string;
  company_size?: string;
  revenue_range?: Range;
  business_age?: string;
}

export interface ICPDecisionMaker {
  role: string;
  authority: string;
  influence?: string;
}

export interface ICPPsychographics {
  beliefs: string[];
  motivations: string[];
  fears: string[];
  aspirations: string[];
}

export interface ICPLanguage {
  preferred_terms: string[];
  avoided_terms: string[];
  customer_phrases: string[];
}

export interface ICPAwareness {
  problem: AwarenessLevel;
  solution: AwarenessLevel;
  product: AwarenessLevel;
}

export interface ICPProfile extends SchemaEnvelope {
  schema_type: 'ICPProfile';
  name: string;
  market: { country: string; region?: string };
  firmographics: ICPFirmographics;
  decision_maker: ICPDecisionMaker;
  psychographics: ICPPsychographics;
  jobs_to_be_done: string[];
  pain_points: string[];
  desired_outcomes: string[];
  triggers: string[];
  objections: string[];
  existing_solutions: string[];
  failed_alternatives?: string[];
  buying_process: string[];
  language: ICPLanguage;
  awareness: ICPAwareness;
}

export interface OfferPricing {
  model: string;
  amount?: Money;
  currency?: string;
  range?: Range;
}

export interface OfferCommercial {
  gross_margin?: number;
  target_cac?: Money;
  aov?: Money;
  ltv?: Money;
}

export interface OfferProfile extends SchemaEnvelope {
  schema_type: 'OfferProfile';
  name: string;
  category: string;
  description: string;
  customer_problem: string;
  desired_outcomes: string[];
  features?: string[];
  benefits?: string[];
  mechanism: string;
  differentiators: string[];
  pricing?: OfferPricing;
  commercial?: OfferCommercial;
  proof: string[];
  guarantees?: string[];
  limitations: string[];
  objections?: string[];
  cta_options: string[];
}

export interface SolutionMethodology extends SchemaEnvelope {
  schema_type: 'SolutionMethodology';
  problem_definition: string;
  diagnostic_process: string[];
  intervention: string[];
  delivery_steps: string[];
  mechanism: string;
  transformation: {
    before_state: string;
    after_state: string;
  };
  customer_participation: string[];
  proof_points: string[];
  limitations: string[];
  non_claims: string[];
  failure_conditions: string[];
}

export interface MarketIntelligence extends SchemaEnvelope {
  schema_type: 'MarketIntelligence';
  market: {
    country: string;
    region?: string;
    industry: string;
    category?: string;
  };
  market_size: Record<string, unknown>;
  market_trends: string[];
  customer_trends: string[];
  pain_trends: string[];
  desire_trends: string[];
  competitors: string[];
  substitutes: string[];
  economic_factors: string[];
  regulatory_factors: string[];
  cultural_factors: string[];
  technology_factors: string[];
  opportunities: string[];
  threats: string[];
  evidence_ids: string[];
}

export interface ChannelAudience {
  size_estimate: Range;
  icp_density: number;
  audience_quality: string;
}

export interface ChannelBehavior {
  intent: string;
  content_consumption: string;
  interaction_patterns: string;
}

export interface ChannelCreativeGrammar {
  common_formats: string[];
  hook_patterns: string[];
  visual_patterns: string[];
  cta_patterns: string[];
}

export interface ChannelCost {
  currency: string;
  estimated_cpm?: Money;
  estimated_cpc?: Money;
  estimated_cpl?: Money;
}

export interface ChannelProfile extends SchemaEnvelope {
  schema_type: 'ChannelProfile';
  channel: Platform;
  placement: string;
  market: string;
  audience: ChannelAudience;
  behavior: ChannelBehavior;
  creative_grammar: ChannelCreativeGrammar;
  cost: ChannelCost;
  awareness_distribution: Record<AwarenessLevel, number>;
  competition: {
    density: string;
    creative_saturation: string;
  };
  constraints: string[];
  strengths: string[];
  weaknesses: string[];
  evidence_ids: string[];
}

export interface ChannelRecommendationScores {
  audience_fit: number;
  icp_density: number;
  pain_intensity: number;
  awareness_fit: number;
  solution_fit: number;
  commercial_potential: number;
  cost_efficiency: number;
  creative_opportunity: number;
  measurement_quality: number;
}

export interface ChannelRecommendationTestPlan {
  budget: Money;
  duration_days: number;
  success_metric: string;
  minimum_sample: number;
}

export interface ChannelRecommendation extends SchemaEnvelope {
  schema_type: 'ChannelRecommendation';
  channel_profile_id: string;
  business_profile_id: string;
  icp_profile_id: string;
  offer_profile_id: string;
  objective: Objective;
  scores: ChannelRecommendationScores;
  total_score: number;
  confidence: Confidence;
  recommendation: Recommendation;
  reasoning: string[];
  risks: string[];
  test_plan: ChannelRecommendationTestPlan;
}

export interface WebsiteCompetitor {
  url: string;
  strengths: string[];
  weaknesses: string[];
  design_patterns: string[];
}

export interface WebsiteResearchBrief extends SchemaEnvelope {
  schema_type: 'WebsiteResearchBrief';
  business_profile_id: string;
  research_scope: ResearchScope;
  competitor_websites?: WebsiteCompetitor[];
  industry_benchmarks?: {
    avg_load_time: number;
    avg_pages: number;
    common_features: string[];
    conversion_patterns: string[];
  };
  content_requirements: {
    pages_needed: string[];
    copy_tone: string;
    imagery_style: string;
    key_messages: string[];
  };
  technical_requirements: {
    platform_recommendation: string;
    integrations: string[];
    performance_targets: Record<string, unknown>;
  };
  seo_requirements?: {
    target_keywords: string[];
    schema_types: string[];
    content_strategy: string;
  };
  wireframe_notes?: Array<{
    page_name: string;
    sections: string[];
    layout_notes: string;
  }>;
  design_direction?: {
    style: string;
    color_psychology: string;
    typography_mood: string;
    reference_sites: string[];
  };
}

// ─── Creative Schemas ────────────────────────────────────────────────────────

export interface CreativeBriefAwareness {
  problem: AwarenessLevel;
  solution: AwarenessLevel;
}

export interface CreativeBrief extends SchemaEnvelope {
  schema_type: 'CreativeBrief';
  business_profile_id: string;
  offer_profile_id: string;
  icp_profile_id: string;
  methodology_id: string;
  channel_recommendation_id: string;
  campaign_objective: Objective;
  awareness_stage: CreativeBriefAwareness;
  single_minded_proposition: string;
  customer_problem: string;
  customer_desire: string;
  desired_belief_change: {
    current_belief: string;
    desired_belief: string;
  };
  mechanism_to_demonstrate: string;
  proof_required: string[];
  offer: Record<string, unknown>;
  cta: string;
  creative_constraints: string[];
  brand_constraints: string[];
  cultural_constraints: string[];
  platform_constraints: Record<string, unknown>;
  production_constraints: Record<string, unknown>;
  success_metrics: string[];
}

export interface CompetitiveAdCapture {
  platform: Platform;
  url: string;
  advertiser: string;
  captured_at: string;
}

export interface CompetitiveAdCreative {
  format: Format;
  duration?: number;
  hook: string;
  headline: string;
  body: string;
}

export interface CompetitiveAdRecord extends SchemaEnvelope {
  schema_type: 'CompetitiveAdRecord';
  capture: CompetitiveAdCapture;
  classification: {
    competitor_type: string;
    industry: string;
    offer_category: string;
  };
  creative: CompetitiveAdCreative;
  audience: Record<string, unknown>;
  comments_or_reactions?: string[];
  landing_page?: {
    url: string;
    promise: string;
    cta: string;
    mechanism: string;
  };
  observed_signals: string[];
  evidence_ids: string[];
}

export interface CreativePattern extends SchemaEnvelope {
  schema_type: 'CreativePattern';
  pattern_type: PatternType;
  name: string;
  description: string;
  observed_in: string[];
  frequency: number;
  trend: Trend;
  saturation: Saturation;
  effectiveness_evidence: Record<string, unknown>;
  audience_fit: Record<string, unknown>;
  strengths: string[];
  weaknesses: string[];
  opportunity: string;
  recommended_use: string;
  confidence: Confidence;
}

export interface CreativeHypothesis extends SchemaEnvelope {
  schema_type: 'CreativeHypothesis';
  creative_angle: string;
  hypothesis: string;
  target_audience: string;
  problem: string;
  desire: string;
  belief_change: string;
  mechanism: string;
  hook_direction: string;
  proof_direction: string;
  expected_response: string;
  why_it_should_work: string[];
  differentiation: string;
  risks: string[];
  production_complexity: ProductionComplexity;
  strategic_score: number;
  confidence: Confidence;
  test_metric: string;
}

export interface Hook extends SchemaEnvelope {
  schema_type: 'Hook';
  hypothesis_id: string;
  type: HookType;
  text: string;
  promise: string;
  attention_mechanism: string;
  emotional_trigger: string;
  audience_relevance: string;
  channel_fit: Record<string, unknown>;
  clarity_score: number;
  curiosity_score: number;
  credibility_score: number;
  scroll_stop_score: number;
  clickbait_risk: number;
  total_score: number;
}

export interface CreativeConcept extends SchemaEnvelope {
  schema_type: 'CreativeConcept';
  hypothesis_id: string;
  hook_id: string;
  title: string;
  core_idea: string;
  creative_angle: string;
  opening: string;
  problem: string;
  tension: string;
  revelation: string;
  mechanism: string;
  proof: string;
  transformation: string;
  cta: string;
  format: Format;
  duration_seconds: number;
  visual_direction: string;
  story_direction: string;
  audio_direction: string;
  differentiation: string;
  strategic_score: number;
  production_score: number;
  overall_score: number;
  confidence: Confidence;
}

export interface StoryScene {
  scene_number: number;
  duration_seconds: number;
  description: string;
  visual: string;
  audio: string;
  text_overlay?: string;
  transition?: string;
}

export interface Story extends SchemaEnvelope {
  schema_type: 'Story';
  concept_id: string;
  title: string;
  premise: string;
  characters: string[];
  setting: string;
  conflict: string;
  tension: string;
  revelation: string;
  mechanism: string;
  transformation: string;
  cta: string;
  narrative_structure: string;
  scenes: StoryScene[];
  dialogue?: string[];
  voiceover?: string[];
  screen_text?: string[];
  hook_integrity: {
    fulfilled: boolean;
    explanation: string;
  };
  methodology_integrity: {
    accurate: boolean;
    explanation: string;
  };
}

// ─── Production Schemas ──────────────────────────────────────────────────────

export interface CharacterIdentity {
  age_range: string;
  gender_presentation: string;
  ethnicity_or_cultural_context: string;
  occupation?: string;
}

export interface CharacterAppearance {
  face: string;
  hair: string;
  body: string;
  skin: string;
  distinctive_features?: string;
}

export interface CharacterVoice {
  age: string;
  accent: string;
  tone: string;
  pace: string;
}

export interface CharacterBible extends SchemaEnvelope {
  schema_type: 'CharacterBible';
  character_name: string;
  role: string;
  identity: CharacterIdentity;
  appearance: CharacterAppearance;
  wardrobe: string[];
  personality: string[];
  emotional_arc: string[];
  voice: CharacterVoice;
  continuity_constraints: string[];
  reference_asset_ids: string[];
}

export interface EnvironmentBible extends SchemaEnvelope {
  schema_type: 'EnvironmentBible';
  name: string;
  location_type: string;
  geography: string;
  architecture: string;
  interior_design: string;
  time_of_day: string;
  season?: string;
  weather?: string;
  lighting: string;
  color_palette: string[];
  props: string[];
  background_activity: string[];
  camera_constraints: string[];
  continuity_constraints: string[];
}

export interface StoryboardScene {
  scene_number: number;
  duration_seconds: number;
  visual_description: string;
  camera: string;
  audio: string;
  text_overlay?: string;
  transition?: string;
  character_ids?: string[];
  environment_id?: string;
}

export interface Storyboard extends SchemaEnvelope {
  schema_type: 'Storyboard';
  story_id: string;
  format: {
    aspect_ratio: string;
    resolution: string;
    fps: number;
  };
  total_duration_seconds: number;
  scenes: StoryboardScene[];
}

export interface ProductionSpecification extends SchemaEnvelope {
  schema_type: 'ProductionSpecification';
  storyboard_id: string;
  output_requirements: {
    platform: Platform;
    aspect_ratio: string;
    resolution: string;
    duration_seconds: number;
    fps: number;
  };
  visual: {
    style: string;
    realism_level: string;
    camera_style: string;
    lighting_style: string;
  };
  image_generation: {
    model_requirements: string;
    reference_assets: string[];
    continuity_requirements: string[];
  };
  video_generation: {
    clip_duration: number;
    motion_requirements: string;
    camera_requirements: string;
  };
  audio: Record<string, unknown>;
  subtitles: {
    required: boolean;
    style: string;
    language: string;
  };
  brand: {
    logo: string;
    colors: string[];
    fonts: string[];
  };
}

export interface AssetFile {
  uri: string;
  mime_type: string;
  size_bytes: number;
  checksum?: string;
}

export interface AssetSpecification {
  width?: number;
  height?: number;
  duration_seconds?: number;
  fps?: number;
}

export interface AssetGenerationSource {
  type: string;
  provider: string;
  model: string;
  generation_id?: string;
}

export interface Asset extends SchemaEnvelope {
  schema_type: 'Asset';
  asset_type: AssetType;
  purpose: string;
  file: AssetFile;
  specification: AssetSpecification;
  parent_asset_ids: string[];
  scene_id?: string;
  quality: {
    score: number;
    status: string;
  };
  rights: {
    source: string;
    license: string;
    commercial_use: boolean;
  };
  generation_source: AssetGenerationSource;
}

// ─── Performance Schemas ─────────────────────────────────────────────────────

export interface Campaign extends SchemaEnvelope {
  schema_type: 'Campaign';
  campaign_name: string;
  business_profile_id: string;
  offer_profile_id: string;
  creative_ids: string[];
  channel: {
    platform: Platform;
    placement: string;
  };
  audience: {
    icp_profile_id: string;
    targeting: Record<string, unknown>;
  };
  objective: Objective;
  budget: Money;
  schedule: {
    start: string;
    end: string;
  };
  tracking: {
    utm_scheme: string;
    crm_campaign_id?: string;
    attribution_model: string;
  };
  campaign_status: CampaignStatus;
}

export interface PerformanceAttention {
  impressions: number;
  reach: number;
  video_starts?: number;
  three_second_views?: number;
  thumb_stop_rate?: number;
}

export interface PerformanceEngagement {
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  watch_time_seconds?: number;
}

export interface PerformanceLeadGeneration {
  clicks: number;
  landing_page_visits: number;
  whatsapp_conversations?: number;
  forms?: number;
  calls?: number;
}

export interface PerformanceSales {
  opportunities: number;
  proposals: number;
  sales: number;
  conversion_rate: number;
  cac: Money;
}

export interface PerformanceRevenue {
  revenue: Money;
  gross_profit: Money;
  roas: number;
  contribution_margin?: number;
  ltv?: Money;
}

export interface PerformanceRecord extends SchemaEnvelope {
  schema_type: 'PerformanceRecord';
  campaign_id: string;
  creative_id: string;
  measurement_period: {
    start: string;
    end: string;
  };
  attention: PerformanceAttention;
  engagement: PerformanceEngagement;
  lead_generation: PerformanceLeadGeneration;
  sales: PerformanceSales;
  revenue: PerformanceRevenue;
  cost: {
    spend: Money;
    currency: string;
  };
  attribution: {
    model: string;
    confidence: number;
    evidence_ids: string[];
  };
  sample_quality: {
    sample_size: number;
    statistical_confidence: number;
  };
}

export interface CreativeLearning extends SchemaEnvelope {
  schema_type: 'CreativeLearning';
  source_performance_ids: string[];
  scope: {
    industry?: string;
    market?: string;
    icp?: string;
    offer_category?: string;
    channel?: string;
  };
  observation: string;
  finding: string;
  winning_pattern: Record<string, unknown>;
  losing_pattern: Record<string, unknown>;
  diagnosis: {
    primary_failure: string;
    secondary_failure?: string;
  };
  commercial_effect: {
    metric: string;
    before: number;
    after: number;
    delta: number;
  };
  confidence: Confidence;
  applicability: {
    scope: string;
    conditions: string[];
    exceptions: string[];
  };
  recommendation: string;
  evidence_ids: string[];
}

// ─── Governance Schemas ──────────────────────────────────────────────────────

export interface ValidationCheck {
  check_name: string;
  passed: boolean;
  message?: string;
  severity?: Priority;
}

export interface ValidationReport extends SchemaEnvelope {
  schema_type: 'ValidationReport';
  object_id: string;
  validator: {
    agent_type: string;
    version: string;
  };
  checks: ValidationCheck[];
  critical_errors: string[];
  warnings: string[];
  required_revisions: string[];
  overall_score: number;
  confidence: Confidence;
  validated_at: string;
  validation_status: ValidationStatus;
}

// ─── Union Type ──────────────────────────────────────────────────────────────

export type CITESchemaObject =
  | BusinessProfile
  | ICPProfile
  | OfferProfile
  | SolutionMethodology
  | MarketIntelligence
  | ChannelProfile
  | ChannelRecommendation
  | CreativeBrief
  | CompetitiveAdRecord
  | CreativePattern
  | CreativeHypothesis
  | Hook
  | CreativeConcept
  | Story
  | CharacterBible
  | EnvironmentBible
  | Storyboard
  | ProductionSpecification
  | Asset
  | ValidationReport
  | Campaign
  | PerformanceRecord
  | CreativeLearning
  | WebsiteResearchBrief;
