// Subscriber Monitoring System
// Re-export all modules for convenient imports

export {
  trackActivity,
  trackPageView,
  trackFeatureAction,
  trackLogin,
  trackMessageSent,
  getActivitySummary,
  getDaysSinceLastLogin,
  getFeaturesUsed,
  cleanupOldEvents,
  EVENT_CATEGORIES,
  TRACKABLE_FEATURES,
} from './activity-tracker'

export {
  calculateHealthScore,
  calculateAllHealthScores,
  getHealthScoreHistory,
} from './health-score'
export type { HealthScore, RiskLevel, Trend } from './health-score'

export {
  getOnboardingProgress,
  completeStep,
  skipStep,
  resetOnboarding,
  autoDetectCompletedSteps,
  ONBOARDING_STEPS,
} from './onboarding'
export type { OnboardingProgress } from './onboarding'

export {
  evaluateInterventions,
  createIntervention,
  shouldSendIntervention,
  INTERVENTION_RULES,
  INTERVENTION_TEMPLATES,
} from './interventions'
