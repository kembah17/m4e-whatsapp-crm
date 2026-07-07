// ============================================================
// Package Execution System Types
// ============================================================

// ---------- Enums / Union Types ----------

export type PackageKey =
  | 'pkg1_reactivation'
  | 'pkg2_online_presence'
  | 'pkg3_growth_engine'
  | 'complete'
  | 'unicorn'

export type MilestoneStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'skipped'
  | 'blocked'

export type TransitionType =
  | 'upgrade'
  | 'retainer'
  | 'extension'
  | 'escalation'

export type TransitionRecommendationLevel =
  | 'strong_recommend'
  | 'recommend'
  | 'maintain'
  | 'extend'
  | 'escalate'

export type TransitionDecision =
  | 'accepted'
  | 'declined'
  | 'deferred'

export type MetricType =
  | 'campaign_performance'
  | 'reactivation_rate'
  | 'satisfaction_score'
  | 'revenue_recovered'
  | 'import_success'
  | 'chatbot_resolution'
  | 'sentiment_trend'
  | 'ban_risk'

export type MetricUnit =
  | 'percent'
  | 'count'
  | 'naira'
  | 'score'

export type ImprovementLogType =
  | 'retrospective'
  | 'process_improvement'
  | 'template_update'
  | 'timeline_adjustment'
  | 'pricing_validation'
  | 'feature_request'
  | 'competitor_intel'

export type ImprovementSource =
  | 'post_project_retro'
  | 'monthly_review'
  | 'quarterly_review'
  | 'client_feedback'
  | 'system_alert'

export type ImpactAssessment = 'high' | 'medium' | 'low'

export type OutcomeType =
  | 'revenue_impact'
  | 'satisfaction_trajectory'
  | 'milestone_completion'
  | 'time_to_value'
  | 'campaign_performance'

export type ValidationStatus =
  | 'not_started'
  | 'in_progress'
  | 'completed'
  | 'failed'

export type ValidationType =
  | 'self_execution'
  | 'first_client'
  | 'real_world'

export type AccessLevel =
  | 'managed'
  | 'self_service'
  | 'preview'

export type ReportFrequency = 'weekly' | 'monthly'

// ---------- JSONB Sub-types ----------

export interface RetainerOption {
  name: string
  price: number
  monitoring_level: string
  intervention_frequency: string
}

export interface MilestoneTemplate {
  week: number
  name: string
  description: string
  deliverables: string[]
  criteria: string[]
}

export interface TransitionCriterion {
  metric: string
  threshold: number
  operator: '>=' | '>' | '<=' | '='
}

export interface QualitativeCriterion {
  key: string
  description: string
}

export interface TransitionRules {
  next_packages?: string[]
  quantitative_criteria?: TransitionCriterion[]
  qualitative_criteria?: QualitativeCriterion[]
  qualitative_minimum?: number
}

export interface DeliverableItem {
  name: string
  status: 'pending' | 'in_progress' | 'completed'
  url?: string
}

export interface CriterionItem {
  name: string
  met: boolean
  value?: number | string
  threshold?: number | string
}

export interface ActionItem {
  description: string
  assignee?: string
  due_date?: string
  status: 'pending' | 'in_progress' | 'completed'
  completed_at?: string
}

export interface ValidationFinding {
  finding: string
  severity: 'critical' | 'major' | 'minor' | 'info'
  resolution?: string
}

export interface ValidationBottleneck {
  phase: string
  issue: string
  resolution?: string
  time_impact?: string
}

// ---------- Table Row Types ----------

