/**
 * Churn Archetype Segmentation
 *
 * Classifies churned contacts into archetypes to enable targeted
 * win-back campaigns with archetype-specific messaging.
 */

export const CHURN_ARCHETYPES = [
  {
    id: 'product_fit_drift',
    name: 'Product-Fit Drift',
    icon: '🔄',
    description: 'Low feature usage, support tickets — product no longer fits needs',
    signals: ['low_feature_usage', 'support_tickets', 'feature_requests'],
    recommendedCampaign: 'product_update_announcement',
  },
  {
    id: 'price_objection',
    name: 'Price Objection',
    icon: '💰',
    description: 'Deal stalled at negotiation, price sensitivity signals',
    signals: ['deal_stalled', 'price_inquiry', 'competitor_pricing'],
    recommendedCampaign: 'limited_time_winback',
  },
  {
    id: 'competitor_poaching',
    name: 'Competitor Poaching',
    icon: '🏴‍☠️',
    description: 'Export requests, competitor mentions, sudden disengagement',
    signals: ['export_requests', 'competitor_mentions', 'sudden_drop'],
    recommendedCampaign: 'value_reminder_direct_outreach',
  },
  {
    id: 'natural_lifecycle',
    name: 'Natural Lifecycle',
    icon: '🍂',
    description: 'Seasonal buyer, project completed, natural end of engagement',
    signals: ['seasonal_pattern', 'project_completed', 'one_time_need'],
    recommendedCampaign: 'seasonal_reactivation',
  },
  {
    id: 'other',
    name: 'Other / Unclassified',
    icon: '❓',
    description: 'Churn reason not yet classified — requires manual review',
    signals: [],
    recommendedCampaign: 'general_reactivation',
  },
] as const

export type ChurnArchetypeId = typeof CHURN_ARCHETYPES[number]['id']

/**
 * Get a churn archetype definition by ID.
 */
export function getChurnArchetype(id: string) {
  return CHURN_ARCHETYPES.find((a) => a.id === id) ?? null
}

/**
 * Get the recommended campaign slug for a churn archetype.
 */
export function getRecommendedCampaign(archetypeId: string): string | null {
  const archetype = getChurnArchetype(archetypeId)
  return archetype?.recommendedCampaign ?? null
}
