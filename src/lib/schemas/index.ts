// =============================================================================
// CITE Schema Library - Public API
// =============================================================================

// Types
export type {
  // Enums
  LifecycleStatus,
  ConfidenceLevel,
  ValidationStatus,
  ApprovalStatus,
  TransformationType,
  SourceRefType,
  Objective,
  AwarenessLevel,
  Recommendation,
  Priority,
  Platform,
  Format,
  AssetType,
  ObjectType,
  PatternType,
  Trend,
  Saturation,
  ProductionComplexity,
  CampaignStatus,
  HookType,
  ResearchScope,
  NigerianIndustry,
  // Common interfaces
  Confidence,
  Provenance,
  SourceRef,
  Evidence,
  Money,
  Range,
  ObjectRef,
  Validation,
  Approval,
  NigerianMarket,
  WhatsAppContext,
  // Envelope
  SchemaEnvelope,
  // Intelligence
  BusinessProfile,
  BusinessProfileIdentity,
  BusinessProfileModel,
  BusinessProfileCommercial,
  BusinessProfileMarketPosition,
  BusinessProfileCapacity,
  ICPProfile,
  ICPFirmographics,
  ICPDecisionMaker,
  ICPPsychographics,
  ICPLanguage,
  ICPAwareness,
  OfferProfile,
  OfferPricing,
  OfferCommercial,
  SolutionMethodology,
  MarketIntelligence,
  ChannelProfile,
  ChannelAudience,
  ChannelBehavior,
  ChannelCreativeGrammar,
  ChannelCost,
  ChannelRecommendation,
  ChannelRecommendationScores,
  ChannelRecommendationTestPlan,
  WebsiteResearchBrief,
  WebsiteCompetitor,
  // Creative
  CreativeBrief,
  CreativeBriefAwareness,
  CompetitiveAdRecord,
  CompetitiveAdCapture,
  CompetitiveAdCreative,
  CreativePattern,
  CreativeHypothesis,
  Hook,
  CreativeConcept,
  Story,
  StoryScene,
  // Production
  CharacterBible,
  CharacterIdentity,
  CharacterAppearance,
  CharacterVoice,
  EnvironmentBible,
  Storyboard,
  StoryboardScene,
  ProductionSpecification,
  Asset,
  AssetFile,
  AssetSpecification,
  AssetGenerationSource,
  // Performance
  Campaign,
  PerformanceRecord,
  PerformanceAttention,
  PerformanceEngagement,
  PerformanceLeadGeneration,
  PerformanceSales,
  PerformanceRevenue,
  CreativeLearning,
  // Governance
  ValidationReport,
  ValidationCheck,
  // Union
  CITESchemaObject,
} from './types';

// Scoring
export {
  calculateStrategicCreativeScore,
  calculateChannelScore,
  calculateHookScore,
  calculateOverallConceptScore,
  calculateProductionScore,
  checkValidationGate,
  getCommercialPriorityRank,
  scoreToConfidenceLevel,
  STRATEGIC_WEIGHTS,
  CHANNEL_WEIGHTS,
  HOOK_WEIGHTS,
  HOOK_CLICKBAIT_WEIGHT,
  PRODUCTION_DIFFICULTY_WEIGHTS,
  VALIDATION_GATE_DEFAULTS,
  COMMERCIAL_PRIORITY_HIERARCHY,
} from './scoring';

export type {
  StrategicScoreInput,
  ChannelScoreInput,
  HookScoreInput,
  ProductionScoreInput,
  GateType,
} from './scoring';

// Validation
export {
  validateEnvelope,
  isValidSchemaType,
  isValidLifecycleStatus,
  isValidConfidenceLevel,
  getRequiredFields,
  getMissingFields,
  calculateCompleteness,
  ALL_SCHEMA_TYPES,
  ALL_LIFECYCLE_STATUSES,
  ALL_CONFIDENCE_LEVELS,
} from './validation';


// =============================================================================
// CITE Phase 2 — Pattern Library, Hypothesis Engine, Evidence Tracking
// =============================================================================

// Phase 2 Types
export type {
  // Campaign Context
  CampaignContext,
  // Pattern Extraction
  CampaignMetrics,
  ExtractedPattern,
  EffectivenessEvidence,
  AudienceFit,
  ExtractionResult,
  ExtractedLearning,
  // Pattern Consultation
  PatternMatch,
  PatternSuggestion,
  ConsultationResult,
  // Hypothesis Engine
  CreativeHypothesisGenerated,
  SuccessCriteria,
  HypothesisGenerationResult,
  BusinessProfileSummary,
  ICPProfileSummary,
  ChannelContext,
  // Rules Engine
  RuleSeverity,
  RuleViolation,
  RuleCheckResult,
  // Evidence Tracking
  EvidenceSource,
  CampaignProvenance,
  CampaignEvidenceRecord,
  ProvenanceResult,
} from './phase2-types';

// Pattern Extraction (post-campaign analysis)
export {
  extractPatternsFromCampaign,
} from './pattern-extraction';

// Pattern Consultation (pre-campaign suggestions)
export {
  consultPatterns,
  generateSuggestions,
} from './pattern-consultation';

// Hypothesis Engine
export {
  generateHypotheses,
} from './hypothesis-engine';

// Rules Engine (16 business rules)
export {
  checkRules,
  hasBlockingViolations,
  getBusinessRules,
  checkRuleById,
} from './rules-engine';

// Evidence & Provenance Tracking
export {
  trackEvidence,
  getProvenance,
  autoPopulateProvenance,
  updatePostCampaignEvidence,
} from './evidence-tracker';