export interface PackageConfig {
  id: string
  package_key: PackageKey
  name: string
  description: string | null
  price_naira: number
  duration_weeks: number
  tier: 1 | 2 | 3
  campaign_slugs: string[]
  automation_types: string[]
  flow_types: string[]
  report_frequency: ReportFrequency
  retainer_options: RetainerOption[]
  milestone_template: MilestoneTemplate[]
  transition_rules: TransitionRules
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface PackageMilestone {
  id: string
  account_id: string
  package_config_id: string
  milestone_key: string
  name: string
  description: string | null
  week_number: number
  status: MilestoneStatus
  started_at: string | null
  completed_at: string | null
  planned_hours: number
  actual_hours: number
  deliverables: DeliverableItem[]
  criteria: CriterionItem[]
  notes: string | null
  created_at: string
  updated_at: string
}

export interface PackageTransition {
  id: string
  account_id: string
  from_package_id: string | null
  to_package_id: string | null
  transition_type: TransitionType
  recommendation: TransitionRecommendationLevel
  quantitative_scores: Record<string, number>
  qualitative_scores: Record<string, boolean>
  recommendation_text: string | null
  decision: TransitionDecision | null
  decided_at: string | null
  decided_by: string | null
  notes: string | null
  created_at: string
}

export interface ExecutionMetric {
  id: string
  account_id: string
  package_config_id: string | null
  metric_type: MetricType
  metric_key: string
  metric_value: number
  metric_unit: MetricUnit | null
  period_start: string
  period_end: string
  metadata: Record<string, unknown>
  created_at: string
}

export interface ImprovementLogEntry {
  id: string
  account_id: string | null
  package_config_id: string | null
  log_type: ImprovementLogType
  title: string
  description: string
  source: ImprovementSource
  action_items: ActionItem[]
  impact_assessment: ImpactAssessment | null
  outcome: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface ClientOutcome {
  id: string
  account_id: string
  package_config_id: string
  outcome_type: OutcomeType
  outcome_key: string
  outcome_value: number | null
  outcome_text: string | null
  measured_at: string
  metadata: Record<string, unknown>
  created_at: string
}

export interface PackageValidation {
  id: string
  package_config_id: string
  validation_type: ValidationType
  status: ValidationStatus
  started_at: string | null
  completed_at: string | null
  findings: ValidationFinding[]
  metrics_snapshot: Record<string, unknown>
  bottlenecks: ValidationBottleneck[]
  time_estimates_validated: boolean
  deliverables_produced: boolean
  edge_cases_handled: boolean
  notes: string | null
  created_at: string
  updated_at: string
}

export interface GuidedAccessConfig {
  id: string
  account_id: string
  package_config_id: string | null
  feature_key: string
  access_level: AccessLevel
  is_highlighted: boolean
  upgrade_prompt: string | null
  created_at: string
}

// ---------- RPC Result Types ----------

export interface TransitionRecommendation {
  recommendation: TransitionRecommendationLevel | 'no_transition_rules'
  message?: string
  quantitative_results?: Array<{
    metric: string
    passed: boolean
    value: number
    threshold: string
  }>
  quantitative_passed?: number
  quantitative_total?: number
  next_packages?: string[]
  qualitative_criteria?: QualitativeCriterion[]
  error?: string
}

export interface AggregatedMetric {
  group_key: string
  avg_value: number
  min_value: number
  max_value: number
  count: number
  accounts_count: number
}

// ---------- API Request/Response Types ----------

export interface CreateMilestoneRequest {
  account_id: string
  package_config_id: string
  milestone_key: string
  name: string
  description?: string
  week_number: number
  planned_hours?: number
  deliverables?: DeliverableItem[]
  criteria?: CriterionItem[]
}

export interface UpdateMilestoneRequest {
  status?: MilestoneStatus
  started_at?: string
  completed_at?: string
  actual_hours?: number
  deliverables?: DeliverableItem[]
  criteria?: CriterionItem[]
  notes?: string
}

export interface RecordTransitionRequest {
  account_id: string
  from_package_id?: string
  to_package_id?: string
  transition_type: TransitionType
  recommendation: TransitionRecommendationLevel
  quantitative_scores?: Record<string, number>
  qualitative_scores?: Record<string, boolean>
  recommendation_text?: string
  decision?: TransitionDecision
  notes?: string
}

export interface RecordMetricRequest {
  account_id: string
  package_config_id?: string
  metric_type: MetricType
  metric_key: string
  metric_value: number
  metric_unit?: MetricUnit
  period_start: string
  period_end: string
  metadata?: Record<string, unknown>
}

export interface CreateImprovementRequest {
  account_id?: string
  package_config_id?: string
  log_type: ImprovementLogType
  title: string
  description: string
  source: ImprovementSource
  action_items?: ActionItem[]
  impact_assessment?: ImpactAssessment
}

export interface RecordOutcomeRequest {
  account_id: string
  package_config_id: string
  outcome_type: OutcomeType
  outcome_key: string
  outcome_value?: number
  outcome_text?: string
  metadata?: Record<string, unknown>
}

// ---------- Retrospective Form ----------

export interface RetrospectiveForm {
  what_went_well: string
  what_didnt_work: string
  what_surprised_us: string
  client_feedback: string
  process_bottlenecks: string
  template_effectiveness: string
  time_accuracy: string
  communication_quality: string
  tool_effectiveness: string
  key_learning: string
}

// ---------- Strategy Session Types ----------

export interface StrategySessionDocument {
  type: 'performance_summary' | 'market_opportunity' | 'audience_intelligence' | 'budget_modelling' | 'session_summary' | 'campaign_architecture' | 'creative_brief' | 'twelve_week_calendar'
  title: string
  content: string
  generated_at: string
}

export interface StrategySessionAgenda {
  sections: Array<{
    time: string
    title: string
    description: string
    notes?: string
  }>
}
